"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./profile.css";
import WalletConverter from "@/components/profile/WalletConverter";

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
  signalPiece?: { collectionName?: string; imageUrl?: string } | null;
  firstMintLabel?: string | null;
  firstMint?: {
    nft?: { imageUrl?: string; title?: string; collectionName?: string };
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

type MarketAttention = {
  ethAmountLabel: string;
  collectionName: string | null;
  title: string | null;
  imageUrl: string | null;
  contractAddress: string | null;
  tokenId: string | null;
  openseaUrl: string | null;
} | null;

type ProfileResponse = {
  wallet: string;
  profileIdentity?: ProfileIdentity;
  profile?: WalletProfile;
  taste?: Record<string, number>;
  marketAttention?: MarketAttention;
  categoryGroups?: Record<string, {
    totalCount: number;
    previews: Array<{ title: string; collectionName: string; imageUrl: string }>;
    collections: Array<{ name: string; count: number }>;
  }>;
};

type TasteSlice = { label: string; value: number };

function isValidInput(value: string): boolean {
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) || trimmed.endsWith(".eth");
}

function shortenAddress(value: string): string {
  if (!value || value.length < 14) return value;
  return value.slice(0, 6) + "..." + value.slice(-4);
}

function toDisplayName(wallet: string): string {
  const trimmed = wallet.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(".eth")) return trimmed;
  return shortenAddress(trimmed);
}

