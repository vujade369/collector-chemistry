// app/api/compare/route.ts
import { NextResponse } from "next/server";
import { fetchWalletNFTs } from "@/lib/fetchWalletNFTs";
import { buildWalletProfile as buildCoreWalletProfile, type WalletProfileNFT } from "@/lib/walletProfile";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

type NFTAttribute = {
  trait_type?: string;
  value?: string | number;
};

type NFT = {
  contract: {
    address: string;
    name?: string;
  };
  tokenId: string;
  title?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      image?: string;
      image_url?: string;
      name?: string;
      description?: string;
      attributes?: NFTAttribute[];
    };
  };
  contractMetadata?: {
    name?: string;
  };
  metadata?: {
    attributes?: NFTAttribute[];
  };
  spamInfo?: {
    isSpam?: string;
  };

  displayTitle?: string;
  displayCollectionName?: string;
  displayCollectionSlug?: string;
  displayArtist?: string;
  displayImage?: string;
  acquiredDateA?: string | null;
  acquiredDateB?: string | null;
};

type SharedBucket = {
  walletA: NFT[];
  walletB: NFT[];
  walletACount: number;
  walletBCount: number;
  enteredDateA?: string | null;
  enteredDateB?: string | null;
};

type TasteMap = Record<string, number>;

type MarketStat = {
  label: string;
  value: string;
  sublabel?: string;
};

type WalletMastery = {
  highestBounty: MarketStat;
  questStarted: MarketStat;
};

type CollectorProfile = {
  archetype: string;
  level: number;
  primaryLean: string;
  secondaryLean: string;
  profileLine: string;
  collectorIdentityLabel: string;
  dominantCategory: string;
  secondaryCategory: string;
  categoryDistribution: Array<{
    category: string;
    percentage: number;
    count: number;
  }>;
  otherPercentage: number;
  categoryConfidence: "High" | "Medium" | "Low";
  categorySourceBreakdown: {
    opensea: number;
    metadata: number;
    keyword: number;
    other: number;
  };
  topCollection: {
    source: "collection" | "artist";
    name: string;
    ownedCount: number;
    previewImages: string[];
  } | null;
};

type WalletSummary = {
  totalNFTs: number;
  taste: TasteMap;
  profile: CollectorProfile;
};

type OpenSeaTrait = {
  trait_type?: string;
  display_type?: string;
  value?: string | number;
};

type OpenSeaAssetResponse = {
  nft?: {
    identifier?: string;
    name?: string;
    description?: string;
    image_url?: string;
    display_image_url?: string;
    image_original_url?: string;
    image_preview_url?: string;
    collection?: string | { name?: string; slug?: string };
    collection_slug?: string;
    traits?: OpenSeaTrait[];
  };
  identifier?: string;
  name?: string;
  description?: string;
  image_url?: string;
  display_image_url?: string;
  image_original_url?: string;
  image_preview_url?: string;
  collection?: string | { name?: string; slug?: string };
  collection_slug?: string;
  traits?: OpenSeaTrait[];
};

type ResolvedDisplayMetadata = {
  title?: string;
  collectionName?: string;
  collectionSlug?: string;
  artist?: string;
  imageUrl?: string;
  description?: string;
};

type OpenSeaAccountNFT = {
  identifier?: string | number;
  token_id?: string | number;
  collection?: string | {
    name?: string;
    slug?: string;
    floor_price?: number;
  };
  collection_slug?: string;
  name?: string;
  contract?: string;
  contract_address?: string;
  image_url?: string;
  display_image_url?: string;
  opensea_url?: string;
  floor_price?: number;
};

type OpenSeaAccountNFTResponse = {
  nfts?: OpenSeaAccountNFT[];
  next?: string | null;
};

type OpenSeaBestOfferResponse = {
  price?: {
    current?: {
      currency?: string;
      value?: string;
      decimal?: number;
    };
  };
  order_hash?: string;
  protocol_address?: string;
};

type OpenSeaCollectionEvent = {
  event_timestamp?: string;
  sent_at?: string;
  to_address?: string;
  winner_account?: { address?: string };
  nft?: {
    identifier?: string | number;
    collection?: string;
    contract?: string;
  };
};

type OpenSeaCollectionEventsResponse = {
  asset_events?: OpenSeaCollectionEvent[];
  events?: OpenSeaCollectionEvent[];
  next?: string | null;
};

type OpenSeaNftEvent = {
  event_timestamp?: string;
  from_address?: string;
  to_address?: string;
  winner_account?: { address?: string };
};

type OpenSeaNftEventsResponse = {
  asset_events?: OpenSeaNftEvent[];
  events?: OpenSeaNftEvent[];
  next?: string | null;
};

const PREVIEW_LIMIT = 4;
const EXACT_LIMIT = 8;

const OPENSEA_TIMEOUT_MS = 1800;
const OPENSEA_MAX_ACCOUNT_ITEMS = 60;
const OPENSEA_MAX_BOUNTY_LOOKUPS = 15;
const OPENSEA_MAX_EVENT_PAGES = 6;
const OPENSEA_EVENT_PAGE_LIMIT = 50;

