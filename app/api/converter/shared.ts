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
    walletNftCount?: number;
    collectionGroupCount?: number;
    selectedGroupCount?: number;
    candidateCount: number;
    checkedNftCount: number;
    selectedGroups?: Array<{
      collectionName?: string;
      collectionSlug?: string;
      contractAddress?: string;
      ownedCount: number;
      selectedCandidateCount: number;
      rankReason?: string;
    }>;
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
      rankedOut?: number;
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
};

function rankNftCandidate(nft: any): number {
  const hasSlug = Boolean(String(nft?.displayCollectionSlug || "").trim());
  const hasToken = Boolean(pickTokenId(nft));
  const hasImage = Boolean(nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.imageUrl);
  const hasName = Boolean(String(nft?.name || nft?.title || nft?.metadata?.name || "").trim());
  const balance = Number(nft?.balance || 1);
  return (hasSlug ? 30 : 0) + (hasToken ? 30 : 0) + (hasImage ? 15 : 0) + (hasName ? 10 : 0) + Math.min(balance, 10);
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
    candidates.push({ slug, tokenId });
  }

  return candidates;
}

async function fetchBestOfferEth(slug: string, tokenId: string): Promise<{ ethAmount: number; symbol: string } | null> {
  const cacheKey = `${slug}:${tokenId}`;
  if (offerCache.has(cacheKey)) return offerCache.get(cacheKey) ?? null;

  const offer = await fetchOpenSeaJson<{
    price?: { value?: string };
    price_type?: { symbol?: string };
    payment_token?: { symbol?: string };
    protocol_data?: { parameters?: { offer?: Array<{ startAmount?: string }> } };
  }>(`/offers/collection/${encodeURIComponent(slug)}/nfts/${encodeURIComponent(tokenId)}/best`, {});

  const symbol = String(offer?.price_type?.symbol || offer?.payment_token?.symbol || "WETH").toUpperCase();
  if (symbol !== "ETH" && symbol !== "WETH") {
    offerCache.set(cacheKey, null);
    return null;
  }
  const rawWei = String(offer?.price?.value || offer?.protocol_data?.parameters?.offer?.[0]?.startAmount || "").trim();
  const eth = /^\d+$/.test(rawWei) ? weiToEth(rawWei) : 0;
  const value = Number.isFinite(eth) && eth > 0 ? { ethAmount: eth, symbol } : null;
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
        tokenId: candidate.tokenId,
        collectionSlug: candidate.slug,
        openseaUrl: `https://opensea.io/collection/${candidate.slug}`,
        ethAmount: offer.ethAmount,
        ethAmountLabel: `${offer.ethAmount.toFixed(3)} ${offer.symbol}`,
      })),
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

  return floors;
}

function normalizeCollectionName(value: unknown): string {
  return normalizeText(String(value || ""));
}

function rankNftCandidate(nft: any, resolvedSlug?: string): number {
  const hasSlug = Boolean(String(nft?.displayCollectionSlug || resolvedSlug || "").trim());
  const hasToken = Boolean(pickTokenId(nft));
  const hasImage = Boolean(nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.imageUrl);
  const hasName = Boolean(String(nft?.name || nft?.title || nft?.metadata?.name || "").trim());
  const balance = Number(nft?.balance || 1);
  return (hasSlug ? 30 : 0) + (hasToken ? 30 : 0) + (hasImage ? 15 : 0) + (hasName ? 10 : 0) + Math.min(balance, 10);
}

