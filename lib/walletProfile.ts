export type WalletProfileNFT = {
  displayCollectionName?: string;
  displayCollectionSlug?: string;
  displayCollectionCategory?: string;
  displayCategorySource?: "opensea" | "metadata" | "keyword" | "other";
  contract?: {
    name?: string;
    address?: string;
  };
  collection?: {
    name?: string;
  } | string;
  contractMetadata?: {
    name?: string;
  };
  metadata?: {
    name?: string;
    description?: string;
    collection?: string;
    collection_name?: string;
    category?: string;
    collection_category?: string;
    attributes?: Array<{
      value?: string | number;
    }>;
  };
  raw?: {
    metadata?: {
      name?: string;
      description?: string;
      collection?: string;
      collection_name?: string;
      category?: string;
      collection_category?: string;
      attributes?: Array<{
        value?: string | number;
      }>;
    };
  };
  title?: string;
  description?: string;
};

export type TopCollection = {
  name: string;
  count: number;
  percentage: number;
};

export type CategoryDistribution = Array<{
  category: string;
  percentage: number;
  count: number;
}>;

export type WalletProfile = {
  totalNFTs: number;
  totalCollections: number;
  topCollections: TopCollection[];
  unknownCollectionCount: number;
  focusIndex: number;
  focusLabel: "Focused" | "Balanced" | "Explorer";
  categoryDistribution: CategoryDistribution;
  dominantCategory: string;
  secondaryCategory: string;
  topCategoryMargin: number;
  otherPercentage: number;
  categoryConfidence: "High" | "Medium" | "Low";
  categorySourceBreakdown: {
    opensea: number;
    metadata: number;
    keyword: number;
    other: number;
  };
  collectorIdentityLabel: string;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  meme: [
    "meme",
    "pepe",
    "wojak",
    "furie",
    "internet culture",
    "shitpost",
    "rare pepe",
  ],
  generative: [
    "generative",
    "algorithmic",
    "art blocks",
    "fxhash",
    "long form",
    "on chain art",
    "onchain art",
    "gen art",
    "procedural",
    "autoglyph",
  ],
  pfp: [
    "pfp",
    "profile picture",
    "avatar",
    "punk",
    "ape",
    "azuki",
    "doodle",
    "milady",
    "penguin",
    "cat",
    "bear",
    "character",
  ],
  fine_art: [
    "fine art",
    "painting",
    "portrait",
    "gallery",
    "edition",
    "contemporary art",
    "1 1",
    "one of one",
    "canvas",
  ],
  photography: [
    "photo",
    "photography",
    "photograph",
    "film",
    "documentary",
    "camera",
    "lens",
  ],
  gaming: [
    "game",
    "gaming",
    "quest",
    "play",
    "player",
    "metaverse",
    "virtual world",
    "xp",
  ],
  utility: [
    "utility",
    "membership",
    "pass",
    "access",
    "ticket",
    "allowlist",
    "whitelist",
    "redeem",
  ],
  music: [
    "music",
    "song",
    "audio",
    "sound",
    "track",
    "album",
    "record",
  ],
  "3d_animation": [
    "3d",
    "animation",
    "animated",
    "cgi",
    "render",
    "motion",
    "loop",
  ],
  collectibles: [
    "collectible",
    "trading card",
    "set",
    "series",
    "figure",
    "toy",
    "sticker",
  ],
  sports: ["sports", "athlete", "team", "league", "rookie"],
  virtual_worlds: ["virtual worlds", "virtual world", "metaverse", "land"],
};

export function normalizeText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s/#-]/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeOpenSeaCategory(category?: string) {
  const normalized = normalizeText(category).replace(/\s+/g, "-");

  const map: Record<string, string> = {
    art: "fine_art",
    pfp: "pfp",
    gaming: "gaming",
    music: "music",
    photography: "photography",
    utility: "utility",
    memberships: "utility",
    "domain-names": "utility",
    collectibles: "collectibles",
    sports: "sports",
    "virtual-worlds": "virtual_worlds",
  };

  return map[normalized] || "";
}

function toAttributeArray(
  rawAttributes: unknown
): Array<{ value?: string | number }> {
  return Array.isArray(rawAttributes)
    ? (rawAttributes as Array<{ value?: string | number }>)
    : [];
}