function truncateString(value: string, max = 180) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchOpenSeaJson<T>(
  path: string,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  if (!OPENSEA_API_KEY) return fallback;

  return withTimeout(
    (async () => {
      const res = await fetch(`${OPENSEA_BASE_URL}${path}`, {
        cache: "no-store",
        ...init,
        headers: {
          accept: "application/json",
          "x-api-key": OPENSEA_API_KEY,
          ...(init?.headers || {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.log("OPENSEA_OPTIONAL_FETCH_FAILED", {
          path,
          status: res.status,
          body: truncateString(text),
        });
        return fallback;
      }

      return (await res.json()) as T;
    })(),
    OPENSEA_TIMEOUT_MS,
    fallback
  );
}

function normalizeAddress(value?: string) {
  return String(value || "").toLowerCase();
}

function formatDateShort(timestamp?: string | null) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sanitizeDateLabel(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() < 2010) return null;

  return trimmed;
}

function getDaysSince(timestamp?: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function formatEthValue(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "No Bids";
  }
  if (value <= 0) return "No Bids";
  if (value >= 1000) return `${Math.round(value)} ETH`;
  if (value >= 10) return `${value.toFixed(1)} ETH`;
  return `${value.toFixed(3).replace(/\.?0+$/, "")} ETH`;
}

function parsePotentialNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferEthFromBestOffer(data: OpenSeaBestOfferResponse) {
  const current = data?.price?.current;
  if (!current) return null;
  const rawValue = parsePotentialNumber(current.value);
  if (rawValue === null) return null;
  const decimals = typeof current.decimal === "number" ? current.decimal : 18;
  return rawValue / Math.pow(10, decimals);
}

function getCollectionSlugFromAccountItem(item: OpenSeaAccountNFT) {
  if (typeof item.collection === "object" && item.collection?.slug) {
    return item.collection.slug;
  }
  if (item.collection_slug) return item.collection_slug;
  return "";
}

function getCollectionNameFromAccountItem(item: OpenSeaAccountNFT) {
  if (typeof item.collection === "object" && item.collection?.name) {
    return item.collection.name;
  }
  if (typeof item.collection === "string") return item.collection;
  return "";
}

function getFloorPriceFromAccountItem(item: OpenSeaAccountNFT) {
  if (typeof item.collection === "object") {
    const fromCollection = parsePotentialNumber(item.collection.floor_price);
    if (fromCollection !== null) return fromCollection;
  }
  return parsePotentialNumber(item.floor_price) ?? null;
}

async function fetchOpenSeaAccountInventory(address: string): Promise<OpenSeaAccountNFT[]> {
  if (!OPENSEA_API_KEY) return [];

  const items: OpenSeaAccountNFT[] = [];
  let next = "";
  let safety = 0;

  while (items.length < OPENSEA_MAX_ACCOUNT_ITEMS && safety < OPENSEA_MAX_EVENT_PAGES) {
    const params = new URLSearchParams({ limit: "50" });
    if (next) params.set("next", next);

    const data = await fetchOpenSeaJson<OpenSeaAccountNFTResponse>(
      `/chain/ethereum/account/${address}/nfts?${params.toString()}`,
      { nfts: [], next: null }
    );

    const pageItems = data?.nfts || [];
    items.push(...pageItems);

    next = String(data?.next || "");
    safety += 1;
    if (!next || !pageItems.length) break;
  }

  return items.slice(0, OPENSEA_MAX_ACCOUNT_ITEMS);
}

async function fetchBestOfferForItem(
  collectionSlug: string,
  identifier: string
): Promise<number | null> {
  if (!collectionSlug || !identifier) return null;

  const data = await fetchOpenSeaJson<OpenSeaBestOfferResponse>(
    `/offers/collection/${collectionSlug}/nfts/${identifier}/best`,
    {}
  );

  return inferEthFromBestOffer(data);
}

async function computeHighestBounty(address: string): Promise<MarketStat> {
  if (!OPENSEA_API_KEY) {
    return {
      label: "Highest bounty",
      value: "No Bids",
      sublabel: "OpenSea market data unavailable",
    };
  }

  const inventory = await fetchOpenSeaAccountInventory(address);
  const candidates = inventory
    .map((item) => ({
      identifier: String(item.identifier ?? item.token_id ?? ""),
      collectionSlug: getCollectionSlugFromAccountItem(item),
      collectionName: getCollectionNameFromAccountItem(item),
      floorPrice: getFloorPriceFromAccountItem(item),
      name: item.name || "",
    }))
    .filter((item) => item.identifier && item.collectionSlug)
    .sort((a, b) => (b.floorPrice ?? -1) - (a.floorPrice ?? -1))
    .slice(0, OPENSEA_MAX_BOUNTY_LOOKUPS);

  if (!candidates.length) {
    return {
      label: "Highest bounty",
      value: "No Bids",
      sublabel: "No eligible items for offer scan",
    };
  }

  const offers = await Promise.all(
    candidates.map(async (item) => {
      const amount = await fetchBestOfferForItem(item.collectionSlug, item.identifier);
      return { ...item, amount };
    })
  );

  offers.sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1));
  const top = offers.find((item) => (item.amount ?? 0) > 0);

  if (!top) {
    return {
      label: "Highest bounty",
      value: "No Bids",
      sublabel: "No active offers across top 15 items",
    };
  }

  return {
    label: "Highest bounty",
    value: formatEthValue(top.amount),
    sublabel: top.name || top.collectionName || top.collectionSlug,
  };
}

async function fetchCollectionInboundTimestamp(
  collectionSlug: string,
  walletAddress: string
): Promise<string | null> {
  if (!collectionSlug || !OPENSEA_API_KEY) return null;

  const target = normalizeAddress(walletAddress);
  let next = "";
  let oldest: string | null = null;

  for (let page = 0; page < OPENSEA_MAX_EVENT_PAGES; page += 1) {
    const params = new URLSearchParams({
      limit: String(OPENSEA_EVENT_PAGE_LIMIT),
      event_type: "sale",
    });
    params.append("event_type", "transfer");
    if (next) params.set("next", next);

    const data = await fetchOpenSeaJson<OpenSeaCollectionEventsResponse>(
      `/events/collection/${collectionSlug}?${params.toString()}`,
      { events: [], asset_events: [], next: null }
    );

    const events = data.events || data.asset_events || [];
    for (const event of events) {
      const toAddress = normalizeAddress(
        event.to_address || event.winner_account?.address
      );
      if (toAddress === target) {
        const timestamp = event.event_timestamp || event.sent_at || null;
        if (timestamp && (!oldest || new Date(timestamp) < new Date(oldest))) {
          oldest = timestamp;
        }
      }
    }

    next = String(data.next || "");
    if (!next || !events.length) break;
  }

  return oldest;
}

async function computeQuestStarted(
  walletAddress: string,
  sharedCollectionCandidates: Array<{ name: string; slug: string; floorPrice?: number | null }>
): Promise<MarketStat> {
  if (!sharedCollectionCandidates.length) {
    return {
      label: "Quest started",
      value: "—",
      sublabel: "No shared collection realm found",
    };
  }

  const uniqueCandidates = sharedCollectionCandidates
    .filter((item) => item.slug)
    .sort((a, b) => (b.floorPrice ?? -1) - (a.floorPrice ?? -1))
    .slice(0, 5);

  if (!uniqueCandidates.length) {
    return {
      label: "Quest started",
      value: "—",
      sublabel: "Shared collections missing OpenSea slugs",
    };
  }

  const timestamps = await Promise.all(
    uniqueCandidates.map(async (item) => ({
      ...item,
      timestamp: await fetchCollectionInboundTimestamp(item.slug, walletAddress),
    }))
  );

  const grounded = timestamps
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime());

  const picked = grounded[0] || timestamps[0];
  if (!picked?.timestamp) {
    return {
      label: "Quest started",
      value: picked?.name || "—",
      sublabel: "Shared realm found, date still loading",
    };
  }

  return {
    label: "Quest started",
    value: `${picked.name} · ${formatDateShort(picked.timestamp)}`,
    sublabel: `${getDaysSince(picked.timestamp) ?? 0}d in realm`,
  };
}

async function buildWalletMastery(
  walletAddress: string,
  sharedCollectionCandidates: Array<{ name: string; slug: string; floorPrice?: number | null }>
): Promise<WalletMastery> {
  const [highestBounty, questStarted] = await Promise.all([
    computeHighestBounty(walletAddress),
    computeQuestStarted(walletAddress, sharedCollectionCandidates),
  ]);

  return { highestBounty, questStarted };
}

type ProfileCategoryDistribution = CollectorProfile["categoryDistribution"];
type ProfileTopCollection = { name?: string; collectionName?: string };

function getChemistryLabel(score: number) {
  if (score >= 80) return "Strong Signal";
  if (score >= 60) return "Kindred";
  if (score >= 40) return "Interesting Tension";
  return "Distant But Related";
}

