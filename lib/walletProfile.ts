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
  acquiredAt?: string;
  mintedAt?: string;
  blockTimestamp?: string;
  timeLastUpdated?: string;
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
  patternLine: string;
  identityParagraph: string;
  coreInsight: string;
  tensionInsight: string;
  whatStandsOut: string;
  anchorCollection: { name: string; count: number } | null;
  behavioralReads: string[];
  absenceSignal: string;
  repeatRatio: number;
  top1Percent: number;
  top3Percent: number;
  categoryCoexistenceCount: number;
  absentCategories: string[];
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

const COMMON_CATEGORIES = ["pfp", "generative", "fine_art", "meme", "utility"] as const;

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

function formatCategoryLabel(category: string) {
  return category.replace(/_/g, " ").trim().toLowerCase();
}

function pickVariant(seed: number, options: string[]) {
  if (!options.length) return "";
  const index = Math.abs(seed) % options.length;
  return options[index];
}

function getBreadthLevel(totalCollections: number, avgNFTsPerCollection: number) {
  if (totalCollections > 30 && avgNFTsPerCollection < 3) return "HIGH" as const;
  if (totalCollections >= 12) return "MEDIUM" as const;
  return "LOW" as const;
}

function buildPatternLine(params: {
  focusLabel: "Focused" | "Balanced" | "Explorer";
  repeatRatio: number;
  top1Percent: number;
  categoryCoexistenceCount: number;
}) {
  const { focusLabel, repeatRatio, top1Percent, categoryCoexistenceCount } = params;

  if (focusLabel === "Explorer" && repeatRatio > 0.25) {
    return "Wide range, repeat choices";
  }
  if (focusLabel === "Explorer" && top1Percent > 0.12) {
    return "Explores widely, commits in pockets";
  }
  if (focusLabel === "Explorer" && repeatRatio < 0.1) {
    return "Fast-moving, lightly attached";
  }
  if (focusLabel === "Focused" && categoryCoexistenceCount >= 3) {
    return "Tight focus, wide references";
  }
  if (focusLabel === "Focused") {
    return "Tight focus, high conviction";
  }
  if (focusLabel === "Balanced" && categoryCoexistenceCount >= 3) {
    return "Measured choices, surprising spread";
  }
  return "Selective eye, consistent instinct";
}

function buildCoreInsight(params: {
  breadthLevel: "HIGH" | "MEDIUM" | "LOW";
  repeatRatio: number;
  top1Percent: number;
  categoryCoexistenceCount: number;
  lowData: boolean;
  unknownRatio: number;
  seed: number;
}) {
  const {
    breadthLevel,
    repeatRatio,
    top1Percent,
    categoryCoexistenceCount,
    lowData,
    unknownRatio,
    seed,
  } = params;

  if (lowData) {
    return pickVariant(seed, [
      "Small sample, but you already return to the same kinds of work.",
      "Early read, but your attention already has a repeat pattern.",
    ]);
  }
  if (breadthLevel === "HIGH" && repeatRatio > 0.2) {
    return "You move widely, but your repeat choices are easy to spot.";
  }
  if (breadthLevel === "HIGH" && top1Percent > 0.12) {
    return "You move across scenes, but one collection keeps taking meaningful share.";
  }
  if (categoryCoexistenceCount >= 3) {
    return pickVariant(seed, [
      "You move between very different kinds of work, but the visual signal you respond to stays consistent.",
      "The formats change, but your cultural signal stays steady across the wallet.",
    ]);
  }
  if (unknownRatio > 0.25) {
    return "A meaningful part of this wallet refuses neat labels, and that feels intentional.";
  }
  if (repeatRatio > 0.2) {
    return "Even when the surface looks varied, your returns reveal a clear pull.";
  }
  return "";
}

