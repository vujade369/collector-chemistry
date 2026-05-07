export type WalletOwnerNFT = {
  spamInfo?: {
    isSpam?: string;
  };
  contract?: {
    address?: string;
  };
  tokenId?: string | number;
  token_id?: string | number;
  identifier?: string | number;
  [key: string]: unknown;
};

export class WalletFetchError extends Error {
  errorType: "MISSING_API_KEY" | "UPSTREAM_FETCH_FAILED";
  resolverStage: "fetch_init" | "alchemy_request";
  upstreamStatus?: number;
  diagnostics?: {
    owner: string;
    endpointPath: string;
    query: Record<string, string>;
    hasPageKey: boolean;
    fetchErrorName?: string;
    fetchErrorMessage?: string;
    fetchErrorCauseMessage?: string;
    fetchErrorCauseCode?: string;
  };

  constructor(params: {
    message: string;
    errorType: "MISSING_API_KEY" | "UPSTREAM_FETCH_FAILED";
    resolverStage: "fetch_init" | "alchemy_request";
    upstreamStatus?: number;
    diagnostics?: {
      owner: string;
      endpointPath: string;
      query: Record<string, string>;
      hasPageKey: boolean;
      fetchErrorName?: string;
      fetchErrorMessage?: string;
      fetchErrorCauseMessage?: string;
      fetchErrorCauseCode?: string;
    };
  }) {
    super(params.message);
    this.name = "WalletFetchError";
    this.errorType = params.errorType;
    this.resolverStage = params.resolverStage;
    this.upstreamStatus = params.upstreamStatus;
    this.diagnostics = params.diagnostics;
  }
}

export type WalletNFTFetchDebug = {
  alchemyFetchMs: number;
  openSeaVisibleFilterMs: number;
  normalizationMs: number;
  ensResolveMs: number;
  alchemyPageCount: number;
  alchemyBreakReason: string | null;
  visibleTokenPageCount: number;
  totalFetchedNFTs: number;
  visibleTokenCount: number;
  returnedNFTs: number;
  openSeaVisibleFilterApplied: boolean;
  openSeaVisibleFilterFallbackReason: string | null;
  openSeaVisibleFilterCacheHit: boolean;
  openSeaVisibleFilterCacheAgeMs: number | null;
  openSeaVisibleFilterCacheTtlMs: number;
};

export type WalletNFTFetchResult<T extends WalletOwnerNFT = WalletOwnerNFT> = {
  nfts: T[];
  debug: WalletNFTFetchDebug;
};

export type WalletMergeFetchDebug = WalletNFTFetchDebug & {
  wallets: Array<{
    wallet: string;
    ok: boolean;
    debug?: WalletNFTFetchDebug;
    error?: string;
  }>;
};

function createFetchDebug(): WalletNFTFetchDebug {
  return {
    alchemyFetchMs: 0,
    openSeaVisibleFilterMs: 0,
    normalizationMs: 0,
    ensResolveMs: 0,
    alchemyPageCount: 0,
    alchemyBreakReason: null,
    visibleTokenPageCount: 0,
    totalFetchedNFTs: 0,
    visibleTokenCount: 0,
    returnedNFTs: 0,
    openSeaVisibleFilterApplied: false,
    openSeaVisibleFilterFallbackReason: null,
    openSeaVisibleFilterCacheHit: false,
    openSeaVisibleFilterCacheAgeMs: null,
    openSeaVisibleFilterCacheTtlMs: OPENSEA_VISIBLE_TOKEN_CACHE_TTL_MS,
  };
}

