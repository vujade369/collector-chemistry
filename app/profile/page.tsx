"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import "./profile.css";
import WalletTypeaheadInput from "@/components/shared/WalletTypeaheadInput";
import WalletBanner from "@/components/profile/WalletBanner";
import WalletConverter from "@/components/profile/WalletConverter";

// ─── Types ────────────────────────────────────────────────────────────────────

type TopCollection = {
  name: string;
  count: number;
  percentage?: number;
  imageUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
  openseaUrl?: string;
};

type CategoryRow = {
  category: string;
  percentage: number;
  count: number;
};

type ProfileNFTSignal = {
  title?: string;
  name?: string;
  tokenId?: string;
  collectionName?: string;
  collectionSlug?: string;
  contractAddress?: string;
  imageUrl?: string;
  openseaUrl?: string;
  timestamp?: string;
  ethAmountLabel?: string;
  sourceLabel?: string;
} | null;

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

type MarketAttention = {
  ethAmountLabel: string;
  collectionName: string | null;
} | null;

type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  coreInsight?: string;
  tensionInsight?: string;
  whatStandsOut?: string;
  behavioralReads?: string[];
  collectorIdentityLabel?: string;
  focusLabel?: "Focused" | "Balanced" | "Explorer";
  dominantCategory?: string;
  secondaryCategory?: string;
  anchorCollection?: { name: string; count: number; imageUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string } | null;
  topCollections?: TopCollection[];
  categoryDistribution?: CategoryRow[];
  totalNFTs?: number;
  totalCollections?: number;
  firstMint?: FirstMint;
  signalPiece?: ProfileNFTSignal;
  highestCurrentOffer?: ProfileNFTSignal;
  latestArrival?: ProfileNFTSignal;
  topArtists?: Array<{ name: string; count: number; imageUrl?: string; sourceLabel?: string; openseaUrl?: string; externalUrl?: string }>;
  openseaUsername?: string;
  avatarUrl?: string;
  openseaUrl?: string;
};

type ProfileIdentity = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

type CategoryPreview = {
  title?: string;
  collectionName?: string;
  imageUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
  openseaUrl?: string;
};

type CategoryGroup = {
  totalCount?: number;
  previews?: CategoryPreview[];
};

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

type WalletResolveResponse =
  | { ok: true; address: string; message?: string }
  | { ok: false; message?: string };

// ─── Utilities ────────────────────────────────────────────────────────────────

async function resolveWalletIdentity(value: string): Promise<WalletResolveResponse> {
  const res = await fetch(`/api/wallet/resolve?q=${encodeURIComponent(value)}`);
  const json = (await res.json()) as WalletResolveResponse;
  return res.ok && json.ok ? json : { ok: false, message: json.message };
}

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

function normalizeImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

function normalizeCollectionKey(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
}

