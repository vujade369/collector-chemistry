import { fetchWalletNFTs } from "@/lib/fetchWalletNFTs";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

export type EstimateQuality = "high" | "medium" | "low";
export type MatchConfidence = "high" | "medium" | "low";

export type CollectionFloorResult = {
  floorPriceETH: number | null;
  sourceLabel: "Best listing" | "Collection stats" | "Unavailable";
};

export type WalletOfferEstimateResult = {
  wallet: string;
  detectedOfferValueETH: number;
  offerCount: number;
  checkedNftCount: number;
  candidateCount: number;
  estimateQuality: EstimateQuality;
  error: null | "missing_opensea" | "no_wallet_offers" | "estimate_failed";
  offers?: Array<{
    title?: string;
    tokenId?: string;
    collectionName?: string;
    collectionSlug?: string;
    contractAddress?: string;
    imageUrl?: string;
    openseaUrl?: string;
    ethAmount: number;
    ethAmountLabel?: string;
  }>;
  debug?: {
    candidateStrategy: string;
    candidateCap: number;
    candidateCount: number;
    checkedNftCount: number;
    candidatesChecked: Array<{
      title?: string;
      name?: string;
      collectionName?: string;
      collectionSlug?: string;
      tokenId?: string;
      contractAddress?: string;
      hasImage?: boolean;
      rankReason?: string;
    }>;
    offersFound: Array<{
      title?: string;
      name?: string;
      collectionName?: string;
      collectionSlug?: string;
      tokenId?: string;
      contractAddress?: string;
      ethAmount: number;
      ethAmountLabel?: string;
      openseaUrl?: string;
    }>;
    skippedCounts?: {
      missingSlug?: number;
      missingTokenId?: number;
      noOffer?: number;
      unsupportedCurrency?: number;
      lookupFailed?: number;
    };
  };
};

export type ConverterCollectionSearchResult = {
  slug: string;
  name: string;
  imageUrl?: string;
  floorPriceETH?: number | null;
  openseaUrl?: string;
  verified?: boolean;
  safelistStatus?: string;
  matchConfidence?: MatchConfidence;
};

const OFFER_CANDIDATE_CAP = 20;
const offerCache = new Map<string, { ethAmount: number; symbol: string } | null>();
const slugCache = new Map<string, string | null>();

export function isEthAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isEns(value: string) {
  return /^[a-zA-Z0-9-]+\.eth$/.test(value.trim());
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
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
  return withTimeout(request, 1800, fallback);
}

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

