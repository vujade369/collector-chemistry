"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./profile.css";
import WalletBanner from "@/components/profile/WalletBanner";
import WalletConverter from "@/components/profile/WalletConverter";

type CategoryDistributionEntry = { category: string; percentage: number; count: number };
type TopCollection = {
  name: string;
  count: number;
  percentage?: number;
  imageUrl?: string;
  previewImages?: string[];
  source?: "collection" | "artist";
};
type FirstMint = { tokenId?: string; collectionName?: string; imageUrl?: string; timestamp?: string } | null;
type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  focusLabel?: string;
  topCollections?: TopCollection[];
  totalNFTs?: number;
  categoryDistribution?: CategoryDistributionEntry[];
  firstMint?: FirstMint;
  anchorCollection?: { name: string; count: number; imageUrl?: string } | null;
};
type ProfileIdentity = { displayName: string | null; username: string | null; avatarUrl: string | null; bannerUrl: string | null };
type MarketAttention = { ethAmountLabel: string; collectionName: string | null } | null;
type ProfileResponse = { wallet: string; wallets?: string[]; walletCount?: number; profileIdentity?: ProfileIdentity; profile?: WalletProfile; marketAttention?: MarketAttention };

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
function formatMintDate(timestamp?: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatCategoryLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateToTwoSentences(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "";
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  return parts.slice(0, 2).join(" ").trim();
}

function getCategoryAccent(categoryLabel: string) {
  const key = categoryLabel.toLowerCase().replace(/\s+/g, "_");
  const mapping: Record<string, string> = {
    meme: "#ff3399",
    pfp: "#29b6f6",
    generative: "#9575ff",
    fine_art: "#ff8c42",
    utility: "#39d353",
    music: "#00e5cc",
    photography: "#ffcc00",
    gaming: "#a78bfa",
    other: "#444",
  };
  return mapping[key] || "#555";
}

function TasteSignature({ slices }: { slices: TasteSlice[] }) {
  const cumulative = slices.reduce((sum, item) => sum + item.value, 0);
  const gradient = `conic-gradient(${slices.map((slice, index) => `rgba(255, 51, 153, ${[1, 0.74, 0.56, 0.4][Math.min(index, 3)] || 0.28}) 0 ${slice.value}%`).join(",")})`;
  return (
    <div className="taste-map-wrap">
      <div className="taste-map-donut" style={{ backgroundImage: gradient }}>
        <div className="taste-map-hole">
          <p className="taste-map-center-label">{slices[0]?.label || "No category"}</p>
          <p className="taste-map-center-value">{Math.round(slices[0]?.value || 0)}%</p>
        </div>
      </div>
      <div className="taste-map-legend">
        {slices.slice(0, 6).map((slice) => (
          <div key={slice.label} className="taste-map-legend-row">
            <span>{slice.label}</span>
            <span>{Math.round(slice.value)}%</span>
          </div>
        ))}
      </div>
      {cumulative === 0 && <p className="profile-muted-copy">No category data available yet.</p>}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletFromQuery = (searchParams.get("wallet") || "").trim();
  const initialWalletsFromQuery = walletFromQuery.split(",").map((v) => v.trim()).filter(Boolean);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProfileResponse | null>(null);
  const [compareWallet, setCompareWallet] = useState("");

  useEffect(() => {
    async function load() {
      if (!walletFromQuery || initialWalletsFromQuery.length === 0 || !initialWalletsFromQuery.some(isValidInput)) {
        setError("Nothing found for this wallet.");
        setResult(null);
        return;
      }
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(initialWalletsFromQuery.join(","))}`);
        const json = (await res.json()) as ProfileResponse | { error?: string };
        if (!res.ok || !("profile" in json) || !json.profile) {
          setError("Nothing found for this wallet.");
          return;
        }
        setResult(json as ProfileResponse);
      } catch {
        setError("Nothing found for this wallet.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [walletFromQuery]);

  const profile = result?.profile || null;
  const resolvedWallet = result?.wallet || walletFromQuery;
  const fallbackDisplayName = useMemo(() => toDisplayName(resolvedWallet), [resolvedWallet]);
  const headerDisplayName = useMemo(() => String(result?.profileIdentity?.displayName || "").trim() || String(result?.profileIdentity?.username || "").trim() || fallbackDisplayName, [result?.profileIdentity?.displayName, result?.profileIdentity?.username, fallbackDisplayName]);
  const headerAvatarUrl = useMemo(() => normalizeImageUrl(result?.profileIdentity?.avatarUrl), [result?.profileIdentity?.avatarUrl]);
  const firstMint = profile?.firstMint || null;
  const firstMintImage = normalizeImageUrl(firstMint?.imageUrl);
  const categoryDistribution = (profile?.categoryDistribution || []).slice().sort((a, b) => b.percentage - a.percentage);
  const tasteSlices = categoryDistribution.map((entry) => ({ label: formatCategoryLabel(entry.category), value: entry.percentage }));
  const topCategory = categoryDistribution[0] || null;
  const topCollections = (profile?.topCollections || []).slice(0, 5);
  const canCompare = isValidInput(compareWallet);
  const collectionCount = profile?.topCollections?.length || 0;
  const heroIdentity = truncateToTwoSentences(profile?.identityParagraph);

  function updateWalletQuery(wallets: string[]) {
    router.push(`/profile?wallet=${encodeURIComponent(wallets.join(","))}`);
  }
  function addWallet(wallet: string) {
    const next = Array.from(new Set([...(result?.wallets || initialWalletsFromQuery), wallet.trim()])).slice(0, 5);
    updateWalletQuery(next);
  }
  function removeWallet(wallet: string) {
    const next = (result?.wallets || initialWalletsFromQuery).filter((w) => w !== wallet);
    if (next.length === 0) return;
    updateWalletQuery(next);
  }
  function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;
    router.push(`/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`);
  }

  return <main className="profile-page"><div className="profile-shell">{loading && <div className="profile-center"><p className="profile-eyebrow">Reading your wallet...</p></div>}{!loading && error && <div className="profile-center"><p className="profile-error">Nothing found for this wallet. <button className="profile-error-link" onClick={() => router.push("/")} type="button">Try another wallet</button></p></div>}{!loading && !error && profile && <>
    <section className="profile-panel profile-hero-grid">
      <article className="profile-panel profile-hero-left">
        <p className="profile-eyebrow">Collector</p><h1 className="profile-display-name">{headerDisplayName}</h1><p className="profile-address">{shortenAddress(resolvedWallet)}</p>
        <p className="profile-class-label">{profile.focusLabel || "Collector"}</p>
        {profile.patternLine && <p className="profile-quote-title">Pattern line</p>}
        {profile.patternLine && <p className="profile-pattern-copy">{profile.patternLine}</p>}
        {heroIdentity && <p className="profile-muted-copy">{heroIdentity}</p>}
      </article>
      <article className="profile-panel profile-hero-center">
        {headerAvatarUrl ? <img src={headerAvatarUrl} alt={headerDisplayName} className="profile-hero-image" /> : <div className="profile-hero-image profile-hero-placeholder">{headerDisplayName.slice(0, 1).toUpperCase()}</div>}
      </article>
      <article className="profile-panel profile-hero-right">
        <p className="profile-eyebrow">First Minted NFT</p>
        <div className="profile-first-mint-frame">{firstMintImage ? <img src={firstMintImage} alt={firstMint?.tokenId || "First mint"} className="profile-hero-image profile-first-mint-image" /> : <div className="profile-hero-image profile-first-mint-empty">✦</div>}</div>
        <p className="profile-collection-title">{firstMint?.tokenId || "First mint unavailable"}</p>
        {firstMint?.collectionName && <p className="profile-muted-copy">{firstMint.collectionName}</p>}
        {firstMint?.timestamp && <p className="profile-muted-copy">{formatMintDate(firstMint.timestamp)}</p>}
        <p className="profile-muted-copy">Where it started.</p>
      </article>
    </section>
    <section className="profile-stats-grid">
      <article className="profile-panel profile-stat-card profile-stat-card--holdings"><p className="profile-stat-value">{profile.totalNFTs || 0}</p><p className="profile-section-label">Total Holdings</p></article>
      <article className="profile-panel profile-stat-card profile-stat-card--collections"><p className="profile-stat-value">{collectionCount}</p><p className="profile-section-label">Collections</p></article>
      <article className="profile-panel profile-stat-card profile-stat-card--category"><p className="profile-stat-value">{topCategory ? `${formatCategoryLabel(topCategory.category)} ${topCategory.percentage}%` : "Unavailable"}</p><p className="profile-section-label">Top Category</p></article>
      <article className="profile-panel profile-stat-card profile-stat-card--market"><p className="profile-stat-value">{result?.marketAttention?.ethAmountLabel || profile.anchorCollection?.name || "Unavailable"}</p><p className="profile-section-label">Market Attention</p></article>
    </section>

    <section className="profile-pattern-grid">
      <article className="profile-panel profile-panel-glow"><p className="profile-section-label">Taste Map</p><TasteSignature slices={tasteSlices} /></article>
      <article className="profile-panel"><p className="profile-section-label">Taste DNA</p><div className="taste-bars">{tasteSlices.slice(0, 6).map((slice) => <div className="taste-bar-row" key={slice.label}><span className="taste-bar-name">{slice.label}</span><div className="taste-bar-track"><div className="taste-bar-fill" style={{ width: `${slice.value}%`, backgroundColor: getCategoryAccent(slice.label) }} /></div><span className="taste-bar-pct">{Math.round(slice.value)}%</span></div>)}</div></article>
      {profile.patternLine && <p className="profile-pattern-quote">{profile.patternLine}</p>}
    </section>

    <section className="profile-panel"><p className="profile-section-label">Key Signals</p><div className="profile-key-signals">{firstMint?.collectionName && <article className="signal-card signal-card--first-mint"><p className="signal-label">First Mint</p><p className="signal-value">{firstMint.tokenId || firstMint.collectionName}</p><p className="signal-support">{firstMint.collectionName}</p></article>} {topCollections[0] && <article className="signal-card signal-card--signal-piece"><p className="signal-label">Signal Piece</p><p className="signal-value">{topCollections[0].name}</p><p className="signal-support">Your wallet keeps returning here.</p></article>} {profile.anchorCollection?.name && profile.anchorCollection.name !== topCollections[0]?.name && <article className="signal-card signal-card--anchor"><p className="signal-label">Anchor Collection</p><p className="signal-value">{profile.anchorCollection.name}</p></article>}</div></section>

    <section className="profile-panel"><p className="profile-section-label">Collected Works</p><div className="profile-collected-works"><span>Total Holdings {profile.totalNFTs || 0}</span><span>Collections {collectionCount}</span><span>Anchor Items {topCollections[0]?.count || 0}</span><span>Market Attention {result?.marketAttention?.ethAmountLabel || "Unavailable"}</span></div></section>

    <section className="profile-panel"><p className="profile-section-label">Top Collections</p><div className="profile-collection-list">{topCollections.map((collection, index) => { const thumbUrl = normalizeImageUrl(collection.imageUrl || collection.previewImages?.[0] || ""); const walletPct = profile.totalNFTs ? ((collection.count / profile.totalNFTs) * 100).toFixed(1) : "0.0"; return <article key={`${collection.name}-${index}`} className="profile-top-collection-card"><div className="profile-top-head"><span className="profile-rank">{index + 1}</span><div className="profile-thumb">{thumbUrl ? <img src={thumbUrl} alt={collection.name} className="profile-thumb-img" /> : <span>{collection.name.slice(0, 1).toUpperCase()}</span>}</div><div><p className="profile-collection-title">{collection.name}</p><p className="profile-muted-copy">{tasteSlices[index]?.label || "Category unavailable"}</p></div></div><p className="profile-muted-copy">Holdings {collection.count} • {walletPct}% of wallet</p><div className="taste-bar-track"><div className={`taste-bar-fill collection-rank-fill collection-rank-fill--${Math.min(index + 1, 4)}`} style={{ width: `${walletPct}%` }} /></div></article>; })}</div></section>

    <WalletBanner wallets={result?.wallets || initialWalletsFromQuery} onAdd={addWallet} onRemove={removeWallet} />
    <section className="profile-panel profile-compare-cta"><p className="profile-section-label">Compare & Chemistry</p><h2>Find your collector counterpart.</h2><p>See where your taste overlaps or clashes. Find your people. Or your nemesis.</p><form onSubmit={handleCompareSubmit} className="profile-compare-form"><input className="profile-input" value={compareWallet} onChange={(e) => setCompareWallet(e.target.value)} placeholder="Second wallet address or ENS" /><button className="profile-btn-primary" disabled={!canCompare} type="submit">Compare Wallet</button></form></section>
    <WalletConverter wallet={resolvedWallet} />
  </>}</div></main>;
}