function getOrientationIdentity(
  categoryDistribution: ProfileCategoryDistribution,
  topCollections: ProfileTopCollection[]
) {
  const ranked = categoryDistribution
    .filter((entry) => entry.category !== "other" && entry.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);
  const primary = ranked[0];
  const activeLanes = ranked.filter((entry) => entry.percentage >= 12).length;
  const collectionAnchor = topCollections[0]?.name || topCollections[0]?.collectionName || "";

  if (!primary || primary.percentage < 20) {
    if (collectionAnchor) {
      return `a curiosity-led collector who follows a personal thread through groups like ${collectionAnchor}`;
    }
    return "a curiosity-led collector who follows instinct more than a single lane";
  }

  if (primary.percentage >= 55) {
    if (collectionAnchor) {
      return `a signature-driven collector who keeps returning to a core obsession, including ${collectionAnchor}`;
    }
    return "a signature-driven collector who keeps returning to one core obsession";
  }

  if (activeLanes >= 3) {
    if (collectionAnchor) {
      return `an exploratory collector who moves between scenes while staying coherent, with anchors like ${collectionAnchor}`;
    }
    return "an exploratory collector who moves between scenes while staying coherent";
  }

  if (collectionAnchor) {
    return `a selective collector with a steady center and a few clear anchors, including ${collectionAnchor}`;
  }

  return "a selective collector with a steady center and a few clear anchors";
}

function getRelationshipDynamic(
  categoryDistributionA: ProfileCategoryDistribution,
  categoryDistributionB: ProfileCategoryDistribution
) {
  const topA = categoryDistributionA
    .filter((entry) => entry.category !== "other")
    .sort((a, b) => b.percentage - a.percentage)[0];
  const topB = categoryDistributionB
    .filter((entry) => entry.category !== "other")
    .sort((a, b) => b.percentage - a.percentage)[0];

  if (!topA || !topB) return "Parallel Intuition";

  const samePrimary = topA.category === topB.category;
  const percentGap = Math.abs((topA.percentage || 0) - (topB.percentage || 0));

  if (samePrimary && percentGap <= 15) return "Shared Frequency";
  if (samePrimary) return "Same Compass, Different Intensity";

  const categoryGap = Math.abs((topA.percentage || 0) - (topB.percentage || 0));
  if (categoryGap <= 10) return "Different Doors, Same House";

  return "Productive Contrast";
}

function buildPairInterpretation(params: {
  categoryDistributionA: ProfileCategoryDistribution;
  categoryDistributionB: ProfileCategoryDistribution;
  topCollectionsA: ProfileTopCollection[];
  topCollectionsB: ProfileTopCollection[];
  sharedCollectionCount: number;
  sharedArtistCount: number;
  sharedExactCount: number;
  chemistryScore: number;
}) {
  const {
    categoryDistributionA,
    categoryDistributionB,
    topCollectionsA,
    topCollectionsB,
    sharedCollectionCount,
    sharedArtistCount,
    sharedExactCount,
    chemistryScore,
  } = params;

  const chemistryLabel = getChemistryLabel(chemistryScore);
  const relationshipDynamic = getRelationshipDynamic(
    categoryDistributionA,
    categoryDistributionB
  );
  const orientationA = getOrientationIdentity(categoryDistributionA, topCollectionsA);
  const orientationB = getOrientationIdentity(categoryDistributionB, topCollectionsB);

  const connectiveSignals = sharedCollectionCount + sharedArtistCount + sharedExactCount;
  const gapLine =
    connectiveSignals === 0
      ? "At first glance they can look far apart, because their paths rarely meet in the exact same places."
      : connectiveSignals <= 3
      ? "At first glance there is some distance between them, and that distance is real."
      : "At first glance they do not mirror each other one-to-one, and that difference matters.";

  const sharedInstinctLine =
    relationshipDynamic === "Shared Frequency" ||
    relationshipDynamic === "Same Compass, Different Intensity"
      ? "What links them is a similar instinct for what feels culturally alive, even when the depth of commitment differs."
      : relationshipDynamic === "Different Doors, Same House"
      ? "What links them is not identical taste, but a shared instinct for work that carries a clear point of view."
      : relationshipDynamic === "Productive Contrast"
      ? "What links them is a compatible tension, where each collector sharpens what the other is already searching for."
      : "What links them is a parallel instinct for signal over noise, even without obvious overlap.";

  return {
    headline: `${relationshipDynamic} (${chemistryLabel})`,
    summary: `${orientationA}. ${orientationB}. ${gapLine} ${sharedInstinctLine}`,
  };
}

async function fetchNftAcquiredDate(
  nft: NFT,
  walletAddress: string
): Promise<string | null> {
  if (!OPENSEA_API_KEY) return null;

  const contract = nft.contract.address;
  const identifier = String(nft.tokenId);
  const target = normalizeAddress(walletAddress);
  let next = "";

  for (let page = 0; page < OPENSEA_MAX_EVENT_PAGES; page += 1) {
    const params = new URLSearchParams({
      limit: String(OPENSEA_EVENT_PAGE_LIMIT),
      event_type: "sale",
    });
    params.append("event_type", "transfer");
    if (next) params.set("next", next);

    const data = await fetchOpenSeaJson<OpenSeaNftEventsResponse>(
      `/events/chain/ethereum/contract/${contract}/nfts/${identifier}?${params.toString()}`,
      { events: [], asset_events: [], next: null }
    );

    const events = data.events || data.asset_events || [];
    for (const event of events) {
      const toAddress = normalizeAddress(
        event.to_address || event.winner_account?.address
      );
      if (toAddress === target) {
        const timestamp = event.event_timestamp || null;
        return sanitizeDateLabel(timestamp ? formatDateShort(timestamp) : null);
      }
    }

    next = String(data.next || "");
    if (!next || !events.length) break;
  }

  return null;
}

async function enrichSharedExactWithAcquiredDates(
  nfts: NFT[],
  walletA: string,
  walletB: string,
  cache: Map<string, Promise<NFT>>
): Promise<NFT[]> {
  const enriched = await enrichDisplayedNFTs(nfts, cache);

  return Promise.all(
    enriched.map(async (nft) => {
      const [acquiredDateA, acquiredDateB] = await Promise.all([
        fetchNftAcquiredDate(nft, walletA),
        fetchNftAcquiredDate(nft, walletB),
      ]);

      return {
        ...nft,
        acquiredDateA,
        acquiredDateB,
      };
    })
  );
}

async function buildSharedCollectionCandidates(
  walletAddress: string,
  sharedCollectionNames: string[]
): Promise<Array<{ name: string; slug: string; floorPrice?: number | null }>> {
  const inventory = await fetchOpenSeaAccountInventory(walletAddress);
  const wanted = new Set(sharedCollectionNames.map((name) => normalizeText(name)));

  const candidateMap = new Map<string, { name: string; slug: string; floorPrice?: number | null }>();

  for (const item of inventory) {
    const name = getCollectionNameFromAccountItem(item);
    const normalizedName = normalizeText(name);
    const slug = getCollectionSlugFromAccountItem(item);
    if (!wanted.has(normalizedName) || !slug) continue;

    const existing = candidateMap.get(slug);
    const floorPrice = getFloorPriceFromAccountItem(item);
    if (!existing || (floorPrice ?? -1) > (existing.floorPrice ?? -1)) {
      candidateMap.set(slug, { name: name || slug, slug, floorPrice });
    }
  }

  return [...candidateMap.values()].sort((a, b) => (b.floorPrice ?? -1) - (a.floorPrice ?? -1));
}