async function buildOfferCandidates(wallet: string): Promise<{
  candidates: OfferCandidate[];
  walletNftCount: number;
  collectionGroupCount: number;
  selectedGroupCount: number;
  selectedGroups: NonNullable<WalletOfferEstimateResult["debug"]>["selectedGroups"];
  skippedCounts: NonNullable<WalletOfferEstimateResult["debug"]>["skippedCounts"];
}> {
  if (!ALCHEMY_API_KEY) {
    return {
      candidates: [],
      walletNftCount: 0,
      collectionGroupCount: 0,
      selectedGroupCount: 0,
      selectedGroups: [],
      skippedCounts: { rankedOut: 0 },
    };
  }
  const nfts = await fetchWalletNFTs<any>(wallet, ALCHEMY_API_KEY);
  const groups = new Map<string, { key: string; nfts: any[]; slug?: string; contractAddress?: string; collectionName?: string }>();

  for (const nft of nfts) {
    const slug = String(nft?.displayCollectionSlug || "").trim();
    const contractAddress = normalizeAddress(String(nft?.contract?.address || nft?.contractAddress || "").trim());
    const collectionName = String(nft?.collection?.name || nft?.displayCollectionName || nft?.collectionName || "").trim();
    const normalizedName = normalizeCollectionName(collectionName);

    const key = slug ? `slug:${slug}` : contractAddress ? `contract:${contractAddress}` : normalizedName ? `name:${normalizedName}` : "unknown";
    const existing = groups.get(key) || { key, nfts: [], slug: slug || undefined, contractAddress: contractAddress || undefined, collectionName: collectionName || undefined };
    if (!existing.slug && slug) existing.slug = slug;
    if (!existing.contractAddress && contractAddress) existing.contractAddress = contractAddress;
    if (!existing.collectionName && collectionName) existing.collectionName = collectionName;
    existing.nfts.push(nft);
    groups.set(key, existing);
  }

  const rankedGroups = [];
  for (const group of groups.values()) {
    let resolvedSlug = group.slug || "";
    if (!resolvedSlug && group.contractAddress) {
      resolvedSlug = (await resolveSlugFromContract(group.contractAddress)) || "";
    }
    const withToken = group.nfts.filter((nft) => Boolean(pickTokenId(nft))).length;
    const withImageOrName = group.nfts.filter((nft) => Boolean(nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.imageUrl || String(nft?.name || nft?.title || nft?.metadata?.name || "").trim())).length;
    const score =
      group.nfts.length * 100 +
      (resolvedSlug ? 40 : 0) +
      (group.contractAddress ? 20 : 0) +
      withToken * 5 +
      withImageOrName * 3;
    rankedGroups.push({ ...group, resolvedSlug: resolvedSlug || undefined, withToken, withImageOrName, score });
  }

  rankedGroups.sort((a, b) => b.score - a.score || b.nfts.length - a.nfts.length);

  const candidates: OfferCandidate[] = [];
  const seen = new Set<string>();
  const selectedGroups: NonNullable<WalletOfferEstimateResult["debug"]>["selectedGroups"] = [];
  let rankedOut = 0;

  for (const group of rankedGroups) {
    if (candidates.length >= OFFER_CANDIDATE_CAP) {
      rankedOut += group.nfts.length;
      continue;
    }
    const groupCandidates = [...group.nfts]
      .sort((a, b) => rankNftCandidate(b, group.resolvedSlug) - rankNftCandidate(a, group.resolvedSlug))
      .slice(0, 3);

    let selectedForGroup = 0;
    for (const nft of groupCandidates) {
      if (candidates.length >= OFFER_CANDIDATE_CAP) break;
      const tokenId = pickTokenId(nft);
      if (!tokenId) continue;
      const slug = String(nft?.displayCollectionSlug || group.resolvedSlug || "").trim();
      if (!slug) continue;
      const key = `${slug}:${tokenId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        title: String(nft?.title || "").trim() || undefined,
        name: String(nft?.name || nft?.metadata?.name || "").trim() || undefined,
        collectionName: String(nft?.collection?.name || nft?.displayCollectionName || group.collectionName || "").trim() || undefined,
        slug,
        tokenId,
        contractAddress: normalizeAddress(String(nft?.contract?.address || nft?.contractAddress || "").trim()) || undefined,
        hasImage: Boolean(nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.imageUrl),
        rankReason: "group-balanced",
      });
      selectedForGroup += 1;
    }
    if (selectedForGroup > 0 && selectedGroups.length < 10) {
      selectedGroups.push({
        collectionName: group.collectionName,
        collectionSlug: group.resolvedSlug,
        contractAddress: group.contractAddress,
        ownedCount: group.nfts.length,
        selectedCandidateCount: selectedForGroup,
        rankReason: `owned:${group.nfts.length},slug:${group.resolvedSlug ? 1 : 0},contract:${group.contractAddress ? 1 : 0},tokenRich:${group.withToken}`,
      });
    } else if (selectedForGroup === 0) {
      rankedOut += group.nfts.length;
    }
  }

  return {
    candidates,
    walletNftCount: nfts.length,
    collectionGroupCount: groups.size,
    selectedGroupCount: selectedGroups.length,
    selectedGroups,
    skippedCounts: {
      rankedOut,
    },
  };
}

async function fetchBestOfferEth(slug: string, tokenId: string): Promise<{ ethAmount: number; symbol: string } | null> {
  const cacheKey = `${slug}:${tokenId}`;
  if (offerCache.has(cacheKey)) return offerCache.get(cacheKey) ?? null;

  const offer = await fetchOpenSeaJson<{
    price?: { value?: string };
    price_type?: { symbol?: string };
    payment_token?: { symbol?: string };
    protocol_data?: { parameters?: { offer?: Array<{ startAmount?: string }> } };
  }>(`/offers/collection/${encodeURIComponent(slug)}/nfts/${encodeURIComponent(tokenId)}/best`, {});

  const symbol = String(offer?.price_type?.symbol || offer?.payment_token?.symbol || "WETH").toUpperCase();
  if (symbol !== "ETH" && symbol !== "WETH") {
    offerCache.set(cacheKey, null);
    return null;
  }
  const rawWei = String(offer?.price?.value || offer?.protocol_data?.parameters?.offer?.[0]?.startAmount || "").trim();
  const eth = /^\d+$/.test(rawWei) ? weiToEth(rawWei) : 0;
  const value = Number.isFinite(eth) && eth > 0 ? { ethAmount: eth, symbol } : null;
  offerCache.set(cacheKey, value);
  return value;
}

export async function buildWalletOfferEstimate(wallet: string, includeDebug = false): Promise<WalletOfferEstimateResult> {
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
    const candidateData = await buildOfferCandidates(wallet);
    const candidates = candidateData.candidates;
    const checked = candidates.slice(0, OFFER_CANDIDATE_CAP);

    const skippedCounts: NonNullable<WalletOfferEstimateResult["debug"]>["skippedCounts"] = {
      missingSlug: 0,
      missingTokenId: 0,
      noOffer: 0,
      unsupportedCurrency: 0,
      lookupFailed: 0,
      rankedOut: candidateData.skippedCounts?.rankedOut || 0,
    };
    const offers = await Promise.all(checked.map(async (c) => ({ candidate: c, offer: await fetchBestOfferEth(c.slug, c.tokenId) })));
    const validOffers = offers.filter((v): v is { candidate: OfferCandidate; offer: { ethAmount: number; symbol: string } } => Boolean(v.offer?.ethAmount && v.offer.ethAmount > 0));
    const detectedOfferValueETH = validOffers.reduce((sum, value) => sum + value.offer.ethAmount, 0);

    const coverage = checked.length / OFFER_CANDIDATE_CAP;
    const estimateQuality: EstimateQuality = coverage >= 0.8 ? "high" : coverage >= 0.4 ? "medium" : "low";

    for (const row of offers) {
      if (!row.offer) skippedCounts.noOffer = (skippedCounts.noOffer || 0) + 1;
    }
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
        collectionSlug: candidate.slug,
        contractAddress: candidate.contractAddress,
        openseaUrl: `https://opensea.io/collection/${candidate.slug}`,
        ethAmount: offer.ethAmount,
        ethAmountLabel: `${offer.ethAmount.toFixed(3)} ${offer.symbol}`,
      })),
      debug: includeDebug
        ? {
            candidateStrategy: "collection-balanced-v1",
            candidateCap: OFFER_CANDIDATE_CAP,
            walletNftCount: candidateData.walletNftCount,
            collectionGroupCount: candidateData.collectionGroupCount,
            selectedGroupCount: candidateData.selectedGroupCount,
            candidateCount: candidates.length,
            checkedNftCount: checked.length,
            selectedGroups: candidateData.selectedGroups,
            candidatesChecked: checked.slice(0, 20).map((candidate) => ({
              title: candidate.title,
              name: candidate.name,
              collectionName: candidate.collectionName,
              collectionSlug: candidate.slug,
              tokenId: candidate.tokenId,
              contractAddress: candidate.contractAddress,
              hasImage: candidate.hasImage,
              rankReason: candidate.rankReason,
            })),
            offersFound: validOffers.slice(0, 20).map(({ candidate, offer }) => ({
              title: candidate.title,
              name: candidate.name,
              collectionName: candidate.collectionName,
              collectionSlug: candidate.slug,
              tokenId: candidate.tokenId,
              contractAddress: candidate.contractAddress,
              ethAmount: offer.ethAmount,
              ethAmountLabel: `${offer.ethAmount.toFixed(3)} ${offer.symbol}`,
              openseaUrl: `https://opensea.io/collection/${candidate.slug}`,
            })),
            skippedCounts,
          }
        : undefined,
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

  const normalizeForMatch = (v: string) => normalizeText(v).replace(/\s+/g, "");
  const safe = normalizeText(q);
  const compact = safe.replace(/\s+/g, "");
  const dashed = safe.replace(/\s+/g, "-");
  const variants = Array.from(new Set([compact, dashed, safe.replace(/\s+/g, " ").trim().replace(/\s+/g, "-")])).filter(Boolean);

  const bySlug = new Map<string, ConverterCollectionSearchResult>();

  for (const path of endpoints) {
    const payload = await fetchOpenSeaJson<any>(path, {});
    const rows = parseCollectionRows(payload);
    for (const row of rows) {
      const mapped = mapCollectionResult(row, q);
      if (!mapped) continue;
      const exists = bySlug.get(mapped.slug);
      if (!exists) bySlug.set(mapped.slug, mapped);
    }
    if (bySlug.size >= 12) break;
  }

  for (const variant of variants) {
    const fallback = await fetchOpenSeaJson<any>(`/collections/${encodeURIComponent(variant)}`, {});
    const mapped = mapCollectionResult(
      { slug: fallback?.collection || fallback?.slug || variant, name: fallback?.name || fallback?.title || "", image_url: fallback?.image_url || fallback?.imageUrl },
      q
    );
    if (!mapped) continue;
    bySlug.set(mapped.slug, mapped);
  }

  const all = Array.from(bySlug.values());

  const ranked = all
    .map((item) => {
      const safelist = (item.safelistStatus || "").toLowerCase();
      const safelistBoost = safelist.includes("verified") || safelist.includes("approved") ? 2 : safelist.includes("requested") ? 1 : 0;
      const confidenceBoost = item.matchConfidence === "high" ? 2 : item.matchConfidence === "medium" ? 1 : 0;
      const verifiedBoost = item.verified ? 2 : 0;
      const looksLikeAddress = isEthAddress(item.slug) || isEthAddress(item.name);
      const exactish = normalizeForMatch(item.slug.replace(/-/g, "")) === compact || normalizeForMatch(item.name) === compact;
      return { item, score: safelistBoost + confidenceBoost + verifiedBoost + (exactish ? 3 : 0) - (looksLikeAddress ? 3 : 0) };
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

  return floors
    .sort((a, b) => {
      const aFloor = a.floorPriceETH && a.floorPriceETH > 0 ? 1 : 0;
      const bFloor = b.floorPriceETH && b.floorPriceETH > 0 ? 1 : 0;
      if (bFloor !== aFloor) return bFloor - aFloor;
      const aImg = a.imageUrl ? 1 : 0;
      const bImg = b.imageUrl ? 1 : 0;
      if (bImg !== aImg) return bImg - aImg;
      const aConf = a.matchConfidence === "high" ? 2 : a.matchConfidence === "medium" ? 1 : 0;
      const bConf = b.matchConfidence === "high" ? 2 : b.matchConfidence === "medium" ? 1 : 0;
      return bConf - aConf;
    })
    .slice(0, 6);
}
