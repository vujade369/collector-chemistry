import { NextResponse } from "next/server";
import { fetchAndMergeWalletNFTsWithDebug, fetchWalletNFTsWithDebug, WalletFetchError } from "@/lib/fetchWalletNFTs";
import {
  buildWalletProfile,
  classifyCategoryWithSource,
  normalizeOpenSeaCategory,
  normalizeText,
  resolveCollectionName,
  type WalletProfileNFT,
} from "@/lib/walletProfile";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const DEFAULT_COLLECTION_CATEGORY_CAP = 25;
const CATEGORY_ENRICHMENT_TIMEOUT_MS = 10000;
const CATEGORY_ENRICHMENT_RESPONSE_BUDGET_MS = 2800;
const CATEGORY_ENRICHMENT_CONCURRENCY = 4;
const OPENSEA_MAX_EVENT_PAGES = 6;
const OPENSEA_EVENT_PAGE_LIMIT = 50;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function isEthAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isEns(value: string) {
  return /^[a-zA-Z0-9-]+\.eth$/.test(value.trim());
}

function isLikelyValidInput(value: string) {
  const trimmed = value.trim();
  return isEthAddress(trimmed) || isEns(trimmed);
}

type ResolveResult =
  | { ok: true; wallet: string; resolverStage: "direct_input" | "opensea_url" }
  | { ok: false; error: string; resolverStage: "input_parse" | "username_resolution" };

function resolveWalletInput(walletInput: string): ResolveResult {
  const trimmed = walletInput.trim();
  if (!trimmed) {
    return { ok: false, error: "Missing wallet", resolverStage: "input_parse" };
  }

  if (isLikelyValidInput(trimmed)) {
    return { ok: true, wallet: trimmed, resolverStage: "direct_input" };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isOpenSeaHost = host === "opensea.io" || host === "www.opensea.io";

    if (!isOpenSeaHost) {
      return { ok: false, error: "Enter a valid Ethereum address or ENS name.", resolverStage: "input_parse" };
    }

    const addressesParam = parsed.searchParams.get("addresses");
    if (addressesParam && isEthAddress(addressesParam)) {
      return { ok: true, wallet: addressesParam, resolverStage: "opensea_url" };
    }

    const pathSegment = parsed.pathname.split("/").filter(Boolean).pop() || "";
    if (isLikelyValidInput(pathSegment)) {
      return { ok: true, wallet: pathSegment, resolverStage: "opensea_url" };
    }

    return { ok: false, error: "OpenSea username resolution not supported yet. Please provide a 0x address or ENS.", resolverStage: "username_resolution" };
  } catch {
    const looksLikeHandle = /^[a-zA-Z0-9._-]+$/.test(trimmed);
    if (looksLikeHandle && !isEthAddress(trimmed) && !isEns(trimmed)) {
      return { ok: false, error: "OpenSea username resolution not supported yet. Please provide a 0x address or ENS.", resolverStage: "username_resolution" };
    }
    return { ok: false, error: "Enter a valid Ethereum address or ENS name.", resolverStage: "input_parse" };
  }
}

type OpenSeaContractResponse = {
  collection?: string;
  collections?: Array<{ slug?: string; category?: string }>;
  slug?: string;
};

type CategoryEnrichmentDebug = {
  collectionsCheckedForCategory: number;
  collectionsWithCategory: number;
  collectionsWithoutSlug: number;
  collectionsCategoryCap: number;
  categoryEnrichmentTimedOut: boolean;
  categoryEnrichmentConcurrency: number;
  categoryRequestsStarted: number;
  categoryRequestsCompleted: number;
  openseaCategorySamples: Array<{
    slug: string;
    endpoint: string;
    rawResponse: string;
    category: string | null;
    success: boolean;
  }>;
};

function createCategoryEnrichmentDebug(categoryCap: number): CategoryEnrichmentDebug {
  return {
    collectionsCheckedForCategory: 0,
    collectionsWithCategory: 0,
    collectionsWithoutSlug: 0,
    collectionsCategoryCap: categoryCap,
    categoryEnrichmentTimedOut: false,
    categoryEnrichmentConcurrency: CATEGORY_ENRICHMENT_CONCURRENCY,
    categoryRequestsStarted: 0,
    categoryRequestsCompleted: 0,
    openseaCategorySamples: [],
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutHandle!);
  return result;
}

async function fetchOpenSeaJson<T>(path: string, fallback: T): Promise<T> {
  if (!OPENSEA_API_KEY) return fallback;

  const request = fetch(`${OPENSEA_BASE_URL}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json", "X-API-KEY": OPENSEA_API_KEY },
  })
    .then(async (res) => {
      if (!res.ok) return fallback;
      try {
        return (await res.json()) as T;
      } catch {
        return fallback;
      }
    })
    .catch(() => fallback);

  return withTimeout(request, 5000, fallback);
}

type ProfileIdentity = {
  displayName: string | null;
  username: string | null;
  openseaUsername: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  openseaUrl: string | null;
};

async function fetchOpenSeaProfileIdentity(address: string): Promise<ProfileIdentity> {
  if (!OPENSEA_API_KEY) {
    return { displayName: null, username: null, openseaUsername: null, avatarUrl: null, bannerUrl: null, openseaUrl: null };
  }

  const data = await fetchOpenSeaJson<{
    username?: string | null;
    name?: string | null;
    profile_image_url?: string | null;
    banner_image_url?: string | null;
    account?: { username?: string | null; name?: string | null } | null;
    user?: { username?: string | null; name?: string | null } | null;
  }>(`/accounts/${address}`, {});

  const displayName =
    [data?.name, data?.account?.name, data?.username, data?.account?.username, data?.user?.name, data?.user?.username]
      .map((value) => String(value || "").trim())
      .find(Boolean) || null;

  const username =
    [data?.username, data?.account?.username, data?.user?.username]
      .map((value) => String(value || "").trim())
      .find(Boolean) || null;

  return {
    displayName,
    username,
    openseaUsername: username,
    avatarUrl: data?.profile_image_url || null,
    bannerUrl: data?.banner_image_url || null,
    openseaUrl: `https://opensea.io/${address}`,
  };
}

type DisplayCollection = {
  name?: string;
  imageUrl?: string;
  collectionSlug?: string;
  contractAddress?: string;
  openseaUrl?: string;
  category?: string;
};

function normalizeEntityKey(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/[^\w\s:/-]/g, " ").replace(/\s+/g, " ");
}