function buildTensionInsight(params: {
  breadthLevel: "HIGH" | "MEDIUM" | "LOW";
  focusLabel: "Focused" | "Balanced" | "Explorer";
  top1Percent: number;
  categoryCoexistenceCount: number;
  unknownRatio: number;
  repeatRatio: number;
  lowData: boolean;
  seed: number;
}) {
  const {
    breadthLevel,
    focusLabel,
    top1Percent,
    categoryCoexistenceCount,
    unknownRatio,
    repeatRatio,
    lowData,
    seed,
  } = params;

  if (lowData) return "";

  if (
    breadthLevel === "HIGH" &&
    (repeatRatio > 0.1 || categoryCoexistenceCount >= 3)
  ) {
    return pickVariant(seed + 11, [
      "It looks open-ended at first. It is not.",
      "At first glance it reads like wandering. Then the repeats show up.",
      "Plenty of range on the surface. Underneath, you keep returning to the same thread.",
    ]);
  }

  if (focusLabel === "Explorer" && top1Percent > 0.12) {
    return pickVariant(seed, [
      "It looks scattered at first. It is not.",
      "Broad on the surface. Structured underneath.",
    ]);
  }
  if (focusLabel === "Focused" && categoryCoexistenceCount >= 3) {
    return "Fewer collections than most, but the taste runs in multiple directions.";
  }
  if (unknownRatio > 0.3 && repeatRatio > 0.2) {
    return "The pattern here is real. It just does not fit obvious categories.";
  }
  return "";
}

function buildWhatStandsOut(params: {
  top1Percent: number;
  top3Percent: number;
  focusLabel: "Focused" | "Balanced" | "Explorer";
  topCollection: { name: string; count: number } | null;
  repeatRatio: number;
  repeatCollectionsLength: number;
  absentCategories: string[];
  totalCollections: number;
}) {
  const {
    top1Percent,
    top3Percent,
    focusLabel,
    topCollection,
    repeatRatio,
    repeatCollectionsLength,
    absentCategories,
    totalCollections,
  } = params;

  if (focusLabel === "Explorer" && top3Percent > 0.35) {
    const pct = Math.round(top3Percent * 100);
    return `You move across a lot of collections, but ${pct}% sits in just three. That push and pull between breadth and return defines the wallet.`;
  }
  if (top1Percent > 0.15 && topCollection?.name) {
    const pct = Math.round(top1Percent * 100);
    return `${topCollection.name} holds ${pct}% on its own. You keep roaming, but you keep this one close.`;
  }
  if (repeatRatio > 0.3) {
    return `${repeatCollectionsLength} collections have three or more pieces. You are not just sampling, you are revisiting.`;
  }
  if (absentCategories.length >= 2) {
    return `Almost no movement into ${formatCategoryLabel(absentCategories[0])} or ${formatCategoryLabel(absentCategories[1])}. The taste boundary is sharper than most.`;
  }
  return `${totalCollections} collections with ${repeatCollectionsLength} repeat pockets. The wallet stays open without losing shape.`;
}

function buildIdentityParagraph(params: {
  breadthLevel: "HIGH" | "MEDIUM" | "LOW";
  repeatRatio: number;
  top1Percent: number;
  top3Percent: number;
  categoryCoexistenceCount: number;
  lowData: boolean;
  timeBehavior: "bursty" | "steady" | "";
  unknownRatio: number;
  anchorCollection: { name: string; count: number } | null;
  seed: number;
}) {
  const {
    breadthLevel,
    repeatRatio,
    top1Percent,
    top3Percent,
    categoryCoexistenceCount,
    lowData,
    timeBehavior,
    unknownRatio,
    anchorCollection,
    seed,
  } = params;

  if (lowData) {
    return pickVariant(seed, [
      "You move with curiosity, then return to specific pockets quickly. From the outside it reads exploratory. Underneath, the repeats are already visible. It suggests your taste is forming faster than the wallet is growing.",
      "You are early, but not undefined. You test different things, then revisit what lands. At a glance it looks open-ended. Underneath, there is already editing. It suggests clear taste, even at low volume.",
    ]);
  }

  const moveLine =
    breadthLevel === "HIGH"
      ? pickVariant(seed + 1, [
          "You move across a lot of territory.",
          "You move broadly, without committing everywhere.",
        ])
      : breadthLevel === "MEDIUM"
      ? pickVariant(seed + 2, [
          "You move selectively, with enough range to test different work.",
          "You keep a measured spread, then go deeper where it clicks.",
        ])
      : pickVariant(seed + 3, [
          "You move with concentration and stay close to a tighter set of collections.",
          "You keep attention tight, then build depth inside it.",
        ]);

  const surfaceLine =
    repeatRatio >= 0.2
      ? "From the outside this can read broad. In practice you return with intent."
      : "From the outside this can read open-ended. In practice your attention still edits hard.";

  const structureFacts: string[] = [];
  if (anchorCollection?.name && top1Percent > 0.1) {
    structureFacts.push(
      `one anchor holds about ${Math.round(top1Percent * 100)}% of your wallet`
    );
  }
  if (top3Percent > 0.3) {
    structureFacts.push(
      `${Math.round(top3Percent * 100)}% sits in your top three collections`
    );
  }
  if (categoryCoexistenceCount >= 3) {
    structureFacts.push(
      "you keep returning across very different kinds of work"
    );
  }

  const structureLine =
    structureFacts.length > 0
      ? `Under the surface, ${structureFacts.join(", ")}.`
      : "Under the surface, your attention has a quiet structure.";

  const suggestionParts: string[] = [];
  if (unknownRatio > 0.25)
    suggestionParts.push("You are comfortable trusting taste before labels catch up.");
  if (timeBehavior === "bursty")
    suggestionParts.push(
      "Your pattern moves in waves, with periods of concentrated motion."
    );
  if (timeBehavior === "steady")
    suggestionParts.push("Your pattern reads like steady practice, not occasional bursts.");

  const suggestionLine =
    suggestionParts[0] ||
    pickVariant(seed + 7, [
      "What that means is simple. You explore, but you do not collect by accident.",
      "What that means is you are not browsing. You are building a point of view.",
    ]);

  return [moveLine, surfaceLine, structureLine, suggestionLine].join(" ");
}