function normalizeImageUrl(url?: string | null) {
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
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function buildTasteSlices(taste: Record<string, number>, maxSegments = 6): TasteSlice[] {
  const merged = new Map<string, number>();
  for (const [label, value] of Object.entries(taste || {})) {
    if (Number(value) > 0) merged.set(label, (merged.get(label) || 0) + Number(value));
  }
  const normalized = [...merged.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (normalized.length <= maxSegments) {
    return [...normalized.filter(e => e.label !== "Other"), ...normalized.filter(e => e.label === "Other")];
  }
  const nonOther = normalized.filter(e => e.label !== "Other");
  const otherTotal = normalized.filter(e => e.label === "Other").reduce((s, e) => s + e.value, 0);
  const head = nonOther.slice(0, maxSegments - 1);
  const tailTotal = nonOther.slice(maxSegments - 1).reduce((s, e) => s + e.value, 0) + otherTotal;
  return tailTotal > 0 ? [...head, { label: "Other", value: tailTotal }] : head;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, s: number, e: number) {
  const start = polarToCartesian(cx, cy, r, s);
  const end = polarToCartesian(cx, cy, r, e);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

function toRgba(hex: string, alpha: number) {
  const c = hex.replace("#", "");
  const f = c.length === 3 ? c.split("").map(x => x + x).join("") : c;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(alpha, 1))})`;
}

function TasteSignature({ slices }: { slices: TasteSlice[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 94; const cy = 94; const r = 64;
  const base = 18; const gap = slices.length > 1 ? 1.2 : 0;
  const rankOpacity = [1, 0.74, 0.56, 0.4];
  const ranked = [...slices].filter(s => s.label !== "Other").sort((a, b) => b.value - a.value);

  let angle = -100;
  const arcs = slices.map((slice, i) => {
    const sweep = (slice.value / total) * 360;
    const adj = Math.max(sweep - gap, 0.85);
    const s = angle + gap / 2;
    const e = s + adj;
    angle += sweep;
    const rank = ranked.findIndex(x => x.label === slice.label) + 1;
    const isOther = slice.label === "Other";
    const baseOp = isOther ? 0.28 : rankOpacity[Math.min(rank - 1, rankOpacity.length - 1)] || 0.26;
    const isH = hovered === i;
    const isDim = hovered !== null && !isH;
    const op = isH ? 1 : isDim ? Math.max(0.14, baseOp * 0.45) : baseOp;
    const sw = isH ? (rank === 1 ? base + 4.2 : base + 3) : rank === 1 ? base + 1.2 : base;
    return { i, label: slice.label, value: Math.round(slice.value), path: arcPath(cx, cy, r, s, e), stroke: toRgba("#ff3399", op), sw };
  });

  const ordered = hovered === null ? arcs : [...arcs.filter(a => a.i !== hovered), ...arcs.filter(a => a.i === hovered)];

  const legend = (() => {
    const b = new Map<string, number>();
    for (const s of slices) b.set(s.label, (b.get(s.label) || 0) + s.value);
    const m = [...b.entries()].map(([label, value]) => ({ label, value }));
    return [...m.filter(e => e.label !== "Other").sort((a, b) => b.value - a.value), ...m.filter(e => e.label === "Other")].slice(0, 5);
  })();

  const lead = legend[0];
  const cLabel = hovered !== null ? slices[hovered]?.label : lead?.label;
  const cVal = hovered !== null ? Math.round(slices[hovered]?.value || 0) : Math.round(lead?.value || 0);

  return (
    <div className="taste-layout">
      <div className="taste-donut-wrap">
        <svg viewBox="0 0 188 188" className="profile-taste-chart" role="img" aria-label="Taste signature">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1b1b1b" strokeWidth={base} />
          {ordered.map((a, idx) => (
            <path key={`${a.label}-${a.i}`} d={a.path} fill="none" stroke={a.stroke} strokeWidth={a.sw} strokeLinecap="butt"
              style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.6s ease ${idx * 0.1}s` }}
              onMouseEnter={() => setHovered(a.i)} onMouseLeave={() => setHovered(null)} />
          ))}
          <circle cx={cx} cy={cy} r={r - base / 2 + 1} fill="#111" />
          {cLabel && <>
            <text x={cx} y={cy - 4} textAnchor="middle" className="profile-taste-center-label">{cLabel}</text>
            <text x={cx} y={cy + 13} textAnchor="middle" className="profile-taste-center-value">{cVal}%</text>
          </>}
        </svg>
      </div>
      <div className="taste-legend-col">
        {legend.map((row, i) => (
          <div key={`leg-${row.label}`} className={`taste-legend-row${i === 0 ? " taste-legend-row--lead" : ""}`}>
            <span className="taste-legend-label">{row.label}</span>
            <span className="taste-legend-pct">{Math.round(row.value)}%</span>
          </div>
        ))}
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
        setError("Nothing found for this wallet."); setResult(null); return;
      }
      setLoading(true); setError(""); setResult(null);
      try {
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(walletFromQuery)}`);
        const json = await res.json() as ProfileResponse | { error?: string };
        if (!res.ok || !("profile" in json) || !json.profile) {
          setError("Nothing found for this wallet."); setResult(null); return;
        }
        setResult(json as ProfileResponse);
      } catch { setError("Nothing found for this wallet."); setResult(null); }
      finally { setLoading(false); }
    }
    void load();
  }, [walletFromQuery]);

  const profile = result?.profile || null;
  const resolvedWallet = result?.wallet || walletFromQuery;
  const fallbackDisplayName = useMemo(() => toDisplayName(resolvedWallet), [resolvedWallet]);

  const headerDisplayName = useMemo(() => {
    const id = result?.profileIdentity;
    return String(id?.displayName || "").trim() || String(id?.username || "").trim() || fallbackDisplayName;
  }, [result?.profileIdentity, fallbackDisplayName]);

  const headerAvatarUrl = useMemo(() => normalizeImageUrl(result?.profileIdentity?.avatarUrl), [result?.profileIdentity?.avatarUrl]);
  const behavioralReads = useMemo(() => (profile?.behavioralReads || []).filter(Boolean).slice(0, 3), [profile?.behavioralReads]);

  const firstMint = useMemo(() => {
    const m = profile?.firstMint;
    if (!m?.nft?.collectionName || !m?.timestamp) return null;
    return {
      imageUrl: normalizeImageUrl(m.nft.imageUrl),
      collectionName: m.nft.collectionName,
      date: formatMintDate(m.timestamp),
      year: String(new Date(m.timestamp).getFullYear()),
      label: profile?.firstMintLabel || null,
    };
  }, [profile]);

  const signalPiece = useMemo(() => {
    if (!profile?.signalPiece?.collectionName || !profile?.signalPiece?.imageUrl) return null;
    return { collectionName: profile.signalPiece.collectionName, imageUrl: normalizeImageUrl(profile.signalPiece.imageUrl) };
  }, [profile]);

  const marketAttention = result?.marketAttention || null;

  const showSignalPiece = signalPiece && (!marketAttention ||
    (signalPiece.collectionName || "").toLowerCase() !== (marketAttention.collectionName || "").toLowerCase());

  const tasteSlices = useMemo(() => buildTasteSlices(result?.taste || {}, 6), [result?.taste]);

  const sortedCategoryEntries = useMemo(() =>
    Object.entries(result?.categoryGroups || {}).sort((a, b) => b[1].totalCount - a[1].totalCount),
    [result?.categoryGroups]);

  const categoryList = sortedCategoryEntries.slice(0, 6);
  const remainingCategories = sortedCategoryEntries.slice(6);
  const canCompare = isValidInput(compareWallet);
  const totalCollections = profile?.topCollections?.length || 0;
  const topCollections = (profile?.topCollections || []).slice(0, 5);
  const totalNFTsForBar = profile?.totalNFTs || 1;

  function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;
    router.push(`/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`);
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        {loading && <div className="profile-center"><p className="profile-eyebrow">Reading your wallet...</p></div>}
        {!loading && error && (
          <div className="profile-center">
            <p className="profile-error">Nothing found for this wallet.{" "}
              <button className="profile-error-link" onClick={() => router.push("/")} type="button">Try another wallet</button>
            </p>
          </div>
        )}
        {!loading && !error && profile && (<>

          {/* ZONE 1: HERO */}
          <header className="profile-panel profile-hero-card">
            <div className="profile-id-top">
              <div className="profile-id-main">
                <div className="profile-avatar-fallback" aria-hidden="true">
                  {headerAvatarUrl
                    ? <img src={headerAvatarUrl} alt={headerDisplayName} className="profile-avatar-img" />
                    : headerDisplayName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="profile-eyebrow">Collector profile</p>
                  <h1 className="profile-display-name">{headerDisplayName}</h1>
                  <p className="profile-address">{shortenAddress(resolvedWallet)}</p>
                </div>
              </div>
              {profile.collectorIdentityLabel && <span className="profile-identity-pill">{profile.collectorIdentityLabel}</span>}
            </div>

            <div className="profile-stats-row">
              <div className="profile-stat">
                <p className="profile-stat-value">{profile.totalNFTs || 0}</p>
                <p className="profile-stat-label">Holdings</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-value">{totalCollections}</p>
                <p className="profile-stat-label">Collections</p>
              </div>
              {(firstMint?.label || firstMint?.year) && (
                <div className="profile-stat">
                  <p className="profile-stat-value">{firstMint.label || firstMint.year}</p>
                  <p className="profile-stat-label">First mint</p>
                </div>
              )}
            </div>

            <div className="profile-hero-divider" />

            <div className="profile-signal-grid">
              {marketAttention && (
                <article className="profile-signal-card profile-signal-card--primary">
                  <p className="profile-section-label">Market attention</p>
                  <div className="profile-signal-body">
                    <div className="profile-thumb profile-thumb--lg">
                      {marketAttention.imageUrl
                        ? <img src={normalizeImageUrl(marketAttention.imageUrl)} alt={marketAttention.collectionName || "NFT"} className="profile-thumb-img" />
                        : <div className="profile-thumb-placeholder">{(marketAttention.collectionName || "?").slice(0, 1).toUpperCase()}</div>}
                    </div>
                    <div className="profile-signal-text">
                      <p className="profile-return-name">{marketAttention.title || marketAttention.collectionName || "Unknown"}</p>
                      {marketAttention.collectionName && marketAttention.title && (
                        <p className="profile-return-count">{marketAttention.collectionName}</p>
                      )}
                      <p className="profile-signal-bid">
                        <span className="profile-bid-amount">{marketAttention.ethAmountLabel}</span>
                        <span className="profile-bid-label">current best offer</span>
                      </p>
                    </div>
                  </div>
                </article>
              )}

              {showSignalPiece && (
                <article className="profile-signal-card">
                  <p className="profile-section-label">Signal piece</p>
                  <div className="profile-signal-body">
                    <div className="profile-thumb">
                      {signalPiece.imageUrl
                        ? <img src={signalPiece.imageUrl} alt={signalPiece.collectionName} className="profile-thumb-img" />
                        : <div className="profile-thumb-placeholder">{signalPiece.collectionName.slice(0, 1).toUpperCase()}</div>}
                    </div>
                    <div className="profile-signal-text">
                      <p className="profile-return-name">{signalPiece.collectionName}</p>
                      <p className="profile-return-count">Your wallet keeps returning here.</p>
                    </div>
                  </div>
                </article>
              )}

              {firstMint && (
                <article className="profile-signal-card">
                  <p className="profile-section-label">First mint</p>
                  <div className="profile-signal-body">
                    <div className="profile-thumb">
                      {firstMint.imageUrl
                        ? <img src={firstMint.imageUrl} alt={firstMint.collectionName} className="profile-thumb-img" />
                        : <div className="profile-thumb-placeholder">{firstMint.collectionName.slice(0, 1).toUpperCase()}</div>}
                    </div>
                    <div className="profile-signal-text">
                      <p className="profile-return-name">{firstMint.collectionName}</p>
                      <p className="profile-return-count">First recorded mint {firstMint.date}.</p>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </header>

          {/* ZONE 2: INTERPRETATION */}
          {(profile.patternLine || profile.identityParagraph) && (
            <section className="profile-panel profile-interpretation-card">
              {profile.patternLine && <p className="profile-pattern-line">{profile.patternLine}</p>}
              {profile.identityParagraph && <p className="profile-identity-paragraph">{profile.identityParagraph}</p>}
              {(behavioralReads.length > 0 || profile.acquisitionBreakdown) && (
                <div className="profile-interpretation-footer">
                  {behavioralReads.length > 0 && (
                    <div className="profile-reads">
                      {behavioralReads.map((read, idx) => <span key={`${read}-${idx}`} className="profile-read-tag">{read}</span>)}
                    </div>
                  )}
                  {profile.acquisitionBreakdown && profile.acquisitionBreakdown.totalSampled > 0 && (
                    <div className="profile-acq-row">
                      <div className="profile-acq-bar-group">
                        <div className="profile-acq-label-row">
                          <span className="profile-acq-label">Minted</span>
                          <span className="profile-acq-pct">{profile.acquisitionBreakdown.mintPercent}%</span>
                        </div>
                        <div className="profile-taste-track">
                          <div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.mintPercent}%` }} />
                        </div>
                      </div>
                      <div className="profile-acq-bar-group">
                        <div className="profile-acq-label-row">
                          <span className="profile-acq-label">Acquired</span>
                          <span className="profile-acq-pct">{profile.acquisitionBreakdown.acquiredPercent}%</span>
                        </div>
                        <div className="profile-taste-track">
                          <div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.acquiredPercent}%`, opacity: 0.55 }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ZONE 3: TASTE SYSTEM */}
          {tasteSlices.length > 0 && (
            <section className="profile-panel profile-panel-glow profile-taste-section">
              <p className="profile-section-label">Taste map</p>
              <TasteSignature slices={tasteSlices} />
              {categoryList.length > 0 && (
                <div className="cat-subsection">
                  <p className="profile-section-label">Explore by category</p>
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
                                <div className="cat-drawer-header">
                                  <span className="cat-drawer-label">{openCategory}</span>
                                  <span className="cat-drawer-count">{openGroup.totalCount} pieces · {openGroup.collections.length} collections</span>
                                </div>
                                <div className="cat-nft-grid">
                                  {openGroup.previews.slice(0, 3).map((p, i) => (
                                    <div key={i} className="cat-nft-thumb">
                                      {p.imageUrl ? <img src={p.imageUrl} alt={p.title} className="profile-thumb-img" /> : <div className="profile-thumb-placeholder">{p.collectionName.slice(0, 1).toUpperCase()}</div>}
                                    </div>
                                  ))}
                                  {openGroup.totalCount > 3 && <div className="cat-nft-more">+{openGroup.totalCount - 3}</div>}
                                </div>
                                <div className="cat-collections">
                                  {openGroup.collections.slice(0, 3).map((c, i) => (
                                    <div key={i} className="cat-coll-row">
                                      <span className="cat-coll-name">{c.name}</span>
                                      <span className="cat-coll-count">{c.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </React.Fragment>
                      );
                    })}
                    {!showAllCategories && remainingCategories.length > 0 && (
                      <button type="button" className="cat-show-more" onClick={() => setShowAllCategories(true)}>Show remaining categories ›</button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ZONE 4: TOP COLLECTIONS */}
          {topCollections.length > 0 && (
            <section className="profile-panel">
              <p className="profile-section-label">Top collections</p>
              <div className="profile-collection-list">
                {topCollections.map((collection, index) => {
                  const thumbUrl = normalizeImageUrl(collection.imageUrl || collection.previewImages?.[0] || "");
                  const barWidth = Math.max(Math.round((collection.count / totalNFTsForBar) * 100), 4);
                  return (
                    <div key={`${collection.name}-${index}`} className="profile-collection-row">
                      <span className="profile-collection-rank">{String(index + 1).padStart(2, "0")}</span>
                      <div className="profile-collection-thumb">
                        {thumbUrl
                          ? <img src={thumbUrl} alt={collection.name} className="profile-thumb-img" />
                          : <div className="profile-thumb-placeholder profile-thumb-placeholder--sm">{collection.name.slice(0, 1).toUpperCase()}</div>}
                      </div>
                      <div className="profile-collection-meta">
                        <span className="profile-collection-name">{collection.name}</span>
                        <div className="profile-collection-bar-wrap">
                          <div className="profile-collection-bar" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                      <span className="profile-collection-count">{collection.count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ZONE 5: COMPARE CTA */}
          <section className="profile-compare-section">
            <p className="profile-compare-title">See who stopped in the same places.</p>
            <p className="profile-compare-sub">Drop in another wallet. See where your worlds overlap.</p>
            <form onSubmit={handleCompareSubmit} className="profile-compare-form">
              <input className="profile-input" value={compareWallet} onChange={e => setCompareWallet(e.target.value)} placeholder="Second wallet address or ENS" />
              <button className="profile-btn-primary" disabled={!canCompare} type="submit">Compare</button>
            </form>
          </section>

          <WalletConverter wallet={resolvedWallet} />

        </>)}
      </div>
    </main>
  );
}
