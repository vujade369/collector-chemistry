"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import "./profile.css";
import WalletBanner from "@/components/profile/WalletBanner";
import WalletConverter from "@/components/profile/WalletConverter";

type CategoryDistributionEntry = { category: string; percentage: number; count: number };
type TopCollection = {
  name: string;
  count: number;
  percentage?: number;
  category?: string;
  imageUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
  openseaUrl?: string;
};
type FirstMint = {
  tokenId?: string;
  title?: string;
  collectionName?: string;
  imageUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
  openseaUrl?: string;
  timestamp?: string;
  nft?: { imageUrl?: string; title?: string; collectionName?: string; tokenId?: string };
} | null;
type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  focusLabel?: string;
  topCollections?: TopCollection[];
  totalNFTs?: number;
  categoryDistribution?: CategoryDistributionEntry[];
  firstMint?: FirstMint;
  signalPiece?: { tokenId?: string; title?: string; collectionName?: string; imageUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string } | null;
  anchorCollection?: { name: string; count: number; imageUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string } | null;
  openseaUsername?: string;
  avatarUrl?: string;
  openseaUrl?: string;
};
type ProfileIdentity = { displayName: string | null; username: string | null; avatarUrl: string | null; bannerUrl: string | null };
type MarketAttention = { ethAmountLabel: string; collectionName: string | null } | null;
type CategoryPreview = { collectionName?: string; imageUrl?: string; collectionSlug?: string; contractAddress?: string };
type CategoryGroup = { totalCount?: number; previews?: CategoryPreview[] };
type ProfileResponse = {
  wallet: string;
  wallets?: string[];
  walletCount?: number;
  profileIdentity?: ProfileIdentity;
  profile?: WalletProfile;
  marketAttention?: MarketAttention;
  categoryGroups?: Record<string, CategoryGroup>;
  acquisitionBreakdown?: { mintCount?: number; acquiredCount?: number; totalSampled?: number; mintPercent?: number; acquiredPercent?: number };
};

type TasteSlice = { label: string; value: number; key: string };

