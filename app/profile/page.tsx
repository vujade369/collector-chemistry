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

type CategoryRow = {
  category: string;
  percentage: number;
  count: number;
};

type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  coreInsight?: string;
  tensionInsight?: string;
  whatStandsOut?: string;
  behavioralReads?: string[];
  collectorIdentityLabel?: string;
  anchorCollection?: { name: string; count: number; imageUrl?: string } | null;
  topCollections?: TopCollection[];
  categoryDistribution?: CategoryRow[];
  totalNFTs?: number;
  focusLabel?: "Focused" | "Balanced" | "Explorer";
  dominantCategory?: string;
  secondaryCategory?: string;
  signalPiece?: {
    collectionName?: string;
    imageUrl?: string;
  } | null;
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

type ProfileResponse = {
  wallet: string;
  profile?: WalletProfile;
  taste?: Record<string, number>;
  categoryGroups?: Record<string, {
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
  }>;
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

function toTitleCase(value: string): string {
  return value
    .split("_")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

  const rankedNonOther = [...slices]
    .filter((slice) => slice.label !== "Other")
    .sort((a, b) => b.value - a.value);

  let currentAngle = startAngle;
  const arcs = slices.map((slice, index) => {
    const rawSweep = (slice.value / total) * 360;
    const adjustedSweep = Math.max(rawSweep - gapAngle, 0.85);
    const arcStart = currentAngle + gapAngle / 2;
    const arcEnd = arcStart + adjustedSweep;
    currentAngle += rawSweep;

    const rank = rankedNonOther.findIndex((item) => item.label === slice.label) + 1;
    const isOther = slice.label === "Other";
    const baseOpacity = isOther
      ? 0.28
      : rank > 0
      ? rankOpacity[Math.min(rank - 1, rankOpacity.length - 1)] || 0.26
      : 0.26;
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

  const orderedArcs = hoveredIndex === null
    ? arcs
    : [...arcs.filter((arc) => arc.index !== hoveredIndex), ...arcs.filter((arc) => arc.index === hoveredIndex)];

  const legendRows = (() => {
    const bucket = new Map<string, number>();
    for (const slice of slices) {
      bucket.set(slice.label, (bucket.get(slice.label) || 0) + slice.value);
    }
    const merged = [...bucket.entries()].map(([label, value]) => ({ label, value }));
    const nonOther = merged
      .filter((entry) => entry.label !== "Other")
      .sort((a, b) => b.value - a.value);
    const other = merged.filter((entry) => entry.label === "Other");
    return [...nonOther, ...other].slice(0, 5);
  })();

  return (
    <div className="profile-panel">
      <p className="profile-section-label">{title}</p>
      <div style={{ display: "grid", gap: "18px", justifyItems: "center" }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${title} taste signature`}
          style={{ width: "188px", height: "188px" }}
        >
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1b1b1b" strokeWidth={baseStrokeWidth} />
          {orderedArcs.map((arc, index) => (
            <path
              key={`${arc.label}-${arc.index}`}
              d={arc.path}
              fill="none"
              stroke={arc.stroke}
              strokeWidth={arc.strokeWidth}
              strokeLinecap="butt"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.6s ease ${index * 0.1}s`,
              }}
              onMouseEnter={() => setHoveredIndex(arc.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={radius - baseStrokeWidth / 2 + 1} fill="#111" />
        </svg>
        <div style={{ width: "100%", display: "grid", gap: "8px" }}>
          {legendRows.map((row) => (
            <div key={`legend-${row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
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
  const displayName = useMemo(() => toDisplayName(resolvedWallet), [resolvedWallet]);

  const behavioralReads = useMemo(
    () => (profile?.behavioralReads || []).filter(Boolean).slice(0, 3),
    [profile?.behavioralReads]
  );

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
      const imageUrl = normalizeImageUrl(fallback.imageUrl || fallback.previewImages?.[0]);
      return { name: fallback.name, count: fallback.count, imageUrl };
    }
    return null;
  }, [profile]);

  const signalPiece = useMemo(() => {
    if (!profile) return null;
    if (profile.signalPiece?.collectionName && profile.signalPiece?.imageUrl) {
      return {
        collectionName: profile.signalPiece.collectionName,
        imageUrl: normalizeImageUrl(profile.signalPiece.imageUrl),
      };
    }
    if (returnPattern?.name && returnPattern?.imageUrl) {
      return {
        collectionName: returnPattern.name,
        imageUrl: returnPattern.imageUrl,
      };
    }
    return null;
  }, [profile, returnPattern]);

  const firstMint = useMemo(() => {
    const mint = profile?.firstMint;
    if (!mint?.nft?.collectionName || !mint?.timestamp) return null;
    return {
      imageUrl: normalizeImageUrl(mint.nft.imageUrl),
      title: mint.nft.title || mint.nft.collectionName,
      collectionName: mint.nft.collectionName,
      date: formatMintDate(mint.timestamp),
    };
  }, [profile]);

  const tasteSlices = useMemo(
    () => buildTasteSlices(result?.taste || {}, 6),
    [result?.taste]
  );

  const categoryList = useMemo(() => {
    const groups = result?.categoryGroups || {};
    return Object.entries(groups)
      .sort((a, b) => b[1].totalCount - a[1].totalCount)
      .slice(0, 6);
  }, [result?.categoryGroups]);

  const remainingCategories = useMemo(() => {
    const groups = result?.categoryGroups || {};
    return Object.entries(groups)
      .sort((a, b) => b[1].totalCount - a[1].totalCount)
      .slice(6);
  }, [result?.categoryGroups]);

  const canCompare = isValidInput(compareWallet);

  function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;
    router.push(
      `/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        {loading ? (
          <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="profile-eyebrow">Reading your wallet...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "14px", color: "#666" }}>
              Nothing found for this wallet.{" "}
              <button
                style={{ textDecoration: "underline", color: "#a8a49d" }}
                onClick={() => router.push("/")}
                type="button"
              >
                Try another wallet
              </button>
            </p>
          </div>
        ) : null}

        {!loading && !error && profile ? (
          <>
            <header className="profile-header">
              <p className="profile-eyebrow">Collector profile</p>
              <h1 className="profile-display-name">{displayName}</h1>
              <p className="profile-address">{resolvedWallet}</p>
            </header>

            {profile.patternLine || profile.identityParagraph ? (
              <section style={{ display: "grid", gap: "20px" }}>
                {profile.patternLine ? (
                  <p className="profile-pattern-line">{profile.patternLine}</p>
                ) : null}
                {profile.identityParagraph ? (
                  <p className="profile-identity-paragraph">{profile.identityParagraph}</p>
                ) : null}
              </section>
            ) : null}

            {behavioralReads.length > 0 ? (
              <div className="profile-reads">
                {behavioralReads.map((read, idx) => (
                  <span key={`${read}-${idx}`} className="profile-read-tag">{read}</span>
                ))}
              </div>
            ) : null}

            {returnPattern ? (
              <div className="profile-panel">
                <p className="profile-section-label">Return Pattern</p>
                <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "72px", height: "72px", borderRadius: "10px", overflow: "hidden", background: "#0f0f0f", border: "0.5px solid #1e1e1e" }}>
                    {returnPattern.imageUrl ? (
                      <img src={returnPattern.imageUrl} alt={returnPattern.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <p className="profile-return-name">{returnPattern.name}</p>
                    <p className="profile-return-count">{returnPattern.count} works held</p>
                  </div>
                </div>
              </div>
            ) : null}

            {signalPiece ? (
              <div className="profile-panel">
                <p className="profile-section-label">Signal Piece</p>
                <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "72px", height: "72px", borderRadius: "10px", overflow: "hidden", background: "#0f0f0f", border: "0.5px solid #1e1e1e" }}>
                    <img src={signalPiece.imageUrl} alt={signalPiece.collectionName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <p className="profile-return-name">{signalPiece.collectionName}</p>
                </div>
              </div>
            ) : null}

            {firstMint ? (
              <div className="profile-panel">
                <p className="profile-section-label">First mint</p>
                <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "72px", height: "72px", borderRadius: "10px", overflow: "hidden", background: "#0f0f0f", border: "0.5px solid #1e1e1e" }}>
                    {firstMint.imageUrl ? (
                      <img src={firstMint.imageUrl} alt={firstMint.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <p className="profile-return-name">{firstMint.collectionName}</p>
                    <p className="profile-return-count">{firstMint.date}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {profile.acquisitionBreakdown && profile.acquisitionBreakdown.totalSampled > 0 ? (
              <div className="profile-panel">
                <p className="profile-section-label">How they collect</p>
                <div style={{ display: "grid", gap: "10px" }}>
                  <div className="profile-taste-label-row">
                    <span className="profile-taste-label">Minted</span>
                    <span className="profile-taste-pct">{profile.acquisitionBreakdown.mintPercent}%</span>
                  </div>
                  <div className="profile-taste-track"><div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.mintPercent}%` }} /></div>
                  <div className="profile-taste-label-row">
                    <span className="profile-taste-label">Acquired</span>
                    <span className="profile-taste-pct">{profile.acquisitionBreakdown.acquiredPercent}%</span>
                  </div>
                  <div className="profile-taste-track"><div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.acquiredPercent}%`, opacity: 0.55 }} /></div>
                </div>
              </div>
            ) : null}

            {tasteSlices.length > 0 ? <TasteSignature title="Taste map" slices={tasteSlices} /> : null}

            {categoryList.length > 0 ? (
              <div className="profile-panel">
                <p className="profile-section-label">Tap a category to explore</p>
                <div className="cat-grid">
                  {(showAllCategories
                    ? [...categoryList, ...remainingCategories]
                    : categoryList
                  ).map(([cat, group], idx) => {
                    const isOpen = openCategory === cat;
                    const insertDrawerAfter =
                      idx % 2 === 1 ||
                      idx === (showAllCategories
                        ? categoryList.length + remainingCategories.length - 1
                        : categoryList.length - 1);
                    return (
                      <React.Fragment key={cat}>
                        <div
                          className={`cat-card${isOpen ? " cat-card--open" : ""}`}
                          onClick={() => setOpenCategory(isOpen ? null : cat)}
                        >
                          <div className="cat-accent" />
                          <span className="cat-chevron">{isOpen ? "▾" : "›"}</span>
                          <p className="cat-name">{cat}</p>
                          <p className="cat-pct">{result?.taste?.[cat] != null ? `${Math.round(result.taste[cat])}%` : String(group.totalCount)}</p>
                          <p className="cat-count">{group.totalCount} pieces</p>
                        </div>
                        {insertDrawerAfter && openCategory && (
                          (() => {
                            const rowStart = idx % 2 === 0 ? idx : idx - 1;
                            const rowEnd = rowStart + 1;
                            const rowCats = (showAllCategories
                              ? [...categoryList, ...remainingCategories]
                              : categoryList
                            ).slice(rowStart, rowEnd + 1).map(([c]) => c);
                            if (!rowCats.includes(openCategory)) return null;
                            const openGroup = result?.categoryGroups?.[openCategory];
                            if (!openGroup) return null;
                            return (
                              <div className="cat-drawer">
                                <div className="cat-drawer-header">
                                  <span className="cat-drawer-label">{openCategory}</span>
                                  <span className="cat-drawer-count">
                                    {openGroup.totalCount} pieces across {openGroup.collections.length} collections
                                  </span>
                                </div>
                                <div className="cat-nft-grid">
                                  {openGroup.previews.slice(0, 3).map((p, i) => (
                                    <div key={i} className="cat-nft-thumb">
                                      {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      ) : null}
                                    </div>
                                  ))}
                                  {openGroup.totalCount > 3 ? (
                                    <div className="cat-nft-more">+{openGroup.totalCount - 3}</div>
                                  ) : null}
                                </div>
                                <div className="cat-collections">
                                  {openGroup.collections.slice(0, 3).map((c, i) => (
                                    <div key={i} className="cat-coll-row">
                                      <span className="cat-coll-name">{c.name}</span>
                                      <span className="cat-coll-count">{c.count} pieces</span>
                                    </div>
                                  ))}
                                  {openGroup.collections.length > 3 ? (
                                    <div className="cat-coll-row">
                                      <span className="cat-coll-name" style={{ color: "#444" }}>
                                        + {openGroup.collections.length - 3} more collections
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!showAllCategories && remainingCategories.length > 0 ? (
                    <button
                      className="cat-show-more"
                      onClick={() => setShowAllCategories(true)}
                      type="button"
                    >
                      Show {remainingCategories.length} more categories ›
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {profile.whatStandsOut ? (
              <p className="profile-standout">{profile.whatStandsOut}</p>
            ) : null}

            <section className="profile-compare-section">
              <div style={{ display: "grid", gap: "6px" }}>
                <p className="profile-compare-title">See who stopped in the same places.</p>
                <p className="profile-compare-sub">Add another wallet to see where your taste overlaps.</p>
              </div>
              <form style={{ display: "grid", gap: "12px", maxWidth: "480px" }} onSubmit={handleCompareSubmit}>
                <input
                  type="text"
                  value={compareWallet}
                  onChange={(e) => setCompareWallet(e.target.value)}
                  placeholder="Second wallet address or ENS"
                  className="profile-input"
                />
                <button
                  type="submit"
                  disabled={!canCompare}
                  className="profile-btn-primary"
                >
                  Compare
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