function getAttributeText(rawAttributes: unknown) {
  const attributes = toAttributeArray(rawAttributes);
  if (!attributes.length) return "";
  return attributes
    .map((attribute) => String(attribute?.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function resolveCollectionName(nft: WalletProfileNFT) {
  const candidateValues = [
    nft.displayCollectionName,
    nft.contractMetadata?.name,
    nft.contract?.name,
    typeof nft.collection === "object" ? nft.collection?.name : undefined,
    typeof nft.collection === "string" ? nft.collection : undefined,
    nft.raw?.metadata?.collection,
    nft.raw?.metadata?.collection_name,
    nft.metadata?.collection,
    nft.metadata?.collection_name,
  ];

  for (const candidate of candidateValues) {
    const trimmed = String(candidate || "").trim();
    if (trimmed) return trimmed;
  }

  return "Unknown collection";
}

type CategorySource = "opensea" | "metadata" | "keyword" | "other";

function classifyCategoryWithSource(nft: WalletProfileNFT): {
  category: string;
  source: CategorySource;
} {
  const fromOpenSea = normalizeOpenSeaCategory(nft.displayCollectionCategory);
  if (fromOpenSea) {
    return { category: fromOpenSea, source: "opensea" };
  }

  const metadataCandidates = [
    nft.metadata?.category,
    nft.metadata?.collection_category,
    nft.raw?.metadata?.category,
    nft.raw?.metadata?.collection_category,
  ];

  for (const candidate of metadataCandidates) {
    const normalized = normalizeOpenSeaCategory(candidate);
    if (normalized) {
      return { category: normalized, source: "metadata" };
    }
  }

  const haystack = normalizeText(
    [
      nft.displayCollectionName,
      nft.contractMetadata?.name,
      nft.contract?.name,
      nft.metadata?.name,
      nft.metadata?.description,
      getAttributeText(nft.metadata?.attributes),
      nft.raw?.metadata?.name,
      nft.raw?.metadata?.description,
      getAttributeText(nft.raw?.metadata?.attributes),
      nft.title,
      nft.description,
    ]
      .filter(Boolean)
      .join(" ")
  );

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return { category, source: "keyword" };
    }
  }

  return { category: "other", source: "other" };
}

export function calculateFocusIndex(
  collections: Array<{ count: number }>,
  totalNFTs: number
) {
  if (!totalNFTs) return 0;

  const sorted = [...collections].sort((a, b) => b.count - a.count);
  const top3Count = sorted.slice(0, 3).reduce((sum, item) => sum + item.count, 0);

  const top3Concentration = top3Count / totalNFTs;
  const collectionSpread = collections.length / totalNFTs;

  const focusIndex =
    (top3Concentration * 0.7 + (1 - collectionSpread) * 0.3) * 100;

  return Math.max(0, Math.min(100, Math.round(focusIndex)));
}

export function classifyCollectorFocus(
  focusIndex: number
): "Focused" | "Balanced" | "Explorer" {
  if (focusIndex >= 70) return "Focused";
  if (focusIndex >= 40) return "Balanced";
  return "Explorer";
}

export function buildCategoryDistribution(
  nfts: WalletProfileNFT[]
): CategoryDistribution {
  const totalNFTs = nfts.length;
  if (!totalNFTs) return [];

  const counts = new Map<string, number>();

  for (const nft of nfts) {
    const { category } = classifyCategoryWithSource(nft);
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalNFTs) * 100),
    }))
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return a.category.localeCompare(b.category);
    });
}

export function getDominantCategory(categoryDistribution: CategoryDistribution) {
  return categoryDistribution[0]?.category || "other";
}

function getSecondaryCategory(categoryDistribution: CategoryDistribution) {
  return categoryDistribution[1]?.category || "other";
}

function getTopCategoryMargin(categoryDistribution: CategoryDistribution) {
  const first = categoryDistribution[0]?.percentage || 0;
  const second = categoryDistribution[1]?.percentage || 0;
  return Math.max(0, first - second);
}

function getCategoryConfidence(params: {
  totalNFTs: number;
  dominantCategory: string;
  otherPercentage: number;
  topCategoryMargin: number;
}): "High" | "Medium" | "Low" {
  const { totalNFTs, dominantCategory, otherPercentage, topCategoryMargin } = params;

  if (totalNFTs < 10) return "Low";
  if (otherPercentage > 50) return "Low";
  if (dominantCategory === "other") return "Medium";
  if (topCategoryMargin < 10) return "Medium";
  return "High";
}

function getCategorySourceBreakdown(nfts: WalletProfileNFT[]) {
  const counts = {
    opensea: 0,
    metadata: 0,
    keyword: 0,
    other: 0,
  };

  for (const nft of nfts) {
    const { source } = classifyCategoryWithSource(nft);
    counts[source] += 1;
  }

  return counts;
}