function aggregateFetchDebug(debugs: WalletNFTFetchDebug[]): WalletNFTFetchDebug {
  const aggregate = createFetchDebug();
  for (const debug of debugs) {
    aggregate.alchemyFetchMs = Math.max(aggregate.alchemyFetchMs, debug.alchemyFetchMs);
    aggregate.openSeaVisibleFilterMs = Math.max(aggregate.openSeaVisibleFilterMs, debug.openSeaVisibleFilterMs);
    aggregate.normalizationMs += debug.normalizationMs;
    aggregate.ensResolveMs = Math.max(aggregate.ensResolveMs, debug.ensResolveMs);
    aggregate.alchemyPageCount += debug.alchemyPageCount;
    if (!aggregate.alchemyBreakReason && debug.alchemyBreakReason) {
      aggregate.alchemyBreakReason = debug.alchemyBreakReason;
    }
    aggregate.visibleTokenPageCount += debug.visibleTokenPageCount;
    aggregate.totalFetchedNFTs += debug.totalFetchedNFTs;
    aggregate.visibleTokenCount += debug.visibleTokenCount;
    aggregate.returnedNFTs += debug.returnedNFTs;
    aggregate.openSeaVisibleFilterApplied =
      aggregate.openSeaVisibleFilterApplied || debug.openSeaVisibleFilterApplied;
    aggregate.openSeaVisibleFilterCacheHit =
      aggregate.openSeaVisibleFilterCacheHit || debug.openSeaVisibleFilterCacheHit;
    if (
      aggregate.openSeaVisibleFilterCacheAgeMs === null &&
      debug.openSeaVisibleFilterCacheAgeMs !== null
    ) {
      aggregate.openSeaVisibleFilterCacheAgeMs = debug.openSeaVisibleFilterCacheAgeMs;
    }
    if (!aggregate.openSeaVisibleFilterFallbackReason && debug.openSeaVisibleFilterFallbackReason) {
      aggregate.openSeaVisibleFilterFallbackReason = debug.openSeaVisibleFilterFallbackReason;
    }
  }
  return aggregate;
}

function getValidAlchemyPageKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return undefined;
  return trimmed;
}

export async function fetchWalletNFTsWithDebug<T extends WalletOwnerNFT = WalletOwnerNFT>(
  owner: string,
  alchemyApiKey?: string
): Promise<WalletNFTFetchResult<T>> {
  const debug = createFetchDebug();

  if (!alchemyApiKey) {
    throw new WalletFetchError({
      message: "Missing ALCHEMY_API_KEY",
      errorType: "MISSING_API_KEY",
      resolverStage: "fetch_init",
    });
  }

  const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}`;
  const allNfts: T[] = [];
  let pageKey: string | undefined = undefined;

  const alchemyStartMs = Date.now();
  do {
    const params = new URLSearchParams({
      owner,
      withMetadata: "true",
      pageSize: "100",
    });

    if (pageKey) {
      params.set("pageKey", pageKey);
    }

    const endpointPath = "/getNFTsForOwner";
    const query = {
      owner,
      withMetadata: "true",
      pageSize: "100",
      ...(pageKey ? { pageKey } : {}),
    };
    const url = `${baseUrl}${endpointPath}?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (error) {
      const fetchErr = error as Error & {
        cause?: { message?: string; code?: string };
      };
      throw new WalletFetchError({
        message: "fetch failed",
        errorType: "UPSTREAM_FETCH_FAILED",
        resolverStage: "fetch_init",
        diagnostics: {
          owner,
          endpointPath,
          query,
          hasPageKey: Boolean(pageKey),
          fetchErrorName: fetchErr?.name,
          fetchErrorMessage: fetchErr?.message,
          fetchErrorCauseMessage: fetchErr?.cause?.message,
          fetchErrorCauseCode: fetchErr?.cause?.code,
        },
      });
    }

    if (!res.ok) {
      const text = await res.text();
      throw new WalletFetchError({
        message: `Alchemy request failed: ${res.status} ${text.slice(0, 180)}`,
        errorType: "UPSTREAM_FETCH_FAILED",
        resolverStage: "alchemy_request",
        upstreamStatus: res.status,
        diagnostics: {
          owner,
          endpointPath,
          query,
          hasPageKey: Boolean(pageKey),
        },
      });
    }

    const data = await res.json();
    const pageNfts = (data.ownedNfts || []) as T[];

    allNfts.push(...pageNfts);
    debug.alchemyPageCount += 1;
    pageKey = getValidAlchemyPageKey(data.pageKey);
  } while (pageKey);
  debug.alchemyFetchMs = Date.now() - alchemyStartMs;
  debug.totalFetchedNFTs = allNfts.length;
  debug.alchemyBreakReason = pageKey ? null : "no_valid_page_key";

  const ensResolveStartMs = Date.now();
  const resolvedAddress = await resolveEnsToAddress(owner);
  debug.ensResolveMs = Date.now() - ensResolveStartMs;
  const visibleResult = await fetchOpenSeaVisibleTokenKeysWithDebug(resolvedAddress);
  debug.openSeaVisibleFilterMs = visibleResult.elapsedMs;
  debug.visibleTokenPageCount = visibleResult.pageCount;
  debug.visibleTokenCount = visibleResult.keys?.size || 0;
  debug.openSeaVisibleFilterFallbackReason = visibleResult.fallbackReason;
  debug.openSeaVisibleFilterCacheHit = visibleResult.cacheHit;
  debug.openSeaVisibleFilterCacheAgeMs = visibleResult.cacheAgeMs;
  debug.openSeaVisibleFilterCacheTtlMs = visibleResult.cacheTtlMs;

  if (!visibleResult.keys) {
    debug.returnedNFTs = allNfts.length;
    return { nfts: allNfts, debug };
  }

  debug.openSeaVisibleFilterApplied = true;
  const normalizationStartMs = Date.now();
  const nfts = allNfts.filter((nft) => {
    const key = getNftKey(nft);
    if (!key) return true;
    return visibleResult.keys!.has(key);
  });
  debug.normalizationMs = Date.now() - normalizationStartMs;
  debug.returnedNFTs = nfts.length;

  return { nfts, debug };
}

