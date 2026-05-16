"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  acquisitionDNA?: AcquisitionDNA;
};

type ProfileIdentity = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

type CategoryPreview = {
  title?: string;
  tokenId?: string;
  collectionName?: string;
  imageUrl?: string;
  animationUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
  openseaUrl?: string;
};

type CategoryGroup = {
  totalCount?: number;
  previews?: CategoryPreview[];
  collections?: Array<{ name: string; count: number }>;
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

type AcquisitionDNA = {
  totalSampled?: number;
  totalMatched?: number;
  totalUnmatched?: number;
  minted: { count: number; percent: number };
  purchased?: { count: number; percent: number };
  received: { count: number; percent: number };
  unknown: { count: number; percent: number };
  activityByQuarter?: Array<{ key?: string; year?: number; quarter?: number; count?: number }>;
  scope?: string;
};

type ActivityQuarter = {
  key: string;
  year: number;
  quarter: number;
  count: number;
};

type RhythmChartPoint = ActivityQuarter & {
  x: number;
  y: number;
};

type RhythmChartModel = {
  width: number;
  height: number;
  points: RhythmChartPoint[];
  linePath: string;
  areaPath: string;
  averageY: number;
};

type TasteSlice = { label: string; value: number; count: number; key: string };

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

function normalizeSeedSlug(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
}

function NftMedia({ animationUrl, imageUrl, alt, className }: { animationUrl?: string; imageUrl?: string; alt: string; className: string }) {
  const [videoError, setVideoError] = useState(false);
  const [imgError, setImgError] = useState(false);
  const animation = normalizeImageUrl(animationUrl);
  const image = normalizeImageUrl(imageUrl);

  if (animation && !videoError) {
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        className={className}
        onError={() => setVideoError(true)}
      >
        <source src={animation} />
      </video>
    );
  }
  if (image && !imgError) {
    return <img src={image} alt={alt} className={className} onError={() => setImgError(true)} />;
  }
  return <span aria-hidden="true">✦</span>;
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

function buildOrbitBridgeUrl(walletQuery: string, topCollections: TopCollection[]): string {
  const params = new URLSearchParams();
  params.set("wallet", walletQuery);

  const seedSlugs = Array.from(
    new Set(
      topCollections
        .map((collection) => normalizeSeedSlug(collection.collectionSlug))
        .filter(Boolean),
    ),
  ).slice(0, 5);

  if (seedSlugs.length >= 2) {
    params.set("seedSlugs", seedSlugs.join(","));
  }

  return `/orbit?${params.toString()}`;
}

function getEntryPatternRead(mintedPercent: number, purchasedPercent = 0): string {
  if (mintedPercent >= 50) return "This wallet shows a strong primary-entry pattern.";
  if (purchasedPercent >= 40) return "This wallet reads more like a later-curated collection than a mostly primary-mint wallet.";
  if (mintedPercent >= 10 && purchasedPercent >= 10) {
    return "This wallet has some early-entry signals, with a meaningful share built through later curation.";
  }
  if (mintedPercent >= 25) return "You mix early discovery with selective collecting.";
  if (mintedPercent >= 10) return "You have some early-entry signals, but most of the wallet was built after mint.";
  return "This wallet reads like a curator's eye, not an early mover.";
}

function formatQuarterLabel(row: ActivityQuarter): string {
  return `Q${row.quarter} ${row.year}`;
}

function formatAverageQuarterCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizeActivityByQuarter(
  rows?: AcquisitionDNA["activityByQuarter"],
): ActivityQuarter[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const year = Number(row?.year);
      const quarter = Number(row?.quarter);
      const count = Number(row?.count);

      if (
        !Number.isFinite(year) ||
        !Number.isFinite(quarter) ||
        quarter < 1 ||
        quarter > 4 ||
        !Number.isFinite(count) ||
        count <= 0
      ) {
        return null;
      }

      return {
        key: row?.key || `${year}-Q${quarter}`,
        year,
        quarter,
        count,
      };
    })
    .filter((row): row is ActivityQuarter => row !== null)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter - b.quarter;
    });
}