function buildCollectorIdentityLabel(
  _focusLabel: "Focused" | "Balanced" | "Explorer",
  dominantCategory: string,
  secondaryCategory: string,
  categoryDistribution: CategoryDistribution,
  otherPercentage: number
) {
  const normalizeCategoryLabel = (category: string) =>
    category.replace(/_/g, " ").trim().toLowerCase();
  const toTitleCase = (value: string) =>
    value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

  const topCategoryPercentage = categoryDistribution[0]?.percentage || 0;
  const hasAnyCategoryOver20 = categoryDistribution.some(
    (entry) => entry.category !== "other" && entry.percentage > 20
  );

  if (otherPercentage > 40 || !hasAnyCategoryOver20) {
    return "Exploratory collector across emerging and uncategorized work";
  }

  const exploratory = otherPercentage >= 20;
  const dominantIsStrong = topCategoryPercentage >= 30;

  const dominantLabel = toTitleCase(normalizeCategoryLabel(dominantCategory));
  const secondaryEntry = categoryDistribution.find(
    (entry) => entry.category === secondaryCategory
  );
  const secondaryIsMeaningful = (secondaryEntry?.percentage || 0) >= 10;
  const secondaryLabel = normalizeCategoryLabel(secondaryCategory);

  if (dominantIsStrong) {
    let label = `${dominantLabel}-forward collector`;
    if (secondaryIsMeaningful && secondaryCategory !== "other") {
      label += ` with ${secondaryLabel} spillover`;
    }
    if (exploratory) {
      label += " and experimental edges";
    }
    return label;
  }

  const rankedNonOther = categoryDistribution.filter(
    (entry) => entry.category !== "other"
  );

  const first = normalizeCategoryLabel(rankedNonOther[0]?.category || "");
  const second = normalizeCategoryLabel(rankedNonOther[1]?.category || "");

  if (!first && !second) {
    return "Exploratory collector across emerging and uncategorized work";
  }

  if (first && !second) {
    let singleLabel = `${toTitleCase(first)} collector`;
    if (exploratory) {
      singleLabel += " with experimental edges";
    }
    return singleLabel;
  }

  let dualLabel = `${toTitleCase(first)} and ${toTitleCase(second)} collector`;
  if (exploratory) {
    dualLabel += " with experimental edges";
  }
  return dualLabel;
}

export function buildWalletProfile(nfts: WalletProfileNFT[]): WalletProfile {
  const totalNFTs = nfts.length;

  const collectionMap = new Map<string, number>();
  for (const nft of nfts) {
    const name = resolveCollectionName(nft);
    collectionMap.set(name, (collectionMap.get(name) || 0) + 1);
  }

  const collections = [...collectionMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalCollections = collections.length;
  const unknownCollectionCount = collectionMap.get("Unknown collection") || 0;
  const namedCollections = collections.filter(
    (collection) => collection.name !== "Unknown collection"
  );
  const topCollectionsSource =
    namedCollections.length > 0 ? namedCollections : collections;

  const topCollections: TopCollection[] = topCollectionsSource
    .slice(0, 3)
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage: totalNFTs ? Math.round((item.count / totalNFTs) * 100) : 0,
    }));

  const focusIndex = calculateFocusIndex(collections, totalNFTs);
  const focusLabel = classifyCollectorFocus(focusIndex);

  const categoryDistribution = buildCategoryDistribution(nfts);
  const dominantCategory = getDominantCategory(categoryDistribution);
  const secondaryCategory = getSecondaryCategory(categoryDistribution);
  const otherPercentage =
    categoryDistribution.find((entry) => entry.category === "other")?.percentage || 0;
  const topCategoryMargin = getTopCategoryMargin(categoryDistribution);
  const categoryConfidence = getCategoryConfidence({
    totalNFTs,
    dominantCategory,
    otherPercentage,
    topCategoryMargin,
  });
  const categorySourceBreakdown = getCategorySourceBreakdown(nfts);
  const collectorIdentityLabel = buildCollectorIdentityLabel(
    focusLabel,
    dominantCategory,
    secondaryCategory,
    categoryDistribution,
    otherPercentage
  );

  return {
    totalNFTs,
    totalCollections,
    topCollections,
    unknownCollectionCount,
    focusIndex,
    focusLabel,
    categoryDistribution,
    dominantCategory,
    secondaryCategory,
    topCategoryMargin,
    otherPercentage,
    categoryConfidence,
    categorySourceBreakdown,
    collectorIdentityLabel,
  };
}