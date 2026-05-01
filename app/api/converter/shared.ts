import { fetchWalletNFTs } from "@/lib/fetchWalletNFTs";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

export type EstimateQuality = "high" | "medium" | "low";

// Cache wallet estimates for 5 minutes so repeat searches are instant
const estimateCache = new Map<string, { result: WalletEstimateResult; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  const t = new Promise<T>((r) => { h = setTimeout(() => r(fallback), timeoutMs); });
  const result = await Promise.race([promise, t]);
  clearTimeout(h!);
  return result;
}

export async function fetchOpenSeaJson<T>(path: string, fallback: T): Promise<T> {
  if (!OPENSEA_API_KEY) return fallback;
  const request = fetch(`${OPENSEA_BASE_URL}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json", "X-API-KEY": OPENSEA_API_KEY },
  })
    .then(async (res) => {
      if (!res.ok) return fallback;
      try { return (await res.json()) as T; } catch { return fallback; }
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
    fetchOpenSeaJson<{ listings?: Array<{ price?: { current?: { value?: string } } }> }>(
      `/listings/collection/${encodeURIComponent(slug)}/best?limit=5`, {}
    ),
    5000, {}
  );
  const wei = String(data?.listings?.[0]?.price?.current?.value || "").trim();
  if (!wei || !/^\d+$/.test(wei)) return null;
  const eth = Number(weiToEth(wei));
  // Skip floors under 0.001 ETH — too illiquid to contribute meaningfully
  return Number.isFinite(eth) && eth >= 0.001 ? eth : null;
}

async function resolveSlugFromContract(contractAddress: string): Promise<string | null> {
  if (!contractAddress) return null;
  const data = await fetchOpenSeaJson<{ collection?: string; slug?: string }>(
    `/chain/ethereum/contract/${contractAddress.toLowerCase()}`, {}
  );
  const slug = String(data?.collection || data?.slug || "").trim();
  return slug || null;
}

type CollectionEstimate = {
  contractAddress: string;
  slug: string;
  name: string;
  ownedCount: number;
  floorPriceETH: number | null;
  contributionETH: number;
};

type WalletEstimateResult = {
  wallet: string;
  collections: CollectionEstimate[];
  estimatedValueETH: number;
  collectionsWithFloor: number;
  collectionsWithoutFloor: number;
  estimateQuality: EstimateQuality;
  error: string | null;
};

export async function buildWalletEstimate(wallet: string): Promise<WalletEstimateResult> {
  // Return cached result if still fresh
  const cached = estimateCache.get(wallet);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  if (!ALCHEMY_API_KEY) {
    return { error: "missing_alchemy", wallet, collections: [], estimatedValueETH: 0,
      collectionsWithFloor: 0, collectionsWithoutFloor: 0, estimateQuality: "low" };
  }

  const nfts = await fetchWalletNFTs<any>(wallet, ALCHEMY_API_KEY);

  // Key by contract address — raw Alchemy NFTs don't have displayCollectionSlug
  const bucket = new Map<string, { contractAddress: string; slug: string; name: string; ownedCount: number }>();

  for (const nft of nfts) {
    const slug = String(nft?.displayCollectionSlug || "").trim().toLowerCase();
    const contractAddress = String(nft?.contract?.address || nft?.contractAddress || "").trim().toLowerCase();
    const name = String(
      nft?.contractMetadata?.name || nft?.contract?.name ||
      nft?.contract?.openSeaMetadata?.collectionName || "Unknown collection"
    ).trim();

    const key = slug || contractAddress;
    if (!key) continue;

    const existing = bucket.get(key);
    if (existing) {
      existing.ownedCount += 1;
      if (!existing.slug && slug) existing.slug = slug;
    } else {
      bucket.set(key, { contractAddress, slug, name, ownedCount: 1 });
    }
  }

  // Top 5 only — tail collections add noise without improving accuracy
  const topCollections = [...bucket.values()]
    .sort((a, b) => b.ownedCount - a.ownedCount)
    .slice(0, 5);

  // Resolve slugs for collections that don't have one
  const withSlugs = await Promise.all(
    topCollections.map(async (c) => {
      if (c.slug) return c;
      const resolved = await resolveSlugFromContract(c.contractAddress);
      return { ...c, slug: resolved || "" };
    })
  );

  // Fetch floor prices in parallel, skip collections with no slug
  const enriched = await Promise.all(
    withSlugs.map(async (c) => {
      if (!c.slug) return { ...c, floorPriceETH: null, contributionETH: 0 };
      const floorPriceETH = await fetchCollectionFloorPriceETH(c.slug);
      return { ...c, floorPriceETH, contributionETH: floorPriceETH ? floorPriceETH * c.ownedCount : 0 };
    })
  );

  const collectionsWithFloor = enriched.filter((c) => c.floorPriceETH !== null).length;
  const collectionsWithoutFloor = enriched.length - collectionsWithFloor;
  const estimatedValueETH = enriched.reduce((sum, c) => sum + c.contributionETH, 0);
  const ratio = enriched.length === 0 ? 0 : collectionsWithFloor / enriched.length;
  const estimateQuality: EstimateQuality = ratio > 0.6 ? "high" : ratio >= 0.3 ? "medium" : "low";

  const result: WalletEstimateResult = {
    wallet, collections: enriched, estimatedValueETH,
    collectionsWithFloor, collectionsWithoutFloor, estimateQuality, error: null,
  };

  estimateCache.set(wallet, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
