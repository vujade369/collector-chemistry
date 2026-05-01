"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./profile.css";

type TopCollection = {
  name: string;
  count: number;
  percentage?: number;
  imageUrl?: string;
  previewImages?: string[];
  source?: "collection" | "artist";
};

type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  behavioralReads?: string[];
  collectorIdentityLabel?: string;
  anchorCollection?: { name: string; count: number; imageUrl?: string } | null;
  topCollections?: TopCollection[];
  totalNFTs?: number;
  signalPiece?: {
    collectionName?: string;
    imageUrl?: string;
  } | null;
  firstMintLabel?: string | null;
  firstMint?: {
    nft?: {
      imageUrl?: string;
      title?: string;
      collectionName?: string;
    };
    timestamp?: string;
  } | null;
  acquisitionBreakdown?: {
    mintCount: number;
    acquiredCount: number;
    totalSampled: number;
    mintPercent: number;
    acquiredPercent: number;
  } | null;
};

type ProfileIdentity = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

type ProfileResponse = {
  wallet: string;
  profileIdentity?: ProfileIdentity;
  profile?: WalletProfile;
  taste?: Record<string, number>;
  categoryGroups?: Record<
    string,
    {
      totalCount: number;
      previews: Array<{
        title: string;
        collectionName: string;
        imageUrl: string;
      }>;
      collections: Array<{
        name: string;
        count: number;
      }>;
    }
  >;
};

type TasteSlice = {
  label: string;
  value: number;
};

function isValidInput(value: string): boolean {
  const trimmed = value.trim();
  const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isEns = trimmed.endsWith(".eth");
  return isEthAddress || isEns;
}

function shortenAddress(value: string): string {
  if (!value) return "";
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function toDisplayName(wallet: string): string {
  const trimmed = wallet.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(".eth")) return trimmed;
  return shortenAddress(trimmed);
}

function normalizeImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

