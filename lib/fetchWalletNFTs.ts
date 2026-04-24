export type WalletOwnerNFT = {
  spamInfo?: {
    isSpam?: string;
  };
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

  return allNfts;
}