export async function fetchWalletNFTs<T extends WalletOwnerNFT = WalletOwnerNFT>(
  owner: string,
  alchemyApiKey?: string
): Promise<T[]> {
  const { nfts } = await fetchWalletNFTsWithDebug<T>(owner, alchemyApiKey);
  return nfts;
}

function normalizeTokenIdForMerge(value: string) {
  return normalizeTokenId(value);
}

function getMergeKey(nft: WalletOwnerNFT) {
  const contract = getContractAddress(nft.contract);
  const rawTokenId = String(nft.tokenId ?? nft.token_id ?? nft.identifier ?? "");
  const tokenId = normalizeTokenIdForMerge(rawTokenId);
  if (!contract || !tokenId) return "";
  return `${contract}:${tokenId}`;
}

export async function fetchAndMergeWalletNFTs<T extends WalletOwnerNFT = WalletOwnerNFT>(
  wallets: string[],
  alchemyApiKey?: string
): Promise<{ mergedNFTs: Array<T & { sourceWallet?: string }>; deduplicatedCount: number; failedWallets: string[] }> {
  const { mergedNFTs, deduplicatedCount, failedWallets } =
    await fetchAndMergeWalletNFTsWithDebug<T>(wallets, alchemyApiKey);
  return { mergedNFTs, deduplicatedCount, failedWallets };
}

export async function fetchAndMergeWalletNFTsWithDebug<T extends WalletOwnerNFT = WalletOwnerNFT>(
  wallets: string[],
  alchemyApiKey?: string
): Promise<{ mergedNFTs: Array<T & { sourceWallet?: string }>; deduplicatedCount: number; failedWallets: string[]; debug: WalletMergeFetchDebug }> {
  const uniqueWallets = Array.from(new Set(wallets.map((w) => w.trim()).filter(Boolean)));
  const results = await Promise.allSettled(
    uniqueWallets.map(async (wallet) => ({
      wallet,
      result: await fetchWalletNFTsWithDebug<T>(wallet, alchemyApiKey),
    }))
  );

  const mergedNFTs: Array<T & { sourceWallet?: string }> = [];
  const failedWallets: string[] = [];
  const seen = new Set<string>();
  let deduplicatedCount = 0;

  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue;
    }
    const { wallet, result: fetchResult } = result.value;
    const { nfts } = fetchResult;
    for (const nft of nfts) {
      const key = getMergeKey(nft);
      if (key && seen.has(key)) {
        deduplicatedCount += 1;
        continue;
      }
      if (key) seen.add(key);
      mergedNFTs.push({ ...(nft as T), sourceWallet: wallet });
    }
  }

  results.forEach((result, idx) => {
    if (result.status === "rejected") failedWallets.push(uniqueWallets[idx]);
  });

  const walletDebug = results.map((result, idx) => {
    if (result.status === "fulfilled") {
      return {
        wallet: result.value.wallet,
        ok: true,
        debug: result.value.result.debug,
      };
    }
    const error = result.reason instanceof Error ? result.reason.message : "Wallet fetch failed";
    return {
      wallet: uniqueWallets[idx],
      ok: false,
      error,
    };
  });
  const successfulDebug = walletDebug
    .map((entry) => entry.debug)
    .filter((entry): entry is WalletNFTFetchDebug => Boolean(entry));
  const debug: WalletMergeFetchDebug = {
    ...aggregateFetchDebug(successfulDebug),
    returnedNFTs: mergedNFTs.length,
    wallets: walletDebug,
  };

  return { mergedNFTs, deduplicatedCount, failedWallets, debug };
}

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_MAX_PAGES = 40;
const OPENSEA_VISIBLE_TOKEN_CACHE_TTL_MS = 60_000;