// Fetches the date each wallet first entered each shared collection.
// Returns a map of collectionName -> { dateA, dateB }
async function fetchCollectionEntryDates(
  walletA: string,
  walletB: string,
  candidatesA: Array<{ name: string; slug: string }>,
  candidatesB: Array<{ name: string; slug: string }>
): Promise<Map<string, { dateA: string | null; dateB: string | null }>> {
  const result = new Map<string, { dateA: string | null; dateB: string | null }>();

  // Build a slug lookup for each wallet keyed by normalized name
  const slugMapA = new Map(candidatesA.map((c) => [normalizeText(c.name), c.slug]));
  const slugMapB = new Map(candidatesB.map((c) => [normalizeText(c.name), c.slug]));

  const allNames = new Set([...slugMapA.keys(), ...slugMapB.keys()]);

  await Promise.all(
    [...allNames].map(async (normalizedName) => {
      const slugA = slugMapA.get(normalizedName) || "";
      const slugB = slugMapB.get(normalizedName) || "";

      const [rawDateA, rawDateB] = await Promise.all([
        slugA ? fetchCollectionInboundTimestamp(slugA, walletA) : Promise.resolve(null),
        slugB ? fetchCollectionInboundTimestamp(slugB, walletB) : Promise.resolve(null),
      ]);

      result.set(normalizedName, {
        dateA: sanitizeDateLabel(rawDateA ? formatDateShort(rawDateA) : null),
        dateB: sanitizeDateLabel(rawDateB ? formatDateShort(rawDateB) : null),
      });
    })
  );

  return result;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s/#-]/g, " ")
    .replace(/\s+/g, " ");
}

function humanizeCollectionName(value?: string | null) {
  if (!value) return "";

  const withSpaces = value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .replace(/\s+/g, " ");

  if (!withSpaces) return "";

  return withSpaces
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (word === word.toUpperCase()) return word;
      if (/\d/.test(word) && word.length <= 4) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeImageUrl(url?: string) {
  if (!url) return "";

  if (url.startsWith("ipfs://ipfs/")) {
    return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  }

  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }

  if (url.startsWith("ar://")) {
    return url.replace("ar://", "https://arweave.net/");
  }

  return url;
}

function getNFTKey(nft: NFT) {
  return `${nft.contract.address.toLowerCase()}-${String(nft.tokenId).toLowerCase()}`;
}

function getExistingImage(nft: NFT) {
  return normalizeImageUrl(
    nft.displayImage ||
      nft?.image?.cachedUrl ||
      nft?.image?.pngUrl ||
      nft?.image?.thumbnailUrl ||
      nft?.image?.originalUrl ||
      nft?.raw?.metadata?.image ||
      nft?.raw?.metadata?.image_url ||
      ""
  );
}

function getCollectionName(nft: NFT) {
  const slugFallback = humanizeCollectionName(nft.displayCollectionSlug);

  return (
    nft.displayCollectionName ||
    nft.contractMetadata?.name?.trim() ||
    nft.contract?.name?.trim() ||
    slugFallback ||
    humanizeCollectionName(nft.contract.address) ||
    nft.contract.address
  );
}

