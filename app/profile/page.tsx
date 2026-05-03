"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
};

type CategoryRow = {
  category: string;
  percentage: number;
  count: number;
};
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
  nft?: {
    imageUrl?: string;
    title?: string;
    collectionName?: string;
    tokenId?: string;
  };
} | null;

type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  coreInsight?: string;
  tensionInsight?: string;
  whatStandsOut?: string;
  behavioralReads?: string[];
  collectorIdentityLabel?: string;
  anchorCollection?: { name: string; count: number } | null;
  topCollections?: TopCollection[];
  categoryDistribution?: CategoryRow[];
  totalNFTs?: number;
  focusLabel?: "Focused" | "Balanced" | "Explorer";
  dominantCategory?: string;
  secondaryCategory?: string;
};

type ProfileResponse = {
  wallet: string;
  profile?: WalletProfile;
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
  focusLabel?: string;
  topCollections?: TopCollection[];
  totalNFTs?: number;
  categoryDistribution?: CategoryDistributionEntry[];
  firstMint?: FirstMint;
  signalPiece?: { tokenId?: string; title?: string; collectionName?: string; imageUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string } | null;
  anchorCollection?: { name: string; count: number; imageUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string } | null;
  highestCurrentOffer?: ProfileNFTSignal;
  latestArrival?: ProfileNFTSignal;
  topArtists?: Array<{ name: string; count: number; imageUrl?: string; sourceLabel?: string; openseaUrl?: string; externalUrl?: string }>;
  openseaUsername?: string;
  avatarUrl?: string;
  openseaUrl?: string;
};
type ProfileIdentity = { displayName: string | null; username: string | null; avatarUrl: string | null; bannerUrl: string | null };
type ProfileNFTSignal = { title?: string; name?: string; tokenId?: string; collectionName?: string; collectionSlug?: string; contractAddress?: string; imageUrl?: string; openseaUrl?: string; timestamp?: string; ethAmountLabel?: string; sourceLabel?: string } | null;
type MarketAttention = { ethAmountLabel: string; collectionName: string | null } | null;

type CategoryPreview = {
  title?: string;
  collectionName?: string;
  imageUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
};

type CategoryGroup = { totalCount?: number; previews?: CategoryPreview[] };