function isValidInput(value: string): boolean {
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) || trimmed.endsWith(".eth");
}
function shortenAddress(value: string): string {
  if (!value || value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
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
function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget;
  target.style.display = "none";
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
function getCategoryAccent(categoryKey: string) {
  const key = categoryKey.toLowerCase().replace(/\s+/g, "_");
  const mapping: Record<string, string> = { meme: "#ff3399", pfp: "#29b6f6", generative: "#9575ff", fine_art: "#ff8c42", utility: "#39d353", music: "#00e5cc", photography: "#ffcc00", gaming: "#a78bfa", other: "#444" };
  return mapping[key] || "#555";
}

function TasteSignature({ slices }: { slices: TasteSlice[] }) {
  const gradient = `conic-gradient(${slices.map((slice, index) => `${getCategoryAccent(slice.key)} 0 ${(index + 1) * 12.5}%`).join(",")})`;
  return <div className="taste-map-wrap"><div className="taste-map-donut" style={{ backgroundImage: gradient }}><div className="taste-map-hole"><p className="taste-map-center-label">{slices[0]?.label || "No Category"}</p><p className="taste-map-center-value">{Math.round(slices[0]?.value || 0)}%</p></div></div></div>;
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
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingPhrases = ["Indexing holdings", "Finding origin signal", "Mapping collection gravity", "Reading taste signals", "Tracing mint vs acquisition patterns", "Preparing your collector dossier"];

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setLoadingStep((prev) => (prev + 1) % loadingPhrases.length), 1200);
    return () => clearInterval(timer);
  }, [loading, loadingPhrases.length]);

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
  const headerAvatarUrl = useMemo(() => normalizeImageUrl(profile?.avatarUrl || result?.profileIdentity?.avatarUrl), [profile?.avatarUrl, result?.profileIdentity?.avatarUrl]);
  const firstMint = profile?.firstMint || null;
  const originImageUrl = normalizeImageUrl(firstMint?.imageUrl || firstMint?.nft?.imageUrl || "");
  const originTitle = firstMint?.title || firstMint?.nft?.title || firstMint?.tokenId || firstMint?.nft?.tokenId || "Artifact image unavailable";
  const originCollectionName = firstMint?.collectionName || firstMint?.nft?.collectionName || "";
  const categoryDistribution = (profile?.categoryDistribution || []).slice().sort((a, b) => b.percentage - a.percentage);
  const tasteSlices = categoryDistribution.map((entry) => ({ label: formatCategoryLabel(entry.category), value: entry.percentage, key: entry.category }));
  const topCategory = categoryDistribution[0] || null;
  const topCollections = (profile?.topCollections || []).slice(0, 5);
  const canCompare = isValidInput(compareWallet);
  const collectionCount = profile?.topCollections?.length || 0;
  const heroIdentity = truncateToTwoSentences(profile?.identityParagraph);

  const collectionImageMap = useMemo(() => {
    const map = new Map<string, string>();
    const groups = result?.categoryGroups || {};
    Object.values(groups).forEach((group) => {
      (group?.previews || []).forEach((preview) => {
        const normalizedImageUrl = normalizeImageUrl(preview.imageUrl);
        if (!normalizedImageUrl) return;

        const keys = [
          String(preview.collectionSlug || "").toLowerCase(),
          String(preview.contractAddress || "").toLowerCase(),
          String(preview.collectionName || "").toLowerCase(),
        ].filter(Boolean);

        keys.forEach((key) => {
          if (!map.has(key)) map.set(key, normalizedImageUrl);
        });
      });
    });
    return map;
  }, [result?.categoryGroups]);

  const topCollectionsWithImages = useMemo(() => {
    return topCollections.map((collection) => {
      const mapImage =
        collectionImageMap.get(String(collection.slug || "").toLowerCase()) ||
        collectionImageMap.get(String(collection.name || "").toLowerCase()) ||
        "";

      const resolvedImageUrl = normalizeImageUrl(collection.imageUrl || mapImage || collection.previewImages?.[0] || "");

      return {
        ...collection,
        resolvedImageUrl,
      };
    });
  }, [topCollections, collectionImageMap]);

  const mintedStats = result?.acquisitionBreakdown;
  const mintedPercent = Number.isFinite(mintedStats?.mintPercent) ? Math.max(0, Math.min(100, Number(mintedStats?.mintPercent))) : null;
  const acquiredPercent = Number.isFinite(mintedStats?.acquiredPercent) ? Math.max(0, Math.min(100, Number(mintedStats?.acquiredPercent))) : mintedPercent !== null ? Math.max(0, 100 - mintedPercent) : null;
  const marketStat = useMemo(() => {
    if (result?.marketAttention?.ethAmountLabel) return { value: result.marketAttention.ethAmountLabel, label: "Market Attention" };
    if (profile?.anchorCollection?.name) return { value: profile.anchorCollection.name, label: "Anchor Collection" };
    if (topCollections[0]?.name) return { value: topCollections[0].name, label: "Top Collection" };
    return { value: "Unavailable", label: "Market Signal" };
  }, [result?.marketAttention?.ethAmountLabel, profile?.anchorCollection?.name, topCollections]);

  function originLabel() {
    if (!firstMint) return "Origin Signal";
    if (firstMint.timestamp) return "Earliest Known NFT";
    return "Origin Signal";
  }

  function updateWalletQuery(wallets: string[]) { router.push(`/profile?wallet=${encodeURIComponent(wallets.join(","))}`); }
  function addWallet(wallet: string) { const next = Array.from(new Set([...(result?.wallets || initialWalletsFromQuery), wallet.trim()])).slice(0, 5); updateWalletQuery(next); }
  function removeWallet(wallet: string) { const next = (result?.wallets || initialWalletsFromQuery).filter((w) => w !== wallet); if (next.length === 0) return; updateWalletQuery(next); }
  function handleCompareSubmit(e: FormEvent) { e.preventDefault(); if (!canCompare) return; router.push(`/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`); }

  return <main className="profile-page"><div className="profile-shell">
    {loading && <section className="profile-loading-panel"><div className="loading-ring" aria-hidden="true" /><h2>Reading your wallet</h2><p>{loadingPhrases[loadingStep]}</p><div className="loading-bars" aria-hidden="true"><span /><span /><span /></div></section>}
    {!loading && error && <div className="profile-center"><p className="profile-error">Nothing found for this wallet. <button className="profile-error-link" onClick={() => router.push("/")} type="button">Try another wallet</button></p></div>}
    {!loading && !error && profile && <>
      <section className="profile-hero-composed">
        <article className="profile-panel profile-hero-left"><p className="profile-eyebrow">Collector</p><h1 className="profile-display-name">{headerDisplayName}</h1><p className="profile-address">{shortenAddress(resolvedWallet)}</p><p className="profile-eyebrow">Class</p><p className="profile-class-label">{profile.focusLabel || "Collector"}</p>{profile.patternLine && <><p className="profile-eyebrow">Statement</p><p className="profile-pattern-copy">{profile.patternLine}</p></>}{heroIdentity && <p className="profile-muted-copy">{heroIdentity}</p>}</article>
        <article className="profile-panel profile-hero-center">{headerAvatarUrl ? <img src={headerAvatarUrl} alt={`${headerDisplayName} wallet profile`} className="profile-hero-image" onError={handleImageError} /> : <div className="profile-hero-image profile-hero-placeholder" aria-label="Wallet image fallback">{headerDisplayName.slice(0, 1).toUpperCase()}</div>}</article>
        <article className="profile-panel profile-hero-right"><p className="profile-eyebrow">{firstMint ? originLabel() : "Origin signal not found"}</p><div className="profile-first-mint-frame">{originImageUrl ? <img src={originImageUrl} alt={originTitle} className="profile-hero-image profile-first-mint-image" onError={handleImageError} /> : <div className="profile-hero-image profile-first-mint-empty" aria-hidden="true">✦</div>}</div><p className="profile-collection-title">{originTitle}</p>{originCollectionName && <p className="profile-muted-copy">{originCollectionName}</p>}{firstMint?.timestamp && <p className="profile-muted-copy">{formatMintDate(firstMint.timestamp)}</p>}<p className="profile-muted-copy">Where it started.</p></article>
      </section>

      <section className="profile-stats-grid">
        <article className="profile-panel profile-stat-card profile-stat-card--holdings"><p className="profile-stat-value">{profile.totalNFTs || 0}</p><p className="profile-section-label">Total Holdings</p></article>
        <article className="profile-panel profile-stat-card profile-stat-card--collections"><p className="profile-stat-value">{collectionCount}</p><p className="profile-section-label">Collections</p></article>
        <article className="profile-panel profile-stat-card profile-stat-card--category"><p className="profile-stat-value">{topCategory ? `${topCategory.percentage}%` : "0%"}</p><p className="profile-section-label">{topCategory ? formatCategoryLabel(topCategory.category) : "Top Category"}</p></article>
        <article className="profile-panel profile-stat-card profile-stat-card--market"><p className="profile-stat-value">{marketStat.value}</p><p className="profile-section-label">{marketStat.label}</p></article>
      </section>

      <section className="profile-pattern-grid">
        <article className="profile-panel profile-panel-glow"><p className="profile-section-label">Taste Map</p><TasteSignature slices={tasteSlices} /><div className="taste-map-legend">{tasteSlices.slice(0, 6).map((slice) => <div key={slice.label} className="taste-map-legend-row"><span>{slice.label}</span><span>{Math.round(slice.value)}%</span></div>)}</div></article>
        <article className="profile-panel"><p className="profile-section-label">Taste DNA</p><div className="taste-bars">{tasteSlices.slice(0, 6).map((slice) => <div className="taste-bar-row" key={slice.label}><span className="taste-bar-name">{slice.label}</span><div className="taste-bar-track"><div className="taste-bar-fill" style={{ width: `${slice.value}%`, backgroundColor: getCategoryAccent(slice.key) }} /></div><span className="taste-bar-pct">{Math.round(slice.value)}%</span></div>)}</div>{mintedPercent !== null && acquiredPercent !== null && <div className="minted-module"><p className="profile-section-label">How This Wallet Collects</p><div className="minted-split"><span>Minted {Math.round(mintedPercent)}%</span><span>Acquired {Math.round(acquiredPercent)}%</span></div><div className="minted-track"><div className="minted-fill" style={{ width: `${mintedPercent}%` }} /><div className="acquired-fill" style={{ width: `${acquiredPercent}%` }} /></div></div>}</article>
        {profile.patternLine && <p className="profile-pattern-quote">{profile.patternLine}</p>}
      </section>

      <section className="profile-panel"><p className="profile-section-label">Key Signals</p><div className="profile-key-signals">{firstMint && <article className="signal-card signal-card--first-mint"><div className="signal-media">{originImageUrl ? <img src={originImageUrl} alt={originTitle} className="signal-thumb" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><p className="signal-label">{originLabel()}</p><p className="signal-value">{originTitle}</p><p className="signal-support">{originCollectionName || "Creator signal unavailable"}</p>{firstMint.openseaUrl && <a href={firstMint.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View NFT ↗</a>}</article>}{profile.signalPiece && <article className="signal-card signal-card--signal-piece"><div className="signal-media">{profile.signalPiece.imageUrl ? <img src={normalizeImageUrl(profile.signalPiece.imageUrl)} alt={profile.signalPiece.title || "Signal piece"} className="signal-thumb" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><p className="signal-label">Signal Piece</p><p className="signal-value">{profile.signalPiece.title || profile.signalPiece.tokenId || profile.signalPiece.collectionName}</p><p className="signal-support">Your wallet keeps returning here.</p>{profile.signalPiece.openseaUrl && <a href={profile.signalPiece.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View NFT ↗</a>}</article>}{profile.anchorCollection?.name && <article className="signal-card signal-card--anchor"><div className="signal-media">{profile.anchorCollection.imageUrl ? <img src={normalizeImageUrl(profile.anchorCollection.imageUrl)} alt={profile.anchorCollection.name} className="signal-thumb" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><p className="signal-label">Anchor Collection</p><p className="signal-value">{profile.anchorCollection.name}</p><p className="signal-support">Collection behavior anchor.</p>{profile.anchorCollection.openseaUrl && <a href={profile.anchorCollection.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View Collection ↗</a>}</article>}</div></section>

      <section className="profile-panel profile-collected-works"><p className="profile-section-label">Collected Works</p><div className="profile-collected-grid"><span>Total Holdings {profile.totalNFTs || 0}</span><span>Collections {collectionCount}</span><span>Anchor Items {topCollections[0]?.count || 0}</span><span>Market Attention {result?.marketAttention?.ethAmountLabel || "No active attention detected"}</span></div></section>

      <section className="profile-panel"><p className="profile-section-label">Top Collections</p><div className="profile-collection-list">{topCollections.map((collection, index) => {
        const mapImage = collectionImageMap.get(collection.name.toLowerCase()) || "";
        const thumbUrl = normalizeImageUrl(collection.imageUrl || mapImage || "");
        const walletPct = profile.totalNFTs ? Math.round((collection.count / (profile.totalNFTs || 1)) * 100) : 0;
        const openseaUrl = collection.openseaUrl || (collection.collectionSlug ? `https://opensea.io/collection/${collection.collectionSlug}` : "");
        return <article key={`${collection.name}-${index}`} className="profile-top-collection-card"><div className="profile-top-head"><span className="profile-rank">{index + 1}</span><div className="profile-thumb">{thumbUrl ? <img src={thumbUrl} alt={`${collection.name} collection`} className="profile-thumb-img" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><div><p className="profile-collection-title">{collection.name}</p><p className="profile-muted-copy">Holdings {collection.count} · {walletPct}% of wallet</p>{openseaUrl && <a href={openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View Collection ↗</a>}</div></div><div className="taste-bar-track"><div className={`taste-bar-fill collection-rank-fill collection-rank-fill--${Math.min(index + 1, 4)}`} style={{ width: `${walletPct}%` }} /></div></article>;
      })}</div></section>

      <WalletBanner wallets={result?.wallets || initialWalletsFromQuery} onAdd={addWallet} onRemove={removeWallet} />
      <section className="profile-panel profile-compare-cta"><p className="profile-section-label">Compare & Chemistry</p><h2>Find your collector counterpart.</h2><p>See where your taste overlaps or clashes. Find your people. Or your nemesis.</p><form onSubmit={handleCompareSubmit} className="profile-compare-form"><input className="profile-input" value={compareWallet} onChange={(e) => setCompareWallet(e.target.value)} placeholder="Second wallet address or ENS" /><button className="profile-btn-primary" disabled={!canCompare} type="submit">Compare Wallet</button></form><Link href={`/profile?wallet=${encodeURIComponent(resolvedWallet)}`} className="profile-inline-link">View this profile link</Link></section>
      <WalletConverter wallet={resolvedWallet} />
    </>}
  </div></main>;
}