type OpenSeaVisibleTokenResult = {
  keys: Set<string> | null;
  pageCount: number;
  elapsedMs: number;
  fallbackReason: string | null;
  cacheHit: boolean;
  cacheAgeMs: number | null;
  cacheTtlMs: number;
};

const openSeaVisibleTokenCache = new Map<string, {
  keys: Set<string>;
  pageCount: number;
  createdAtMs: number;
}>();
const openSeaVisibleTokenInFlight = new Map<string, Promise<OpenSeaVisibleTokenResult>>();

const OPENSEA_API_KEY_LOCAL = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL_LOCAL = "https://api.opensea.io/api/v2";

async function resolveEnsToAddress(ensOrAddress: string): Promise<string> {
  if (isEthAddress(ensOrAddress)) return ensOrAddress;
  if (!OPENSEA_API_KEY_LOCAL) return ensOrAddress;
  try {
    const res = await fetch(
      `${OPENSEA_BASE_URL_LOCAL}/accounts/resolve/${encodeURIComponent(ensOrAddress)}`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "x-api-key": OPENSEA_API_KEY_LOCAL,
        },
      }
    );
    if (!res.ok) return ensOrAddress;
    const data = await res.json();
    const resolved = String(data?.address || "").trim();
    return isEthAddress(resolved) ? resolved : ensOrAddress;
  } catch {
    return ensOrAddress;
  }
}

type OpenSeaAccountNFT = {
  identifier?: string | number;
  token_id?: string | number;
  contract?: string | { address?: string };
  contract_address?: string;
};

type OpenSeaAccountNFTResponse = {
  nfts?: OpenSeaAccountNFT[];
  next?: string | null;
};

function isEthAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function normalizeTokenId(value: string) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("0x")) return BigInt(trimmed).toString(10);
    if (/^\d+$/.test(trimmed)) return BigInt(trimmed).toString(10);
  } catch {
    return trimmed;
  }

  return trimmed;
}

function getContractAddress(value: WalletOwnerNFT["contract"] | string | undefined) {
  if (typeof value === "string") return value.toLowerCase();
  return String(value?.address || "").toLowerCase();
}

function getNftKey(nft: WalletOwnerNFT) {
  const contract = getContractAddress(nft.contract);
  const rawTokenId = String(nft.tokenId ?? nft.token_id ?? nft.identifier ?? "");
  const tokenId = normalizeTokenId(rawTokenId);
  if (!contract || !tokenId) return "";
  return `${contract}:${tokenId}`;
}

function getOpenSeaNftKey(nft: OpenSeaAccountNFT) {
  const contract = getContractAddress(nft.contract || nft.contract_address || "");
  const rawTokenId = String(nft.identifier ?? nft.token_id ?? "");
  const tokenId = normalizeTokenId(rawTokenId);
  if (!contract || !tokenId) return "";
  return `${contract}:${tokenId}`;
}