function buildCollectionDisplayIndex(nfts: WalletProfileNFT[], categoryGroups: Record<string, { previews?: Array<{ collectionName?: string; imageUrl?: string; collectionSlug?: string; contractAddress?: string }> }>, profile: ReturnType<typeof buildWalletProfile>) {
  const index = new Map<string, DisplayCollection>();
  const upsert = (entry: DisplayCollection) => {
    const keys = [
      normalizeEntityKey(entry.collectionSlug),
      normalizeEntityKey(entry.contractAddress),
      normalizeEntityKey(entry.name),
    ].filter(Boolean);
    for (const key of keys) {
      const current = index.get(key) || {};
      index.set(key, { ...current, ...Object.fromEntries(Object.entries(entry).filter(([, v]) => Boolean(v))) });
    }
  };

  for (const nft of nfts) {
    upsert({
      name: resolveCollectionName(nft),
      imageUrl: extractNFTImageUrl(nft) || undefined,
      collectionSlug: String(nft.displayCollectionSlug || "").trim() || undefined,
      contractAddress: normalizeAddress(nft.contract?.address || "") || undefined,
      category: normalizeOpenSeaCategory(nft.displayCollectionCategory || "") || undefined,
    });
  }
  if (profile.anchorCollection) upsert(profile.anchorCollection);
  if (profile.signalPiece) {
    upsert({
      name: profile.signalPiece.collectionName,
      imageUrl: profile.signalPiece.imageUrl,
      collectionSlug: profile.signalPiece.collectionSlug,
      contractAddress: profile.signalPiece.contractAddress,
      openseaUrl: profile.signalPiece.openseaUrl,
    });
  }
  for (const group of Object.values(categoryGroups || {})) {
    for (const preview of group?.previews || []) {
      upsert({
        name: preview.collectionName,
        imageUrl: preview.imageUrl,
        collectionSlug: preview.collectionSlug,
        contractAddress: preview.contractAddress,
      });
    }
  }
  return index;
}

async function enrichTopCollectionsDisplay(params: {
  topCollections: Array<{ name: string; count: number; percentage?: number; category?: string; imageUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string }>;
  displayIndex: Map<string, DisplayCollection>;
  cap?: number;
}) {
  const cap = Math.max(1, Math.min(params.cap || 3, 5));
  const cache = new Map<string, Promise<DisplayCollection>>();
  const fetchCollection = (seed: DisplayCollection) => {
    const cacheKey = JSON.stringify([seed.collectionSlug || "", seed.contractAddress || "", normalizeEntityKey(seed.name)]);
    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, (async () => {
        if (!OPENSEA_API_KEY) return {};
        if (seed.collectionSlug) {
          const data = await withTimeout(fetchOpenSeaJson<{ collection?: { slug?: string; name?: string; image_url?: string; category?: string; contracts?: Array<{ address?: string }> } }>(
            `/collections/${encodeURIComponent(seed.collectionSlug)}`,
            {}
          ), 1500, {});
          const collection = data?.collection;
          if (collection?.slug) {
            return {
              name: collection.name || seed.name,
              imageUrl: normalizeImageUrl(collection.image_url || ""),
              collectionSlug: collection.slug,
              openseaUrl: `https://opensea.io/collection/${collection.slug}`,
              contractAddress: normalizeAddress(collection.contracts?.[0]?.address || ""),
              category: normalizeOpenSeaCategory(collection.category || "") || undefined,
            };
          }
        }
        if (seed.contractAddress) {
          const contractData = await withTimeout(fetchOpenSeaJson<OpenSeaContractResponse>(`/chain/ethereum/contract/${seed.contractAddress}`, {}), 1500, {});
          const slug = String(contractData?.collection || contractData?.slug || contractData?.collections?.[0]?.slug || "").trim();
          if (slug) return fetchCollection({ ...seed, collectionSlug: slug });
        }
        return {};
      })());
    }
    return cache.get(cacheKey)!;
  };

  const enriched = await Promise.all(params.topCollections.map(async (collection, index) => {
    const local = params.displayIndex.get(normalizeEntityKey(collection.collectionSlug || collection.contractAddress || collection.name)) || {};
    let merged = { ...collection, ...local };
    if (!merged.openseaUrl && merged.collectionSlug) merged.openseaUrl = `https://opensea.io/collection/${merged.collectionSlug}`;
    if (index < cap && (!merged.imageUrl || !merged.collectionSlug || !merged.openseaUrl)) {
      const remote = await fetchCollection(merged);
      merged = { ...merged, ...remote, openseaUrl: remote.openseaUrl || merged.openseaUrl };
    }
    return merged;
  }));
  return enriched;
}

async function resolveWalletToAddress(wallet: string): Promise<string> {
  const value = wallet.trim();
  if (!value) return "";
  if (isEthAddress(value)) return value;
  if (!OPENSEA_API_KEY) return value;

  const resolved = await fetchOpenSeaJson<{ address?: string }>(
    `/accounts/resolve/${encodeURIComponent(value)}`,
    {}
  );
  const address = String(resolved?.address || "").trim();
  return isEthAddress(address) ? address : value;
}

