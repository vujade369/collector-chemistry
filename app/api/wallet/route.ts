import { NextResponse } from "next/server";

type AlchemyAttribute = {
  trait_type?: string;
  value?: string | number | boolean | null;
};

type AlchemyOwnedNft = {
  contract?: {
    address?: string;
    name?: string;
    symbol?: string;
    openSeaMetadata?: {
      collectionName?: string;
    };
  };
  tokenId?: string;
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      name?: string;
      description?: string;
      image?: string;
      artist?: string;
      creator?: string;
      createdBy?: string;
      created_by?: string;
      attributes?: AlchemyAttribute[];
      [key: string]: unknown;
    };
  };
};

type AlchemyResponse = {
  ownedNfts?: AlchemyOwnedNft[];
  pageKey?: string;
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function extractArtistFromAttributes(
  attributes: AlchemyAttribute[] | undefined
): string {
  if (!attributes || !Array.isArray(attributes)) return "";

  const artistKeys = new Set([
    "artist",
    "creator",
    "created by",
    "created_by",
    "made by",
    "maker",
    "author",
  ]);

  for (const attribute of attributes) {
    const traitType = normalizeText(attribute.trait_type).toLowerCase();
    const value =
      typeof attribute.value === "string" ? attribute.value.trim() : "";

    if (!traitType || !value) continue;

    if (artistKeys.has(traitType)) {
      return value;
    }
  }

  return "";
}

function extractArtistFromName(name: string): string {
  if (!name) return "";

  const lower = name.toLowerCase();
  const byIndex = lower.lastIndexOf(" by ");

  if (byIndex === -1) return "";

  return name.slice(byIndex + 4).trim();
}

function extractArtist(nft: AlchemyOwnedNft, collectionName: string): string {
  const metadata = nft.raw?.metadata;

  const topLevelCandidates = [
    metadata?.artist,
    metadata?.creator,
    metadata?.createdBy,
    metadata?.created_by,
  ];

  for (const candidate of topLevelCandidates) {
    const value = normalizeText(candidate);
    if (value) return value;
  }

  const attributeArtist = extractArtistFromAttributes(metadata?.attributes);
  if (attributeArtist) return attributeArtist;

  const fromNftName = extractArtistFromName(nft.name || "");
  if (fromNftName) return fromNftName;

  const fromCollectionName = extractArtistFromName(collectionName);
  if (fromCollectionName) return fromCollectionName;

  return "";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  const isLikelyEthAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet || "");
  const isLikelyEns = (wallet || "").endsWith(".eth");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  if (!isLikelyEthAddress && !isLikelyEns) {
    return NextResponse.json(
      { error: "Invalid wallet format. Use a full 0x address or ENS name." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ALCHEMY_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  try {
    let allOwnedNfts: AlchemyOwnedNft[] = [];
    let pageKey: string | undefined = undefined;
    let safetyCounter = 0;

    do {
      const url = new URL(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`
      );

      url.searchParams.set("owner", wallet);
      url.searchParams.set("withMetadata", "true");

      if (pageKey) {
        url.searchParams.set("pageKey", pageKey);
      }

      const res = await fetch(url.toString());

      if (!res.ok) {
        const details = await res.text();

        return NextResponse.json(
          {
            error: "Failed to fetch from Alchemy",
            details,
            status: res.status,
          },
          { status: res.status }
        );
      }

      const data: AlchemyResponse = await res.json();

      allOwnedNfts = allOwnedNfts.concat(data.ownedNfts ?? []);
      pageKey = data.pageKey;
      safetyCounter += 1;

      if (safetyCounter > 50) {
        return NextResponse.json(
          { error: "Pagination safety limit reached" },
          { status: 500 }
        );
      }
    } while (pageKey);

    const uniqueContracts = new Map<string, string>();
    const collectionPreviews = new Map<string, string>();

    const cleanedOwnedNfts = allOwnedNfts.map((nft) => {
      const collectionName =
        nft.contract?.openSeaMetadata?.collectionName ||
        nft.contract?.name ||
        nft.contract?.symbol ||
        nft.contract?.address ||
        "Unknown Collection";

      const imageUrl =
        nft.image?.cachedUrl ||
        nft.image?.thumbnailUrl ||
        nft.image?.pngUrl ||
        nft.image?.originalUrl ||
        nft.raw?.metadata?.image ||
        "";

      const contractAddress = nft.contract?.address?.toLowerCase() || "";
      const tokenId = nft.tokenId || "";
      const nftName =
        nft.name ||
        nft.raw?.metadata?.name ||
        "";

      const artist = extractArtist(nft, collectionName);

      if (contractAddress && !uniqueContracts.has(contractAddress)) {
        uniqueContracts.set(contractAddress, collectionName);
      }

      if (collectionName && imageUrl && !collectionPreviews.has(collectionName)) {
        collectionPreviews.set(collectionName, imageUrl);
      }

      return {
        contractAddress,
        tokenId,
        collectionName,
        nftName,
        imageUrl,
        artist,
      };
    });

    return NextResponse.json({
      wallet,
      totalNfts: cleanedOwnedNfts.length,
      totalCollections: uniqueContracts.size,
      collections: Array.from(uniqueContracts.values()).sort((a, b) =>
        a.localeCompare(b)
      ),
      collectionPreviews: Object.fromEntries(collectionPreviews),
      ownedNfts: cleanedOwnedNfts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}