function buildCollectingRhythmChartModel(
  rows: ActivityQuarter[],
  averageCount: number,
): RhythmChartModel | null {
  if (!rows.length) return null;

  const width = 360;
  const height = 160;
  const padding = { top: 16, right: 16, bottom: 22, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxCount = rows.reduce((max, row) => Math.max(max, row.count), 0);
  if (maxCount <= 0) return null;

  const points = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (rows.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - (row.count / maxCount) * plotHeight;
    return { ...row, x, y };
  });

  const baselineY = padding.top + plotHeight;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length === 1
      ? `M ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const averageY = padding.top + plotHeight - (averageCount / maxCount) * plotHeight;

  return { width, height, points, linePath, areaPath, averageY };
}

function formatCategoryLabel(value: string): string {
  const key = normalizeDisplayCategoryKey(value);
  const labels: Record<string, string> = {
    pfp: "PFP",
    fine_art: "Art",
    art: "Art",
    generative: "Generative Art",
    meme: "Meme",
    utility: "Access",
    access: "Access",
    domains: "Domains",
    gaming: "Gaming",
    collectibles: "Collectibles",
    other: "Other",
  };
  return labels[key] || value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeDisplayCategoryKey(value: string): string {
  const key = value.toLowerCase().replace(/\s+/g, "_");
  if (key === "photography" || key === "art") return "fine_art";
  return key;
}

function mergeCategoryGroups(
  groups: Record<string, CategoryGroup>,
): Record<string, CategoryGroup> {
  return Object.entries(groups).reduce<Record<string, CategoryGroup>>(
    (merged, [category, group]) => {
      const key = normalizeDisplayCategoryKey(category);
      const existing = merged[key] || {};
      const collectionCounts = new Map<string, number>();
      [...(existing.collections || []), ...(group?.collections || [])].forEach((collection) => {
        const name = String(collection.name || "").trim();
        if (!name) return;
        collectionCounts.set(name, (collectionCounts.get(name) || 0) + (collection.count || 0));
      });
      merged[key] = {
        totalCount: (existing.totalCount || 0) + (group?.totalCount || 0),
        previews: [...(existing.previews || []), ...(group?.previews || [])],
        collections: [...collectionCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count })),
      };
      return merged;
    },
    {},
  );
}

function formatCategoryContext(pieceCount: number, collections?: Array<{ name: string; count: number }>): string {
  const pieceLabel = `${pieceCount} ${pieceCount === 1 ? "piece" : "pieces"}`;
  const collectionCount = collections?.length || 0;
  if (collectionCount === 0) return pieceLabel;
  if (collectionCount >= 5) return `${pieceLabel} with 5+ named collections`;
  return `${pieceLabel} across ${collectionCount} named ${collectionCount === 1 ? "collection" : "collections"}`;
}

function getCategoryAccent(categoryKey: string): string {
  const key = normalizeDisplayCategoryKey(categoryKey);
  const mapping: Record<string, string> = {
    meme:        "#00E676",
    pfp:         "#4A9FFF",
    generative:  "#B44FFF",
    fine_art:    "#F5A623",
    utility:     "#00BFA5",
    access:      "#00BFA5",
    domains:     "#90A4AE",
    music:       "#FF4081",
    photography: "#29B6F6",
    gaming:      "#FF5722",
    other:       "#546E7A",
  };
  return mapping[key] || "#555";
}

const CATEGORY_FILTER_ORDER = [
  "pfp",
  "fine_art",
  "generative",
  "meme",
  "utility",
  "domains",
  "gaming",
  "collectibles",
  "other",
];

function getCategoryOrder(categoryKey: string) {
  const key = normalizeDisplayCategoryKey(categoryKey);
  const index = CATEGORY_FILTER_ORDER.indexOf(key);
  return index === -1 ? CATEGORY_FILTER_ORDER.length : index;
}

function getPreviewOpenSeaLink(preview: CategoryPreview): { href: string; label: string } | null {
  const contractAddress = String(preview.contractAddress || "").trim();
  const tokenId = String(preview.tokenId || "").trim();
  const collectionSlug = String(preview.collectionSlug || "").trim();

  if (contractAddress && tokenId) {
    return {
      href: preview.openseaUrl || `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`,
      label: "View NFT ↗",
    };
  }

  if (collectionSlug) {
    return {
      href: `https://opensea.io/collection/${collectionSlug}`,
      label: "View Collection ↗",
    };
  }

  return null;
}

