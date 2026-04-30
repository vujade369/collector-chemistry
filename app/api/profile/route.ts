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

async function fetchOpenSeaJson<T>(path: string): Promise<T | null> {
  if (!OPENSEA_API_KEY) return null;

  try {
    const res = await fetch(`${OPENSEA_BASE_URL}${path}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "X-API-KEY": OPENSEA_API_KEY,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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
          `/chain/ethereum/contract/${contractAddress}`
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
    console.log("RAW NFT SAMPLE:", JSON.stringify(nfts[0], null, 2));
    const fetchNFTsMs = Date.now() - fetchStartMs;

    const enrichStartMs = Date.now();
    const { enrichedNFTs, debug } = await enrichCollectionCategories(nfts, categoryCap);
    const categoryEnrichmentMs = Date.now() - enrichStartMs;

    const profileStartMs = Date.now();
    const profile = buildWalletProfile(enrichedNFTs);
    const profileBuildMs = Date.now() - profileStartMs;
    const totalMs = Date.now() - totalStartMs;

    return NextResponse.json({
      wallet,
      profile,
      sampleTopCollections: profile.topCollections,
      sampleCategoryDistribution: profile.categoryDistribution,
      nftCountUsed: profile.totalNFTs,
      collectionsCheckedForCategory: debug.collectionsCheckedForCategory,
      collectionsWithCategory: debug.collectionsWithCategory,
      collectionsWithoutSlug: debug.collectionsWithoutSlug,
      collectionsCategoryCap: debug.collectionsCategoryCap,
      categoryEnrichmentTimedOut: debug.categoryEnrichmentTimedOut,
      categorySourceBreakdown: profile.categorySourceBreakdown,
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