function formatMintDate(timestamp: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function buildTasteSlices(taste: Record<string, number>, maxSegments = 6): TasteSlice[] {
  const entries = Object.entries(taste || {})
    .map(([label, value]) => ({ label, value: Number(value) || 0 }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const merged = new Map<string, number>();
  for (const entry of entries) {
    merged.set(entry.label, (merged.get(entry.label) || 0) + entry.value);
  }
  const normalized = [...merged.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (normalized.length <= maxSegments) {
    const nonOther = normalized.filter((entry) => entry.label !== "Other");
    const other = normalized.filter((entry) => entry.label === "Other");
    return [...nonOther, ...other];
  }

  const nonOther = normalized.filter((entry) => entry.label !== "Other");
  const otherTotal = normalized
    .filter((entry) => entry.label === "Other")
    .reduce((sum, entry) => sum + entry.value, 0);
  const head = nonOther.slice(0, maxSegments - 1);
  const tailTotal =
    nonOther.slice(maxSegments - 1).reduce((sum, entry) => sum + entry.value, 0) + otherTotal;
  if (tailTotal <= 0) return head;
  return [...head, { label: "Other", value: tailTotal }];
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((x) => `${x}${x}`).join("") : clean;
  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(alpha, 1))})`;
}

function TasteSignature({ title, slices }: { title: string; slices: TasteSlice[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toneHex = "#ff3399";
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const size = 188;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 64;
  const baseStrokeWidth = 18;
  const startAngle = -100;
  const gapAngle = slices.length > 1 ? 1.2 : 0;
  const rankOpacity = [1, 0.74, 0.56, 0.4];

  const rankedNonOther = [...slices].filter((slice) => slice.label !== "Other").sort((a, b) => b.value - a.value);

  let currentAngle = startAngle;
  const arcs = slices.map((slice, index) => {
    const rawSweep = (slice.value / total) * 360;
    const adjustedSweep = Math.max(rawSweep - gapAngle, 0.85);
    const arcStart = currentAngle + gapAngle / 2;
    const arcEnd = arcStart + adjustedSweep;
    currentAngle += rawSweep;

    const rank = rankedNonOther.findIndex((item) => item.label === slice.label) + 1;
    const isOther = slice.label === "Other";
    const baseOpacity = isOther ? 0.28 : rank > 0 ? rankOpacity[Math.min(rank - 1, rankOpacity.length - 1)] || 0.26 : 0.26;
    const isHovered = hoveredIndex === index;
    const isDimmed = hoveredIndex !== null && !isHovered;
    const opacity = isHovered ? 1 : isDimmed ? Math.max(0.14, baseOpacity * 0.45) : baseOpacity;
    const baseRankStrokeWidth = rank === 1 ? baseStrokeWidth + 1.2 : baseStrokeWidth;
    const strokeWidth = isHovered ? baseRankStrokeWidth + 3 : baseRankStrokeWidth;

    return {
      index,
      label: slice.label,
      value: Math.round(slice.value),
      path: describeArcPath(cx, cy, radius, arcStart, arcEnd),
      stroke: toRgba(toneHex, opacity),
      strokeWidth,
    };
  });

  const orderedArcs = hoveredIndex === null ? arcs : [...arcs.filter((arc) => arc.index !== hoveredIndex), ...arcs.filter((arc) => arc.index === hoveredIndex)];

  const legendRows = (() => {
    const bucket = new Map<string, number>();
    for (const slice of slices) {
      bucket.set(slice.label, (bucket.get(slice.label) || 0) + slice.value);
    }
    const merged = [...bucket.entries()].map(([label, value]) => ({ label, value }));
    const nonOther = merged.filter((entry) => entry.label !== "Other").sort((a, b) => b.value - a.value);
    const other = merged.filter((entry) => entry.label === "Other");
    return [...nonOther, ...other].slice(0, 5);
  })();

  const leadSlice = legendRows[0] || null;
  const centerLabel = hoveredIndex !== null ? slices[hoveredIndex]?.label : leadSlice?.label;
  const centerValue = hoveredIndex !== null ? Math.round(slices[hoveredIndex]?.value || 0) : Math.round(leadSlice?.value || 0);

  return (
    <div className="profile-panel profile-panel-glow">
      <p className="profile-section-label">{title}</p>
      <div className="profile-taste-signature">
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title} taste signature`} className="profile-taste-chart">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1b1b1b" strokeWidth={baseStrokeWidth} />
          {orderedArcs.map((arc, index) => (
            <path
              key={`${arc.label}-${arc.index}`}
              d={arc.path}
              fill="none"
              stroke={arc.stroke}
              strokeWidth={arc.strokeWidth}
              strokeLinecap="butt"
              style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.6s ease ${index * 0.1}s` }}
              onMouseEnter={() => setHoveredIndex(arc.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={radius - baseStrokeWidth / 2 + 1} fill="#111" />
          {centerLabel ? (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" className="profile-taste-center-label">{centerLabel}</text>
              <text x={cx} y={cy + 13} textAnchor="middle" className="profile-taste-center-value">{centerValue}%</text>
            </>
          ) : null}
        </svg>
        <div className="profile-taste-legend">
          {legendRows.map((row) => (
            <div key={`legend-${row.label}`} className="profile-taste-label-row">
              <span className="profile-taste-label">{row.label}</span>
              <span className="profile-taste-pct">{Math.round(row.value)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletFromQuery = (searchParams.get("wallet") || "").trim();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProfileResponse | null>(null);
  const [compareWallet, setCompareWallet] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    async function load() {
      if (!walletFromQuery || !isValidInput(walletFromQuery)) {
        setError("Nothing found for this wallet.");
        setResult(null);
        return;
      }
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(walletFromQuery)}`);
        const json = (await res.json()) as ProfileResponse | { error?: string };
        if (!res.ok || !("profile" in json) || !json.profile) {
          setError("Nothing found for this wallet.");
          setResult(null);
          return;
        }
        setResult(json as ProfileResponse);
      } catch {
        setError("Nothing found for this wallet.");
        setResult(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [walletFromQuery]);

  const profile = result?.profile || null;
  const resolvedWallet = result?.wallet || walletFromQuery;
  const fallbackDisplayName = useMemo(() => toDisplayName(resolvedWallet), [resolvedWallet]);
  const headerDisplayName = useMemo(() => {
    const identity = result?.profileIdentity;
    const display = String(identity?.displayName || "").trim();
    if (display) return display;
    const username = String(identity?.username || "").trim();
    if (username) return username;
    return fallbackDisplayName;
  }, [result?.profileIdentity, fallbackDisplayName]);
  const headerAvatarUrl = useMemo(() => normalizeImageUrl(result?.profileIdentity?.avatarUrl || ""), [result?.profileIdentity?.avatarUrl]);
  const behavioralReads = useMemo(() => (profile?.behavioralReads || []).filter(Boolean).slice(0, 3), [profile?.behavioralReads]);

  const returnPattern = useMemo(() => {
    if (!profile) return null;
    if (profile.anchorCollection?.name && profile.anchorCollection?.count) {
      return {
        name: profile.anchorCollection.name,
        count: profile.anchorCollection.count,
        imageUrl: normalizeImageUrl(profile.anchorCollection.imageUrl),
      };
    }
    const fallback = (profile.topCollections || [])[0];
    if (fallback?.name && fallback?.count) {
      return { name: fallback.name, count: fallback.count, imageUrl: normalizeImageUrl(fallback.imageUrl || fallback.previewImages?.[0]) };
    }
    return null;
  }, [profile]);

  const signalPiece = useMemo(() => {
    if (!profile) return null;
    if (profile.signalPiece?.collectionName && profile.signalPiece?.imageUrl) {
      return { collectionName: profile.signalPiece.collectionName, imageUrl: normalizeImageUrl(profile.signalPiece.imageUrl) };
    }
    if (returnPattern?.name && returnPattern?.imageUrl) {
      return { collectionName: returnPattern.name, imageUrl: returnPattern.imageUrl };
    }
    return null;
  }, [profile, returnPattern]);

  const firstMint = useMemo(() => {
    const mint = profile?.firstMint;
    if (!mint?.nft?.collectionName || !mint?.timestamp) return null;
    return {
      imageUrl: normalizeImageUrl(mint.nft.imageUrl),
      collectionName: mint.nft.collectionName,
      date: formatMintDate(mint.timestamp),
      year: String(new Date(mint.timestamp).getFullYear()),
      label: profile?.firstMintLabel || null,
    };
  }, [profile]);

  const tasteSlices = useMemo(() => buildTasteSlices(result?.taste || {}, 6), [result?.taste]);
  const sortedCategoryEntries = useMemo(() => Object.entries(result?.categoryGroups || {}).sort((a, b) => b[1].totalCount - a[1].totalCount), [result?.categoryGroups]);
  const categoryList = sortedCategoryEntries.slice(0, 6);
  const remainingCategories = sortedCategoryEntries.slice(6);
  const canCompare = isValidInput(compareWallet);
  const totalCollections = profile?.topCollections?.length || 0;
  const topCollections = (profile?.topCollections || []).slice(0, 5);

  function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;
    router.push(`/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`);
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        {loading ? <div className="profile-center"><p className="profile-eyebrow">Reading your wallet...</p></div> : null}
        {!loading && error ? <div className="profile-center"><p className="profile-error">Nothing found for this wallet. <button className="profile-error-link" onClick={() => router.push("/")} type="button">Try another wallet</button></p></div> : null}
        {!loading && !error && profile ? (
          <>
            <header className="profile-panel profile-header-card">
              <div className="profile-id-top">
                <div className="profile-id-main">
                  <div className="profile-avatar-fallback" aria-hidden="true">
                    {headerAvatarUrl ? (
                      <img src={headerAvatarUrl} alt={headerDisplayName} className="profile-avatar-img" />
                    ) : (
                      headerDisplayName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="profile-eyebrow">Collector profile</p>
                    <h1 className="profile-display-name">{headerDisplayName}</h1>
                    <p className="profile-address">{resolvedWallet}</p>
                  </div>
                </div>
                {profile.collectorIdentityLabel ? <span className="profile-identity-pill">{profile.collectorIdentityLabel}</span> : null}
              </div>
              <div className="profile-stats-row">
                <div className="profile-stat"><p className="profile-stat-value">{profile.totalNFTs || 0}</p><p className="profile-stat-label">Holdings indexed</p></div>
                <div className="profile-stat"><p className="profile-stat-value">{totalCollections}</p><p className="profile-stat-label">Collections</p></div>
                {(firstMint?.label || firstMint?.year) ? <div className="profile-stat"><p className="profile-stat-value">{firstMint.label || firstMint.year}</p><p className="profile-stat-label">First mint</p></div> : null}
              </div>
            </header>

            {(profile.patternLine || profile.identityParagraph) && (
              <section className="profile-panel">
                {profile.patternLine ? <p className="profile-pattern-line">{profile.patternLine}</p> : null}
                {profile.identityParagraph ? <p className="profile-identity-paragraph">{profile.identityParagraph}</p> : null}
                {behavioralReads.length > 0 ? (
                  <div className="profile-reads">
                    {behavioralReads.map((read, idx) => <span key={`${read}-${idx}`} className="profile-read-tag">{read}</span>)}
                  </div>
                ) : null}
              </section>
            )}

            {profile.acquisitionBreakdown && profile.acquisitionBreakdown.totalSampled > 0 ? (
              <div className="profile-panel">
                <p className="profile-section-label">How you collect</p>
                <div className="profile-taste-row">
                  <div className="profile-taste-label-row"><span className="profile-taste-label">Minted</span><span className="profile-taste-pct">{profile.acquisitionBreakdown.mintPercent}%</span></div>
                  <div className="profile-taste-track"><div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.mintPercent}%` }} /></div>
                  <div className="profile-taste-label-row"><span className="profile-taste-label">Acquired</span><span className="profile-taste-pct">{profile.acquisitionBreakdown.acquiredPercent}%</span></div>
                  <div className="profile-taste-track"><div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.acquiredPercent}%`, opacity: 0.55 }} /></div>
                </div>
              </div>
            ) : null}

            {tasteSlices.length > 0 ? <TasteSignature title="Taste map" slices={tasteSlices} /> : null}

            {(returnPattern || signalPiece || firstMint) ? (
              <section className="profile-panel">
                <p className="profile-section-label">Core signals</p>
                <div className="profile-signal-grid">
                  {returnPattern ? <article className="profile-signal-card"><p className="profile-section-label">Return pattern</p><div className="profile-signal-body"><div className="profile-thumb">{returnPattern.imageUrl ? <img src={returnPattern.imageUrl} alt={returnPattern.name} className="profile-thumb-img" /> : null}</div><div><p className="profile-return-name">{returnPattern.name}</p><p className="profile-return-count">You keep returning to {returnPattern.count} works here.</p></div></div></article> : null}
                  {signalPiece ? <article className="profile-signal-card"><p className="profile-section-label">Signal piece</p><div className="profile-signal-body"><div className="profile-thumb">{signalPiece.imageUrl ? <img src={signalPiece.imageUrl} alt={signalPiece.collectionName} className="profile-thumb-img" /> : null}</div><div><p className="profile-return-name">{signalPiece.collectionName}</p><p className="profile-return-count">Your wallet seems to trust this world.</p></div></div></article> : null}
                  {firstMint ? <article className="profile-signal-card"><p className="profile-section-label">First mint</p><div className="profile-signal-body"><div className="profile-thumb">{firstMint.imageUrl ? <img src={firstMint.imageUrl} alt={firstMint.collectionName} className="profile-thumb-img" /> : null}</div><div><p className="profile-return-name">{firstMint.collectionName}</p><p className="profile-return-count">Your first recorded mint was {firstMint.date}.</p></div></div></article> : null}
                </div>
              </section>
            ) : null}

            {categoryList.length > 0 ? (
              <div className="profile-panel">
                <p className="profile-section-label">Tap a category to explore</p>
                <div className="cat-grid">
                  {(showAllCategories ? [...categoryList, ...remainingCategories] : categoryList).map(([cat, group], idx) => {
                    const isOpen = openCategory === cat;
                    const entries = showAllCategories ? [...categoryList, ...remainingCategories] : categoryList;
                    const insertDrawerAfter = idx % 2 === 1 || idx === entries.length - 1;
                    return (
                      <React.Fragment key={cat}>
                        <div className={`cat-card${isOpen ? " cat-card--open" : ""}`} onClick={() => setOpenCategory(isOpen ? null : cat)}>
                          <div className="cat-accent" />
                          <span className="cat-chevron">{isOpen ? "▾" : "›"}</span>
                          <p className="cat-name">{cat}</p>
                          <p className="cat-pct">{result?.taste?.[cat] != null ? `${Math.round(result.taste[cat])}%` : String(group.totalCount)}</p>
                          <p className="cat-count">{group.totalCount} pieces</p>
                        </div>
                        {insertDrawerAfter && openCategory && (() => {
                          const rowStart = idx % 2 === 0 ? idx : idx - 1;
                          const rowCats = entries.slice(rowStart, rowStart + 2).map(([c]) => c);
                          if (!rowCats.includes(openCategory)) return null;
                          const openGroup = result?.categoryGroups?.[openCategory];
                          if (!openGroup) return null;
                          return (
                            <div className="cat-drawer">
                              <div className="cat-drawer-header"><span className="cat-drawer-label">{openCategory}</span><span className="cat-drawer-count">{openGroup.totalCount} pieces across {openGroup.collections.length} collections</span></div>
                              <div className="cat-nft-grid">
                                {openGroup.previews.slice(0, 3).map((p, i) => <div key={i} className="cat-nft-thumb">{p.imageUrl ? <img src={p.imageUrl} alt={p.title} className="profile-thumb-img" /> : null}</div>)}
                                {openGroup.totalCount > 3 ? <div className="cat-nft-more">+{openGroup.totalCount - 3}</div> : null}
                              </div>
                              <div className="cat-collections">
                                {openGroup.collections.slice(0, 3).map((c, i) => <div key={i} className="cat-coll-row"><span className="cat-coll-name">{c.name}</span><span className="cat-coll-count">{c.count}</span></div>)}
                              </div>
                            </div>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
                  {!showAllCategories && remainingCategories.length > 0 ? <button type="button" className="cat-show-more" onClick={() => setShowAllCategories(true)}>Show remaining categories ›</button> : null}
                </div>
              </div>
            ) : null}

            {topCollections.length > 0 ? <section className="profile-panel"><p className="profile-section-label">Top collections</p><div className="profile-collection-list">{topCollections.map((collection, index) => <div key={`${collection.name}-${index}`} className="profile-collection-row"><span className="profile-collection-rank">{String(index + 1).padStart(2, "0")}</span><span className="profile-collection-name">{collection.name}</span><span className="profile-collection-count">{collection.count}</span></div>)}</div></section> : null}

            <section className="profile-compare-section">
              <p className="profile-compare-title">See who stopped in the same places.</p>
              <p className="profile-compare-sub">Drop in another wallet. See where your worlds overlap.</p>
              <form onSubmit={handleCompareSubmit} className="profile-compare-form"><input className="profile-input" value={compareWallet} onChange={(e) => setCompareWallet(e.target.value)} placeholder="Second wallet address or ENS" /><button className="profile-btn-primary" disabled={!canCompare} type="submit">Compare</button></form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
