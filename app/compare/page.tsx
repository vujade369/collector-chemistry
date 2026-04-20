"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type OwnedNft = {
  contractAddress: string;
  tokenId: string;
  collectionName: string;
  nftName: string;
  imageUrl: string;
  artist: string;
};

type WalletApiResponse = {
  wallet: string;
  totalNfts: number;
  totalCollections: number;
  collections: string[];
  collectionPreviews: Record<string, string>;
  ownedNfts: OwnedNft[];
  error?: string;
};

type SharedCollection = {
  contractAddress: string;
  name: string;
  imageUrl?: string;
};

type SharedArtist = {
  name: string;
};

type HighlightGroup = {
  id: string;
  title: string;
  wallet1Nfts: OwnedNft[];
  wallet2Nfts: OwnedNft[];
  wallet1Count: number;
  wallet2Count: number;
  totalCount: number;
};

const DEFAULT_VISIBLE_COLLECTIONS = 5;

function truncateWallet(wallet: string) {
  if (!wallet) return "";
  if (wallet.length < 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function pickHighlights(nfts: OwnedNft[], max = 4) {
  return [...nfts]
    .sort((a, b) => {
      const aHasImage = a.imageUrl ? 1 : 0;
      const bHasImage = b.imageUrl ? 1 : 0;

      if (aHasImage !== bHasImage) return bHasImage - aHasImage;

      const aHasName = a.nftName ? 1 : 0;
      const bHasName = b.nftName ? 1 : 0;

      if (aHasName !== bHasName) return bHasName - aHasName;

      return (a.nftName || "").localeCompare(b.nftName || "");
    })
    .slice(0, max);
}

function getSharedCollections(
  wallet1Data: WalletApiResponse | null,
  wallet2Data: WalletApiResponse | null
): SharedCollection[] {
  if (!wallet1Data || !wallet2Data) return [];

  const wallet1Contracts = new Map<string, SharedCollection>();
  const wallet2Contracts = new Map<string, SharedCollection>();

  wallet1Data.ownedNfts.forEach((nft) => {
    if (!nft.contractAddress) return;

    wallet1Contracts.set(nft.contractAddress, {
      contractAddress: nft.contractAddress,
      name: nft.collectionName || "Unknown Collection",
      imageUrl:
        nft.imageUrl || wallet1Data.collectionPreviews[nft.collectionName],
    });
  });

  wallet2Data.ownedNfts.forEach((nft) => {
    if (!nft.contractAddress) return;

    wallet2Contracts.set(nft.contractAddress, {
      contractAddress: nft.contractAddress,
      name: nft.collectionName || "Unknown Collection",
      imageUrl:
        nft.imageUrl || wallet2Data.collectionPreviews[nft.collectionName],
    });
  });

  const shared: SharedCollection[] = [];

  wallet1Contracts.forEach((collection, contractAddress) => {
    if (wallet2Contracts.has(contractAddress)) {
      const wallet2Match = wallet2Contracts.get(contractAddress);

      shared.push({
        contractAddress,
        name: collection.name || wallet2Match?.name || "Unknown Collection",
        imageUrl: collection.imageUrl || wallet2Match?.imageUrl,
      });
    }
  });

  return shared;
}

function isLikelyCollectionLevelArtist(
  artistName: string,
  nftsForArtist: OwnedNft[]
) {
  const normalizedArtist = normalizeText(artistName);

  if (!normalizedArtist) return true;

  const blockedNames = new Set([
    "6529",
    "6529 collections",
    "art blocks",
    "yuga labs",
    "proof",
  ]);

  if (blockedNames.has(normalizedArtist)) {
    return true;
  }

  const collectionNames = new Set(
    nftsForArtist
      .map((nft) => normalizeText(nft.collectionName || ""))
      .filter(Boolean)
  );

  if (collectionNames.has(normalizedArtist)) {
    return true;
  }

  const allCollectionsContainArtist =
    collectionNames.size > 0 &&
    Array.from(collectionNames).every((collectionName) =>
      collectionName.includes(normalizedArtist)
    );

  if (allCollectionsContainArtist) {
    return true;
  }

  return false;
}

function getSharedArtists(
  wallet1Data: WalletApiResponse | null,
  wallet2Data: WalletApiResponse | null
): SharedArtist[] {
  if (!wallet1Data || !wallet2Data) return [];

  const wallet1ArtistMap = new Map<string, string>();
  const wallet2ArtistMap = new Map<string, string>();
  const wallet1ArtistNfts = new Map<string, OwnedNft[]>();
  const wallet2ArtistNfts = new Map<string, OwnedNft[]>();

  wallet1Data.ownedNfts.forEach((nft) => {
    if (!nft.artist) return;

    const normalized = normalizeText(nft.artist);
    if (!normalized) return;

    if (!wallet1ArtistMap.has(normalized)) {
      wallet1ArtistMap.set(normalized, nft.artist.trim());
    }

    const current = wallet1ArtistNfts.get(normalized) || [];
    current.push(nft);
    wallet1ArtistNfts.set(normalized, current);
  });

  wallet2Data.ownedNfts.forEach((nft) => {
    if (!nft.artist) return;

    const normalized = normalizeText(nft.artist);
    if (!normalized) return;

    if (!wallet2ArtistMap.has(normalized)) {
      wallet2ArtistMap.set(normalized, nft.artist.trim());
    }

    const current = wallet2ArtistNfts.get(normalized) || [];
    current.push(nft);
    wallet2ArtistNfts.set(normalized, current);
  });

  const shared: SharedArtist[] = [];

  wallet1ArtistMap.forEach((originalName, normalized) => {
    if (!wallet2ArtistMap.has(normalized)) return;

    const wallet1Nfts = wallet1ArtistNfts.get(normalized) || [];
    const wallet2Nfts = wallet2ArtistNfts.get(normalized) || [];
    const combinedNfts = [...wallet1Nfts, ...wallet2Nfts];

    if (isLikelyCollectionLevelArtist(originalName, combinedNfts)) {
      return;
    }

    shared.push({
      name: originalName || wallet2ArtistMap.get(normalized) || normalized,
    });
  });

  return shared;
}

function getSharedExactNfts(
  wallet1Data: WalletApiResponse | null,
  wallet2Data: WalletApiResponse | null
): HighlightGroup[] {
  if (!wallet1Data || !wallet2Data) return [];

  const wallet2Map = new Map<string, OwnedNft>();

  wallet2Data.ownedNfts.forEach((nft) => {
    if (!nft.contractAddress || !nft.tokenId) return;
    wallet2Map.set(`${nft.contractAddress}:${nft.tokenId}`, nft);
  });

  const seen = new Set<string>();
  const groups: HighlightGroup[] = [];

  wallet1Data.ownedNfts.forEach((nft) => {
    if (!nft.contractAddress || !nft.tokenId) return;

    const key = `${nft.contractAddress}:${nft.tokenId}`;
    const wallet2Match = wallet2Map.get(key);

    if (!wallet2Match) return;
    if (seen.has(key)) return;

    seen.add(key);

    groups.push({
      id: key,
      title:
        nft.nftName ||
        wallet2Match.nftName ||
        nft.collectionName ||
        "Shared NFT",
      wallet1Nfts: [nft],
      wallet2Nfts: [wallet2Match],
      wallet1Count: 1,
      wallet2Count: 1,
      totalCount: 2,
    });
  });

  return groups
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 8);
}

function getSharedArtistHighlightGroups(
  wallet1Data: WalletApiResponse | null,
  wallet2Data: WalletApiResponse | null,
  sharedArtists: SharedArtist[]
): HighlightGroup[] {
  if (!wallet1Data || !wallet2Data) return [];

  return sharedArtists
    .map((artist) => {
      const normalizedArtist = normalizeText(artist.name);

      const wallet1All = wallet1Data.ownedNfts.filter(
        (nft) => normalizeText(nft.artist || "") === normalizedArtist
      );

      const wallet2All = wallet2Data.ownedNfts.filter(
        (nft) => normalizeText(nft.artist || "") === normalizedArtist
      );

      return {
        id: `artist:${normalizedArtist}`,
        title: artist.name,
        wallet1Nfts: pickHighlights(wallet1All),
        wallet2Nfts: pickHighlights(wallet2All),
        wallet1Count: wallet1All.length,
        wallet2Count: wallet2All.length,
        totalCount: wallet1All.length + wallet2All.length,
      };
    })
    .filter((group) => group.wallet1Count > 0 && group.wallet2Count > 0)
    .sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      const aMin = Math.min(a.wallet1Count, a.wallet2Count);
      const bMin = Math.min(b.wallet1Count, b.wallet2Count);
      if (bMin !== aMin) return bMin - aMin;
      return a.title.localeCompare(b.title);
    });
}