type ProfileResponse = {
  wallet: string;
  wallets?: string[];
  walletCount?: number;
  profileIdentity?: ProfileIdentity;
  profile?: WalletProfile;
  marketAttention?: MarketAttention;
  categoryGroups?: Record<string, CategoryGroup>;
  acquisitionBreakdown?: {
    mintCount?: number;
    acquiredCount?: number;
    totalSampled?: number;
    mintPercent?: number;
    acquiredPercent?: number;
  };
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

function toTitleCase(value: string): string {
  return value
    .split("_")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
function normalizeImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

function normalizeCollectionKey(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
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

function formatCollectorSince(timestamp?: string): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
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
  const gradient = `conic-gradient(${slices
    .map((slice, index) => `${getCategoryAccent(slice.key)} 0 ${(index + 1) * 12.5}%`)
    .join(",")})`;

  return (
    <div className="taste-map-wrap">
      <div className="taste-map-donut" style={{ backgroundImage: gradient }}>
        <div className="taste-map-hole">
          <p className="taste-map-center-label">{slices[0]?.label || "No Category"}</p>
          <p className="taste-map-center-value">{Math.round(slices[0]?.value || 0)}%</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const walletFromQuery = (searchParams.get("wallet") || "").trim();
  const walletFromQuery = (searchParams.get("wallet") || "").trim();
  const initialWalletsFromQuery = walletFromQuery
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProfileResponse | null>(null);
  const [compareWallet, setCompareWallet] = useState("");

  useEffect(() => {
    async function load() {
      if (!walletFromQuery || !isValidInput(walletFromQuery)) {
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const loadingPhrases = [
    "Indexing holdings",
    "Finding origin signal",
    "Mapping collection gravity",
    "Reading taste signals",
    "Tracing mint vs acquisition patterns",
    "Preparing your collector dossier",
  ];

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
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(walletFromQuery)}`);
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(initialWalletsFromQuery.join(","))}`);
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
      return { name: profile.anchorCollection.name, count: profile.anchorCollection.count };
    }
    const fallback = (profile.topCollections || [])[0];
    if (fallback?.name && fallback?.count) {
      return { name: fallback.name, count: fallback.count };
    }
    return null;
  }, [profile]);

  const tasteRows = useMemo(
    () =>
      (profile?.categoryDistribution || [])
        .filter((row) => row && typeof row.percentage === "number")
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5),
    [profile?.categoryDistribution]
  );

  const canCompare = isValidInput(compareWallet);

  function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;
    router.push(
      `/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "#fafaf9", color: "#1c1917" }}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <p className="text-sm text-stone-500">Reading your wallet...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <p className="text-sm text-stone-600">
              Nothing found for this wallet.{" "}
              <button
                className="underline underline-offset-4 text-stone-800 hover:text-stone-950"
                onClick={() => router.push("/")}
                type="button"
              >
  const fallbackDisplayName = useMemo(() => toDisplayName(resolvedWallet), [resolvedWallet]);

  const headerDisplayName = useMemo(
    () =>
      String(result?.profileIdentity?.displayName || "").trim() ||
      String(result?.profileIdentity?.username || "").trim() ||
      profile?.openseaUsername ||
      fallbackDisplayName,
    [result?.profileIdentity?.displayName, result?.profileIdentity?.username, profile?.openseaUsername, fallbackDisplayName],
  );

  const headerAvatarUrl = useMemo(
    () => normalizeImageUrl(profile?.avatarUrl || result?.profileIdentity?.avatarUrl),
    [profile?.avatarUrl, result?.profileIdentity?.avatarUrl],
  );

  const firstMint = profile?.firstMint || null;
  const originImageUrl = normalizeImageUrl(firstMint?.imageUrl || firstMint?.nft?.imageUrl || "");
  const originTitle = firstMint?.title || firstMint?.nft?.title || firstMint?.tokenId || firstMint?.nft?.tokenId || "Artifact image unavailable";
  const originCollectionName = firstMint?.collectionName || firstMint?.nft?.collectionName || "";

  const categoryDistribution = (profile?.categoryDistribution || []).slice().sort((a, b) => b.percentage - a.percentage);
  const tasteSlices = categoryDistribution.map((entry) => ({
    label: formatCategoryLabel(entry.category),
    value: entry.percentage,
    key: entry.category,
  }));

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
          normalizeCollectionKey(preview.collectionName),
        ].filter(Boolean);

        keys.forEach((key) => {
          if (!map.has(key)) map.set(key, normalizedImageUrl);
        });
      });
    });

    return map;
  }, [result?.categoryGroups]);

  const categoryGroups = result?.categoryGroups || {};

  const categoryExplorerItems = useMemo(() => {
    return tasteSlices.slice(0, 6).map((slice) => {
      const group = categoryGroups[slice.key] || categoryGroups[slice.key.toLowerCase()] || null;
      return { key: slice.key, label: slice.label, value: slice.value, group };
    });
  }, [tasteSlices, categoryGroups]);

  useEffect(() => {
    if (!categoryExplorerItems.length) return;

    const withPreviews = categoryExplorerItems.find((item) => (item.group?.previews || []).length > 0);
    const defaultKey = withPreviews?.key || categoryExplorerItems[0]?.key || "";

    setSelectedCategory((prev) => (prev && categoryExplorerItems.some((item) => item.key === prev) ? prev : defaultKey));
  }, [categoryExplorerItems]);

  const mintedStats = result?.acquisitionBreakdown;
  const mintedPercent = Number.isFinite(mintedStats?.mintPercent)
    ? Math.max(0, Math.min(100, Number(mintedStats?.mintPercent)))
    : null;
  const acquiredPercent = Number.isFinite(mintedStats?.acquiredPercent)
    ? Math.max(0, Math.min(100, Number(mintedStats?.acquiredPercent)))
    : mintedPercent !== null
      ? Math.max(0, 100 - mintedPercent)
      : null;

  const marketStat = useMemo(() => {
    if (result?.marketAttention?.ethAmountLabel) return { value: result.marketAttention.ethAmountLabel, label: "Market Attention" };
    if (topCollections[0]?.name) return { value: topCollections[0].name, label: "Top Collection" };
    return { value: "Unavailable", label: "Market Signal" };
  }, [result?.marketAttention?.ethAmountLabel, topCollections]);
  const topCollectionsWithImages = useMemo(
    () =>
      topCollections.map((collection) => {
        const slugKey = String(collection.collectionSlug || "").toLowerCase();
        const contractKey = String(collection.contractAddress || "").toLowerCase();
        const nameKey = normalizeCollectionKey(collection.name);
        return {
          ...collection,
          resolvedImageUrl: normalizeImageUrl(
            collection.imageUrl || collectionImageMap.get(slugKey) || collectionImageMap.get(contractKey) || collectionImageMap.get(nameKey) || ""
          ),
        };
      }),
    [topCollections, collectionImageMap]
  );

  function originLabel() {
    if (!firstMint) return "Origin Signal";
    if (firstMint.timestamp) return "Earliest Known NFT";
    return "Origin Signal";
  }

  const highestOffer = profile?.highestCurrentOffer || null;
  const latestArrival = profile?.latestArrival || null;
  const highestOfferImage = normalizeImageUrl(highestOffer?.imageUrl || "");
  const latestArrivalImage = normalizeImageUrl(latestArrival?.imageUrl || "");

  function updateWalletQuery(wallets: string[]) { router.push(`/profile?wallet=${encodeURIComponent(wallets.join(","))}`); }
  function addWallet(wallet: string) { const next = Array.from(new Set([...(result?.wallets || initialWalletsFromQuery), wallet.trim()])).slice(0, 5); updateWalletQuery(next); }
  function removeWallet(wallet: string) { const next = (result?.wallets || initialWalletsFromQuery).filter((w) => w !== wallet); if (next.length === 0) return; updateWalletQuery(next); }
  function handleCompareSubmit(e: FormEvent) { e.preventDefault(); if (!canCompare) return; router.push(`/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`); }
  const selectedCategoryGroup = categoryExplorerItems.find((item) => item.key === selectedCategory)?.group || null;
  const selectedPreviews = (selectedCategoryGroup?.previews || []).slice(0, 6);

  return (
    <main className="profile-page">
      <div className="profile-shell">
        {loading && (
          <section className="profile-loading-panel">
            <div className="loading-ring" aria-hidden="true" />
            <h2>Reading your wallet</h2>
            <p>{loadingPhrases[loadingStep]}</p>
            <div className="loading-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
        )}

        {!loading && error && (
          <div className="profile-center">
            <p className="profile-error">
              Nothing found for this wallet.{" "}
              <button className="profile-error-link" onClick={() => router.push("/")} type="button">
                Try another wallet
              </button>
            </p>
          </div>
        ) : null}

        {!loading && !error && profile ? (
          <section className="space-y-12 sm:space-y-14">
            <header className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-stone-950 sm:text-3xl"
                style={{ color: "#1c1917" }}>
                {displayName}
              </h1>
              <p className="text-xs text-stone-500 sm:text-sm break-all">{resolvedWallet}</p>
            </header>

            {(profile.patternLine || profile.identityParagraph) ? (
              <section className="space-y-6 sm:space-y-7">
                {profile.patternLine ? (
                  <p className="max-w-2xl text-2xl leading-tight font-semibold tracking-tight text-stone-950 sm:text-3xl"
                    style={{ color: "#1c1917" }}>
                    {profile.patternLine}
                  </p>
                ) : null}
                {profile.identityParagraph ? (
                  <p className="max-w-2xl text-base leading-8 text-stone-700 sm:text-lg sm:leading-9">
                    {profile.identityParagraph}
                  </p>
                ) : null}
              </section>
            ) : null}

            {behavioralReads.length > 0 ? (
              <section>
                <div className="flex flex-wrap gap-2">
                  {behavioralReads.map((read, idx) => (
                    <span
                      key={`${read}-${idx}`}
                      className="rounded-full border border-stone-200 px-3 py-1 text-[11px] tracking-[0.04em] text-stone-400"
                    >
                      {read}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {returnPattern ? (
              <section className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Return Pattern</p>
                <p className="text-base text-stone-900">{returnPattern.name}</p>
                <p className="text-sm text-stone-600">
                  returned to {returnPattern.count} {returnPattern.count === 1 ? "time" : "times"}
                </p>
              </section>
            ) : null}

            {tasteRows.length > 0 ? (
              <section className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Taste map</p>
                <div className="space-y-3">
                  {tasteRows.map((row) => {
                    const pct = Math.max(0, Math.min(100, Math.round(row.percentage)));
                    return (
                      <div key={row.category} className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                          <span className="text-sm text-stone-600">{toTitleCase(row.category)}</span>
                          <span className="text-xs text-stone-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-stone-200">
                          <div
                            className="h-1.5 rounded-full bg-stone-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
        )}

        {!loading && !error && profile && (
          <>
            <section className="profile-hero-composed">
              <article className="profile-panel profile-hero-avatar-card">
                {headerAvatarUrl ? (
                  <img src={headerAvatarUrl} alt={`${headerDisplayName} wallet profile`} className="profile-hero-image" onError={handleImageError} />
                ) : (
                  <div className="profile-hero-image profile-hero-placeholder" aria-label="Wallet image fallback">
                    {headerDisplayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </article>

              <article className="profile-panel profile-hero-left">
                <p className="profile-eyebrow">Collector</p>
                <h1 className="profile-display-name">{headerDisplayName}</h1>
                <p className="profile-address">{shortenAddress(resolvedWallet)}</p>
                <p className="profile-eyebrow">Class</p>
                <p className="profile-class-label">{profile.focusLabel || "Collector"}</p>

      <section className="profile-panel"><p className="profile-section-label">Key Signals</p><div className="profile-key-signals">{firstMint && <article className="signal-card signal-card--first-mint"><div className="signal-media">{originImageUrl ? <img src={originImageUrl} alt={originTitle} className="signal-thumb" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><p className="signal-label">{originLabel()}</p><p className="signal-value">{originTitle}</p><p className="signal-support">{originCollectionName || "Creator signal unavailable"}</p>{firstMint.openseaUrl && <a href={firstMint.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View NFT ↗</a>}</article>}<article className="signal-card signal-card--market-attention"><div className="signal-media">{highestOfferImage ? <img src={highestOfferImage} alt={highestOffer?.title || "Highest current offer"} className="signal-thumb" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><p className="signal-label">{highestOffer?.ethAmountLabel ? "Highest Current Offer" : "Market Attention"}</p><p className="signal-value">{highestOffer?.title || highestOffer?.tokenId || "No active offer detected"}</p><p className="signal-support">{highestOffer?.ethAmountLabel || "No active offer detected"}</p>{highestOffer?.collectionName && <p className="signal-support">{highestOffer.collectionName}</p>}{highestOffer?.openseaUrl && <a href={highestOffer.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View NFT ↗</a>}</article><article className="signal-card signal-card--latest-arrival"><div className="signal-media">{latestArrivalImage ? <img src={latestArrivalImage} alt={latestArrival?.title || "Latest arrival"} className="signal-thumb" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}</div><p className="signal-label">{latestArrival?.sourceLabel === "Recent signal" ? "Recent Signal" : "Latest Arrival"}</p><p className="signal-value">{latestArrival?.title || latestArrival?.tokenId || "No recent arrival detected"}</p><p className="signal-support">{latestArrival?.collectionName || "Collection signal unavailable"}</p>{latestArrival?.timestamp && <p className="signal-support">{formatMintDate(latestArrival.timestamp)}</p>}{latestArrival?.openseaUrl && <a href={latestArrival.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View NFT ↗</a>}</article></div></section>

                {heroIdentity && <p className="profile-muted-copy">{heroIdentity}</p>}
              </article>

              {firstMint?.openseaUrl ? (
                <a className="profile-panel profile-first-mint-plaque profile-first-mint-plaque-link" href={firstMint.openseaUrl} target="_blank" rel="noopener noreferrer">
                  <span className="profile-first-mint-external" aria-hidden="true">
                    ↗
                  </span>
                  <div className="profile-first-mint-plaque-media">
                    {originImageUrl ? (
                      <img src={originImageUrl} alt={originTitle} className="profile-first-mint-image" onError={handleImageError} />
                    ) : (
                      <div className="profile-first-mint-empty" aria-hidden="true">
                        ✦
                      </div>
                    )}
                  </div>
                  <div className="profile-first-mint-plaque-content">
                    <p className="profile-eyebrow">First Mint</p>
                    <p className="profile-first-mint-date">{formatCollectorSince(firstMint?.timestamp)}</p>
                    {originCollectionName && <p className="profile-first-mint-meta">{originCollectionName}</p>}
                    <p className="profile-first-mint-meta">{originTitle}</p>
                  </div>
                </a>
              ) : (
                <div className="profile-panel profile-first-mint-plaque">
                  <div className="profile-first-mint-plaque-media">
                    {originImageUrl ? (
                      <img src={originImageUrl} alt={originTitle} className="profile-first-mint-image" onError={handleImageError} />
                    ) : (
                      <div className="profile-first-mint-empty" aria-hidden="true">
                        ✦
                      </div>
                    )}
                  </div>
                  <div className="profile-first-mint-plaque-content">
                    <p className="profile-eyebrow">First Mint</p>
                    <p className="profile-first-mint-date">{formatCollectorSince(firstMint?.timestamp)}</p>
                    {originCollectionName && <p className="profile-first-mint-meta">{originCollectionName}</p>}
                    <p className="profile-first-mint-meta">{originTitle}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="profile-stats-grid">
              <article className="profile-panel profile-stat-card profile-stat-card--holdings">
                <p className="profile-stat-value">{profile.totalNFTs || 0}</p>
                <p className="profile-section-label">Total Holdings</p>
              </article>
              <article className="profile-panel profile-stat-card profile-stat-card--collections">
                <p className="profile-stat-value">{collectionCount}</p>
                <p className="profile-section-label">Collections</p>
              </article>
              <article className="profile-panel profile-stat-card profile-stat-card--since">
                <p className="profile-stat-value">{formatCollectorSince(firstMint?.timestamp)}</p>
                <p className="profile-section-label">Collector Since</p>
              </article>
            </section>

            <section className="profile-pattern-grid">
              <article className="profile-panel profile-panel-glow">
                <p className="profile-section-label">Taste Map</p>
                <TasteSignature slices={tasteSlices} />
                <div className="taste-map-legend">
                  {categoryExplorerItems.map((slice) => (
                    <button
                      key={slice.key}
                      type="button"
                      className={`taste-map-legend-row taste-map-legend-row--interactive ${selectedCategory === slice.key ? "is-active" : ""}`}
                      onClick={() => setSelectedCategory(slice.key)}
                    >
                      <span>{slice.label}</span>
                      <span>{Math.round(slice.value)}%</span>
                    </button>
                  ))}
                </div>
              </article>

              <article className="profile-panel">
                <p className="profile-section-label">Taste DNA</p>
                <div className="taste-bars">
                  {tasteSlices.slice(0, 6).map((slice) => (
                    <div className="taste-bar-row" key={slice.label}>
                      <span className="taste-bar-name">{slice.label}</span>
                      <div className="taste-bar-track">
                        <div className="taste-bar-fill" style={{ width: `${slice.value}%`, backgroundColor: getCategoryAccent(slice.key) }} />
                      </div>
                      <span className="taste-bar-pct">{Math.round(slice.value)}%</span>
                    </div>
                  ))}
                </div>

                {mintedPercent !== null && acquiredPercent !== null && (
                  <div className="minted-module">
                    <p className="profile-section-label">How This Wallet Collects</p>
                    <div className="minted-split">
                      <span>Minted {Math.round(mintedPercent)}%</span>
                      <span>Acquired {Math.round(acquiredPercent)}%</span>
                    </div>
                    <div className="minted-track">
                      <div className="minted-fill" style={{ width: `${mintedPercent}%` }} />
                      <div className="acquired-fill" style={{ width: `${acquiredPercent}%` }} />
                    </div>
                  </div>
                )}

                <div className="category-explorer">
                  <p className="profile-section-label">Category Explorer</p>
                  {selectedPreviews.length > 0 ? (
                    <div className="category-preview-grid">
                      {selectedPreviews.map((preview, idx) => {
                        const previewImage = normalizeImageUrl(preview.imageUrl);
                        const previewLink = preview.collectionSlug ? `https://opensea.io/collection/${preview.collectionSlug}` : "";

                        return (
                          <article key={`${preview.collectionName || "preview"}-${idx}`} className="category-preview-card">
                            <div className="category-preview-media">
                              {previewImage ? (
                                <img
                                  src={previewImage}
                                  alt={preview.collectionName || "Category preview"}
                                  className="category-preview-img"
                                  onError={handleImageError}
                                />
                              ) : (
                                <span aria-hidden="true">✦</span>
                              )}
                            </div>
                            <p className="category-preview-title">{preview.collectionName || "Untitled collection"}</p>
                            {previewLink ? (
                              <a href={previewLink} target="_blank" rel="noopener noreferrer" className="profile-external-link">
                                View Collection ↗
                              </a>
                            ) : (
                              <p className="category-preview-empty">No marketplace link available.</p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="category-preview-empty">No preview NFTs available for this category.</p>
                  )}
                </div>
              </article>

              {profile.patternLine && <p className="profile-pattern-quote">{profile.patternLine}</p>}
            </section>

            <section className="profile-panel">
              <p className="profile-section-label">Key Signals</p>
              <div className="profile-key-signals">
                {firstMint && (
                  <article className="signal-card signal-card--first-mint">
                    <div className="signal-media">
                      {originImageUrl ? (
                        <img src={originImageUrl} alt={originTitle} className="signal-thumb" onError={handleImageError} />
                      ) : (
                        <span aria-hidden="true">✦</span>
                      )}
                    </div>
                    <p className="signal-label">{originLabel()}</p>
                    <p className="signal-value">{originTitle}</p>
                    <p className="signal-support">{originCollectionName || "Creator signal unavailable"}</p>
                    {firstMint.timestamp && <p className="signal-support">{formatMintDate(firstMint.timestamp)}</p>}
                    {firstMint.openseaUrl && (
                      <a href={firstMint.openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">
                        View NFT ↗
                      </a>
                    )}
                  </article>
                )}

              </div>
            </section>
            {profile.topArtists && profile.topArtists.length > 0 && (
              <section className="profile-panel">
                <p className="profile-section-label">Top Artists</p>
                <div className="profile-collection-list">
                  {profile.topArtists.slice(0, 3).map((artist, index) => {
                    const artistImage = normalizeImageUrl(artist.imageUrl || "");
                    const linkUrl = artist.openseaUrl || artist.externalUrl || "";
                    return (
                      <article key={`${artist.name}-${index}`} className="profile-top-collection-card">
                        <div className="profile-top-head">
                          <span className="profile-rank">{index + 1}</span>
                          <div className="profile-thumb">
                            {artistImage ? <img src={artistImage} alt={artist.name} className="profile-thumb-img" onError={handleImageError} /> : <span aria-hidden="true">✦</span>}
                          </div>
                          <div>
                            <p className="profile-collection-title">{artist.name}</p>
                            <p className="profile-muted-copy">Collected {artist.count}</p>
                            {artist.sourceLabel && <p className="profile-muted-copy">{artist.sourceLabel}</p>}
                            {linkUrl && <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">View Profile ↗</a>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {profile.whatStandsOut ? (
              <section>
                <p className="text-sm italic text-stone-500">{profile.whatStandsOut}</p>
              </section>
            ) : null}

            <section className="pt-6 sm:pt-8 space-y-4">
              <div className="space-y-1.5">
                <p className="text-base font-medium text-stone-900">See who stopped in the same places.</p>
                <p className="text-sm text-stone-600">
                  Add another wallet to see where your taste overlaps.
                </p>
              </div>
              <form className="space-y-3" onSubmit={handleCompareSubmit}>
                <input
                  type="text"
                  value={compareWallet}
                  onChange={(e) => setCompareWallet(e.target.value)}
                  placeholder="Second wallet address or ENS"
                  className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
                />
                <button
                  type="submit"
                  disabled={!canCompare}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-40"
                >
                  Compare
                </button>
              </form>
            </section>
          </section>
        ) : null}
            )}

            <section className="profile-panel">
              <p className="profile-section-label">Top Collections</p>
              <div className="profile-collection-list">
                {topCollectionsWithImages.map((collection, index) => {
                  const thumbUrl = collection.resolvedImageUrl;
                  const walletPct = profile.totalNFTs ? Math.round((collection.count / (profile.totalNFTs || 1)) * 100) : 0;
                  const openseaUrl = collection.openseaUrl || (collection.collectionSlug ? `https://opensea.io/collection/${collection.collectionSlug}` : "");

                  return (
                    <article key={`${collection.name}-${index}`} className="profile-top-collection-card">
                      <div className="profile-top-head">
                        <span className="profile-rank">{index + 1}</span>
                        <div className="profile-thumb">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt={`${collection.name} collection`} className="profile-thumb-img" onError={handleImageError} />
                          ) : (
                            <span aria-hidden="true">✦</span>
                          )}
                        </div>
                        <div>
                          <p className="profile-collection-title">{collection.name}</p>
                          <p className="profile-muted-copy">
                            Holdings {collection.count} · {walletPct}% of wallet
                          </p>
                          {openseaUrl && (
                            <a href={openseaUrl} target="_blank" rel="noopener noreferrer" className="profile-external-link">
                              View Collection ↗
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="taste-bar-track">
                        <div
                          className={`taste-bar-fill collection-rank-fill collection-rank-fill--${Math.min(index + 1, 4)}`}
                          style={{ width: `${walletPct}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <WalletBanner wallets={result?.wallets || initialWalletsFromQuery} onAdd={addWallet} onRemove={removeWallet} />

            <section className="profile-panel profile-compare-cta">
              <p className="profile-section-label">Compare & Chemistry</p>
              <h2>Find your collector counterpart.</h2>
              <p>See where your taste overlaps or clashes. Find your people. Or your nemesis.</p>
              <form onSubmit={handleCompareSubmit} className="profile-compare-form">
                <input
                  className="profile-input"
                  value={compareWallet}
                  onChange={(e) => setCompareWallet(e.target.value)}
                  placeholder="Second wallet address or ENS"
                />
                <button className="profile-btn-primary" disabled={!canCompare} type="submit">
                  Compare Wallet
                </button>
              </form>
              <Link href={`/profile?wallet=${encodeURIComponent(resolvedWallet)}`} className="profile-inline-link">
                View this profile link
              </Link>
            </section>

            <WalletConverter wallet={resolvedWallet} />
          </>
        )}
      </div>
    </main>
  );
}
