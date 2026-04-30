import { NextResponse } from "next/server";
import { fetchWalletNFTs, WalletFetchError } from "@/lib/fetchWalletNFTs";
import {
  buildWalletProfile,
  normalizeOpenSeaCategory,
  normalizeText,
  resolveCollectionName,
  type WalletProfileNFT,
} from "@/lib/walletProfile";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const DEFAULT_COLLECTION_CATEGORY_CAP = 25;
const CATEGORY_ENRICHMENT_TIMEOUT_MS = 4000;
const OPENSEA_MAX_EVENT_PAGES = 6;
const OPENSEA_EVENT_PAGE_LIMIT = 50;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Local test examples:
 * /api/profile?wallet=0x5ffd8de19910efff95df729c54699aebcee8f747
 * /api/profile?wallet=https://opensea.io/0x5ffd8de19910efff95df729c54699aebcee8f747?addresses=0x5ffd8de19910efff95df729c54699aebcee8f747
 */

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
    const isOpenSeaHost =
      host === "opensea.io" || host === "www.opensea.io";

    if (!isOpenSeaHost) {
      return {
        ok: false,
        error: "Enter a valid Ethereum address or ENS name.",
        resolverStage: "input_parse",
      };
    }

    const addressesParam = parsed.searchParams.get("addresses");
    if (addressesParam && isEthAddress(addressesParam)) {
      return { ok: true, wallet: addressesParam, resolverStage: "opensea_url" };
    }

    const pathSegment = parsed.pathname.split("/").filter(Boolean).pop() || "";
    if (isLikelyValidInput(pathSegment)) {
      return { ok: true, wallet: pathSegment, resolverStage: "opensea_url" };
    }

    return {
      ok: false,
      error:
        "OpenSea username resolution not supported yet. Please provide a 0x address or ENS.",
      resolverStage: "username_resolution",
    };
  } catch {
    const looksLikeHandle = /^[a-zA-Z0-9._-]+$/.test(trimmed);
    if (looksLikeHandle && !isEthAddress(trimmed) && !isEns(trimmed)) {
      return {
        ok: false,
        error:
          "OpenSea username resolution not supported yet. Please provide a 0x address or ENS.",
        resolverStage: "username_resolution",
      };
    }

    return {
      ok: false,
      error: "Enter a valid Ethereum address or ENS name.",
      resolverStage: "input_parse",
    };
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
  openseaCategorySamples: Array<{
    slug: string;
    endpoint: string;
    rawResponse: string;
    category: string | null;
    success: boolean;
  }>;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutHandle!);
  return result;
}