async function fetchOpenSeaVisibleTokenKeysWithDebug(owner: string): Promise<OpenSeaVisibleTokenResult> {
  const startedMs = Date.now();
  const finish = (params: {
    keys: Set<string> | null;
    pageCount: number;
    fallbackReason: string | null;
    cacheHit?: boolean;
    cacheAgeMs?: number | null;
  }) => ({
    ...params,
    elapsedMs: Date.now() - startedMs,
    cacheHit: params.cacheHit || false,
    cacheAgeMs: params.cacheAgeMs ?? null,
    cacheTtlMs: OPENSEA_VISIBLE_TOKEN_CACHE_TTL_MS,
  });

  if (!OPENSEA_API_KEY) {
    return finish({ keys: null, pageCount: 0, fallbackReason: "missing_opensea_api_key" });
  }
  const openseaApiKey = OPENSEA_API_KEY;
  if (!isEthAddress(owner)) {
    return finish({ keys: null, pageCount: 0, fallbackReason: "non_eth_owner" });
  }

  const cacheKey = owner.trim().toLowerCase();
  const cached = openSeaVisibleTokenCache.get(cacheKey);
  if (cached) {
    const cacheAgeMs = Date.now() - cached.createdAtMs;
    if (cacheAgeMs < OPENSEA_VISIBLE_TOKEN_CACHE_TTL_MS) {
      return finish({
        keys: cached.keys,
        pageCount: cached.pageCount,
        fallbackReason: null,
        cacheHit: true,
        cacheAgeMs,
      });
    }
    openSeaVisibleTokenCache.delete(cacheKey);
  }

  const inFlight = openSeaVisibleTokenInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = fetchOpenSeaVisibleTokenKeysUncached(cacheKey, startedMs, openseaApiKey).finally(() => {
    openSeaVisibleTokenInFlight.delete(cacheKey);
  });
  openSeaVisibleTokenInFlight.set(cacheKey, request);
  return request;
}

async function fetchOpenSeaVisibleTokenKeysUncached(
  owner: string,
  startedMs: number,
  openseaApiKey: string
): Promise<OpenSeaVisibleTokenResult> {
  const finish = (params: {
    keys: Set<string> | null;
    pageCount: number;
    fallbackReason: string | null;
    cacheHit?: boolean;
    cacheAgeMs?: number | null;
  }) => ({
    ...params,
    elapsedMs: Date.now() - startedMs,
    cacheHit: params.cacheHit || false,
    cacheAgeMs: params.cacheAgeMs ?? null,
    cacheTtlMs: OPENSEA_VISIBLE_TOKEN_CACHE_TTL_MS,
  });
  const keys = new Set<string>();
  let next = "";
  let page = 0;

  while (page < OPENSEA_MAX_PAGES) {
    const params = new URLSearchParams({
      limit: "200",
      include_hidden: "false",
    });
    if (next) params.set("next", next);

    let res: Response;
    try {
      res = await fetch(
        `${OPENSEA_BASE_URL}/chain/ethereum/account/${owner}/nfts?${params.toString()}`,
        {
          cache: "no-store",
          headers: {
            accept: "application/json",
            "x-api-key": openseaApiKey,
          },
        }
      );
    } catch {
      return finish({ keys: null, pageCount: page, fallbackReason: "request_failed" });
    }

    if (!res.ok) {
      return finish({ keys: null, pageCount: page, fallbackReason: `http_${res.status}` });
    }

    let data: OpenSeaAccountNFTResponse;
    try {
      data = (await res.json()) as OpenSeaAccountNFTResponse;
    } catch {
      return finish({ keys: null, pageCount: page, fallbackReason: "invalid_json" });
    }

    for (const nft of data.nfts || []) {
      const key = getOpenSeaNftKey(nft);
      if (key) keys.add(key);
    }

    next = String(data.next || "");
    page += 1;
    if (!next) break;
  }

  openSeaVisibleTokenCache.set(owner, {
    keys,
    pageCount: page,
    createdAtMs: Date.now(),
  });
  return finish({ keys, pageCount: page, fallbackReason: null });
}

async function fetchOpenSeaVisibleTokenKeys(owner: string): Promise<Set<string> | null> {
  const result = await fetchOpenSeaVisibleTokenKeysWithDebug(owner);
  return result.keys;
}