function buildFirstMintLabel(timestamp?: string): string | null {
  const raw = String(timestamp || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function slugToDisplayName(slug: string): string {
  if (!slug) return "";
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function sanitizeRawResponse(raw: string) {
  return raw.slice(0, 500).replace(/\s+/g, " ").trim();
}

async function fetchCollectionCategoryWithSample(
  slug: string,
  samples: CategoryEnrichmentDebug["openseaCategorySamples"],
  timeoutMs = 5000
) {
  if (!OPENSEA_API_KEY || !slug) return null;

  const endpoint = `${OPENSEA_BASE_URL}/collections/${slug}`;
  try {
    const res = await withTimeout(
      fetch(endpoint, {
        cache: "no-store",
        headers: { accept: "application/json", "X-API-KEY": OPENSEA_API_KEY },
      }),
      timeoutMs,
      null as Response | null
    );
    if (!res) {
      if (samples.length < 5) {
        samples.push({ slug, endpoint, rawResponse: "request_timed_out", category: null, success: false });
      }
      return null;
    }
    const rawText = await res.text();
    const rawPreview = sanitizeRawResponse(rawText);

    let parsed: { category?: string; collection?: { category?: string } } = {};
    try {
      parsed = JSON.parse(rawText) as { category?: string; collection?: { category?: string } };
    } catch {
      parsed = {};
    }

    const rawCategory = parsed.collection?.category || parsed.category || null;
    const normalizedCategory = normalizeOpenSeaCategory(rawCategory || "");
    const finalCategory = normalizedCategory || null;

    if (samples.length < 5) {
      samples.push({ slug, endpoint, rawResponse: rawPreview, category: rawCategory, success: Boolean(finalCategory) });
    }

    return finalCategory;
  } catch {
    if (samples.length < 5) {
      samples.push({ slug, endpoint, rawResponse: "request_failed", category: null, success: false });
    }
    return null;
  }
}

function normalizeAddress(value?: string) {
  return String(value || "").toLowerCase();
}

async function enrichCollectionCategories(
  nfts: WalletProfileNFT[],
  categoryCap: number,
  stats = createCategoryEnrichmentDebug(categoryCap),
  timeoutMs = CATEGORY_ENRICHMENT_TIMEOUT_MS
): Promise<{ enrichedNFTs: WalletProfileNFT[]; debug: CategoryEnrichmentDebug }> {
  const collectionBuckets = new Map<string, { nfts: WalletProfileNFT[]; count: number; name: string }>();

  for (const nft of nfts) {
    const collectionName = resolveCollectionName(nft);
    const key = normalizeText(collectionName);
    const bucket = collectionBuckets.get(key);
    if (bucket) {
      bucket.nfts.push(nft);
      bucket.count += 1;
      continue;
    }
    collectionBuckets.set(key, { nfts: [nft], count: 1, name: collectionName });
  }

  const topCollections = [...collectionBuckets.values()].sort((a, b) => b.count - a.count).slice(0, categoryCap);
  const categoryCache = new Map<string, string | null>();
  const slugCache = new Map<string, string | null>();
  const enrichStartMs = Date.now();
  let nextCollectionIndex = 0;
  const remainingBudgetMs = () => Math.max(0, timeoutMs - (Date.now() - enrichStartMs));

  async function processCollection(collection: { nfts: WalletProfileNFT[]; count: number; name: string }) {
    stats.collectionsCheckedForCategory += 1;
    stats.categoryRequestsStarted += 1;

    const sample = collection.nfts[0];
    const contractAddress = normalizeAddress(sample?.contract?.address);
    const normalizedName = normalizeText(collection.name);
    const prefilledSlug = String(sample?.displayCollectionSlug || "").trim();

    const cacheKeys = [
      prefilledSlug ? `slug:${prefilledSlug}` : "",
      contractAddress ? `contract:${contractAddress}` : "",
      normalizedName ? `name:${normalizedName}` : "",
    ].filter(Boolean);

    let resolvedCategory: string | null = null;
    for (const key of cacheKeys) {
      if (categoryCache.has(key)) {
        resolvedCategory = categoryCache.get(key) || null;
        break;
      }
    }

    let resolvedSlug = prefilledSlug || "";
    if (!resolvedSlug && contractAddress) {
      const remainingMs = remainingBudgetMs();
      if (remainingMs <= 0) {
        stats.categoryEnrichmentTimedOut = true;
        return;
      }
      const contractSlugKey = `contract:${contractAddress}`;
      if (slugCache.has(contractSlugKey)) {
        resolvedSlug = slugCache.get(contractSlugKey) || "";
      } else {
        const contractData = await withTimeout(
          fetchOpenSeaJson<OpenSeaContractResponse>(
            `/chain/ethereum/contract/${contractAddress}`,
            {} as OpenSeaContractResponse
          ),
          remainingMs,
          {} as OpenSeaContractResponse
        );
        resolvedSlug = String(contractData?.collection || contractData?.slug || contractData?.collections?.[0]?.slug || "").trim();
        slugCache.set(contractSlugKey, resolvedSlug || null);
      }
    }

    if (!resolvedCategory && resolvedSlug) {
      const slugKey = `slug:${resolvedSlug}`;
      if (categoryCache.has(slugKey)) {
        resolvedCategory = categoryCache.get(slugKey) || null;
      } else {
        const remainingMs = remainingBudgetMs();
        if (remainingMs <= 0) {
          stats.categoryEnrichmentTimedOut = true;
        } else {
          resolvedCategory = await fetchCollectionCategoryWithSample(
            resolvedSlug,
            stats.openseaCategorySamples,
            remainingMs
          );
        }
        categoryCache.set(slugKey, resolvedCategory);
      }
    }

    if (!resolvedCategory) {
      const contractKey = contractAddress ? `contract:${contractAddress}` : "";
      const nameKey = normalizedName ? `name:${normalizedName}` : "";
      if (contractKey && categoryCache.has(contractKey)) {
        resolvedCategory = categoryCache.get(contractKey) || null;
      } else if (nameKey && categoryCache.has(nameKey)) {
        resolvedCategory = categoryCache.get(nameKey) || null;
      }
    }

    if (!resolvedSlug) stats.collectionsWithoutSlug += 1;
    if (resolvedCategory) stats.collectionsWithCategory += 1;

    for (const key of cacheKeys) {
      if (!categoryCache.has(key)) categoryCache.set(key, resolvedCategory);
    }

    for (const nft of collection.nfts) {
      nft.displayCollectionSlug = nft.displayCollectionSlug || resolvedSlug || undefined;
      if (resolvedCategory) {
        nft.displayCollectionCategory = resolvedCategory;
        nft.displayCategorySource = "opensea";
      }
    }
  }

  async function runCategoryWorker() {
    while (nextCollectionIndex < topCollections.length) {
      if (Date.now() - enrichStartMs >= timeoutMs) {
        stats.categoryEnrichmentTimedOut = true;
        return;
      }

      const collection = topCollections[nextCollectionIndex];
      nextCollectionIndex += 1;
      await processCollection(collection);
      stats.categoryRequestsCompleted += 1;
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(CATEGORY_ENRICHMENT_CONCURRENCY, topCollections.length) },
      () => runCategoryWorker()
    )
  );

  return { enrichedNFTs: nfts, debug: stats };
}

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
  };
};

type OpenSeaAccountEventNft = {
  contract?: string;
  identifier?: string | number;
  collection?: string;
  image_url?: string;
  display_image_url?: string;
  name?: string;
};

type OpenSeaAccountEvent = {
  event_timestamp?: string | number;
  sent_at?: string;
  from_address?: string;
  to_address?: string;
  winner_account?: { address?: string };
  nft?: OpenSeaAccountEventNft;
};

type OpenSeaAccountEventsResponse = {
  asset_events?: OpenSeaAccountEvent[];
  events?: OpenSeaAccountEvent[];
  next?: string | null;
};

type ResolvedDisplayMetadata = { title?: string; collectionName?: string; imageUrl?: string };

function normalizeImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

function extractNFTAnimationUrl(nft: WalletProfileNFT): string {
  return normalizeImageUrl(
    nft.raw?.metadata?.display_animation_url ||
    nft.raw?.metadata?.animation_url ||
    ""
  );
}

function extractNFTImageUrl(nft: WalletProfileNFT) {
  return normalizeImageUrl(
    nft.image?.cachedUrl ||
    nft.image?.thumbnailUrl ||
    nft.image?.originalUrl ||
    nft.raw?.metadata?.display_image_url ||
    nft.raw?.metadata?.image_url ||
    nft.raw?.metadata?.image ||
    nft.contract?.openSeaMetadata?.imageUrl ||
    ""
  );
}

