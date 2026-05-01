import { fetchWalletNFTs } from "@/lib/fetchWalletNFTs";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

export type EstimateQuality = "high" | "medium" | "low";

export function isEthAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isEns(value: string) {
  return /^[a-zA-Z0-9-]+\.eth$/.test(value.trim());
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let h: ReturnType<typeof setTimeout>;
  const t = new Promise<T>((r) => {
    h = setTimeout(() => r(fallback), timeoutMs);
  });
  const result = await Promise.race([promise, t]);
  clearTimeout(h!);
  return result;
}

export async function fetchOpenSeaJson<T>(path: string, fallback: T): Promise<T> {
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

function weiToEth(wei: string): string {
  const value = String(wei || "").trim();
  if (!value || !/^\d+$/.test(value)) return "0";
  const full = value.padStart(19, "0");
  const intPart = full.slice(0, -18).replace(/^0+(?=\d)/, "");
  const fracPart = full.slice(-18).replace(/0+$/, "");
  if (!fracPart) return intPart || "0";
  return `${intPart || "0"}.${fracPart}`;
}

export async function fetchCollectionFloorPriceETH(slug: string): Promise<number | null> {
  const data = await withTimeout(
    fetchOpenSeaJson<{
      listings?: Array<{ price?: { current?: { value?: string } } }>;
    }>(`/listings/collection/${encodeURIComponent(slug)}/best?limit=20`, {}),
    5000,
    {}
  );
  const wei = String(data?.listings?.[0]?.price?.current?.value || "").trim();
  if (!wei || !/^\d+$/.test(wei)) return null;
  const eth = Number(weiToEth(wei));
  return Number.isFinite(eth) && eth > 0 ? eth : null;
}

// Resolve a collection slug from a contract address via OpenSea
async function resolveSlugFromContract(contractAddress: string): Promise<string | null> {
  if (!contractAddress) return null;
  const data = await fetchOpenSeaJson<{ collection?: string; slug?: string }>(
    `/chain/ethereum/contract/${contractAddress.toLowerCase()}`,
    {}
  );
  const slug = String(data?.collection || data?.slug || "").trim();
  return slug || null;
}

export async function buildWalletEstimate(wallet: string) {
  if (!ALCHEMY_API_KEY) {
    return {
      error: "missing_alchemy",
      wallet,
      collections: [],
      estimatedValueETH: 0,
      collectionsWithFloor: 0,
      collectionsWithoutFloor: 0,
      estimateQuality: "low" as EstimateQuality,
    };
  }

  const nfts = await fetchWalletNFTs<any>(wallet, ALCHEMY_API_KEY);

  // Build bucket keyed by contract address (more reliable than slug from raw Alchemy data)
  const bucket = new Map<
    string,
    { contractAddress: string; slug: string; name: string; ownedCount: number }
  >();

  for (const nft of nfts) {
    // Try slug first (populated after enrichment), fall back to contract address
    const slug = String(nft?.displayCollectionSlug || "").trim().toLowerCase();
    const contractAddress = String(
      nft?.contract?.address || nft?.contractAddress || ""
    )
      .trim()
      .toLowerCase();
    const name = String(
      nft?.contractMetadata?.name ||
        nft?.contract?.name ||
        nft?.contract?.openSeaMetadata?.collectionName ||
        "Unknown collection"
    ).trim();

    // Key by slug if available, otherwise by contract address
    const key = slug || contractAddress;
    if (!key) continue;

    const existing = bucket.get(key);
    if (existing) {
      existing.ownedCount += 1;
      // Upgrade to slug if we find one later
      if (!existing.slug && slug) existing.slug = slug;
    } else {
      bucket.set(key, { contractAddress, slug, name, ownedCount: 1 });
    }
  }

  // Take top 10 collections by owned count
  const topCollections = [...bucket.values()]
    .sort((a, b) => b.ownedCount - a.ownedCount)
    .slice(0, 10);

  // Resolve slugs for any collections that don't have one yet
  const withSlugs = await Promise.all(
    topCollections.map(async (collection) => {
      if (collection.slug) return collection;
      const resolved = await resolveSlugFromContract(collection.contractAddress);
      return { ...collection, slug: resolved || "" };
    })
  );

  // Fetch floor prices in parallel for collections with slugs
  const enriched = await Promise.all(
    withSlugs.map(async (collection) => {
      if (!collection.slug) {
        return { ...collection, floorPriceETH: null, contributionETH: 0 };
      }
      const floorPriceETH = await fetchCollectionFloorPriceETH(collection.slug);
      return {
        ...collection,
        floorPriceETH,
        contributionETH: floorPriceETH ? floorPriceETH * collection.ownedCount : 0,
      };
    })
  );

  const collectionsWithFloor = enriched.filter((c) => c.floorPriceETH !== null).length;
  const collectionsWithoutFloor = enriched.length - collectionsWithFloor;
  const estimatedValueETH = enriched.reduce((sum, c) => sum + c.contributionETH, 0);
  const ratio = enriched.length === 0 ? 0 : collectionsWithFloor / enriched.length;
  const estimateQuality: EstimateQuality =
    ratio > 0.6 ? "high" : ratio >= 0.3 ? "medium" : "low";

  return {
    wallet,
    collections: enriched,
    estimatedValueETH,
    collectionsWithFloor,
    collectionsWithoutFloor,
    estimateQuality,
    error: null,
  };
}