function weiToEth(wei: string): number {
  const value = String(wei || "").trim();
  if (!value || !/^\d+$/.test(value)) return 0;
  const full = value.padStart(19, "0");
  const intPart = full.slice(0, -18).replace(/^0+(?=\d)/, "");
  const fracPart = full.slice(-18).replace(/0+$/, "");
  return Number(fracPart ? `${intPart || "0"}.${fracPart}` : intPart || "0");
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function computeMatchConfidence(query: string, name: string, slug: string): MatchConfidence {
  const q = normalizeText(query);
  const n = normalizeText(name);
  const s = normalizeText(slug.replace(/-/g, " "));
  if (!q) return "low";
  if (n === q || s === q) return "high";
  if (n.includes(q) || s.includes(q) || q.includes(n)) return "medium";
  return "low";
}

function normalizeAddress(value: string): string {
  return String(value || "").trim().toLowerCase();
}

async function resolveSlugFromContract(contractAddress: string): Promise<string | null> {
  const normalized = normalizeAddress(contractAddress);
  if (!normalized) return null;
  if (slugCache.has(normalized)) return slugCache.get(normalized) || null;

  const data = await fetchOpenSeaJson<{ collection?: string; slug?: string; collections?: Array<{ slug?: string }> }>(
    `/chain/ethereum/contract/${encodeURIComponent(normalized)}`,
    {}
  );
  const slug = String(data?.collection || data?.slug || data?.collections?.[0]?.slug || "").trim();
  slugCache.set(normalized, slug || null);
  return slug || null;
}

export async function fetchCollectionFloorPriceETH(slug: string): Promise<CollectionFloorResult> {
  const safeSlug = String(slug || "").trim();
  if (!safeSlug) return { floorPriceETH: null, sourceLabel: "Unavailable" };

  const best = await fetchOpenSeaJson<{ listings?: Array<{ price?: { current?: { value?: string } } }> }>(
    `/listings/collection/${encodeURIComponent(safeSlug)}/best?limit=1`,
    {}
  );
  const bestWei = String(best?.listings?.[0]?.price?.current?.value || "").trim();
  if (/^\d+$/.test(bestWei)) {
    const eth = weiToEth(bestWei);
    if (Number.isFinite(eth) && eth > 0) return { floorPriceETH: eth, sourceLabel: "Best listing" };
  }

  const stats = await fetchOpenSeaJson<{ total?: { floor_price?: number | string }; floor_price?: number | string }>(
    `/collections/${encodeURIComponent(safeSlug)}/stats`,
    {}
  );
  const statsFloor = Number(stats?.total?.floor_price ?? stats?.floor_price ?? NaN);
  if (Number.isFinite(statsFloor) && statsFloor > 0) {
    return { floorPriceETH: statsFloor, sourceLabel: "Collection stats" };
  }

  return { floorPriceETH: null, sourceLabel: "Unavailable" };
}

function pickTokenId(nft: any): string | null {
  return normalizeTokenIdForOpenSea(nft?.tokenId ?? nft?.identifier ?? nft?.id);
}

type OfferCandidate = {
  slug: string;
  tokenId: string;
  title?: string;
  name?: string;
  collectionName?: string;
  contractAddress?: string;
  hasImage?: boolean;
  rankReason?: string;
};

function rankNftCandidate(nft: any): number {
  const hasSlug = Boolean(String(nft?.displayCollectionSlug || "").trim());
  const hasToken = Boolean(pickTokenId(nft));
  const hasImage = Boolean(nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.imageUrl);
  const hasName = Boolean(String(nft?.name || nft?.title || nft?.metadata?.name || "").trim());
  const collectionName = String(nft?.displayCollectionName || nft?.contractMetadata?.name || nft?.contract?.name || "").trim();
  const hasCollectionName = Boolean(collectionName && collectionName.toLowerCase() !== "unknown collection");
  const hasContractAddress = Boolean(String(nft?.contract?.address || nft?.contractAddress || "").trim());
  const balance = Number(nft?.balance || 1);
  return (
    (hasSlug ? 36 : 0) +
    (hasToken ? 30 : 0) +
    (hasCollectionName ? 12 : 0) +
    (hasContractAddress ? 7 : 0) +
    (hasImage ? 9 : 0) +
    (hasName ? 9 : 0) +
    Math.min(balance, 8)
  );
}

async function buildOfferCandidates(wallet: string): Promise<OfferCandidate[]> {
  if (!ALCHEMY_API_KEY) return [];
  const nfts = await fetchWalletNFTs<any>(wallet, ALCHEMY_API_KEY);

  const ranked = [...nfts].sort((a, b) => rankNftCandidate(b) - rankNftCandidate(a));
  const candidates: OfferCandidate[] = [];
  const seen = new Set<string>();

  for (const nft of ranked) {
    if (candidates.length >= OFFER_CANDIDATE_CAP) break;
    const tokenId = pickTokenId(nft);
    if (!tokenId) continue;

    let slug = String(nft?.displayCollectionSlug || "").trim();
    if (!slug) {
      const contractAddress = String(nft?.contract?.address || nft?.contractAddress || "").trim();
      if (contractAddress) slug = (await resolveSlugFromContract(contractAddress)) || "";
    }
    if (!slug) continue;

    const key = `${slug}:${tokenId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hasImage = Boolean(nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.imageUrl);
    const contractAddress = String(nft?.contract?.address || nft?.contractAddress || "").trim() || undefined;
    const title = String(nft?.title || nft?.name || nft?.metadata?.name || "").trim() || undefined;
    candidates.push({
      slug,
      tokenId,
      title,
      name: String(nft?.name || nft?.title || "").trim() || undefined,
      collectionName: String(nft?.displayCollectionName || nft?.contractMetadata?.name || nft?.contract?.name || "").trim() || undefined,
      contractAddress,
      hasImage,
      rankReason: `${nft?.displayCollectionSlug ? "slug+" : ""}${hasImage ? "image+" : ""}${title ? "title" : "token"}`,
    });
  }

  return candidates;
}

async function fetchBestOfferEth(slug: string, tokenId: string): Promise<{ ethAmount: number; symbol: string; skippedReason?: "unsupportedCurrency" | "lookupFailed" | "noOffer" } | null> {
  const cacheKey = `${slug}:${tokenId}`;
  if (offerCache.has(cacheKey)) return offerCache.get(cacheKey) ?? null;

  const offer = await fetchOpenSeaJson<{
    price?: { value?: string };
    price_type?: { symbol?: string };
    payment_token?: { symbol?: string };
    protocol_data?: { parameters?: { offer?: Array<{ startAmount?: string }> } };
  }>(`/offers/collection/${encodeURIComponent(slug)}/nfts/${encodeURIComponent(tokenId)}/best`, {});

  if (!offer || Object.keys(offer).length === 0) return { ethAmount: 0, symbol: "", skippedReason: "lookupFailed" };
  const symbol = String(offer?.price_type?.symbol || offer?.payment_token?.symbol || "WETH").toUpperCase();
  if (symbol !== "ETH" && symbol !== "WETH") {
    offerCache.set(cacheKey, null);
    return { ethAmount: 0, symbol, skippedReason: "unsupportedCurrency" };
  }
  const rawWei = String(offer?.price?.value || offer?.protocol_data?.parameters?.offer?.[0]?.startAmount || "").trim();
  if (!rawWei) return { ethAmount: 0, symbol, skippedReason: "noOffer" };
  const eth = /^\d+$/.test(rawWei) ? weiToEth(rawWei) : 0;
  const value = Number.isFinite(eth) && eth > 0 ? { ethAmount: eth, symbol } : { ethAmount: 0, symbol, skippedReason: "noOffer" as const };
  offerCache.set(cacheKey, value);
  return value;
}

export async function buildWalletOfferEstimate(wallet: string): Promise<WalletOfferEstimateResult> {
  if (!OPENSEA_API_KEY) {
    return {
      wallet,
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      estimateQuality: "low",
      error: "missing_opensea",
    };
  }
  if (!ALCHEMY_API_KEY) {
    return {
      wallet,
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      estimateQuality: "low",
      error: "estimate_failed",
    };
  }

  try {
    const candidates = await buildOfferCandidates(wallet);
    const checked = candidates.slice(0, OFFER_CANDIDATE_CAP);

    const offers = await Promise.all(checked.map(async (c) => ({ candidate: c, offer: await fetchBestOfferEth(c.slug, c.tokenId) })));
    const validOffers = offers.filter((v): v is { candidate: OfferCandidate; offer: { ethAmount: number; symbol: string } } => Boolean(v.offer?.ethAmount && v.offer.ethAmount > 0));
    const detectedOfferValueETH = validOffers.reduce((sum, value) => sum + value.offer.ethAmount, 0);
    const skippedCounts = offers.reduce(
      (acc, item) => {
        if (!item.offer?.skippedReason) return acc;
        if (item.offer.skippedReason === "unsupportedCurrency") acc.unsupportedCurrency += 1;
        if (item.offer.skippedReason === "lookupFailed") acc.lookupFailed += 1;
        if (item.offer.skippedReason === "noOffer") acc.noOffer += 1;
        return acc;
      },
      { missingSlug: 0, missingTokenId: 0, noOffer: 0, unsupportedCurrency: 0, lookupFailed: 0 }
    );

    const coverage = checked.length / OFFER_CANDIDATE_CAP;
    const estimateQuality: EstimateQuality = coverage >= 0.8 ? "high" : coverage >= 0.4 ? "medium" : "low";

    return {
      wallet,
      detectedOfferValueETH,
      offerCount: validOffers.length,
      checkedNftCount: checked.length,
      candidateCount: candidates.length,
      estimateQuality,
      error: validOffers.length ? null : "no_wallet_offers",
      offers: validOffers.map(({ candidate, offer }) => ({
        title: candidate.title,
        name: candidate.name,
        collectionName: candidate.collectionName,
        tokenId: candidate.tokenId,
        contractAddress: candidate.contractAddress,
        collectionSlug: candidate.slug,
        openseaUrl: candidate.contractAddress ? `https://opensea.io/item/ethereum/${candidate.contractAddress}/${candidate.tokenId}` : undefined,
        ethAmount: offer.ethAmount,
        ethAmountLabel: `${offer.ethAmount.toFixed(3)} ${offer.symbol}`,
      })),
      debug: {
        candidateStrategy: "Rank wallet NFTs by resolvable slug, token id, and display quality, then cap checks.",
        candidateCap: OFFER_CANDIDATE_CAP,
        candidateCount: candidates.length,
        checkedNftCount: checked.length,
        candidatesChecked: checked.map((c) => ({
          title: c.title,
          name: c.name,
          collectionName: c.collectionName,
          collectionSlug: c.slug,
          tokenId: c.tokenId,
          contractAddress: c.contractAddress,
          hasImage: c.hasImage,
          rankReason: c.rankReason,
        })),
        offersFound: validOffers.map(({ candidate, offer }) => ({
          title: candidate.title,
          name: candidate.name,
          collectionName: candidate.collectionName,
          collectionSlug: candidate.slug,
          tokenId: candidate.tokenId,
          contractAddress: candidate.contractAddress,
          ethAmount: offer.ethAmount,
          ethAmountLabel: `${offer.ethAmount.toFixed(3)} ${offer.symbol}`,
          openseaUrl: candidate.contractAddress ? `https://opensea.io/item/ethereum/${candidate.contractAddress}/${candidate.tokenId}` : undefined,
        })),
        skippedCounts,
      },
    };
  } catch {
    return {
      wallet,
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      estimateQuality: "low",
      error: "estimate_failed",
    };
  }
}