async function fetchOpenSeaJson<T>(
  path: string,
  fallback: T
): Promise<T> {
  if (!OPENSEA_API_KEY) return fallback;

  const request = fetch(`${OPENSEA_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "X-API-KEY": OPENSEA_API_KEY,
    },
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

function sanitizeRawResponse(raw: string) {
  return raw.slice(0, 500).replace(/\s+/g, " ").trim();
}

async function fetchCollectionCategoryWithSample(
  slug: string,
  samples: CategoryEnrichmentDebug["openseaCategorySamples"]
) {
  if (!OPENSEA_API_KEY || !slug) return null;

  const endpoint = `${OPENSEA_BASE_URL}/collections/${slug}`;
  try {
    const res = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "X-API-KEY": OPENSEA_API_KEY,
      },
    });
    const rawText = await res.text();
    const rawPreview = sanitizeRawResponse(rawText);

    let parsed: {
      category?: string;
      collection?: { category?: string };
    } = {};
    try {
      parsed = JSON.parse(rawText) as {
        category?: string;
        collection?: { category?: string };
      };
    } catch {
      parsed = {};
    }

    const rawCategory = parsed.collection?.category || parsed.category || null;
    const normalizedCategory = normalizeOpenSeaCategory(rawCategory || "");
    const finalCategory = normalizedCategory || null;

    if (samples.length < 5) {
      samples.push({
        slug,
        endpoint,
        rawResponse: rawPreview,
        category: rawCategory,
        success: Boolean(finalCategory),
      });
    }

    return finalCategory;
  } catch {
    if (samples.length < 5) {
      samples.push({
        slug,
        endpoint,
        rawResponse: "request_failed",
        category: null,
        success: false,
      });
    }
    return null;
  }
}

function normalizeAddress(value?: string) {
  return String(value || "").toLowerCase();
}

async function enrichCollectionCategories(
  nfts: WalletProfileNFT[],
  categoryCap: number
): Promise<{ enrichedNFTs: WalletProfileNFT[]; debug: CategoryEnrichmentDebug }> {
  const collectionBuckets = new Map<
    string,
    { nfts: WalletProfileNFT[]; count: number; name: string }
  >();

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

  const topCollections = [...collectionBuckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, categoryCap);

  const categoryCache = new Map<string, string | null>();
  const slugCache = new Map<string, string | null>();
  const stats: CategoryEnrichmentDebug = {
    collectionsCheckedForCategory: 0,
    collectionsWithCategory: 0,
    collectionsWithoutSlug: 0,
    collectionsCategoryCap: categoryCap,
    categoryEnrichmentTimedOut: false,
    openseaCategorySamples: [],
  };
  const enrichStartMs = Date.now();

  for (const collection of topCollections) {
    if (Date.now() - enrichStartMs >= CATEGORY_ENRICHMENT_TIMEOUT_MS) {
      stats.categoryEnrichmentTimedOut = true;
      break;
    }

    stats.collectionsCheckedForCategory += 1;
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
      const contractSlugKey = `contract:${contractAddress}`;
      if (slugCache.has(contractSlugKey)) {
        resolvedSlug = slugCache.get(contractSlugKey) || "";
      } else {
        const contractData = await fetchOpenSeaJson<OpenSeaContractResponse>(
          `/chain/ethereum/contract/${contractAddress}`,
          {} as OpenSeaContractResponse
        );
        resolvedSlug = String(
          contractData?.collection ||
            contractData?.slug ||
            contractData?.collections?.[0]?.slug ||
            ""
        ).trim();
        slugCache.set(contractSlugKey, resolvedSlug || null);
      }
    }

    if (!resolvedCategory && resolvedSlug) {
      const slugKey = `slug:${resolvedSlug}`;
      if (categoryCache.has(slugKey)) {
        resolvedCategory = categoryCache.get(slugKey) || null;
      } else {
        resolvedCategory = await fetchCollectionCategoryWithSample(
          resolvedSlug,
          stats.openseaCategorySamples
        );
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

    if (!resolvedSlug) {
      stats.collectionsWithoutSlug += 1;
    }

    if (resolvedCategory) {
      stats.collectionsWithCategory += 1;
    }

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

  return {
    enrichedNFTs: nfts,
    debug: stats,
  };
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

type ResolvedDisplayMetadata = {
  title?: string;
  collectionName?: string;
  imageUrl?: string;
};

function normalizeImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

function classify(nft: WalletProfileNFT) {
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

function buildTasteDNA(nfts: WalletProfileNFT[]) {
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

async function fetchOpenSeaAsset(
  contractAddress: string,
  tokenId: string
): Promise<ResolvedDisplayMetadata> {
  if (!contractAddress || !tokenId) return {};

  const data = await fetchOpenSeaJson<OpenSeaAssetResponse>(
    `/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`,
    {} as OpenSeaAssetResponse
  );

  const payload = data.nft || {};
  const collection = payload.collection;
  const collectionName =
    typeof collection === "string"
      ? collection
      : collection?.name || "";

  const title = payload.name || "";
  const imageUrl = normalizeImageUrl(
    payload.display_image_url ||
      payload.image_url ||
      payload.image_preview_url ||
      payload.image_original_url ||
      ""
  );

  return {
    title,
    collectionName,
    imageUrl,
  };
}

async function fetchFirstMint(address: string): Promise<{
  nft: {
    contractAddress: string;
    tokenId: string;
    collectionName: string;
    imageUrl: string;
    title: string;
  };
  timestamp: string;
} | null> {
  if (!ALCHEMY_API_KEY) return null;

  try {
    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          toAddress: normalizeAddress(address),
          fromAddress: ZERO_ADDRESS,
          category: ["erc721", "erc1155"],
          withMetadata: true,
          excludeZeroValue: false,
          maxCount: "0xa",
          order: "asc",
        },
      ],
    };

    const res = await withTimeout(
      fetch(alchemyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }),
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
          metadata?: {
            blockTimestamp?: string;
          };
          rawContract?: {
            address?: string;
          };
        }>;
      };
    };

    const transfers = json?.result?.transfers || [];
    if (!transfers.length) return null;

    const first = transfers[0];
    const contractAddress = normalizeAddress(
      first.contractAddress || first.rawContract?.address || ""
    );
    const rawTokenId = first.tokenId || first.erc1155Metadata?.[0]?.tokenId || "";
    const tokenId = rawTokenId.startsWith("0x")
      ? String(BigInt(rawTokenId))
      : String(rawTokenId);
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
    return {
      mintCount: 0,
      acquiredCount: 0,
      totalSampled: 0,
      mintPercent: 0,
      acquiredPercent: 0,
    };
  }

  try {
    const target = normalizeAddress(address);
    let next = "";
    let mintCount = 0;
    let acquiredCount = 0;

    for (let page = 0; page < OPENSEA_MAX_EVENT_PAGES; page += 1) {
      const params = new URLSearchParams({
        limit: String(OPENSEA_EVENT_PAGE_LIMIT),
        event_type: "transfer",
      });
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
      return {
        mintCount,
        acquiredCount,
        totalSampled,
        mintPercent: 0,
        acquiredPercent: 0,
      };
    }

    const mintPercent = Math.round((mintCount / totalSampled) * 100);
    const acquiredPercent = Math.max(0, 100 - mintPercent);

    return {
      mintCount,
      acquiredCount,
      totalSampled,
      mintPercent,
      acquiredPercent,
    };
  } catch {
    return {
      mintCount: 0,
      acquiredCount: 0,
      totalSampled: 0,
      mintPercent: 0,
      acquiredPercent: 0,
    };
  }
}

export async function GET(req: Request) {
  const totalStartMs = Date.now();
  const { searchParams } = new URL(req.url);
  const walletInput = searchParams.get("wallet")?.trim() || "";
  const categoryCapInput = Number(searchParams.get("categoryCap"));
  const categoryCap =
    Number.isFinite(categoryCapInput) && categoryCapInput > 0
      ? Math.floor(categoryCapInput)
      : DEFAULT_COLLECTION_CATEGORY_CAP;
  const resolved = resolveWalletInput(walletInput);

  if (!resolved.ok) {
    return NextResponse.json(
      {
        error: resolved.error,
        errorType: "INVALID_WALLET_INPUT",
        walletInput,
        resolverStage: resolved.resolverStage,
        upstreamStatus: null,
        message: resolved.error,
      },
      { status: 400 }
    );
  }

  const wallet = resolved.wallet;
  const alchemyConfigured = Boolean(ALCHEMY_API_KEY);
  const alchemyBaseUrl = ALCHEMY_API_KEY
    ? `https://eth-mainnet.g.alchemy.com/nft/v3/<redacted>`
    : null;

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
          diagnostics: {
            alchemyConfigured,
            alchemyBaseUrl,
          },
        },
        { status: 500 }
      );
    }

    const fetchStartMs = Date.now();
    const nfts = await fetchWalletNFTs<WalletProfileNFT>(wallet, ALCHEMY_API_KEY);
    const taste = buildTasteDNA(nfts);
    console.log("RAW NFT SAMPLE:", JSON.stringify(nfts[0], null, 2));
    const fetchNFTsMs = Date.now() - fetchStartMs;

    const enrichStartMs = Date.now();
    const { enrichedNFTs, debug } = await enrichCollectionCategories(nfts, categoryCap);
    const categoryEnrichmentMs = Date.now() - enrichStartMs;

    const profileStartMs = Date.now();
    const profile = buildWalletProfile(enrichedNFTs);
    const firstMint = await fetchFirstMint(wallet);
    const acquisitionBreakdown = await fetchAcquisitionBreakdown(wallet);
    const enrichedProfile = {
      ...profile,
      firstMint,
      acquisitionBreakdown,
    };
    const profileBuildMs = Date.now() - profileStartMs;
    const totalMs = Date.now() - totalStartMs;

    return NextResponse.json({
      wallet,
      profile: enrichedProfile,
      taste,
      sampleTopCollections: enrichedProfile.topCollections,
      sampleCategoryDistribution: enrichedProfile.categoryDistribution,
      nftCountUsed: enrichedProfile.totalNFTs,
      collectionsCheckedForCategory: debug.collectionsCheckedForCategory,
      collectionsWithCategory: debug.collectionsWithCategory,
      collectionsWithoutSlug: debug.collectionsWithoutSlug,
      collectionsCategoryCap: debug.collectionsCategoryCap,
      categoryEnrichmentTimedOut: debug.categoryEnrichmentTimedOut,
      categorySourceBreakdown: enrichedProfile.categorySourceBreakdown,
      openseaCategorySamples: debug.openseaCategorySamples,
      timing: {
        fetchNFTsMs,
        categoryEnrichmentMs,
        profileBuildMs,
        totalMs,
      },
      diagnostics: {
        walletInput,
        resolvedWallet: wallet,
        resolverStage: resolved.resolverStage,
        alchemyConfigured,
        alchemyBaseUrl,
      },
    });
  } catch (error) {
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
        diagnostics: {
          resolvedWallet: wallet,
          alchemyConfigured,
          alchemyBaseUrl,
        },
      },
      { status: 500 }
    );
  }
}