// ─── Taste Signature ──────────────────────────────────────────────────────────

function TasteSignature({
  slices,
  selectedKey,
}: {
  slices: TasteSlice[];
  selectedKey: string;
}) {
  let cursor = 0;
  const segments = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const start = cursor;
      const end = Math.min(100, cursor + slice.value);
      cursor = end;
      return `${getCategoryAccent(slice.key)} ${start}% ${end}%`;
    });
  if (cursor < 100) segments.push(`#1e1e1e ${cursor}% 100%`);

  const selectedSlice = slices.find((slice) => slice.key === selectedKey) || slices[0];
  const gradient = segments.length > 0 ? `conic-gradient(${segments.join(", ")})` : "#1e1e1e";

  return (
    <div className="taste-map-wrap">
      <div className="taste-map-donut" style={{ backgroundImage: gradient }}>
        <div className="taste-map-hole">
          <p className="taste-map-center-label">{selectedSlice?.label || "No Category"}</p>
          <p className="taste-map-center-value">{Math.round(selectedSlice?.value || 0)}%</p>
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
  const [showResults, setShowResults] = useState(false);
  const [compareWallet, setCompareWallet] = useState("");
  const [compareResolveError, setCompareResolveError] = useState("");
  const [resolvingCompare, setResolvingCompare] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const inFlightProfileQueryRef = useRef<string | null>(null);
  const profileRequestIdRef = useRef(0);

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
        setShowResults(false);
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
      setShowResults(false);

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
  const profileReady = !loading && !error && Boolean(profile);
  const showLoadingRead = loading || (profileReady && !showResults);

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

  const categoryDistribution = useMemo(() => {
    const merged = new Map<string, CategoryRow>();
    for (const entry of profile?.categoryDistribution || []) {
      const key = normalizeDisplayCategoryKey(entry.category);
      const existing = merged.get(key);
      merged.set(key, {
        category: key,
        count: (existing?.count || 0) + entry.count,
        percentage: (existing?.percentage || 0) + entry.percentage,
      });
    }
    return [...merged.values()].sort((a, b) => b.percentage - a.percentage);
  }, [profile?.categoryDistribution]);

  const topCollections = (profile?.topCollections || []).slice(0, 5);
  const collectionCount = profile?.totalCollections || profile?.topCollections?.length || 0;
  const orbitBridgeUrl = buildOrbitBridgeUrl(
    result?.wallets?.length ? result.wallets.join(",") : walletFromQuery,
    topCollections,
  );
  const canCompare = compareWallet.trim().length > 0 && !resolvingCompare;
  const identityArchetypeLabel =
    profile?.collectorIdentityLabel || profile?.focusLabel || "Collector";
  const identitySecondaryLine = useMemo(() => {
    const username = String(result?.profileIdentity?.username || "").trim();
    const shortWallet = shortenAddress(resolvedWallet);
    if (username && username !== headerDisplayName) return username;
    return shortWallet === headerDisplayName ? "" : shortWallet;
  }, [headerDisplayName, resolvedWallet, result?.profileIdentity?.username]);

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

  const categoryGroups = useMemo(
    () => mergeCategoryGroups(result?.categoryGroups || {}),
    [result?.categoryGroups],
  );

  const categoryExplorerItems = useMemo(() => {
    return categoryDistribution
      .map((entry) => {
        const key = normalizeDisplayCategoryKey(entry.category);
        const group =
          categoryGroups[key] ||
          null;
        const count = group?.totalCount || entry.count;
        return {
          key,
          label: formatCategoryLabel(key),
          value: entry.percentage,
          count,
          group,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => {
        const aIsOther = normalizeDisplayCategoryKey(a.key) === "other";
        const bIsOther = normalizeDisplayCategoryKey(b.key) === "other";
        if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
        if (b.value !== a.value) return b.value - a.value;
        if (b.count !== a.count) return b.count - a.count;
        return getCategoryOrder(a.key) - getCategoryOrder(b.key);
      });
  }, [categoryDistribution, categoryGroups]);

  useEffect(() => {
    if (categoryExplorerItems.length === 0) {
      if (selectedCategoryKey) setSelectedCategoryKey("");
      return;
    }

    const selectedStillExists = categoryExplorerItems.some(
      (item) => item.key === selectedCategoryKey,
    );
    if (!selectedCategoryKey || !selectedStillExists) {
      setSelectedCategoryKey(categoryExplorerItems[0].key);
    }
  }, [categoryExplorerItems, selectedCategoryKey]);

  const selectedCategoryItem =
    categoryExplorerItems.find((item) => item.key === selectedCategoryKey) ||
    categoryExplorerItems[0] ||
    null;

  const mintedStats = result?.acquisitionBreakdown;
  const mintedPercent = Number.isFinite(mintedStats?.mintPercent)
    ? Math.max(0, Math.min(100, Number(mintedStats?.mintPercent)))
    : null;
  const acquiredPercent = Number.isFinite(mintedStats?.acquiredPercent)
    ? Math.max(0, Math.min(100, Number(mintedStats?.acquiredPercent)))
    : mintedPercent !== null
      ? Math.max(0, 100 - mintedPercent)
      : null;

  const acquisitionDNA = profile?.acquisitionDNA ?? null;
  const activityByQuarter = useMemo(
    () => normalizeActivityByQuarter(acquisitionDNA?.activityByQuarter),
    [acquisitionDNA?.activityByQuarter],
  );
  const peakCount = activityByQuarter.reduce(
    (peak, row) => Math.max(peak, row.count),
    0,
  );
  const peakQuarter =
    peakCount > 0
      ? activityByQuarter.find((row) => row.count === peakCount) || null
      : null;
  const firstActivityQuarter = activityByQuarter[0] || null;
  const latestActivityQuarter = activityByQuarter[activityByQuarter.length - 1] || null;
  const averageActivityCount = activityByQuarter.length > 0
    ? activityByQuarter.reduce((sum, row) => sum + row.count, 0) / activityByQuarter.length
    : 0;
  const collectingRhythmChart = useMemo(
    () => buildCollectingRhythmChartModel(activityByQuarter, averageActivityCount),
    [activityByQuarter, averageActivityCount],
  );

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
        {showLoadingRead && (
          <section className="profile-loading-panel" aria-live="polite">
            <div className="loading-lens-copy">
              <p className="profile-eyebrow">Wallet Read</p>
              <h2>Reading the wallet…</h2>
              <p className="loading-lens-secondary">
                We’re tracing what this wallet keeps, where it returns, and which signals stand out.
              </p>
            </div>

            <div className="loading-constellation-mark" aria-hidden="true">
              <span className="loading-constellation-line loading-constellation-line--one" />
              <span className="loading-constellation-line loading-constellation-line--two" />
              <span className="loading-constellation-line loading-constellation-line--three" />
              <span className="loading-constellation-point loading-constellation-point--one" />
              <span className="loading-constellation-point loading-constellation-point--two" />
              <span className="loading-constellation-point loading-constellation-point--three" />
              <span className="loading-constellation-point loading-constellation-point--four" />
              <span className="loading-constellation-point loading-constellation-point--five" />
            </div>

            <div className="loading-signal">
              {profileReady ? (
                <div className="loading-ready-state">
                  <p>Your constellation is ready.</p>
                  <button
                    className="profile-btn-primary"
                    type="button"
                    onClick={() => setShowResults(true)}
                  >
                    See results
                  </button>
                </div>
              ) : (
                <div className="loading-progress-phrases" aria-label="Wallet read progress">
                  <span>Finding signal points</span>
                  <span>Mapping collection patterns</span>
                  <span>Preparing the read</span>
                </div>
              )}
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
        {profileReady && showResults && profile && (
          <>
            {/* ── Identity + Read ── */}
            <section className="profile-hero-composed">
              <article className="profile-panel profile-identity-block">
                {topCollectionsWithImages.slice(0, 4).some((c) => c.resolvedImageUrl) && (
                  <div className="profile-identity-atmosphere" aria-hidden="true">
                    {topCollectionsWithImages
                      .slice(0, 4)
                      .filter((c) => c.resolvedImageUrl)
                      .map((collection, i) => (
                        <img
                          key={i}
                          src={collection.resolvedImageUrl}
                          alt=""
                          className="profile-identity-atmosphere-img"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ))}
                  </div>
                )}
                <div className="profile-identity-avatar-wrap">
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
                </div>

                <div className="profile-identity-copy">
                  <p className="profile-eyebrow">Profile Identity</p>
                  <div className="profile-identity-name-row">
                    <h1 className="profile-display-name">{headerDisplayName}</h1>
                    <span className="profile-archetype-badge">{identityArchetypeLabel}</span>
                  </div>
                  {identitySecondaryLine && (
                    <p className="profile-address">{identitySecondaryLine}</p>
                  )}

                  <div className="profile-identity-stats" aria-label="Profile proof stats">
                    <div className="profile-identity-stat profile-identity-stat--holdings">
                      <p className="profile-identity-stat-value">{profile.totalNFTs || 0}</p>
                      <p className="profile-section-label">Pieces Kept</p>
                    </div>
                    <div className="profile-identity-stat profile-identity-stat--collections">
                      <p className="profile-identity-stat-value">{collectionCount}</p>
                      <p className="profile-section-label">Collections</p>
                    </div>
                  </div>

                  <div className="profile-identity-wallets">
                    <WalletBanner
                      wallets={result?.wallets || initialWalletsFromQuery}
                      onAdd={addWallet}
                      onRemove={removeWallet}
                      variant="compact"
                    />
                  </div>
                </div>
              </article>

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

              <div style={{ display: "flex", justifyContent: "flex-end", padding: "2px 4px 0" }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    });
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: linkCopied ? "#7ab87a" : "#666",
                    padding: "0",
                    letterSpacing: "0.02em",
                  }}
                >
                  {linkCopied ? "Copied" : "Copy link"}
                </button>
              </div>

            </section>

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


            {/* ── Entry Pattern ── */}
            {acquisitionDNA?.minted != null && Number.isFinite(acquisitionDNA.minted.percent) && (
              <article className="profile-panel profile-entry-pattern">
                <div className="entry-pattern-ring-col">
                  <svg viewBox="0 0 64 64" className="entry-pattern-svg" aria-hidden="true">
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#1e1e1e" strokeWidth="2.5" />
                    <circle
                      cx="32" cy="32" r="24" fill="none"
                      stroke="#9575ff"
                      strokeWidth="2.5"
                      strokeDasharray={`${((acquisitionDNA.minted.percent / 100) * (2 * Math.PI * 24)).toFixed(2)} 999`}
                      strokeLinecap="round"
                      transform="rotate(-90 32 32)"
                    />
                  </svg>
                </div>
                <div className="entry-pattern-body">
                  <p className="profile-eyebrow">Entry Pattern</p>
                  <p className="entry-pattern-main">{Math.round(acquisitionDNA.minted.percent)}% minted directly</p>
                  <p className="entry-pattern-proof">{acquisitionDNA.minted.count} Ethereum mints matched to this wallet</p>
                  {(acquisitionDNA.purchased?.count || 0) > 0 && (
                    <div className="entry-pattern-secondary" aria-label="Additional entry pattern signals">
                      <p>
                        <span>{Math.round(acquisitionDNA.purchased?.percent || 0)}% bought after mint</span>
                        <span>{acquisitionDNA.purchased?.count || 0} matched secondary buys</span>
                      </p>
                    </div>
                  )}
                  {acquisitionDNA.unknown.percent >= 30 && (
                    <p className="entry-pattern-caveat">Based on the mint and sale history we could match.</p>
                  )}
                  <p className="entry-pattern-read">{getEntryPatternRead(acquisitionDNA.minted.percent, acquisitionDNA.purchased?.percent || 0)}</p>
                </div>
              </article>
            )}

            {/* ── Collecting Rhythm ── */}
            {activityByQuarter.length > 0 && peakQuarter && peakCount > 0 && firstActivityQuarter && latestActivityQuarter && collectingRhythmChart && (
              <article className="profile-panel profile-collecting-rhythm">
                <div className="collecting-rhythm-head">
                  <p className="profile-section-label">Collecting Rhythm</p>
                  <p className="collecting-rhythm-title">
                    The busiest stretch was {formatQuarterLabel(peakQuarter)}.
                  </p>
                  <p className="profile-muted-copy">
                    A quarter-by-quarter read of matched visible collecting activity.
                  </p>
                  <p className="collecting-rhythm-note">
                    Based on matched visible OpenSea activity for NFTs currently in this wallet. Older or hidden activity may be incomplete.
                  </p>
                </div>

                <div
                  className="collecting-rhythm-chart"
                  role="img"
                  aria-label={`Collecting activity from ${formatQuarterLabel(firstActivityQuarter)} to ${formatQuarterLabel(latestActivityQuarter)}. Peak was ${formatQuarterLabel(peakQuarter)} with ${peakCount} matched ${peakCount === 1 ? "item" : "items"}. Usual pace was ${formatAverageQuarterCount(averageActivityCount)} per quarter.`}
                >
                  <svg
                    className="collecting-rhythm-svg"
                    viewBox={`0 0 ${collectingRhythmChart.width} ${collectingRhythmChart.height}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line className="collecting-rhythm-gridline" x1="16" x2="344" y1="138" y2="138" />
                    <line
                      className="collecting-rhythm-average-line"
                      x1="16"
                      x2="344"
                      y1={collectingRhythmChart.averageY}
                      y2={collectingRhythmChart.averageY}
                    />
                    <path className="collecting-rhythm-area" d={collectingRhythmChart.areaPath} />
                    <path className="collecting-rhythm-line" d={collectingRhythmChart.linePath} />
                    {collectingRhythmChart.points
                      .filter((point) => point.key === peakQuarter.key)
                      .map((point) => (
                        <g key={point.key} className="collecting-rhythm-peak-point">
                          <circle cx={point.x} cy={point.y} r="8" />
                          <circle cx={point.x} cy={point.y} r="3.6" />
                        </g>
                      ))}
                  </svg>
                  <div
                    className="collecting-rhythm-average-label"
                    style={{ "--average-y": `${(collectingRhythmChart.averageY / collectingRhythmChart.height) * 100}%` } as CSSProperties}
                  >
                    Usual pace
                  </div>
                </div>

                <div className="collecting-rhythm-footer" aria-label="Collecting rhythm summary">
                  <div className="collecting-rhythm-stat">
                    <span className="collecting-rhythm-stat-label">Started</span>
                    <span className="collecting-rhythm-stat-value">{formatQuarterLabel(firstActivityQuarter)}</span>
                  </div>
                  <div className="collecting-rhythm-stat">
                    <span className="collecting-rhythm-stat-label">Peak</span>
                    <span className="collecting-rhythm-stat-value">
                      {formatQuarterLabel(peakQuarter)} · {peakCount} matched
                    </span>
                  </div>
                  <div className="collecting-rhythm-stat">
                    <span className="collecting-rhythm-stat-label">Latest</span>
                    <span className="collecting-rhythm-stat-value">{formatQuarterLabel(latestActivityQuarter)}</span>
                  </div>
                  <div className="collecting-rhythm-stat">
                    <span className="collecting-rhythm-stat-label">Usual pace</span>
                    <span className="collecting-rhythm-stat-value">
                      {formatAverageQuarterCount(averageActivityCount)} / quarter
                    </span>
                  </div>
                </div>
              </article>
            )}


            {/* ── Taste System ── */}
            {categoryExplorerItems.length > 0 && selectedCategoryItem && (
              <section className="profile-panel profile-panel-glow profile-taste-module">
                <div className="taste-module-head">
                  <p className="profile-section-label">Taste Map</p>
                  <p className="profile-muted-copy">
                    Where this profile keeps returning, grouped by the pieces already in view.
                  </p>
                </div>

                <div className="taste-module-grid">
                  <TasteSignature
                    slices={categoryExplorerItems}
                    selectedKey={selectedCategoryItem.key}
                  />

                  <div className="taste-category-list" aria-label="Taste categories">
                    {categoryExplorerItems.map((slice) => {
                      const isSelected = slice.key === selectedCategoryItem.key;
                      const accent = getCategoryAccent(slice.key);
                      return (
                        <button
                          key={slice.key}
                          className={`taste-category-row${isSelected ? " is-selected" : ""}`}
                          type="button"
                          onClick={() => setSelectedCategoryKey(slice.key)}
                          style={{ "--category-accent": accent } as CSSProperties}
                          aria-pressed={isSelected}
                        >
                          <span className="taste-category-dot" aria-hidden="true" />
                          <span className="taste-category-name">{slice.label}</span>
                          <span className="taste-category-count">
                            {slice.count} {slice.count === 1 ? "piece" : "pieces"}
                          </span>
                          <span className="taste-category-percent">
                            {Math.round(slice.value)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <article className="taste-drilldown">
                  <div className="category-catalog-head">
                    <h3 className="category-catalog-title">{selectedCategoryItem.label}</h3>
                    <p className="category-catalog-context">
                      {formatCategoryContext(
                        selectedCategoryItem.count,
                        selectedCategoryItem.group?.collections,
                      )}
                    </p>
                  </div>

                  {(() => {
                    const previews = (selectedCategoryItem.group?.previews || []).slice(0, 3);
                    if (previews.length === 0) {
                      return (
                        <p className="category-preview-empty">
                          No preview NFTs available for this category yet.
                        </p>
                      );
                    }

                    return (
                      <div className="category-catalog-grid">
                        {previews.map((preview, idx) => {
                          const previewLink = getPreviewOpenSeaLink(preview);
                          return (
                            <article
                              key={`${preview.collectionName || "preview"}-${preview.tokenId || idx}`}
                              className="category-preview-card"
                            >
                              <div className="category-preview-media">
                                <NftMedia
                                  animationUrl={preview.animationUrl}
                                  imageUrl={preview.imageUrl}
                                  alt={preview.title || preview.collectionName || "Category preview"}
                                  className="category-preview-img"
                                />
                              </div>
                              <p className="category-preview-title">
                                {preview.title || preview.collectionName || "Untitled NFT"}
                              </p>
                              {preview.collectionName && (
                                <p className="category-preview-collection">
                                  {preview.collectionName}
                                </p>
                              )}
                              {previewLink && (
                                <a
                                  href={previewLink.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="profile-external-link"
                                >
                                  {previewLink.label}
                                </a>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    );
                  })()}
                </article>

                {mintedPercent !== null && acquiredPercent !== null && (
                  <div className="minted-module">
                    <p className="profile-section-label">How This Profile Collects</p>
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
                            <span className="profile-collection-count">{collection.count}</span>
                            {" held · "}{walletPct}% of wallet
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
              <div className="profile-orbit-bridge">
                <div>
                  <p className="profile-section-label">Find Collectors Near This Wallet</p>
                  <p className="profile-muted-copy">
                    Build an orbit from the collection signals this wallet returns to most.
                  </p>
                </div>
                <Link className="profile-btn-primary profile-orbit-bridge-link" href={orbitBridgeUrl}>
                  Build Orbit
                </Link>
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
