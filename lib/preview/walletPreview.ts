export type PreviewNFT = {
  imageUrl: string;
  name: string;
  collectionName: string;
};

type AlchemyPreviewNFT = {
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      image?: string;
      name?: string;
    };
  };
  name?: string;
  title?: string;
  contractMetadata?: {
    name?: string;
  };
  contract?: {
    name?: string;
  };
};

export async function getWalletPreviewImages(wallet: string): Promise<PreviewNFT[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const params = new URLSearchParams({ owner: wallet, withMetadata: "true", pageSize: "12" });
      const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner?${params.toString()}`;
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });

      if (!res.ok) return [];

      const data = (await res.json()) as { ownedNfts?: AlchemyPreviewNFT[] };
      return (data.ownedNfts || [])
        .map((nft) => ({
          imageUrl:
            nft.image?.cachedUrl ||
            nft.image?.thumbnailUrl ||
            nft.image?.originalUrl ||
            nft.raw?.metadata?.image ||
            "",
          name: nft.name || nft.title || nft.raw?.metadata?.name || "",
          collectionName: nft.contractMetadata?.name || nft.contract?.name || "",
        }))
        .filter((nft) => Boolean(nft.imageUrl))
        .slice(0, 12);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return [];
  }
}