function buildTasteDNA(nfts: WalletProfileNFT[]) {
  const counts: Record<string, number> = {};
  nfts.forEach((nft) => {
    const type = classifyCategoryWithSource(nft).category;
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

function buildCategoryGroups(nfts: WalletProfileNFT[]): Record<string, {
  totalCount: number;
  previews: Array<{ title: string; tokenId?: string; collectionName: string; imageUrl: string; animationUrl?: string; collectionSlug?: string; contractAddress?: string; openseaUrl?: string }>;
  collections: Array<{ name: string; count: number }>;
}> {
  const grouped = new Map<string, WalletProfileNFT[]>();

  for (const nft of nfts) {
    const category = classifyCategoryWithSource(nft).category;
    if (category === "other") continue;
    const bucket = grouped.get(category);
    if (bucket) {
      bucket.push(nft);
    } else {
      grouped.set(category, [nft]);
    }
  }

  const entries = [...grouped.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => {
      const previews = items.slice(0, 4).map((nft) => {
        const collectionName = resolveCollectionName(nft);
        const animationUrl = extractNFTAnimationUrl(nft) || undefined;
        const imageUrl = extractNFTImageUrl(nft) || nft.contract?.openSeaMetadata?.imageUrl || "";
        const collectionSlug = String(nft.displayCollectionSlug || "").trim().toLowerCase() || undefined;
        const contractAddress = String(nft.contract?.address || "").trim().toLowerCase() || undefined;
        const tokenId = String(nft.tokenId || "").trim() || undefined;
        const openseaUrl = contractAddress && tokenId
          ? `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
          : collectionSlug
            ? `https://opensea.io/collection/${collectionSlug}`
            : undefined;
        return { title: nft.name || nft.title || collectionName, tokenId, collectionName, imageUrl, animationUrl, collectionSlug, contractAddress, openseaUrl };
      });

      const collectionCounts = new Map<string, number>();
      for (const nft of items) {
        const collectionName = resolveCollectionName(nft);
        if (collectionName === "Unknown collection") continue;
        collectionCounts.set(collectionName, (collectionCounts.get(collectionName) || 0) + 1);
      }

      const collections = [...collectionCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return [category, { totalCount: items.length, previews, collections }] as const;
    })
    .sort((a, b) => b[1].totalCount - a[1].totalCount);

  return Object.fromEntries(entries);
}

async function fetchOpenSeaAsset(contractAddress: string, tokenId: string): Promise<ResolvedDisplayMetadata> {
  if (!contractAddress || !tokenId) return {};

  const data = await fetchOpenSeaJson<OpenSeaAssetResponse>(
    `/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`,
    {} as OpenSeaAssetResponse
  );

  const payload = data.nft || {};
  const collection = payload.collection;
  const collectionNameRaw = typeof collection === "string" ? collection : collection?.name || "";
  const collectionName = collectionNameRaw.includes("-") && !collectionNameRaw.includes(" ")
    ? slugToDisplayName(collectionNameRaw)
    : collectionNameRaw;
  const title = payload.name || "";
  const imageUrl = normalizeImageUrl(
    payload.display_image_url || payload.image_url || payload.image_preview_url || payload.image_original_url || ""
  );
  return { title, collectionName, imageUrl };
}

async function fetchFirstMint(address: string): Promise<{
  nft: { contractAddress: string; tokenId: string; collectionName: string; imageUrl: string; title: string };
  timestamp: string;
} | null> {
  if (!ALCHEMY_API_KEY) return null;

  try {
    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        toAddress: normalizeAddress(address),
        fromAddress: ZERO_ADDRESS,
        category: ["erc721", "erc1155"],
        withMetadata: true,
        excludeZeroValue: false,
        maxCount: "0xa",
        order: "asc",
      }],
    };

    const res = await withTimeout(
      fetch(alchemyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" }),
      8000,
      null as unknown as Response
    );

    if (!res || !res.ok) return null;

    const json = (await res.json()) as {
      result?: {
        transfers?: Array<{
          from: string;
          to: string;
          contractAddress: string;
          tokenId: string | null;
          erc1155Metadata?: Array<{ tokenId: string }> | null;
          asset: string | null;
          metadata?: { blockTimestamp?: string };
          rawContract?: { address?: string };
        }>;
      };
    };

    const transfers = json?.result?.transfers || [];
    if (!transfers.length) return null;

    const first = transfers[0];
    const contractAddress = normalizeAddress(first.contractAddress || first.rawContract?.address || "");
    const rawTokenId = first.tokenId || first.erc1155Metadata?.[0]?.tokenId || "";
    const tokenId = rawTokenId.startsWith("0x") ? String(BigInt(rawTokenId)) : String(rawTokenId);
    const timestamp = first.metadata?.blockTimestamp || "";

    if (!contractAddress || !tokenId) return null;

    const displayMeta = await fetchOpenSeaAsset(contractAddress, String(tokenId));

    return {
      nft: {
        contractAddress,
        tokenId: String(tokenId),
        collectionName: displayMeta.collectionName || first.asset || "Unknown collection",
        imageUrl: displayMeta.imageUrl || "",
        title: displayMeta.title || (first.asset ? `${first.asset} #${tokenId}` : `#${tokenId}`),
      },
      timestamp,
    };
  } catch {
    return null;
  }
}

async function fetchAcquisitionBreakdown(address: string): Promise<{
  mintCount: number;
  acquiredCount: number;
  totalSampled: number;
  mintPercent: number;
  acquiredPercent: number;
}> {
  if (!OPENSEA_API_KEY) {
    return { mintCount: 0, acquiredCount: 0, totalSampled: 0, mintPercent: 0, acquiredPercent: 0 };
  }

  try {
    const target = normalizeAddress(address);
    let next = "";
    let mintCount = 0;
    let acquiredCount = 0;

    for (let page = 0; page < OPENSEA_MAX_EVENT_PAGES; page += 1) {
      const params = new URLSearchParams({ limit: String(OPENSEA_EVENT_PAGE_LIMIT), event_type: "transfer" });
      if (next) params.set("next", next);

      const data = await fetchOpenSeaJson<OpenSeaAccountEventsResponse>(
        `/events/accounts/${target}?${params.toString()}`,
        { events: [], asset_events: [], next: null }
      );

      const events = data.events || data.asset_events || [];

      for (const event of events) {
        if (normalizeAddress(event.to_address || event.winner_account?.address) !== target) continue;
        if (normalizeAddress(event.from_address) === ZERO_ADDRESS) {
          mintCount += 1;
        } else {
          acquiredCount += 1;
        }
      }

      next = String(data.next || "");
      if (!next || !events.length) break;
    }

    const totalSampled = mintCount + acquiredCount;
    if (totalSampled === 0) {
      return { mintCount, acquiredCount, totalSampled, mintPercent: 0, acquiredPercent: 0 };
    }

    const mintPercent = Math.round((mintCount / totalSampled) * 100);
    const acquiredPercent = Math.max(0, 100 - mintPercent);
    return { mintCount, acquiredCount, totalSampled, mintPercent, acquiredPercent };
  } catch {
    return { mintCount: 0, acquiredCount: 0, totalSampled: 0, mintPercent: 0, acquiredPercent: 0 };
  }
}

function weiToEth(wei: string): string {
  const value = String(wei || "").trim();
  if (!value || !/^\d+$/.test(value)) return "0";
  const full = value.padStart(19, "0");
  const intPart = full.slice(0, -18).replace(/^0+(?=\d)/, "");
  const fracPart = full.slice(-18).replace(/0+$/, "");
  if (!fracPart) return intPart || "0";
  return `${intPart || "0"}.${fracPart}`;
}

type MarketAttention = {
  ethAmountLabel: string;
  collectionName: string | null;
  title: string | null;
  imageUrl: string | null;
  contractAddress: string | null;
  collectionSlug: string | null;
  tokenId: string | null;
  openseaUrl: string | null;
  sourceLabel: string;
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
};

type ProfileTopArtist = {
  name: string;
  count: number;
  imageUrl?: string;
  sourceLabel?: string;
  openseaUrl?: string;
  externalUrl?: string;
};

function normalizeTokenIdForOpenSea(raw: unknown): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (/^0x[0-9a-f]+$/i.test(value)) {
    const asInt = parseInt(value, 16);
    if (!Number.isNaN(asInt)) return String(asInt);
  }
  if (/^\d+$/.test(value)) return value;
  return null;
}

function pickTokenId(nft: WalletProfileNFT): string | null {
  const candidate =
    (nft as WalletProfileNFT & { tokenId?: unknown; identifier?: unknown; id?: unknown }).tokenId ??
    (nft as WalletProfileNFT & { identifier?: unknown }).identifier ??
    (nft as WalletProfileNFT & { id?: unknown }).id;
  return normalizeTokenIdForOpenSea(candidate);
}

async function fetchTopOfferViaOpenSeaMcp(walletAddress: string): Promise<MarketAttention | null> {
  if (!OPENSEA_API_KEY || !isEthAddress(walletAddress)) return null;

  try {
    const task = async () => {
      const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
        import("@modelcontextprotocol/sdk/client/index.js"),
        import("@modelcontextprotocol/sdk/client/streamableHttp.js"),
      ]);

      const client = new Client({ name: "collector-chemistry-market-attention", version: "1.0.0" });
      const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.opensea.io/mcp"),
        {
          requestInit: {
            headers: { "X-API-KEY": OPENSEA_API_KEY },
          },
        }
      );

      try {
        await client.connect(transport);
        const toolResult = await client.callTool({
          name: "get_nft_balances",
          arguments: {
            address: walletAddress,
            sortBy: "TOP_OFFER",
            sortDirection: "DESC",
            limit: 5,
          },
        });

        const textPayload = Array.isArray(toolResult?.content)
          ? toolResult.content.find((part) => part?.type === "text")?.text
          : null;
        if (!textPayload) return null;

const parsed = JSON.parse(textPayload) as {
  items?: Array<Record<string, unknown>>;
  nfts?: Array<Record<string, unknown>>;
  data?: {
    items?: Array<Record<string, unknown>>;
    nfts?: Array<Record<string, unknown>>;
  };
};

const items = Array.isArray(parsed?.items)
  ? parsed.items
  : Array.isArray(parsed?.nfts)
    ? parsed.nfts
    : Array.isArray(parsed?.data?.items)
      ? parsed.data.items
      : Array.isArray(parsed?.data?.nfts)
        ? parsed.data.nfts
        : [];
        if (!items.length) return null;

        for (const rawItem of items) {
          const item = rawItem as {
            name?: string;
            imageUrl?: string;
            contractAddress?: string;
            tokenId?: string | number;
            collection?: { name?: string; slug?: string };
            bestOffer?: {
              pricePerItem?: {
                native?: { unit?: string | number; symbol?: string };
                token?: { unit?: string | number; symbol?: string };
              };
            };
          };
          const bestOffer = item.bestOffer?.pricePerItem;
          if (!bestOffer) continue;

          const contractAddress = normalizeAddress(item.contractAddress || "");
          const tokenId = normalizeTokenIdForOpenSea(item.tokenId);
          const collectionSlug = String(item.collection?.slug || "").trim();
          if (!contractAddress || !tokenId || !collectionSlug) continue;

          const nativeUnitRaw = String(bestOffer.native?.unit ?? "").trim();
          const tokenUnitRaw = String(bestOffer.token?.unit ?? "").trim();
          const amountRaw = nativeUnitRaw || tokenUnitRaw;
          if (!amountRaw) continue;

          const amount = Number(String(amountRaw).replace(/,/g, ""));
          if (!Number.isFinite(amount) || amount <= 0) continue;

          const symbol = String(bestOffer.token?.symbol || bestOffer.native?.symbol || "ETH").trim() || "ETH";
          const ethAmountLabel = `${amount.toFixed(2)} ${symbol.toUpperCase()}`;

          return {
            ethAmountLabel,
            collectionName: String(item.collection?.name || "").trim() || collectionSlug,
            title: String(item.name || "").trim() || null,
            imageUrl: String(item.imageUrl || "").trim() || null,
            contractAddress,
            tokenId,
            collectionSlug,
            openseaUrl: `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`,
            sourceLabel: "Highest current offer",
          };
        }
      } finally {
        try {
          await client.close();
        } catch {}
      }

      return null;
    };

    return await withTimeout(task(), 10000, null as MarketAttention | null);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("MCP market attention lookup failed", error);
    }
    return null;
  }
}