function buildBehavioralReads(params: {
  breadthHigh: boolean;
  repeatRatio: number;
  categoryCoexistenceCount: number;
  top1Percent: number;
  absentCategories: string[];
  timeBehavior: "bursty" | "steady" | "";
  lowData: boolean;
  firstAcquisition: string;
}) {
  const {
    breadthHigh,
    repeatRatio,
    categoryCoexistenceCount,
    top1Percent,
    absentCategories,
    timeBehavior,
    lowData,
    firstAcquisition,
  } = params;
  const reads: string[] = [];

  if (lowData) {
    reads.push("Early pattern, already directional");
  }
  if (breadthHigh && repeatRatio > 0.2) {
    reads.push("Moves wide, then repeats with intent");
  }
  if (repeatRatio > 0.2 && categoryCoexistenceCount >= 3) {
    reads.push("Repeats the same visual signal in very different work");
  }
  if (top1Percent > 0.12) {
    reads.push("Keeps one anchor while continuing to explore");
  }
  if (absentCategories.length >= 2) {
    reads.push(`Rarely moves into ${formatCategoryLabel(absentCategories[0])}`);
  }
  if (categoryCoexistenceCount >= 3) {
    reads.push("Moves between very different scenes without flattening taste");
  }
  if (breadthHigh && repeatRatio < 0.1) {
    reads.push("Prefers fresh territory over deep stacking");
  }
  if (timeBehavior === "steady") {
    reads.push("Builds steadily over time");
  }
  if (timeBehavior === "bursty") {
    reads.push("Moves in concentrated waves");
  }
  if (firstAcquisition) {
    const year = new Date(firstAcquisition).getUTCFullYear();
    if (year > 0 && year <= 2021) {
      reads.push("Tends to arrive early");
    }
  }

  return [...new Set(reads)].slice(0, 3);
}

function buildAbsenceSignal(absentCategories: string[]) {
  if (absentCategories.length >= 2) {
    return `Almost no presence in ${formatCategoryLabel(absentCategories[0])} or ${formatCategoryLabel(absentCategories[1])}.`;
  }
  return "";
}

function buildCollectorIdentityLabel(patternLine: string) {
  if (patternLine) return patternLine;
  return "Selective collector with clear instincts";
}

function extractTimestamp(nft: WalletProfileNFT) {
  const candidates = [
    nft.acquiredAt,
    nft.mintedAt,
    nft.blockTimestamp,
    nft.timeLastUpdated,
  ];
  for (const value of candidates) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return "";
}

