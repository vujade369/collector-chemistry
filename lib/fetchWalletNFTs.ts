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

export async function fetchWalletNFTs<T extends WalletOwnerNFT = WalletOwnerNFT>(
  owner: string,
  alchemyApiKey?: string
): Promise<T[]> {
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
    const pageNfts = ((data.ownedNfts || []) as T[]).filter(
      (nft) => nft?.spamInfo?.isSpam !== "true"
    );

    allNfts.push(...pageNfts);
    pageKey = data.pageKey;
  } while (pageKey);

  const visibleKeys = await fetchOpenSeaVisibleTokenKeys(owner);
  if (!visibleKeys) return allNfts;

  return allNfts.filter((nft) => {
    const key = getNftKey(nft);
    return key ? visibleKeys.has(key) : true;
  });
}

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_MAX_PAGES = 40;

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

async function fetchOpenSeaVisibleTokenKeys(owner: string): Promise<Set<string> | null> {
  if (!OPENSEA_API_KEY) return null;
  if (!isEthAddress(owner)) return null;

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
            "x-api-key": OPENSEA_API_KEY,
          },
        }
      );
    } catch {
      return null;
    }

    if (!res.ok) return null;

    let data: OpenSeaAccountNFTResponse;
    try {
      data = (await res.json()) as OpenSeaAccountNFTResponse;
    } catch {
      return null;
    }

    for (const nft of data.nfts || []) {
      const key = getOpenSeaNftKey(nft);
      if (key) keys.add(key);
    }

    next = String(data.next || "");
    page += 1;
    if (!next) break;
  }

  return keys;
}