async function fetchMarketAttention(
  nfts: WalletProfileNFT[],
  resolvedAddress?: string
): Promise<MarketAttention | null> {
  if (!OPENSEA_API_KEY || !nfts.length) return null;

  try {
    return await withTimeout((async () => {
      let candidates: Array<{
        slug: string;
        tokenId: string;
        name: string | null;
        imageUrl: string | null;
        openseaUrl: string | null;
        contractAddress: string | null;
      }> = [];

      if (resolvedAddress && isEthAddress(resolvedAddress)) {
        const inventory = await fetchOpenSeaJson<{
          nfts?: Array<{
            identifier?: string;
            collection?: string;
            name?: string;
            image_url?: string;
            display_image_url?: string;
            opensea_url?: string;
            contract?: string;
          }>;
        }>(
          `/chain/ethereum/account/${encodeURIComponent(resolvedAddress)}/nfts?limit=200`,
          {}
        );

        const inventoryNfts = Array.isArray(inventory?.nfts) ? inventory.nfts : [];
        if (inventoryNfts.length) {
          candidates = inventoryNfts
            .map((nft) => {
              const tokenId = normalizeTokenIdForOpenSea(nft?.identifier);
              const slug = String(nft?.collection || "").trim();
              if (!tokenId || !slug) return null;
              return {
                slug,
                tokenId,
                name: String(nft?.name || "").trim() || null,
                imageUrl: String(nft?.image_url || nft?.display_image_url || "").trim() || null,
                openseaUrl: String(nft?.opensea_url || "").trim() || null,
                contractAddress: normalizeAddress(nft?.contract || "") || null,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
        }
      }

      if (!candidates.length) {
        const contractToSlug = new Map<string, string | null>();
        const contractsNeedingLookup: string[] = [];
        for (const nft of nfts) {
          if (String(nft.displayCollectionSlug || "").trim()) continue;
          const contract = normalizeAddress(nft.contract?.address || "");
          if (contract && !contractToSlug.has(contract) && !contractsNeedingLookup.includes(contract)) {
            contractsNeedingLookup.push(contract);
          }
        }

        await Promise.all(
          contractsNeedingLookup.slice(0, 80).map(async (contractAddress) => {
            const contractData = await fetchOpenSeaJson<OpenSeaContractResponse>(
              `/chain/ethereum/contract/${contractAddress}`,
              {} as OpenSeaContractResponse
            );
            const slug = String(
              contractData?.collection ||
              contractData?.slug ||
              contractData?.collections?.[0]?.slug ||
              ""
            ).trim();
            contractToSlug.set(contractAddress, slug || null);
          })
        );

        candidates = nfts
          .map((nft) => {
            const tokenId = pickTokenId(nft);
            if (!tokenId) return null;
            let slug = String(nft.displayCollectionSlug || "").trim();
            if (!slug) {
              const contract = normalizeAddress(nft.contract?.address || "");
              slug = String(contractToSlug.get(contract) || "").trim();
            }
            if (!slug) return null;
            return {
              slug,
              tokenId,
              name: String(nft.name || nft.title || "").trim() || null,
              imageUrl: extractNFTImageUrl(nft) || null,
              openseaUrl: null,
              contractAddress: normalizeAddress(nft.contract?.address || "") || null,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
      }

      if (!candidates.length) return null;

      // Cap to 15 candidates, prioritizing NFTs from top collections by count in this wallet
      if (candidates.length > 15) {
        const slugCounts = new Map<string, number>();
        for (const c of candidates) slugCounts.set(c.slug, (slugCounts.get(c.slug) || 0) + 1);
        const topSlugs = [...slugCounts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
        const seen = new Set<string>();
        const capped: typeof candidates = [];
        for (const slug of topSlugs) {
          if (capped.length >= 15) break;
          const hit = candidates.find((c) => c.slug === slug && !seen.has(`${c.slug}:${c.tokenId}`));
          if (hit) { capped.push(hit); seen.add(`${hit.slug}:${hit.tokenId}`); }
        }
        candidates = capped;
      }

      const responses = await Promise.all(
        candidates.map(async ({ slug, tokenId, name, imageUrl, openseaUrl, contractAddress }) => {
        const data = await fetchOpenSeaJson<{
          price?: { value?: string; currency?: string };
          protocol_data?: {
            parameters?: {
              offer?: Array<{ startAmount?: string }>;
              consideration?: Array<{ token?: string }>;
            };
          };
        }>(`/offers/collection/${encodeURIComponent(slug)}/nfts/${encodeURIComponent(tokenId)}/best`, {});

        const weiValue =
          String(data?.price?.value || "").trim() ||
          String(data?.protocol_data?.parameters?.offer?.[0]?.startAmount || "").trim();
        if (!weiValue || !/^\d+$/.test(weiValue)) return null;

        const eth = Number(weiToEth(weiValue));
        if (!Number.isFinite(eth) || eth <= 0) return null;

        // Filter out bundle/sweep offers that require selling more than 1 NFT
type SeaportConsiderationItem = {
  itemType?: number;
  startAmount?: string | number;
  token?: string;
};

const consideration =
  (data?.protocol_data?.parameters?.consideration ?? []) as SeaportConsiderationItem[];

const nftConsideration = consideration.find(
  (c) => c.itemType === 4 || c.itemType === 3 // ERC1155 or ERC721 criteria
);

const nftQuantity = Number(nftConsideration?.startAmount || 1);
if (nftQuantity > 1) return null;

const currency = String(data?.price?.currency || "ETH").trim().toUpperCase();
const currencyLabel = currency === "WETH" ? "WETH" : "ETH";

const normalizedContractAddress = normalizeAddress(
  contractAddress ||
    consideration[0]?.token ||
    ""
);

        return {
          eth,
          weiValue,
          currencyLabel,
          contractAddress: normalizedContractAddress || null,
          tokenId,
          title: name || null,
          imageUrl: imageUrl || null,
          collectionName: slug || null,
          collectionSlug: slug,
          openseaUrl: openseaUrl || null,
        };
        })
      );

      const valid = responses.filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
      );
      if (!valid.length) return null;

      valid.sort((a, b) => b.eth - a.eth);
      const winner = valid[0];

      let finalTitle = winner.title;
      let finalImageUrl = winner.imageUrl;
      let finalCollectionName = winner.collectionName || winner.collectionSlug || null;
      let finalOpenseaUrl = winner.openseaUrl;

      if ((!finalTitle || !finalImageUrl) && winner.contractAddress && winner.tokenId) {
        const enriched = await fetchOpenSeaAsset(winner.contractAddress, winner.tokenId);
        finalTitle = finalTitle || enriched.title || null;
        finalImageUrl = finalImageUrl || enriched.imageUrl || null;
        finalCollectionName = finalCollectionName || enriched.collectionName || null;
        finalOpenseaUrl = finalOpenseaUrl || null;
      }

      return {
        ethAmountLabel: `${Number(weiToEth(winner.weiValue)).toFixed(3)} ${winner.currencyLabel}`,
        collectionName: finalCollectionName || null,
        title: finalTitle || null,
        imageUrl: finalImageUrl || null,
        contractAddress: winner.contractAddress,
        tokenId: winner.tokenId,
        collectionSlug: winner.collectionSlug || null,
        openseaUrl: finalOpenseaUrl || (
          winner.contractAddress && winner.tokenId
            ? `https://opensea.io/item/ethereum/${winner.contractAddress}/${winner.tokenId}`
            : null
        ),
        sourceLabel: "Highest current offer",
      };
    })(), 30000, null as MarketAttention | null);
  } catch {
    return null;
  }
}


async function fetchLatestArrivalSignal(
  wallets: string[],
  alchemyApiKey: string
): Promise<ProfileNFTSignal | null> {
  if (!OPENSEA_API_KEY || !wallets.length) return null;

  try {
    // Use OpenSea events endpoint — returns all event types (transfer, mint, sale, airdrop)
    // sorted by most recent. Filter to events where to_address matches the wallet.
    const walletSet = new Set(wallets.map((w) => normalizeAddress(w)).filter(Boolean));

    const task = async () => {
      for (const wallet of wallets) {
        const data = await fetchOpenSeaJson<{
          asset_events?: Array<{
            event_type?: string;
            event_timestamp?: number;
            to_address?: string;
            from_address?: string;
            nft?: {
              identifier?: string;
              collection?: string;
              contract?: string;
              name?: string;
              image_url?: string;
              opensea_url?: string;
            };
          }>;
        }>(`/events/accounts/${encodeURIComponent(wallet)}?limit=20`, { asset_events: [] });

        const events = data?.asset_events || [];

        // Find the most recent event where this wallet is the recipient
        // and an NFT was received (transfer, mint, sale, airdrop all count)
        const arrival = events.find((e) => {
          const toAddress = normalizeAddress(e.to_address || "");
          return walletSet.has(toAddress) && e.nft?.identifier;
        });

        if (!arrival?.nft) continue;

        const nft = arrival.nft;
        const contractAddress = normalizeAddress(nft.contract || "") || undefined;
        const tokenId = nft.identifier || undefined;
        const timestamp = arrival.event_timestamp
          ? new Date(arrival.event_timestamp * 1000).toISOString()
          : undefined;

        return {
          title: nft.name || tokenId || undefined,
          name: nft.name || undefined,
          collectionName: nft.collection || undefined,
          contractAddress,
          tokenId,
          imageUrl: nft.image_url || undefined,
          openseaUrl: nft.opensea_url ||
            (contractAddress && tokenId
              ? `https://opensea.io/item/ethereum/${contractAddress}/${tokenId}`
              : undefined),
          timestamp,
          sourceLabel: "Recent Signal",
        } as ProfileNFTSignal;
      }

      return null;
    };

    return await withTimeout(task(), 8000, null as ProfileNFTSignal | null);
  } catch {
    return null;
  }
}


function normalizeArtistValue(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getArtistCandidate(nft: WalletProfileNFT): { name: string; sourceLabel: string; externalUrl?: string } | null {
  const attributeSets = [nft.metadata?.attributes, nft.raw?.metadata?.attributes].filter(Boolean);
  const keys = new Set(["artist", "creator", "created by", "seize artist profile"]);

 for (const attributes of attributeSets) {
  if (!Array.isArray(attributes)) continue;

  for (const attribute of attributes) {
    if (!attribute || typeof attribute !== "object") continue;

    const traitType = normalizeArtistValue(
      (attribute as { trait_type?: unknown; traitType?: unknown; type?: unknown }).trait_type ??
        (attribute as { trait_type?: unknown; traitType?: unknown; type?: unknown }).traitType ??
        (attribute as { trait_type?: unknown; traitType?: unknown; type?: unknown }).type
    );

    if (!keys.has(traitType)) continue;

    const name = normalizeArtistValue(
      (attribute as { value?: unknown; name?: unknown }).value ??
        (attribute as { value?: unknown; name?: unknown }).name
    );

    if (name) return { name, sourceLabel: "Artist attribute" };
  }
}

  const creatorName = normalizeArtistValue((nft as WalletProfileNFT & { creator?: { username?: string; address?: string } }).creator?.username);
  if (creatorName) return { name: creatorName, sourceLabel: "Creator profile" };

  return null;
}

function buildTopArtists(nfts: WalletProfileNFT[]): ProfileTopArtist[] {
  const artistMap = new Map<string, ProfileTopArtist>();
  for (const nft of nfts) {
    const candidate = getArtistCandidate(nft);
    if (!candidate?.name) continue;
    const key = candidate.name.toLowerCase();
    const existing = artistMap.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.imageUrl) existing.imageUrl = extractNFTImageUrl(nft) || undefined;
      continue;
    }
    artistMap.set(key, {
      name: candidate.name,
      count: 1,
      imageUrl: extractNFTImageUrl(nft) || undefined,
      sourceLabel: candidate.sourceLabel,
      externalUrl: candidate.externalUrl,
    });
  }

  return Array.from(artistMap.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3);
}

function toProfileSignalFromMarketAttention(marketAttention: MarketAttention | null): ProfileNFTSignal | null {
  if (!marketAttention) return null;
  return {
    title: marketAttention.title || undefined,
    name: marketAttention.title || undefined,
    tokenId: marketAttention.tokenId || undefined,
    collectionName: marketAttention.collectionName || undefined,
    collectionSlug: marketAttention.collectionSlug || undefined,
    contractAddress: marketAttention.contractAddress || undefined,
    imageUrl: marketAttention.imageUrl || undefined,
    openseaUrl: marketAttention.openseaUrl || undefined,
    ethAmountLabel: marketAttention.ethAmountLabel || undefined,
    sourceLabel: marketAttention.sourceLabel || undefined,
  };
}
export async function GET(req: Request) {
  const totalStartMs = Date.now();
  const { searchParams } = new URL(req.url);
  const walletInput = searchParams.get("wallet")?.trim() || "";
  const walletInputs = walletInput.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 5);
  const categoryCapInput = Number(searchParams.get("categoryCap"));
  const categoryCap =
    Number.isFinite(categoryCapInput) && categoryCapInput > 0
      ? Math.floor(categoryCapInput)
      : DEFAULT_COLLECTION_CATEGORY_CAP;
  if (walletInputs.length === 0) {
    return NextResponse.json(
      {
        error: "Missing wallet",
        errorType: "INVALID_WALLET_INPUT",
        walletInput,
        resolverStage: "input_parse",
        upstreamStatus: null,
        message: "Missing wallet",
      },
      { status: 400 }
    );
  }

  const resolvedWallets = walletInputs.map(resolveWalletInput);
  const validWallets = Array.from(
    new Set(
      resolvedWallets
        .filter(
          (w): w is Extract<ResolveResult, { ok: true }> => w.ok
        )
        .map((w) => w.wallet)
    )
  );
  const walletErrors = resolvedWallets.filter((w) => !w.ok);
  if (validWallets.length === 0) {
    const first = walletErrors[0];
    return NextResponse.json(
      {
        error: first?.error || "Invalid wallet input",
        errorType: "INVALID_WALLET_INPUT",
        walletInput,
        resolverStage: first?.resolverStage || "input_parse",
        upstreamStatus: null,
        message: first?.error || "Invalid wallet input",
      },
      { status: 400 }
    );
  }
  const wallet = validWallets[0];
  const alchemyConfigured = Boolean(ALCHEMY_API_KEY);
  const alchemyBaseUrl = ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/nft/v3/<redacted>` : null;

  try {
    if (!alchemyConfigured) {
      return NextResponse.json(
        {
          error: "Alchemy API key missing.",
          errorType: "MISSING_API_KEY",
          walletInput,
          resolverStage: "fetch_init",
          upstreamStatus: null,
          message: "ALCHEMY_API_KEY is not configured for profile debug endpoint.",
          diagnostics: { alchemyConfigured, alchemyBaseUrl },
        },
        { status: 500 }
      );
    }

    const fetchStartMs = Date.now();
    const fetchResult = validWallets.length > 1
      ? await fetchAndMergeWalletNFTsWithDebug<WalletProfileNFT>(validWallets, ALCHEMY_API_KEY)
      : await fetchWalletNFTsWithDebug<WalletProfileNFT>(wallet, ALCHEMY_API_KEY).then(({ nfts, debug: fetchNFTsBreakdown }) => ({
          mergedNFTs: nfts,
          deduplicatedCount: 0,
          failedWallets: [] as string[],
          debug: fetchNFTsBreakdown,
        }));
    const { mergedNFTs, deduplicatedCount, failedWallets, debug: fetchNFTsBreakdown } = fetchResult;
    const nfts = mergedNFTs;
    const taste = buildTasteDNA(nfts);
    const fetchNFTsMs = Date.now() - fetchStartMs;

    const profileStartMs = Date.now();
    let profileCoreBuildMs = 0;
    let walletSignalResolveMs = 0;
    let firstMintMs = 0;
    let profileIdentityMs = 0;
    let marketAttentionMs = 0;
    let latestArrivalMs = 0;
    let acquisitionBreakdownMs = 0;
    let topArtistsMs = 0;
    let categoryGroupsMs = 0;
    let collectionDisplayIndexMs = 0;
    let topCollectionsDisplayMs = 0;

    // Keep category enrichment on a short response budget; unfinished collections fall back to local classification.
    const enrichStartMs = Date.now();
    const categoryDebug = createCategoryEnrichmentDebug(categoryCap);

    // Resolve ENS names before optional signal tasks
    const walletSignalResolveStartMs = Date.now();
    const resolvedWalletsForSignals = await Promise.all(
      validWallets.map(async (w) => {
        const resolved = await resolveWalletToAddress(w);
        return resolved || w;
      })
    );
    walletSignalResolveMs = Date.now() - walletSignalResolveStartMs;
    const primaryResolvedAddress = resolvedWalletsForSignals[0] || wallet;

    // Start tasks that don't need enrichedNFTs — run in parallel with remaining enrichment
    const earliestMintTask = (async () => {
      const signalStartMs = Date.now();
      try {
        return await Promise.all(
          resolvedWalletsForSignals.map((resolvedAddress) =>
            fetchFirstMint(resolvedAddress)
          )
        ).then((results) =>
          results
            .filter(
              (item): item is NonNullable<typeof item> =>
                Boolean(item?.timestamp)
            )
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0] || null
        );
      } finally {
        firstMintMs = Date.now() - signalStartMs;
      }
    })();

    const primaryIdentityTask = (async () => {
      const signalStartMs = Date.now();
      try {
        return await fetchOpenSeaProfileIdentity(primaryResolvedAddress);
      } finally {
        profileIdentityMs = Date.now() - signalStartMs;
      }
    })();

    const latestArrivalTask = (async () => {
      const signalStartMs = Date.now();
      try {
        return await withTimeout(
          fetchLatestArrivalSignal(resolvedWalletsForSignals, ALCHEMY_API_KEY || ""),
          2000,
          null as ProfileNFTSignal | null
        );
      } finally {
        latestArrivalMs = Date.now() - signalStartMs;
      }
    })();

    const acquisitionBreakdownTask = (async () => {
      const signalStartMs = Date.now();
      try {
        return await fetchAcquisitionBreakdown(wallet);
      } finally {
        acquisitionBreakdownMs = Date.now() - signalStartMs;
      }
    })();

    const { enrichedNFTs, debug } = await enrichCollectionCategories(
      nfts,
      categoryCap,
      categoryDebug,
      CATEGORY_ENRICHMENT_RESPONSE_BUDGET_MS
    );
    const categoryEnrichmentMs = Date.now() - enrichStartMs;

    const profileCoreBuildStartMs = Date.now();
    const profile = buildWalletProfile(enrichedNFTs);
    profileCoreBuildMs = Date.now() - profileCoreBuildStartMs;

    const marketAttention: MarketAttention | null = null;

    const [firstMint, acquisitionBreakdown, profileIdentity, latestArrival] = await Promise.all([
      earliestMintTask,
      acquisitionBreakdownTask,
      primaryIdentityTask,
      latestArrivalTask,
    ]);

    const firstMintLabel = buildFirstMintLabel(firstMint?.timestamp);
    const highestCurrentOffer = toProfileSignalFromMarketAttention(marketAttention);
    const topArtistsStartMs = Date.now();
    const topArtists = buildTopArtists(enrichedNFTs);
    topArtistsMs = Date.now() - topArtistsStartMs;
    const profileWithFirstMint = firstMint
      ? {
          ...profile,
          firstMint: {
            tokenId: firstMint.nft.tokenId,
            title: firstMint.nft.title,
            collectionName: firstMint.nft.collectionName,
            contractAddress: firstMint.nft.contractAddress,
            imageUrl: firstMint.nft.imageUrl,
            openseaUrl: `https://opensea.io/assets/ethereum/${firstMint.nft.contractAddress}/${firstMint.nft.tokenId}`,
            timestamp: firstMint.timestamp,
          },
        }
      : profile;
    const categoryGroupsStartMs = Date.now();
    const categoryGroups = buildCategoryGroups(enrichedNFTs);
    categoryGroupsMs = Date.now() - categoryGroupsStartMs;
    const collectionDisplayIndexStartMs = Date.now();
    const displayIndex = buildCollectionDisplayIndex(enrichedNFTs, categoryGroups, profileWithFirstMint);
    collectionDisplayIndexMs = Date.now() - collectionDisplayIndexStartMs;
    const topCollectionsDisplayStartMs = Date.now();
    const topCollections = await enrichTopCollectionsDisplay({
      topCollections: profileWithFirstMint.topCollections,
      displayIndex,
      cap: 3,
    });
    topCollectionsDisplayMs = Date.now() - topCollectionsDisplayStartMs;
    const enrichedProfile = {
      ...profileWithFirstMint,
      highestCurrentOffer,
      latestArrival,
      topArtists,
      keySignals: {
        origin: profileWithFirstMint.firstMint || undefined,
        highestCurrentOffer: highestCurrentOffer || undefined,
        latestArrival: latestArrival || undefined,
      },
      topCollections,
      firstMintLabel,
      acquisitionBreakdown,
      displayName: profileIdentity.displayName,
      avatarUrl: profileIdentity.avatarUrl,
      openseaUsername: profileIdentity.openseaUsername,
      openseaUrl: profileIdentity.openseaUrl,
    };
    const profileBuildMs = Date.now() - profileStartMs;
    const totalMs = Date.now() - totalStartMs;

    return NextResponse.json({
      wallet,
      wallets: validWallets,
      walletCount: validWallets.length,
      deduplicatedCount,
      failedWallets,
      profile: enrichedProfile,
      profileIdentity,
      marketAttention,
      taste,
      sampleTopCollections: enrichedProfile.topCollections,
      sampleCategoryDistribution: enrichedProfile.categoryDistribution,
      categoryGroups,
      nftCountUsed: enrichedProfile.totalNFTs,
      collectionsCheckedForCategory: debug.collectionsCheckedForCategory,
      collectionsWithCategory: debug.collectionsWithCategory,
      collectionsWithoutSlug: debug.collectionsWithoutSlug,
      collectionsCategoryCap: debug.collectionsCategoryCap,
      categoryEnrichmentTimedOut: debug.categoryEnrichmentTimedOut,
      categoryEnrichmentConcurrency: debug.categoryEnrichmentConcurrency,
      categoryRequestsStarted: debug.categoryRequestsStarted,
      categoryRequestsCompleted: debug.categoryRequestsCompleted,
      categorySourceBreakdown: enrichedProfile.categorySourceBreakdown,
      openseaCategorySamples: debug.openseaCategorySamples,
      timing: {
        fetchNFTsMs,
        categoryEnrichmentMs,
        profileBuildMs,
        totalMs,
        profileCoreBuildMs,
        walletSignalResolveMs,
        firstMintMs,
        acquisitionBreakdownMs,
        profileIdentityMs,
        marketAttentionMs,
        latestArrivalMs,
        topArtistsMs,
        categoryGroupsMs,
        collectionDisplayIndexMs,
        topCollectionsDisplayMs,
        fetchNFTsBreakdown,
      },
      diagnostics: {
        walletInput,
        resolvedWallet: wallet,
        resolverStage:
          validWallets.length > 1
            ? "direct_input"
            : resolvedWallets[0]?.ok
              ? resolvedWallets[0].resolverStage
              : "input_parse",
        alchemyConfigured,
        alchemyBaseUrl,
      },
    });
  } catch (error) {
    console.error("[profile] caught error:", error);
    if (error instanceof WalletFetchError) {
      return NextResponse.json(
        {
          error: "Wallet profile debug fetch failed.",
          errorType: error.errorType,
          walletInput,
          resolverStage: error.resolverStage,
          upstreamStatus: error.upstreamStatus ?? null,
          message: error.message,
          diagnostics: {
            resolvedWallet: wallet,
            alchemyConfigured,
            alchemyBaseUrl,
            ...error.diagnostics,
          },
        },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to build wallet profile";
    return NextResponse.json(
      {
        error: "Wallet profile debug failed.",
        errorType: "UNEXPECTED_PROFILE_ERROR",
        walletInput,
        resolverStage: "fetch_init",
        upstreamStatus: null,
        message,
        diagnostics: { resolvedWallet: wallet, alchemyConfigured, alchemyBaseUrl },
      },
      { status: 500 }
    );
  }
}