function formatMintDate(timestamp?: string): string {
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

function formatCategoryLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCategoryAccent(categoryKey: string): string {
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

// ─── Taste Signature ──────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const walletFromQuery = (searchParams.get("wallet") || "").trim();
  const initialWalletsFromQuery = walletFromQuery
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProfileResponse | null>(null);
  const [compareWallet, setCompareWallet] = useState("");
  const [compareResolveError, setCompareResolveError] = useState("");
  const [resolvingCompare, setResolvingCompare] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const inFlightProfileQueryRef = useRef<string | null>(null);
  const profileRequestIdRef = useRef(0);

  const loadingProcessLines = [
  "Finding the shape of the collection.",
  "Looking for the gravity point.",
  "Building the read.",
];

  useEffect(() => {
  if (!loading) return;

  const timer = setInterval(
    () => setLoadingStep((prev) => (prev + 1) % loadingProcessLines.length),
    1800,
  );

  return () => clearInterval(timer);
}, [loading, loadingProcessLines.length]);

  useEffect(() => {
    async function load() {
      const profileQuery = initialWalletsFromQuery.join(",");

      if (
        !walletFromQuery ||
        initialWalletsFromQuery.length === 0 ||
        !initialWalletsFromQuery.some(isValidInput)
      ) {
        profileRequestIdRef.current += 1;
        inFlightProfileQueryRef.current = null;
        setError("Nothing found for this wallet.");
        setResult(null);
        return;
      }

      if (inFlightProfileQueryRef.current === profileQuery) {
        return;
      }

      profileRequestIdRef.current += 1;
      const requestId = profileRequestIdRef.current;
      inFlightProfileQueryRef.current = profileQuery;
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const res = await fetch(
          `/api/profile?wallet=${encodeURIComponent(profileQuery)}`,
        );
        const json = (await res.json()) as ProfileResponse | { error?: string };
        const isCurrent =
          profileRequestIdRef.current === requestId &&
          inFlightProfileQueryRef.current === profileQuery;

        if (!isCurrent) return;

        if (!res.ok || !("profile" in json) || !json.profile) {
          setError("Nothing found for this wallet.");
          setResult(null);
          return;
        }

        setResult(json as ProfileResponse);
      } catch {
        if (
          profileRequestIdRef.current !== requestId ||
          inFlightProfileQueryRef.current !== profileQuery
        ) {
          return;
        }
        setError("Nothing found for this wallet.");
        setResult(null);
      } finally {
        if (
          profileRequestIdRef.current === requestId &&
          inFlightProfileQueryRef.current === profileQuery
        ) {
          inFlightProfileQueryRef.current = null;
          setLoading(false);
        }
      }
    }

    void load();
  }, [walletFromQuery]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const profile = result?.profile || null;
  const resolvedWallet = result?.wallet || walletFromQuery;

  const fallbackDisplayName = useMemo(
    () => toDisplayName(resolvedWallet),
    [resolvedWallet],
  );

  const headerDisplayName = useMemo(
    () =>
      String(result?.profileIdentity?.displayName || "").trim() ||
      String(result?.profileIdentity?.username || "").trim() ||
      profile?.openseaUsername ||
      fallbackDisplayName,
    [
      result?.profileIdentity?.displayName,
      result?.profileIdentity?.username,
      profile?.openseaUsername,
      fallbackDisplayName,
    ],
  );

  const headerAvatarUrl = useMemo(
    () => normalizeImageUrl(profile?.avatarUrl || result?.profileIdentity?.avatarUrl),
    [profile?.avatarUrl, result?.profileIdentity?.avatarUrl],
  );

  const firstMint = profile?.firstMint || null;
  const originImageUrl = normalizeImageUrl(
    firstMint?.imageUrl || firstMint?.nft?.imageUrl || "",
  );
  const originTitle =
    firstMint?.title ||
    firstMint?.nft?.title ||
    firstMint?.tokenId ||
    firstMint?.nft?.tokenId ||
    "Artifact image unavailable";
  const originCollectionName =
    firstMint?.collectionName || firstMint?.nft?.collectionName || "";

  const categoryDistribution = (profile?.categoryDistribution || [])
    .slice()
    .sort((a, b) => b.percentage - a.percentage);

  const tasteSlices = categoryDistribution.map((entry) => ({
    label: formatCategoryLabel(entry.category),
    value: entry.percentage,
    key: entry.category,
  }));

  const topCollections = (profile?.topCollections || []).slice(0, 5);
  const collectionCount = profile?.totalCollections || profile?.topCollections?.length || 0;
  const canCompare = compareWallet.trim().length > 0 && !resolvingCompare;

  const behavioralReads = useMemo(
    () => (profile?.behavioralReads || []).filter(Boolean).slice(0, 3),
    [profile?.behavioralReads],
  );

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
      const group =
        categoryGroups[slice.key] ||
        categoryGroups[slice.key.toLowerCase()] ||
        null;
      return { key: slice.key, label: slice.label, value: slice.value, group };
    });
  }, [tasteSlices, categoryGroups]);

  useEffect(() => {
    if (!categoryExplorerItems.length) return;
    const withPreviews = categoryExplorerItems.find(
      (item) => (item.group?.previews || []).length > 0,
    );
    const defaultKey = withPreviews?.key || categoryExplorerItems[0]?.key || "";
    setSelectedCategory((prev) =>
      prev && categoryExplorerItems.some((item) => item.key === prev)
        ? prev
        : defaultKey,
    );
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

  const topCollectionsWithImages = useMemo(
    () =>
      topCollections.map((collection) => {
        const slugKey = String(collection.collectionSlug || "").toLowerCase();
        const contractKey = String(collection.contractAddress || "").toLowerCase();
        const nameKey = normalizeCollectionKey(collection.name);
        return {
          ...collection,
          resolvedImageUrl: normalizeImageUrl(
            collection.imageUrl ||
              collectionImageMap.get(slugKey) ||
              collectionImageMap.get(contractKey) ||
              collectionImageMap.get(nameKey) ||
              "",
          ),
        };
      }),
    [topCollections, collectionImageMap],
  );

  const highestOffer = profile?.highestCurrentOffer || null;
  const latestArrival = profile?.latestArrival || null;
  const highestOfferImage = normalizeImageUrl(highestOffer?.imageUrl || "");
  const latestArrivalImage = normalizeImageUrl(latestArrival?.imageUrl || "");

  const selectedCategoryGroup =
    categoryExplorerItems.find((item) => item.key === selectedCategory)?.group ||
    null;
  const selectedPreviews = (selectedCategoryGroup?.previews || []).slice(0, 6);

  // ── Signal visibility guards ──────────────────────────────────────────────────
  const showFirstMintSignal = Boolean(firstMint);
  const showMarketSignal = Boolean(
    highestOffer ||
      result?.marketAttention?.ethAmountLabel ||
      result?.marketAttention?.collectionName,
  );
  const showLatestArrivalSignal = Boolean(latestArrival);
  const showKeySignals =
    showFirstMintSignal || showMarketSignal || showLatestArrivalSignal;

  const hasInterpretation = Boolean(
    profile?.patternLine ||
      profile?.identityParagraph ||
      behavioralReads.length > 0 ||
      profile?.whatStandsOut,
  );

  function originLabel(): string {
    if (!firstMint) return "Origin Signal";
    if (firstMint.timestamp) return "Origin Signal";
    return "Origin Signal";
  }

  function updateWalletQuery(wallets: string[]) {
    router.push(`/profile?wallet=${encodeURIComponent(wallets.join(","))}`);
  }

  function addWallet(wallet: string) {
    const next = Array.from(
      new Set([...(result?.wallets || initialWalletsFromQuery), wallet.trim()]),
    ).slice(0, 5);
    updateWalletQuery(next);
  }

  function removeWallet(wallet: string) {
    const next = (result?.wallets || initialWalletsFromQuery).filter(
      (w) => w !== wallet,
    );
    if (next.length === 0) return;
    updateWalletQuery(next);
  }

  async function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;

    setCompareResolveError("");
    setResolvingCompare(true);

    try {
      const [walletA, walletB] = await Promise.all([
        resolveWalletIdentity(resolvedWallet),
        resolveWalletIdentity(compareWallet.trim()),
      ]);

      if (!walletA.ok || !walletB.ok) {
        setCompareResolveError(walletB.message || walletA.message || "Couldn’t resolve that wallet.");
        return;
      }

      router.push(
        `/compare?a=${encodeURIComponent(walletA.address)}&b=${encodeURIComponent(walletB.address)}`,
      );
    } catch {
      setCompareResolveError("Couldn’t resolve that wallet.");
    } finally {
      setResolvingCompare(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="profile-page">
      <div className="profile-shell">

        {/* Loading */}
{loading && (
  <section className="profile-loading-panel">
    <div className="loading-ring" aria-hidden="true" />
    <h2>Reading your wallet</h2>
    <p className="profile-loading-process">
      {loadingProcessLines[loadingStep % loadingProcessLines.length]}
    </p>
    <div className="loading-bars" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  </section>
)}

        {/* Error */}
        {!loading && error && (
          <div className="profile-center">
            <p className="profile-error">
              Nothing found for this wallet.{" "}
              <button
                className="profile-error-link"
                onClick={() => router.push("/")}
                type="button"
              >
                Try another wallet
              </button>
            </p>
          </div>
        )}

        {/* Profile */}
        {!loading && !error && profile && (
          <>
            {/* ── Hero ── */}
            <section className="profile-hero-composed">
              <article className="profile-panel profile-hero-avatar-card">
                {headerAvatarUrl ? (
                  <img
                    src={headerAvatarUrl}
                    alt={`${headerDisplayName} wallet profile`}
                    className="profile-hero-image"
                    onError={handleImageError}
                  />
                ) : (
                  <div
                    className="profile-hero-image profile-hero-placeholder"
                    aria-label="Wallet image fallback"
                  >
                    {headerDisplayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </article>

              <article className="profile-panel profile-hero-left">
                <p className="profile-eyebrow">Your Constellation</p>
                <h1 className="profile-display-name">{headerDisplayName}</h1>
                <p className="profile-address">{shortenAddress(resolvedWallet)}</p>
                <p className="profile-eyebrow" style={{ marginTop: 8 }}>
                  Pattern
                </p>
                <p className="profile-class-label">{profile.focusLabel || "Collector"}</p>
                {profile.collectorIdentityLabel && (
                  <p className="profile-collector-identity-line">
                    {profile.collectorIdentityLabel}
                  </p>
                )}
                <WalletBanner
                  wallets={result?.wallets || initialWalletsFromQuery}
                  onAdd={addWallet}
                  onRemove={removeWallet}
                  variant="compact"
                />
              </article>

              {firstMint?.openseaUrl ? (
                <a
                  className="profile-panel profile-first-mint-plaque profile-first-mint-plaque-link"
                  href={firstMint.openseaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="profile-first-mint-external" aria-hidden="true">
                    ↗
                  </span>
                  <div className="profile-first-mint-plaque-media">
                    {originImageUrl ? (
                      <img
                        src={originImageUrl}
                        alt={originTitle}
                        className="profile-first-mint-image"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="profile-first-mint-empty" aria-hidden="true">
                        ✦
                      </div>
                    )}
                  </div>
                  <div className="profile-first-mint-plaque-content">
                    <p className="profile-eyebrow">Origin Point</p>
                    <p className="profile-first-mint-date">
                      {formatCollectorSince(firstMint?.timestamp)}
                    </p>
                    {originCollectionName && (
                      <p className="profile-first-mint-meta">{originCollectionName}</p>
                    )}
                    <p className="profile-first-mint-meta">{originTitle}</p>
                  </div>
                </a>
              ) : (
                <div className="profile-panel profile-first-mint-plaque">
                  <div className="profile-first-mint-plaque-media">
                    {originImageUrl ? (
                      <img
                        src={originImageUrl}
                        alt={originTitle}
                        className="profile-first-mint-image"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="profile-first-mint-empty" aria-hidden="true">
                        ✦
                      </div>
                    )}
                  </div>
                  <div className="profile-first-mint-plaque-content">
                    <p className="profile-eyebrow">Origin Point</p>
                    <p className="profile-first-mint-date">
                      {formatCollectorSince(firstMint?.timestamp)}
                    </p>
                    {originCollectionName && (
                      <p className="profile-first-mint-meta">{originCollectionName}</p>
                    )}
                    <p className="profile-first-mint-meta">{originTitle}</p>
                  </div>
                </div>
              )}
            </section>

            {/* ── Stats ── */}
            <section className="profile-stats-grid">
              <article className="profile-panel profile-stat-card profile-stat-card--holdings">
                <p className="profile-stat-value">{profile.totalNFTs || 0}</p>
                <p className="profile-section-label">Pieces Kept</p>
              </article>
              <article className="profile-panel profile-stat-card profile-stat-card--collections">
                <p className="profile-stat-value">{collectionCount}</p>
                <p className="profile-section-label">Collections</p>
              </article>
              <article className="profile-panel profile-stat-card profile-stat-card--since">
                <p className="profile-stat-value">
                  {formatCollectorSince(firstMint?.timestamp)}
                </p>
                <p className="profile-section-label">Collector Since</p>
              </article>
            </section>

            {/* ── The Read ── */}
            {hasInterpretation && (
              <section className="profile-panel profile-interpretation-panel">
                <p className="profile-section-label">The Read</p>
                {profile.patternLine && (
                  <p className="profile-pattern-quote">{profile.patternLine}</p>
                )}
                {profile.identityParagraph && (
                  <p className="profile-interpretation-copy">
                    {profile.identityParagraph}
                  </p>
                )}
                {behavioralReads.length > 0 && (
                  <div className="profile-tag-row">
                    {behavioralReads.map((read, idx) => (
                      <span key={`${read}-${idx}`} className="profile-tag">
                        {read}
                      </span>
                    ))}
                  </div>
                )}
                {profile.whatStandsOut && (
                  <p className="profile-interpretation-standout">
                    {profile.whatStandsOut}
                  </p>
                )}
              </section>
            )}

            {/* ── Signal Points ── */}
            {showKeySignals && (
              <section className="profile-panel">
                <p className="profile-section-label">Signal Points</p>
                <div className="profile-key-signals">
                  {showFirstMintSignal && (
                    <article className="signal-card signal-card--first-mint">
                      <div className="signal-media">
                        {originImageUrl ? (
                          <img
                            src={originImageUrl}
                            alt={originTitle}
                            className="signal-thumb"
                            onError={handleImageError}
                          />
                        ) : (
                          <span aria-hidden="true">✦</span>
                        )}
                      </div>
                      <p className="signal-label">{originLabel()}</p>
                      <p className="signal-value">{originTitle}</p>
                      <p className="signal-support">
                        {originCollectionName || "Creator signal unavailable"}
                      </p>
                      {firstMint?.timestamp && (
                        <p className="signal-support">
                          {formatMintDate(firstMint.timestamp)}
                        </p>
                      )}
                      {firstMint?.openseaUrl && (
                        <a
                          href={firstMint.openseaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-external-link"
                        >
                          View NFT ↗
                        </a>
                      )}
                    </article>
                  )}

                  {showMarketSignal && (
                    <article className="signal-card signal-card--market-attention">
                      <div className="signal-media">
                        {highestOfferImage ? (
                          <img
                            src={highestOfferImage}
                            alt={highestOffer?.title || "Market attention"}
                            className="signal-thumb"
                            onError={handleImageError}
                          />
                        ) : (
                          <span aria-hidden="true">✦</span>
                        )}
                      </div>
                      <p className="signal-label">
                        {highestOffer?.ethAmountLabel
                          ? "Current Attention"
                          : "Market Attention"}
                      </p>
                      {highestOffer && (
                        <p className="signal-value">
                          {highestOffer.title || highestOffer.tokenId || "Untitled NFT"}
                        </p>
                      )}
                      {highestOffer?.ethAmountLabel && (
                        <p className="signal-support">{highestOffer.ethAmountLabel}</p>
                      )}
                      {!highestOffer?.ethAmountLabel &&
                        result?.marketAttention?.ethAmountLabel && (
                          <p className="signal-support">
                            {result.marketAttention.ethAmountLabel}
                          </p>
                        )}
                      {(highestOffer?.collectionName ||
                        result?.marketAttention?.collectionName) && (
                        <p className="signal-support">
                          {highestOffer?.collectionName ||
                            result?.marketAttention?.collectionName}
                        </p>
                      )}
                      {highestOffer?.openseaUrl && (
                        <a
                          href={highestOffer.openseaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-external-link"
                        >
                          View NFT ↗
                        </a>
                      )}
                    </article>
                  )}

                  {showLatestArrivalSignal && (
                    <article className="signal-card signal-card--latest-arrival">
                      <div className="signal-media">
                        {latestArrivalImage ? (
                          <img
                            src={latestArrivalImage}
                            alt={latestArrival?.title || "Latest arrival"}
                            className="signal-thumb"
                            onError={handleImageError}
                          />
                        ) : (
                          <span aria-hidden="true">✦</span>
                        )}
                      </div>
                      <p className="signal-label">
                        {latestArrival?.sourceLabel === "Recent signal"
                          ? "Recent Signal"
                          : "Latest Arrival"}
                      </p>
                      <p className="signal-value">
                        {latestArrival?.title ||
                          latestArrival?.tokenId ||
                          "Untitled NFT"}
                      </p>
                      {latestArrival?.collectionName && (
                        <p className="signal-support">{latestArrival.collectionName}</p>
                      )}
                      {latestArrival?.timestamp && (
                        <p className="signal-support">
                          Entered the wallet {formatMintDate(latestArrival.timestamp)}
                        </p>
                      )}
                      {latestArrival?.openseaUrl && (
                        <a
                          href={latestArrival.openseaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-external-link"
                        >
                          View NFT ↗
                        </a>
                      )}
                    </article>
                  )}
                </div>
              </section>
            )}



            {/* ── Taste System ── */}
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
                <p className="profile-section-label">Taste Pattern</p>
                <div className="taste-bars">
                  {tasteSlices.slice(0, 6).map((slice) => (
                    <div className="taste-bar-row" key={slice.label}>
                      <span className="taste-bar-name">{slice.label}</span>
                      <div className="taste-bar-track">
                        <div
                          className="taste-bar-fill"
                          style={{
                            width: `${slice.value}%`,
                            backgroundColor: getCategoryAccent(slice.key),
                          }}
                        />
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
                      <div
                        className="acquired-fill"
                        style={{ width: `${acquiredPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </article>
            </section>

            {/* ── Category Explorer (full width) ── */}
            {categoryExplorerItems.length > 0 && (
              <section className="profile-panel">
                <p className="profile-section-label">Explore the Worlds</p>
                <div className="category-tab-row">
                  {categoryExplorerItems.map((slice) => (
                    <button
                      key={slice.key}
                      type="button"
                      className={`category-tab-btn${selectedCategory === slice.key ? " is-active" : ""}`}
                      onClick={() => setSelectedCategory(slice.key)}
                    >
                      {slice.label}
                    </button>
                  ))}
                </div>
                  {selectedPreviews.length > 0 ? (
                  <div className="category-preview-grid">
                    {selectedPreviews.map((preview, idx) => {
                      const previewImage = normalizeImageUrl(preview.imageUrl);
                      const previewLink =
                        preview.openseaUrl ||
                        (preview.collectionSlug
                          ? `https://opensea.io/collection/${preview.collectionSlug}`
                          : preview.contractAddress
                            ? `https://opensea.io/assets/ethereum/${preview.contractAddress}`
                            : "");
                      return (
                        <article
                          key={`${preview.collectionName || "preview"}-${idx}`}
                          className="category-preview-card"
                        >
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
                          <p className="category-preview-title">
                            {preview.collectionName || "Untitled collection"}
                          </p>
                          {previewLink && (
                            <a
                              href={previewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="profile-external-link"
                            >
                              View Collection ↗
                            </a>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="category-preview-empty">
                    No preview NFTs available for this category.
                  </p>
                )}
              </section>
            )}

            {/* ── Top Collections ── */}
            <section className="profile-panel">
              <p className="profile-section-label">Where This Wallet Returns</p>
              <div className="profile-collection-list">
                {topCollectionsWithImages.map((collection, index) => {
                  const thumbUrl = collection.resolvedImageUrl;
                  const walletPct = profile.totalNFTs
                    ? Math.round((collection.count / (profile.totalNFTs || 1)) * 100)
                    : 0;
                  const openseaUrl =
                    collection.openseaUrl ||
                    (collection.collectionSlug
                      ? `https://opensea.io/collection/${collection.collectionSlug}`
                      : "");
                  return (
                    <article
                      key={`${collection.name}-${index}`}
                      className="profile-top-collection-card"
                    >
                      <div className="profile-top-head">
                        <span className="profile-rank">{index + 1}</span>
                        <div className="profile-thumb">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={`${collection.name} collection`}
                              className="profile-thumb-img"
                              onError={handleImageError}
                            />
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
                            <a
                              href={openseaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="profile-external-link"
                            >
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

            {/* ── Top Artists ── */}
            {profile.topArtists && profile.topArtists.length > 0 && (
              <section className="profile-panel">
                <p className="profile-section-label">Top Artists</p>
                <div className="profile-collection-list">
                  {profile.topArtists.slice(0, 3).map((artist, index) => {
                    const artistImage = normalizeImageUrl(artist.imageUrl || "");
                    const linkUrl = artist.openseaUrl || artist.externalUrl || "";
                    return (
                      <article
                        key={`${artist.name}-${index}`}
                        className="profile-top-collection-card"
                      >
                        <div className="profile-top-head">
                          <span className="profile-rank">{index + 1}</span>
                          <div className="profile-thumb">
                            {artistImage ? (
                              <img
                                src={artistImage}
                                alt={artist.name}
                                className="profile-thumb-img"
                                onError={handleImageError}
                              />
                            ) : (
                              <span aria-hidden="true">✦</span>
                            )}
                          </div>
                          <div>
                            <p className="profile-collection-title">{artist.name}</p>
                            <p className="profile-muted-copy">
                              Collected {artist.count}
                            </p>
                            {artist.sourceLabel && (
                              <p className="profile-muted-copy">{artist.sourceLabel}</p>
                            )}
                            {linkUrl && (
                              <a
                                href={linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="profile-external-link"
                              >
                                View Profile ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Compare CTA ── */}
            <section className="profile-panel profile-compare-cta">
              <p className="profile-section-label">Find Overlap</p>
              <h2>See where your patterns overlap.</h2>
              <p>
                Compare with another wallet to find shared worlds and unexpected
                points of recognition.
              </p>
              <form onSubmit={handleCompareSubmit} className="profile-compare-form">
                <WalletTypeaheadInput
                  className="profile-input"
                  value={compareWallet}
                  onValueChange={(nextValue) => {
                    setCompareWallet(nextValue);
                    if (compareResolveError) setCompareResolveError("");
                  }}
                  placeholder="Second wallet address or ENS"
                />
                <button
                  className="profile-btn-primary"
                  disabled={!canCompare}
                  type="submit"
                >
                  Compare Wallet
                </button>
              </form>
              {compareResolveError && <p className="profile-error">{compareResolveError}</p>}
              <Link
                href={`/profile?wallet=${encodeURIComponent(resolvedWallet)}`}
                className="profile-inline-link"
              >
                View this profile link
              </Link>
            </section>

            {/* ── Wallet Converter ── */}
            <WalletConverter
              wallet={resolvedWallet}
              wallets={result?.wallets || initialWalletsFromQuery}
            />
          </>
        )}
      </div>
    </main>
  );
}