function deriveTimeBehavior(nfts: WalletProfileNFT[]) {
  const timestamps = nfts
    .map(extractTimestamp)
    .filter(Boolean)
    .sort();

  if (timestamps.length < 6) {
    return {
      firstAcquisition: "",
      lastAcquisition: "",
      timeBehavior: "" as "bursty" | "steady" | "",
    };
  }

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const firstMs = new Date(first).getTime();
  const lastMs = new Date(last).getTime();
  const spanDays = Math.max(1, Math.floor((lastMs - firstMs) / 86400000));
  const activeDays = new Set(timestamps.map((value) => value.slice(0, 10))).size;
  const activeRatio = activeDays / spanDays;

  return {
    firstAcquisition: first,
    lastAcquisition: last,
    timeBehavior: (activeRatio < 0.2 ? "bursty" : "steady") as "bursty" | "steady",
  };
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
  const avgNFTsPerCollection = totalNFTs / Math.max(totalCollections, 1);
  const breadthLevel = getBreadthLevel(totalCollections, avgNFTsPerCollection);
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

  const repeatCollections = collections.filter((collection) => collection.count >= 3);
  const repeatRatio = repeatCollections.length / Math.max(totalCollections, 1);
  const top1Percent = (topCollectionsSource[0]?.count || 0) / Math.max(totalNFTs, 1);
  const top3Count = topCollectionsSource
    .slice(0, 3)
    .reduce((sum, collection) => sum + collection.count, 0);
  const top3Percent = top3Count / Math.max(totalNFTs, 1);

  const focusIndex = calculateFocusIndex(collections, totalNFTs);
  const focusLabel = classifyCollectorFocus(focusIndex);
  const lowData = totalNFTs < 20 || totalCollections < 5;

  const categoryDistribution = buildCategoryDistribution(nfts);
  const dominantCategory = getDominantCategory(categoryDistribution);
  const secondaryCategory = getSecondaryCategory(categoryDistribution);
  const otherPercentage =
    categoryDistribution.find((entry) => entry.category === "other")?.percentage || 0;
  const topCategoryMargin = getTopCategoryMargin(categoryDistribution);
  const dominantCategories = categoryDistribution.filter(
    (entry) => entry.category !== "other" && entry.percentage >= 8
  );
  const categoryCoexistenceCount = dominantCategories.length;
  const presentCategories = new Set(
    categoryDistribution
      .filter((entry) => entry.percentage >= 2)
      .map((entry) => entry.category)
  );
  const absentCategories = COMMON_CATEGORIES.filter(
    (category) => !presentCategories.has(category)
  );
  const categoryConfidence = getCategoryConfidence({
    totalNFTs,
    dominantCategory,
    otherPercentage,
    topCategoryMargin,
  });
  const unknownRatio = otherPercentage / 100;
  const breadthHigh = breadthLevel === "HIGH";
  const { firstAcquisition, timeBehavior } = deriveTimeBehavior(nfts);
  const seed = totalNFTs + totalCollections + focusIndex;

  const patternLine = buildPatternLine({
    focusLabel,
    repeatRatio,
    top1Percent,
    categoryCoexistenceCount,
  });

  const coreInsight = buildCoreInsight({
    breadthLevel,
    repeatRatio,
    top1Percent,
    categoryCoexistenceCount,
    lowData,
    unknownRatio,
    seed,
  });

  const tensionInsight = buildTensionInsight({
    breadthLevel,
    focusLabel,
    top1Percent,
    categoryCoexistenceCount,
    unknownRatio,
    repeatRatio,
    lowData,
    seed,
  });

  const anchorSource = collections.filter((collection) => collection.count >= 5);
  const anchorCandidate =
    anchorSource.sort((a, b) => b.count - a.count)[0] || topCollectionsSource[0] || null;
  const anchorCollection = anchorCandidate
    ? { name: anchorCandidate.name, count: anchorCandidate.count }
    : null;

  const whatStandsOut = buildWhatStandsOut({
    top1Percent,
    top3Percent,
    focusLabel,
    topCollection: topCollectionsSource[0] || null,
    repeatRatio,
    repeatCollectionsLength: repeatCollections.length,
    absentCategories,
    totalCollections,
  });

  const identityParagraph = buildIdentityParagraph({
    breadthLevel,
    repeatRatio,
    top1Percent,
    top3Percent,
    categoryCoexistenceCount,
    lowData,
    timeBehavior,
    unknownRatio,
    anchorCollection,
    seed,
  });

  const behavioralReads = buildBehavioralReads({
    breadthHigh,
    repeatRatio,
    categoryCoexistenceCount,
    top1Percent,
    absentCategories,
    timeBehavior,
    lowData,
    firstAcquisition,
  });

  const absenceSignal = buildAbsenceSignal(absentCategories);
  const categorySourceBreakdown = getCategorySourceBreakdown(nfts);
  const collectorIdentityLabel = buildCollectorIdentityLabel(patternLine);

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
    patternLine,
    identityParagraph,
    coreInsight,
    tensionInsight,
    whatStandsOut,
    anchorCollection,
    behavioralReads,
    absenceSignal,
    repeatRatio,
    top1Percent,
    top3Percent,
    categoryCoexistenceCount,
    absentCategories,
  };
}