function getSharedCollectionHighlightGroups(
  wallet1Data: WalletApiResponse | null,
  wallet2Data: WalletApiResponse | null,
  sharedCollections: SharedCollection[]
): HighlightGroup[] {
  if (!wallet1Data || !wallet2Data) return [];

  return sharedCollections
    .map((collection) => {
      const wallet1All = wallet1Data.ownedNfts.filter(
        (nft) => nft.contractAddress === collection.contractAddress
      );

      const wallet2All = wallet2Data.ownedNfts.filter(
        (nft) => nft.contractAddress === collection.contractAddress
      );

      return {
        id: `collection:${collection.contractAddress}`,
        title: collection.name,
        wallet1Nfts: pickHighlights(wallet1All),
        wallet2Nfts: pickHighlights(wallet2All),
        wallet1Count: wallet1All.length,
        wallet2Count: wallet2All.length,
        totalCount: wallet1All.length + wallet2All.length,
      };
    })
    .sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      const aMin = Math.min(a.wallet1Count, a.wallet2Count);
      const bMin = Math.min(b.wallet1Count, b.wallet2Count);
      if (bMin !== aMin) return bMin - aMin;
      return a.title.localeCompare(b.title);
    });
}

function getSnapshotLine(
  exactCount: number,
  artistGroups: HighlightGroup[],
  collectionGroups: HighlightGroup[]
) {
  if (exactCount > 0) {
    const topArtist = artistGroups[0]?.title;
    const topCollection = collectionGroups[0]?.title;

    if (topArtist) {
      return `The strongest signal is direct overlap, with additional alignment around ${topArtist}${topCollection ? ` and ${topCollection}` : ""}.`;
    }

    if (topCollection) {
      return `The strongest signal is direct overlap, with broader alignment continuing through ${topCollection}.`;
    }

    return "The strongest signal is direct overlap between the two wallets.";
  }

  if (artistGroups.length > 0) {
    const topArtist = artistGroups[0]?.title;
    const topCollection = collectionGroups[0]?.title;

    if (topCollection) {
      return `The strongest overlap sits at the artist level, led by ${topArtist}, with additional alignment in ${topCollection}.`;
    }

    return `The strongest overlap sits at the artist level, led by ${topArtist}.`;
  }

  if (collectionGroups.length > 0) {
    const topCollection = collectionGroups[0]?.title;
    return `The clearest connection shows up at the collection level, led by ${topCollection}.`;
  }

  return "No direct overlap yet, but this layout is ready to surface stronger signals as richer metadata comes in.";
}