function isWeakTitle(title?: string) {
  if (!title) return true;

  const trimmed = title.trim();
  if (!trimmed) return true;
  if (/^#?\d+$/i.test(trimmed)) return true;
  if (/^token\s*#?\d+$/i.test(trimmed)) return true;

  return false;
}

function makeFallbackTitle(nft: NFT, collectionName?: string) {
  const collection = collectionName || getCollectionName(nft);
  return `${collection} #${nft.tokenId}`;
}

function pickBestTitle(nft: NFT, resolved?: ResolvedDisplayMetadata) {
  if (resolved?.title && !isWeakTitle(resolved.title)) return resolved.title;
  if (nft.displayTitle && !isWeakTitle(nft.displayTitle)) return nft.displayTitle;
  if (nft.title && !isWeakTitle(nft.title)) return nft.title;
  if (nft.raw?.metadata?.name && !isWeakTitle(nft.raw.metadata.name)) {
    return nft.raw.metadata.name;
  }

  return makeFallbackTitle(nft, resolved?.collectionName);
}

function extractArtistFromTraits(
  traits?: Array<{ trait_type?: string; value?: string | number }>
) {
  if (!traits?.length) return "";

  const match = traits.find((attr) => {
    const trait = (attr.trait_type || "").toLowerCase();
    return (
      trait.includes("artist") ||
      trait.includes("creator") ||
      trait.includes("author") ||
      trait.includes("illustrator") ||
      trait.includes("photographer") ||
      trait === "by"
    );
  });

  return String(match?.value || "").trim();
}

function inferArtistFromText(nft: NFT) {
  const collection = normalizeText(getCollectionName(nft));
  const title = normalizeText(nft.title || "");
  const description = normalizeText(nft.description || "");

  const likelyArtistCollections = [
    "matt furie",
    "xcopy",
    "drift",
    "robness",
    "grant yun",
    "sam spratt",
    "deekay",
    "fvckrender",
    "beeple",
    "pak",
    "refik anadol",
    "dmitri cherniak",
    "tyler hobbs",
    "open editions by matt furie",
    "the complaint cards not by 6529",
    "6529",
  ];

  for (const name of likelyArtistCollections) {
    if (
      collection.includes(name) ||
      title.includes(name) ||
      description.includes(name)
    ) {
      return name;
    }
  }

  return "";
}

function getArtistName(nft: NFT) {
  const displayArtist = String(nft.displayArtist || "").trim();
  if (displayArtist) return normalizeText(displayArtist);

  const direct =
    extractArtistFromTraits(nft.metadata?.attributes) ||
    extractArtistFromTraits(nft.raw?.metadata?.attributes);

  if (direct) return normalizeText(direct);

  const inferred = inferArtistFromText(nft);
  if (inferred) return normalizeText(inferred);

  return "unknown";
}

async function fetchNFTs(owner: string): Promise<NFT[]> {
  return fetchWalletNFTs<NFT>(owner, ALCHEMY_API_KEY);
}

async function fetchOpenSeaAsset(
  contractAddress: string,
  tokenId: string
): Promise<ResolvedDisplayMetadata> {
  if (!OPENSEA_API_KEY) {
    return {};
  }

  const url = `${OPENSEA_BASE_URL}/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-api-key": OPENSEA_API_KEY,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("OPENSEA_ASSET_FAILED", {
      contractAddress,
      tokenId,
      status: res.status,
      body: text.slice(0, 250),
    });
    return {};
  }

  const data: OpenSeaAssetResponse = await res.json();
  const nft = data.nft || data;

  const collectionName =
    typeof nft?.collection === "string"
      ? nft.collection
      : nft?.collection?.name || "";
  const collectionSlug =
    nft?.collection_slug ||
    (typeof nft?.collection === "object" ? nft?.collection?.slug || "" : "");

  const artist = extractArtistFromTraits(nft?.traits) || "";

  const imageUrl = normalizeImageUrl(
    nft?.display_image_url ||
      nft?.image_url ||
      nft?.image_original_url ||
      nft?.image_preview_url ||
      ""
  );

  return {
    title: nft?.name || "",
    collectionName,
    collectionSlug,
    artist,
    imageUrl,
    description: nft?.description || "",
  };
}

function mergeDisplayMetadata(nft: NFT, resolved: ResolvedDisplayMetadata): NFT {
  const collectionName =
    resolved.collectionName ||
    nft.displayCollectionName ||
    nft.contractMetadata?.name?.trim() ||
    nft.contract?.name?.trim() ||
    humanizeCollectionName(resolved.collectionSlug || nft.displayCollectionSlug) ||
    getCollectionName(nft);
  const imageUrl = resolved.imageUrl || getExistingImage(nft);
  const title = pickBestTitle(nft, resolved);
  const artist =
    resolved.artist ||
    extractArtistFromTraits(nft.metadata?.attributes) ||
    extractArtistFromTraits(nft.raw?.metadata?.attributes) ||
    inferArtistFromText(nft);

  return {
    ...nft,
    title,
    description:
      nft.description ||
      resolved.description ||
      nft.raw?.metadata?.description,
    contractMetadata: {
      name: collectionName,
    },
    displayTitle: title,
    displayCollectionName: collectionName,
    displayCollectionSlug: resolved.collectionSlug || nft.displayCollectionSlug,
    displayArtist: artist || undefined,
    displayImage: imageUrl || undefined,
    image: {
      cachedUrl: imageUrl || nft.image?.cachedUrl,
      thumbnailUrl: nft.image?.thumbnailUrl,
      pngUrl: nft.image?.pngUrl,
      originalUrl: imageUrl || nft.image?.originalUrl,
    },
    raw: {
      metadata: {
        image: imageUrl || nft.raw?.metadata?.image,
        image_url: imageUrl || nft.raw?.metadata?.image_url,
        name: title || nft.raw?.metadata?.name,
        description:
          nft.description ||
          resolved.description ||
          nft.raw?.metadata?.description,
        attributes:
          nft.raw?.metadata?.attributes || nft.metadata?.attributes,
      },
    },
  };
}

async function enrichNFT(
  nft: NFT,
  cache: Map<string, Promise<NFT>>
): Promise<NFT> {
  const key = getNFTKey(nft);
  if (cache.has(key)) return cache.get(key)!;

  const promise = (async () => {
    const existingTitle = pickBestTitle(nft);
    const existingCollection = getCollectionName(nft);
    const existingArtist =
      extractArtistFromTraits(nft.metadata?.attributes) ||
      extractArtistFromTraits(nft.raw?.metadata?.attributes) ||
      inferArtistFromText(nft);
    const existingImage = getExistingImage(nft);

    const needsTitle = isWeakTitle(nft.title) || isWeakTitle(existingTitle);
    const needsCollection =
      !existingCollection ||
      existingCollection === nft.contract.address ||
      /^[A-Z0-9_]+$/.test(existingCollection);
    const needsArtist = !existingArtist;
    const needsImage = !existingImage;

    if (!needsTitle && !needsCollection && !needsArtist && !needsImage) {
      return mergeDisplayMetadata(nft, {
        title: existingTitle,
        collectionName: existingCollection,
        artist: existingArtist,
        imageUrl: existingImage,
      });
    }

    const resolved = await fetchOpenSeaAsset(
      nft.contract.address,
      String(nft.tokenId)
    );

    return mergeDisplayMetadata(nft, {
      title: resolved.title || existingTitle,
      collectionName: resolved.collectionName || existingCollection,
      artist: resolved.artist || existingArtist,
      imageUrl: resolved.imageUrl || existingImage,
      description: resolved.description || nft.description,
    });
  })();

  cache.set(key, promise);
  return promise;
}

async function enrichDisplayedNFTs(
  nfts: NFT[],
  cache: Map<string, Promise<NFT>>
) {
  return Promise.all(nfts.map((nft) => enrichNFT(nft, cache)));
}

async function enrichSharedBuckets(
  buckets: Record<string, SharedBucket>,
  cache: Map<string, Promise<NFT>>,
  entryDates?: Map<string, { dateA: string | null; dateB: string | null }>
): Promise<Record<string, SharedBucket>> {
  const entries = await Promise.all(
    Object.entries(buckets).map(async ([key, bucket]) => {
      const [walletA, walletB] = await Promise.all([
        enrichDisplayedNFTs(bucket.walletA, cache),
        enrichDisplayedNFTs(bucket.walletB, cache),
      ]);

      const dates = entryDates?.get(normalizeText(key));

      return [
        key,
        {
          ...bucket,
          walletA,
          walletB,
          enteredDateA: dates?.dateA ?? null,
          enteredDateB: dates?.dateB ?? null,
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries);
}

const ENS_CONTRACTS = new Set([
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
  "0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401",
]);

const NAME_SERVICE_TERMS = [
  "ens",
  "ethereum name service",
  "namewrapper",
  "basenames",
  "domain",
  "domains",
];

function isLikelyNameServiceCollection(value?: string | null) {
  const normalized = normalizeText(String(value || ""));
  if (!normalized) return false;
  return NAME_SERVICE_TERMS.some((term) => normalized.includes(term));
}

function bucketLooksLikeNameService(key: string, bucket: SharedBucket) {
  if (isLikelyNameServiceCollection(key)) return true;

  const allNfts = [...bucket.walletA, ...bucket.walletB];
  return allNfts.some((nft) => {
    const address = normalizeAddress(nft.contract?.address);
    if (ENS_CONTRACTS.has(address)) return true;

    return (
      isLikelyNameServiceCollection(nft.displayCollectionName) ||
      isLikelyNameServiceCollection(nft.displayCollectionSlug) ||
      isLikelyNameServiceCollection(nft.contractMetadata?.name) ||
      isLikelyNameServiceCollection(nft.contract?.name)
    );
  });
}

function filterNameServiceBuckets(buckets: Record<string, SharedBucket>) {
  return Object.fromEntries(
    Object.entries(buckets).filter(([key, bucket]) => !bucketLooksLikeNameService(key, bucket))
  );
}

function groupByCollection(nfts: NFT[]) {
  const map: Record<string, NFT[]> = {};

  nfts.forEach((nft) => {
    const key = getCollectionName(nft);
    if (!map[key]) map[key] = [];
    map[key].push(nft);
  });

  return map;
}

function groupByArtist(nfts: NFT[]) {
  const map: Record<string, NFT[]> = {};

  nfts.forEach((nft) => {
    const artist = getArtistName(nft);
    if (!map[artist]) map[artist] = [];
    map[artist].push(nft);
  });

  return map;
}

function classify(nft: NFT) {
  const haystack = normalizeText(
    `${nft.contractMetadata?.name || ""} ${nft.contract?.name || ""} ${
      nft.title || ""
    } ${nft.description || ""}`
  );

  if (
    haystack.includes("utility") ||
    haystack.includes("membership") ||
    haystack.includes("pass") ||
    haystack.includes("access")
  ) {
    return "Utility";
  }

  if (
    haystack.includes("music") ||
    haystack.includes("song") ||
    haystack.includes("audio") ||
    haystack.includes("sound")
  ) {
    return "Music";
  }

  if (
    haystack.includes("photo") ||
    haystack.includes("photography") ||
    haystack.includes("photograph")
  ) {
    return "Photography";
  }

  if (
    haystack.includes("generative") ||
    haystack.includes("algorithmic") ||
    haystack.includes("art blocks")
  ) {
    return "Generative Art";
  }

  if (
    haystack.includes("fine art") ||
    haystack.includes("edition") ||
    haystack.includes("gallery") ||
    haystack.includes("painting") ||
    haystack.includes("portrait")
  ) {
    return "Fine Art";
  }

  if (
    haystack.includes("punk") ||
    haystack.includes("ape") ||
    haystack.includes("pfp") ||
    haystack.includes("avatar") ||
    haystack.includes("penguin") ||
    haystack.includes("cat") ||
    haystack.includes("bear")
  ) {
    return "PFP";
  }

  if (
    haystack.includes("meme") ||
    haystack.includes("pepe") ||
    haystack.includes("wojak") ||
    haystack.includes("furie")
  ) {
    return "Meme";
  }

  if (
    haystack.includes("game") ||
    haystack.includes("gaming") ||
    haystack.includes("player") ||
    haystack.includes("quest") ||
    haystack.includes("character")
  ) {
    return "Gaming";
  }

  if (
    haystack.includes("3d") ||
    haystack.includes("animation") ||
    haystack.includes("animated") ||
    haystack.includes("motion") ||
    haystack.includes("vr")
  ) {
    return "3D / Animation";
  }

  if (
    haystack.includes("collectible") ||
    haystack.includes("trading") ||
    haystack.includes("series")
  ) {
    return "Collectibles";
  }

  return "Other";
}

function buildTasteDNA(nfts: NFT[]) {
  const counts: Record<string, number> = {};

  nfts.forEach((nft) => {
    const type = classify(nft);
    counts[type] = (counts[type] || 0) + 1;
  });

  const total = nfts.length;
  const percentages: Record<string, number> = {};

  if (total === 0) return percentages;

  Object.keys(counts).forEach((key) => {
    percentages[key] = Math.round((counts[key] / total) * 100);
  });

  return percentages;
}

function buildSharedBuckets(
  groupedA: Record<string, NFT[]>,
  groupedB: Record<string, NFT[]>,
  excludeUnknown = false
) {
  const result: Record<string, SharedBucket> = {};

  Object.keys(groupedA).forEach((key) => {
    if (!groupedB[key]) return;
    if (excludeUnknown && key === "unknown") return;

    result[key] = {
      walletA: groupedA[key].slice(0, PREVIEW_LIMIT),
      walletB: groupedB[key].slice(0, PREVIEW_LIMIT),
      walletACount: groupedA[key].length,
      walletBCount: groupedB[key].length,
    };
  });

  return result;
}

function scoreExact(sharedExactCount: number, totalA: number, totalB: number) {
  if (!sharedExactCount || !totalA || !totalB) return 0;

  const aRatio = sharedExactCount / totalA;
  const bRatio = sharedExactCount / totalB;
  const balanced = Math.sqrt(aRatio * bRatio);
  const scaled = balanced * Math.log2(2 + sharedExactCount) * 2.4;

  return clamp(scaled);
}

function scoreSharedBuckets(buckets: Record<string, SharedBucket>) {
  const entries = Object.values(buckets);
  if (!entries.length) return 0;

  let total = 0;

  entries.forEach((bucket) => {
    const a = bucket.walletACount;
    const b = bucket.walletBCount;

    if (!a || !b) return;

    const balance = Math.min(a, b) / Math.max(a, b);
    const depth = Math.log2(1 + Math.min(a, b)) / 3;
    total += balance * clamp(depth);
  });

  return clamp(total / Math.max(entries.length, 1));
}

function scoreTaste(tasteA: TasteMap, tasteB: TasteMap) {
  const keys = new Set([...Object.keys(tasteA), ...Object.keys(tasteB)]);
  if (!keys.size) return 0;

  let diff = 0;
  keys.forEach((key) => {
    diff += Math.abs((tasteA[key] || 0) - (tasteB[key] || 0));
  });

  return clamp(1 - diff / 200);
}

function getTopTasteEntries(taste: TasteMap, limit = 2) {
  const entries = Object.entries(taste)
    .filter(([key, value]) => value > 0 && key !== "Other")
    .sort((a, b) => b[1] - a[1]);

  if (entries.length >= limit) return entries.slice(0, limit);

  return Object.entries(taste)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function scoreTopCategoryBonus(tasteA: TasteMap, tasteB: TasteMap) {
  const topA = getTopTasteEntries(tasteA).map(([key]) => key);
  const topB = getTopTasteEntries(tasteB).map(([key]) => key);

  const overlap = topA.filter((item) => topB.includes(item)).length;
  if (overlap === 2) return 0.05;
  if (overlap === 1) return 0.025;
  return 0;
}

function getConfidence(
  totalA: number,
  totalB: number,
  sharedCollections: number,
  sharedArtists: number
) {
  const smaller = Math.min(totalA, totalB);
  const sharedSignals = sharedCollections + sharedArtists;

  if (smaller >= 100 && sharedSignals >= 4) return "High";
  if (smaller >= 25 && sharedSignals >= 2) return "Medium";
  return "Low";
}

function labelFromScore(score: number) {
  if (score >= 90) return "Extremely aligned";
  if (score >= 75) return "Strong match";
  if (score >= 60) return "Clear overlap";
  if (score >= 40) return "Some shared taste";
  if (score >= 20) return "Light connection";
  return "Limited overlap";
}

// --- NEW: Taste alignment label ---
function labelFromTasteAlignment(score: number) {
  if (score >= 85) return "Very high";
  if (score >= 70) return "High";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Light";
  return "Low";
}

// --- NEW: Similarity type — readable framing for zero-overlap comparisons ---
function buildSimilarityType(params: {
  totalA: number;
  totalB: number;
  tasteA: TasteMap;
  tasteB: TasteMap;
  sharedExactCount: number;
  sharedCollectionCount: number;
}) {
  const { totalA, totalB, tasteA, tasteB, sharedExactCount, sharedCollectionCount } = params;

  const topA = getTopTasteEntries(tasteA, 2).map(([key]) => key);
  const topB = getTopTasteEntries(tasteB, 2).map(([key]) => key);
  const sharedTop = topA.filter((key) => topB.includes(key)).length;
  const scaleRatio = Math.max(totalA, totalB) / Math.max(1, Math.min(totalA, totalB));

  if (sharedExactCount >= 2) return "Direct overlap";
  if (sharedCollectionCount >= 3 && scaleRatio <= 2.25) return "Shared worlds";
  if (sharedTop >= 2 && scaleRatio > 2.5) return "Same taste, different depth";
  if (sharedTop >= 2) return "Same lane, different pieces";
  if (sharedTop === 1 && scaleRatio > 2.5) return "Shared interests, different scale";
  if (sharedTop === 1) return "Adjacent collectors";
  return "Light adjacency";
}

// --- NEW: Interpretation line — human-readable summary of why two wallets align ---
function buildInterpretationLine(params: {
  totalA: number;
  totalB: number;
  tasteA: TasteMap;
  tasteB: TasteMap;
  sharedExactCount: number;
  sharedCollectionCount: number;
}) {
  const { totalA, totalB, tasteA, tasteB, sharedExactCount, sharedCollectionCount } = params;

  const topA = getTopTasteEntries(tasteA, 2);
  const topB = getTopTasteEntries(tasteB, 2);
  const sharedTop = topA
    .map(([key]) => key)
    .filter((key) => topB.map(([k]) => k).includes(key));

  const sizeRead =
    totalA > totalB * 3
      ? "One wallet explores much more broadly, while the other stays tighter and more selective."
      : totalB > totalA * 3
      ? "One wallet is far broader in scale, while the other is more concentrated and selective."
      : "Both wallets collect at a relatively similar scale.";

  if (sharedExactCount > 0) {
    return `There is true direct overlap here, sitting inside a broader shared taste profile. ${sizeRead}`;
  }

  if (sharedCollectionCount >= 3 && sharedTop.length) {
    return `These wallets keep finding their way into similar worlds, especially around ${sharedTop.join(
      " and "
    )}. ${sizeRead}`;
  }

  if (sharedTop.length >= 2) {
    return `The overlap is more aesthetic than literal. Both wallets lean toward ${sharedTop.join(
      " and "
    )}, even when they express that through different pieces. ${sizeRead}`;
  }

  if (sharedTop.length === 1) {
    return `There is a visible connection around ${sharedTop[0]}, but each wallet interprets that lane differently. ${sizeRead}`;
  }

  return `There is not much direct overlap yet, but the wallets still show a few adjacent taste signals. ${sizeRead}`;
}

function computeArchetype(
  taste: TasteMap,
  totalNFTs: number,
  diversity: number
) {
  const top = getTopTasteEntries(taste, 2);
  const primary = top[0]?.[0] || "Other";
  const primaryPct = top[0]?.[1] || 0;
  const secondaryPct = top[1]?.[1] || 0;

  if (diversity >= 6 && totalNFTs >= 80) return "Broad Explorer";
  if (primary === "Meme" && primaryPct >= 18) return "Meme Native";
  if (primary === "Fine Art") return "Art-Led Collector";
  if (primary === "Generative Art") return "Generative Lean";
  if (primary === "PFP") return "Identity Builder";
  if (primary === "Utility") return "Utility Strategist";
  if (primary === "Photography") return "Image Archivist";
  if (primary === "Music") return "Sound Collector";
  if (primaryPct >= 38) return "Focused Curator";
  if (Math.abs(primaryPct - secondaryPct) <= 6) return "Cross-Current Collector";

  return "Taste Builder";
}

function computeLevel(totalNFTs: number, diversity: number) {
  const holdingsCurve =
    totalNFTs > 0
      ? (Math.log10(totalNFTs + 1) / Math.log10(1000)) * 92
      : 0;

  const diversityBonus = Math.min(diversity * 1.25, 7);

  return clampInt(Math.round(holdingsCurve + diversityBonus), 1, 99);
}

function buildProfileLine(
  primaryLean: string,
  secondaryLean: string,
  totalNFTs: number
) {
  if (secondaryLean && secondaryLean !== primaryLean) {
    if (totalNFTs >= 100) {
      return `Leans ${primaryLean.toLowerCase()} first, with a strong ${secondaryLean.toLowerCase()} undercurrent.`;
    }
    return `A ${primaryLean.toLowerCase()}-leaning wallet with clear ${secondaryLean.toLowerCase()} spillover.`;
  }

  return `A wallet centered most strongly around ${primaryLean.toLowerCase()}.`;
}

function pickMostOwnedGroup(grouped: Record<string, NFT[]>) {
  const ranked = Object.entries(grouped)
    .filter(([name, items]) => !!name.trim() && items.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  return ranked[0] || null;
}

async function buildTopCollectionSignal(
  nfts: NFT[],
  cache: Map<string, Promise<NFT>>
) {
  const topCollection = pickMostOwnedGroup(groupByCollection(nfts));

  if (topCollection) {
    const [name, items] = topCollection;
    const enriched = await Promise.all(
      items.slice(0, 8).map((nft) => enrichNFT(nft, cache))
    );
    const previewImages = enriched
      .map((nft) => getExistingImage(nft))
      .filter(Boolean)
      .slice(0, 2);

    return {
      source: "collection" as const,
      name,
      ownedCount: items.length,
      previewImages,
    };
  }

  const artistBuckets = groupByArtist(nfts);
  delete artistBuckets.unknown;
  const topArtist = pickMostOwnedGroup(artistBuckets);

  if (!topArtist) return null;

  const [name, items] = topArtist;
  const enriched = await Promise.all(
    items.slice(0, 8).map((nft) => enrichNFT(nft, cache))
  );
  const previewImages = enriched
    .map((nft) => getExistingImage(nft))
    .filter(Boolean)
    .slice(0, 2);

  return {
    source: "artist" as const,
    name,
    ownedCount: items.length,
    previewImages,
  };
}

async function buildCollectorCardProfile(
  nfts: NFT[],
  taste: TasteMap,
  cache: Map<string, Promise<NFT>>
): Promise<CollectorProfile> {
  const top = getTopTasteEntries(taste, 2);
  const primaryLean = top[0]?.[0] || "Other";
  const secondaryLean = top[1]?.[0] || primaryLean;

  const diversity = Object.entries(taste).filter(
    ([key, value]) => value > 0 && key !== "Other"
  ).length;

  const archetype = computeArchetype(taste, nfts.length, diversity);
  const level = computeLevel(nfts.length, diversity);
  const profileLine = buildProfileLine(primaryLean, secondaryLean, nfts.length);

  const topCollection = await buildTopCollectionSignal(nfts, cache);

  return {
    archetype,
    level,
    primaryLean,
    secondaryLean,
    profileLine,
    collectorIdentityLabel: "Exploratory collector across emerging and uncategorized work",
    dominantCategory: "other",
    secondaryCategory: "other",
    categoryDistribution: [],
    otherPercentage: 100,
    categoryConfidence: "Low",
    categorySourceBreakdown: {
      opensea: 0,
      metadata: 0,
      keyword: 0,
      other: 0,
    },
    topCollection,
  };
}

function buildSummary(params: {
  chemistryScore: number;
  tasteA: TasteMap;
  tasteB: TasteMap;
  totalA: number;
  totalB: number;
}) {
  const { chemistryScore, tasteA, tasteB, totalA, totalB } = params;

  const topA = getTopTasteEntries(tasteA).map(([key]) => key);
  const topB = getTopTasteEntries(tasteB).map(([key]) => key);
  const sharedTop = topA.filter((item) => topB.includes(item));

  const sizeRead =
    totalA > totalB * 3
      ? "One wallet collects broadly, while the other is more focused around a smaller set of ideas."
      : totalB > totalA * 3
      ? "One wallet is more concentrated, while the other moves across a much broader range."
      : "Both wallets are operating at a relatively similar scale.";

  if (chemistryScore >= 75) {
    return {
      headline: "Strong collector chemistry",
      body:
        sharedTop.length > 0
          ? `There is real overlap here, especially around ${sharedTop.join(
              " and "
            )}. These wallets feel meaningfully aligned, not just accidentally adjacent. ${sizeRead}`
          : `These wallets clearly move through some of the same worlds. The overlap shows up beyond exact pieces and starts to feel like shared taste. ${sizeRead}`,
    };
  }

  if (chemistryScore >= 50) {
    return {
      headline: "Clear connection with different depth",
      body:
        sharedTop.length > 0
          ? `There's a visible connection here, especially around ${sharedTop.join(
              " and "
            )}. They do not collect the same way, but they are pulled toward some of the same ideas. ${sizeRead}`
          : `The overlap is real, but uneven. These wallets share some common ground, even if one goes broader or deeper than the other. ${sizeRead}`,
    };
  }

  return {
    headline: "Light overlap",
    body:
      sharedTop.length > 0
        ? `There's some shared taste here, especially around ${sharedTop.join(
            " and "
          )}, but the overlap is still light. ${sizeRead}`
        : `There are a few connective threads here, but the overlap is still light. These wallets feel more adjacent than deeply aligned right now. ${sizeRead}`,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletA = searchParams.get("walletA")?.trim();
  const walletB = searchParams.get("walletB")?.trim();

  if (!walletA || !walletB) {
    return NextResponse.json(
      { error: "Missing wallet addresses" },
      { status: 400 }
    );
  }

  try {
    const [nftsA, nftsB] = await Promise.all([
      fetchNFTs(walletA),
      fetchNFTs(walletB),
    ]);

    const tasteA = buildTasteDNA(nftsA);
    const tasteB = buildTasteDNA(nftsB);

    const setA = new Set(nftsA.map(getNFTKey));
    const sharedExactRaw = nftsB.filter((nft) => setA.has(getNFTKey(nft)));

    const collectionsA = groupByCollection(nftsA);
    const collectionsB = groupByCollection(nftsB);
    const sharedCollectionsRaw = buildSharedBuckets(collectionsA, collectionsB);

    const artistsA = groupByArtist(nftsA);
    const artistsB = groupByArtist(nftsB);
    const sharedArtistsRaw = buildSharedBuckets(artistsA, artistsB, true);

    const exactScore = scoreExact(sharedExactRaw.length, nftsA.length, nftsB.length);
    const collectionsScore = scoreSharedBuckets(sharedCollectionsRaw);
    const artistsScore = scoreSharedBuckets(sharedArtistsRaw);
    const tasteScore = scoreTaste(tasteA, tasteB);
    const topCategoryBonus = scoreTopCategoryBonus(tasteA, tasteB);

    const chemistryRaw =
      0.2 * exactScore +
      0.3 * collectionsScore +
      0.2 * artistsScore +
      0.3 * tasteScore +
      topCategoryBonus;

    const chemistryScore = Math.round(clamp(chemistryRaw) * 100);
    const confidence = getConfidence(
      nftsA.length,
      nftsB.length,
      Object.keys(sharedCollectionsRaw).length,
      Object.keys(sharedArtistsRaw).length
    );

    const summary = buildSummary({
      chemistryScore,
      tasteA,
      tasteB,
      totalA: nftsA.length,
      totalB: nftsB.length,
    });

    const similarityType = buildSimilarityType({
      totalA: nftsA.length,
      totalB: nftsB.length,
      tasteA,
      tasteB,
      sharedExactCount: sharedExactRaw.length,
      sharedCollectionCount: Object.keys(sharedCollectionsRaw).length,
    });

    const interpretation = buildInterpretationLine({
      totalA: nftsA.length,
      totalB: nftsB.length,
      tasteA,
      tasteB,
      sharedExactCount: sharedExactRaw.length,
      sharedCollectionCount: Object.keys(sharedCollectionsRaw).length,
    });

    const enrichCache = new Map<string, Promise<NFT>>();
    const sharedCollectionNames = Object.keys(sharedCollectionsRaw);

    const [sharedCollectionCandidatesA, sharedCollectionCandidatesB] =
      await Promise.all([
        buildSharedCollectionCandidates(walletA, sharedCollectionNames),
        buildSharedCollectionCandidates(walletB, sharedCollectionNames),
      ]);

    const collectionEntryDates = await fetchCollectionEntryDates(
      walletA,
      walletB,
      sharedCollectionCandidatesA,
      sharedCollectionCandidatesB
    );

    const coreProfileA = buildCoreWalletProfile(nftsA as WalletProfileNFT[]);
    const coreProfileB = buildCoreWalletProfile(nftsB as WalletProfileNFT[]);

    const [profileCardA, profileCardB, sharedExact, sharedCollections, sharedArtists] =
      await Promise.all([
        buildCollectorCardProfile(nftsA, tasteA, enrichCache),
        buildCollectorCardProfile(nftsB, tasteB, enrichCache),
        enrichSharedExactWithAcquiredDates(
          sharedExactRaw.slice(0, EXACT_LIMIT),
          walletA,
          walletB,
          enrichCache
        ),
        enrichSharedBuckets(sharedCollectionsRaw, enrichCache, collectionEntryDates),
        enrichSharedBuckets(sharedArtistsRaw, enrichCache),
      ]);

    const filteredSharedCollections = filterNameServiceBuckets(sharedCollections);
    const filteredSharedArtists = filterNameServiceBuckets(sharedArtists);

    const profileA: CollectorProfile = {
      ...profileCardA,
      collectorIdentityLabel: coreProfileA.collectorIdentityLabel,
      dominantCategory: coreProfileA.dominantCategory,
      secondaryCategory: coreProfileA.secondaryCategory,
      categoryDistribution: coreProfileA.categoryDistribution,
      otherPercentage: coreProfileA.otherPercentage,
      categoryConfidence: coreProfileA.categoryConfidence,
      categorySourceBreakdown: coreProfileA.categorySourceBreakdown,
    };

    const profileB: CollectorProfile = {
      ...profileCardB,
      collectorIdentityLabel: coreProfileB.collectorIdentityLabel,
      dominantCategory: coreProfileB.dominantCategory,
      secondaryCategory: coreProfileB.secondaryCategory,
      categoryDistribution: coreProfileB.categoryDistribution,
      otherPercentage: coreProfileB.otherPercentage,
      categoryConfidence: coreProfileB.categoryConfidence,
      categorySourceBreakdown: coreProfileB.categorySourceBreakdown,
    };

    const pairInterpretation = buildPairInterpretation({
      categoryDistributionA: profileA.categoryDistribution,
      categoryDistributionB: profileB.categoryDistribution,
      topCollectionsA: coreProfileA.topCollections,
      topCollectionsB: coreProfileB.topCollections,
      sharedCollectionCount: Object.keys(filteredSharedCollections).length,
      sharedArtistCount: Object.keys(filteredSharedArtists).length,
      sharedExactCount: sharedExactRaw.length,
      chemistryScore,
    });

    const walletAResponse: WalletSummary = {
      totalNFTs: nftsA.length,
      taste: tasteA,
      profile: profileA,
    };

    const walletBResponse: WalletSummary = {
      totalNFTs: nftsB.length,
      taste: tasteB,
      profile: profileB,
    };

    return NextResponse.json({
      walletA: walletAResponse,
      walletB: walletBResponse,
      scoring: {
        chemistryScore,
        label: labelFromScore(chemistryScore),
        confidence,
        similarityType,
        tasteAlignment: {
          score: Math.round(tasteScore * 100),
          label: labelFromTasteAlignment(Math.round(tasteScore * 100)),
        },
        interpretation,
        pairInterpretation,
        breakdown: {
          exact: Math.round(exactScore * 100),
          collections: Math.round(collectionsScore * 100),
          artists: Math.round(artistsScore * 100),
          taste: Math.round(tasteScore * 100),
        },
        summary,
      },
      shared: {
        exact: sharedExact,
        exactCount: sharedExactRaw.length,
        collections: filteredSharedCollections,
        artists: filteredSharedArtists,
      },
    });
  } catch (err) {
    console.error("COMPARE_ROUTE_ERROR", err);

    const message =
      err instanceof Error ? err.message : "Failed to fetch comparison data";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}