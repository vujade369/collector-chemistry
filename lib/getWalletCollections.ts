export interface WalletCollection {
  contractAddress: string;
  name: string;
  ownedCount: number;
  imageUrl?: string;
}

interface AlchemyNft {
  contract?: {
    address?: string;
    name?: string;
    openSeaMetadata?: {
      imageUrl?: string;
    };
  };
  image?: {
    thumbnailUrl?: string;
    originalUrl?: string;
  };
}

interface AlchemyResponse {
  ownedNfts?: AlchemyNft[];
  pageKey?: string;
  totalCount?: number;
}

export async function getWalletCollections(
  walletAddress: string
): Promise<WalletCollection[]> {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY is not set");
  }

  if (!walletAddress || !walletAddress.trim()) {
    throw new Error("walletAddress is required");
  }

  const allNfts: AlchemyNft[] = [];
  let pageKey: string | undefined;

  do {
    const url = new URL(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`
    );

    url.searchParams.set("owner", walletAddress.trim());
    url.searchParams.set("withMetadata", "true");

    if (pageKey) {
      url.searchParams.set("pageKey", pageKey);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Alchemy API error: ${res.status} 
${res.statusText}`);
    }

    const data: AlchemyResponse = await res.json();
    const ownedNfts = data.ownedNfts ?? [];

    allNfts.push(...ownedNfts);
    pageKey = data.pageKey;
  } while (pageKey);

  const collectionMap = new Map<string, WalletCollection>();

  for (const nft of allNfts) {
    const address = nft.contract?.address?.toLowerCase();

    if (!address) {
      continue;
    }

    if (collectionMap.has(address)) {
      const existing = collectionMap.get(address);
      if (existing) {
        existing.ownedCount += 1;
      }
      continue;
    }

    collectionMap.set(address, {
      contractAddress: address,
      name: nft.contract?.name || "Unknown Collection",
      ownedCount: 1,
      imageUrl:
        nft.contract?.openSeaMetadata?.imageUrl ??
        nft.image?.thumbnailUrl ??
        nft.image?.originalUrl,
    });
  }

  return Array.from(collectionMap.values());
}