function SectionMeta({
  wallet1Count,
  wallet2Count,
}: {
  wallet1Count: number;
  wallet2Count: number;
}) {
  return (
    <p className="text-xs text-neutral-400 mt-1">
      Wallet One: {wallet1Count} {wallet1Count === 1 ? "piece" : "pieces"} · Wallet Two:{" "}
      {wallet2Count} {wallet2Count === 1 ? "piece" : "pieces"}
    </p>
  );
}

function NftGrid({ nfts }: { nfts: OwnedNft[] }) {
  if (nfts.length === 0) {
    return <p className="text-xs text-neutral-400">No highlights available</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {nfts.map((nft) => (
        <div
          key={`${nft.contractAddress}-${nft.tokenId}-${nft.nftName}`}
          className="space-y-2"
        >
          {nft.imageUrl ? (
            <img
              src={nft.imageUrl}
              alt={nft.nftName || nft.collectionName}
              className="w-full aspect-square rounded-xl object-cover border border-neutral-200 bg-neutral-100"
            />
          ) : (
            <div className="w-full aspect-square rounded-xl border border-neutral-200 bg-neutral-100" />
          )}

          <div className="space-y-0.5">
            <p className="text-xs text-neutral-900 line-clamp-1">
              {nft.nftName || "Untitled"}
            </p>
            <p className="text-[11px] text-neutral-400 line-clamp-1">
              {nft.collectionName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SharedNftSection({ groups }: { groups: HighlightGroup[] }) {
  return (
    <section className="mb-12">
      <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-4">
        Shared NFTs
      </h2>

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-400">No exact NFT overlap yet</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const nft = group.wallet1Nfts[0];

            return (
              <div
                key={group.id}
                className="border border-neutral-200 rounded-2xl p-5 sm:p-6"
              >
                <div className="mb-4">
                  <h3 className="text-sm text-neutral-900">{group.title}</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Exact match · owned by both
                  </p>
                </div>

                <div className="max-w-[220px]">
                  {nft?.imageUrl ? (
                    <img
                      src={nft.imageUrl}
                      alt={nft.nftName || nft.collectionName}
                      className="w-full aspect-square rounded-xl object-cover border border-neutral-200 bg-neutral-100"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-xl border border-neutral-200 bg-neutral-100" />
                  )}

                  <div className="space-y-0.5 mt-3">
                    <p className="text-xs text-neutral-900 line-clamp-1">
                      {nft?.nftName || "Untitled"}
                    </p>
                    <p className="text-[11px] text-neutral-400 line-clamp-1">
                      {nft?.collectionName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HighlightSection({
  title,
  groups,
  wallet1Label,
  wallet2Label,
  emptyText,
}: {
  title: string;
  groups: HighlightGroup[];
  wallet1Label: string;
  wallet2Label: string;
  emptyText: string;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-4">
        {title}
      </h2>

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-400">{emptyText}</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border border-neutral-200 rounded-2xl p-4 sm:p-5"
            >
              <div className="mb-4">
                <h3 className="text-sm text-neutral-900">{group.title}</h3>
                <SectionMeta
                  wallet1Count={group.wallet1Count}
                  wallet2Count={group.wallet2Count}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                    {wallet1Label}
                  </p>
                  <NftGrid nfts={group.wallet1Nfts} />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                    {wallet2Label}
                  </p>
                  <NftGrid nfts={group.wallet2Nfts} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const wallet1 = searchParams.get("wallet1") || "";
  const wallet2 = searchParams.get("wallet2") || "";

  const [wallet1Data, setWallet1Data] = useState<WalletApiResponse | null>(null);
  const [wallet2Data, setWallet2Data] = useState<WalletApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllCollections, setShowAllCollections] = useState(false);

  useEffect(() => {
    async function fetchWallets() {
      if (!wallet1 || !wallet2) {
        setError("Missing wallet1 or wallet2 in the URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [res1, res2] = await Promise.all([
          fetch(`/api/wallet?wallet=${encodeURIComponent(wallet1)}`),
          fetch(`/api/wallet?wallet=${encodeURIComponent(wallet2)}`),
        ]);

        const data1: WalletApiResponse = await res1.json();
        const data2: WalletApiResponse = await res2.json();

        if (!res1.ok) {
          throw new Error(data1.error || "Failed to load wallet 1");
        }

        if (!res2.ok) {
          throw new Error(data2.error || "Failed to load wallet 2");
        }

        setWallet1Data(data1);
        setWallet2Data(data2);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchWallets();
  }, [wallet1, wallet2]);

  const sharedCollections = useMemo(() => {
    return getSharedCollections(wallet1Data, wallet2Data);
  }, [wallet1Data, wallet2Data]);

  const sharedArtists = useMemo(() => {
    return getSharedArtists(wallet1Data, wallet2Data);
  }, [wallet1Data, wallet2Data]);

  const sharedExactNfts = useMemo(() => {
    return getSharedExactNfts(wallet1Data, wallet2Data);
  }, [wallet1Data, wallet2Data]);

  const sharedArtistGroups = useMemo(() => {
    return getSharedArtistHighlightGroups(wallet1Data, wallet2Data, sharedArtists);
  }, [wallet1Data, wallet2Data, sharedArtists]);

  const sharedCollectionGroups = useMemo(() => {
    return getSharedCollectionHighlightGroups(
      wallet1Data,
      wallet2Data,
      sharedCollections
    );
  }, [wallet1Data, wallet2Data, sharedCollections]);

  const visibleCollectionGroups = useMemo(() => {
    if (showAllCollections) return sharedCollectionGroups;
    return sharedCollectionGroups.slice(0, DEFAULT_VISIBLE_COLLECTIONS);
  }, [sharedCollectionGroups, showAllCollections]);

  const hiddenCollectionCount = Math.max(
    sharedCollectionGroups.length - DEFAULT_VISIBLE_COLLECTIONS,
    0
  );

  const snapshotLine = useMemo(() => {
    return getSnapshotLine(
      sharedExactNfts.length,
      sharedArtistGroups,
      sharedCollectionGroups
    );
  }, [sharedExactNfts.length, sharedArtistGroups, sharedCollectionGroups]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-neutral-900">
        <p className="text-sm text-neutral-500">Loading comparison…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-neutral-900">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Compare</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-neutral-900">
      <div className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="border border-neutral-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
              Wallet One
            </p>
            <p className="text-sm text-neutral-900 break-all">
              {truncateWallet(wallet1)}
            </p>
            {wallet1Data && (
              <p className="text-xs text-neutral-400 mt-2">
                {wallet1Data.totalNfts} NFTs · {wallet1Data.totalCollections} collections
              </p>
            )}
          </div>

          <div className="border border-neutral-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
              Wallet Two
            </p>
            <p className="text-sm text-neutral-900 break-all">
              {truncateWallet(wallet2)}
            </p>
            {wallet2Data && (
              <p className="text-xs text-neutral-400 mt-2">
                {wallet2Data.totalNfts} NFTs · {wallet2Data.totalCollections} collections
              </p>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Shared Ground</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Exact matches first, then shared artists and shared collections.
        </p>
      </div>

      <section className="mb-12 border border-neutral-200 rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-4">
          Connection Snapshot
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {sharedExactNfts.length}
            </p>
            <p className="text-sm text-neutral-500">Shared NFTs</p>
          </div>

          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {sharedArtistGroups.length}
            </p>
            <p className="text-sm text-neutral-500">Shared artists</p>
          </div>

          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {sharedCollectionGroups.length}
            </p>
            <p className="text-sm text-neutral-500">Shared collections</p>
          </div>
        </div>

        <p className="text-sm text-neutral-700">{snapshotLine}</p>
      </section>

      <SharedNftSection groups={sharedExactNfts} />

      <HighlightSection
        title="Shared Artists"
        groups={sharedArtistGroups}
        wallet1Label="Wallet One"
        wallet2Label="Wallet Two"
        emptyText="No shared artists surfaced yet"
      />

      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-4">
          Shared Collections
        </h2>

        {sharedCollectionGroups.length === 0 ? (
          <p className="text-sm text-neutral-400">No direct collection overlap yet</p>
        ) : (
          <>
            <div className="space-y-8">
              {visibleCollectionGroups.map((group) => (
                <div
                  key={group.id}
                  className="border border-neutral-200 rounded-2xl p-4 sm:p-5"
                >
                  <div className="mb-4">
                    <h3 className="text-sm text-neutral-900">{group.title}</h3>
                    <SectionMeta
                      wallet1Count={group.wallet1Count}
                      wallet2Count={group.wallet2Count}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                        Wallet One
                      </p>
                      <NftGrid nfts={group.wallet1Nfts} />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                        Wallet Two
                      </p>
                      <NftGrid nfts={group.wallet2Nfts} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hiddenCollectionCount > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowAllCollections((prev) => !prev)}
                  className="text-sm text-neutral-700 underline underline-offset-4"
                >
                  {showAllCollections
                    ? "Show fewer shared collections"
                    : `Show ${hiddenCollectionCount} more shared collections`}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}