function parseCollectionRows(payload: any): any[] {
  if (Array.isArray(payload?.collections)) return payload.collections;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function mapCollectionResult(row: any, query: string): ConverterCollectionSearchResult | null {
  const slug = String(row?.collection || row?.slug || "").trim();
  const name = String(row?.name || row?.title || "").trim();
  if (!slug || !name) return null;

  const safelistStatus = String(row?.safelist_status || row?.safelistStatus || "").trim() || undefined;
  const verified = typeof row?.is_verified === "boolean" ? row.is_verified : undefined;

  return {
    slug,
    name,
    imageUrl: String(row?.image_url || row?.imageUrl || row?.image || "").trim() || undefined,
    openseaUrl: `https://opensea.io/collection/${slug}`,
    verified,
    safelistStatus,
    matchConfidence: computeMatchConfidence(query, name, slug),
  };
}

export async function searchOpenSeaCollections(query: string): Promise<ConverterCollectionSearchResult[]> {
  const q = String(query || "").trim();
  if (!q || !OPENSEA_API_KEY) return [];

  const endpoints = [
    `/search/collections?query=${encodeURIComponent(q)}&limit=12`,
    `/search?query=${encodeURIComponent(q)}&types=collection&limit=12`,
    `/collections?search=${encodeURIComponent(q)}&limit=12`,
  ];

  const seen = new Set<string>();
  const all: ConverterCollectionSearchResult[] = [];

  for (const path of endpoints) {
    const payload = await fetchOpenSeaJson<any>(path, {});
    const rows = parseCollectionRows(payload);
    for (const row of rows) {
      const mapped = mapCollectionResult(row, q);
      if (!mapped) continue;
      if (seen.has(mapped.slug)) continue;
      seen.add(mapped.slug);
      all.push(mapped);
    }
    if (all.length >= 12) break;
  }

  if (all.length < 8) {
    const fallbackSlugs = Array.from(new Set([q, q.toLowerCase().replace(/\s+/g, "-"), q.toLowerCase().replace(/\s+/g, "")])).slice(0, 3);
    for (const slug of fallbackSlugs) {
      const collection = await fetchOpenSeaJson<{ name?: string; image_url?: string; imageUrl?: string; safelist_status?: string; is_verified?: boolean }>(
        `/collections/${encodeURIComponent(slug)}`,
        {}
      );
      const name = String(collection?.name || "").trim();
      if (!name || seen.has(slug)) continue;
      seen.add(slug);
      all.push({
        slug,
        name,
        imageUrl: collection?.image_url || collection?.imageUrl || undefined,
        openseaUrl: `https://opensea.io/collection/${slug}`,
        safelistStatus: collection?.safelist_status,
        verified: typeof collection?.is_verified === "boolean" ? collection.is_verified : undefined,
        matchConfidence: computeMatchConfidence(q, name, slug),
      });
    }
  }

  const ranked = all
    .map((item) => {
      const safelist = (item.safelistStatus || "").toLowerCase();
      const safelistBoost = safelist.includes("verified") || safelist.includes("approved") ? 2 : safelist.includes("requested") ? 1 : 0;
      const confidenceBoost = item.matchConfidence === "high" ? 2 : item.matchConfidence === "medium" ? 1 : 0;
      const verifiedBoost = item.verified ? 2 : 0;
      return { item, score: safelistBoost + confidenceBoost + verifiedBoost };
    })
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((entry) => entry.item)
    .slice(0, 10);

  const floors = await Promise.all(
    ranked.map(async (item) => {
      const floor = await fetchCollectionFloorPriceETH(item.slug);
      return { ...item, floorPriceETH: floor.floorPriceETH };
    })
  );

  const queryNorm = normalizeText(q);
  const betterNamed = floors.some((item) => normalizeText(item.name) !== queryNorm && !/^0x[a-f0-9]{8,}$/i.test(item.name));

  return floors
    .filter((item) => {
      const isAddressLikeSlug = /^0x[a-f0-9]{8,}$/i.test(item.slug);
      const isAddressLikeName = /^0x[a-f0-9]{8,}$/i.test(item.name.trim());
      const hasFloor = Boolean(item.floorPriceETH && item.floorPriceETH > 0);
      if (isAddressLikeName && betterNamed && !hasFloor) return false;
      if (!isAddressLikeSlug) return true;
      return hasFloor || item.matchConfidence === "high";
    })
    .sort((a, b) => {
      const aFloor = a.floorPriceETH && a.floorPriceETH > 0 ? 1 : 0;
      const bFloor = b.floorPriceETH && b.floorPriceETH > 0 ? 1 : 0;
      if (bFloor !== aFloor) return bFloor - aFloor;
      const aAddressName = /^0x[a-f0-9]{8,}$/i.test(a.name.trim()) ? 1 : 0;
      const bAddressName = /^0x[a-f0-9]{8,}$/i.test(b.name.trim()) ? 1 : 0;
      if (aAddressName !== bAddressName) return aAddressName - bAddressName;
      const aImg = a.imageUrl ? 1 : 0;
      const bImg = b.imageUrl ? 1 : 0;
      if (bImg !== aImg) return bImg - aImg;
      const aConf = a.matchConfidence === "high" ? 2 : a.matchConfidence === "medium" ? 1 : 0;
      const bConf = b.matchConfidence === "high" ? 2 : b.matchConfidence === "medium" ? 1 : 0;
      return bConf - aConf;
    })
    .slice(0, 6);
}
