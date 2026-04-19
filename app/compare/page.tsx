"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type AlchemyNft = {
  contract?: {
    address?: string;
    name?: string;
    symbol?: string;
    isSpam?: boolean | null;
    spamClassifications?: string[];
    openSeaMetadata?: {
      collectionName?: string;
    };
  };
};

type WalletData = {
  ownedNfts?: AlchemyNft[];
  totalCount?: number;
  error?: string;
  details?: string;
};

export default function ComparePage() {
  const searchParams = useSearchParams();
  const wallet1 = searchParams.get("wallet1");
  const wallet2 = searchParams.get("wallet2");

  const [walletACollections, setWalletACollections] = useState<string[]>([]);
  const [walletBCollections, setWalletBCollections] = useState<string[]>([]);
  const [sharedCollections, setSharedCollections] = useState<string[]>([]);
  const [walletANfts, setWalletANfts] = useState(0);
  const [walletBNfts, setWalletBNfts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet1 || !wallet2) return;

    const fetchData = async () => {
      try {
        const [res1, res2] = await Promise.all([
          fetch(`/api/wallet?wallet=${encodeURIComponent(wallet1)}`),
          fetch(`/api/wallet?wallet=${encodeURIComponent(wallet2)}`),
        ]);

        const [data1, data2]: [WalletData, WalletData] = await Promise.all([
          res1.json(),
          res2.json(),
        ]);

        if (data1.error || data2.error) {
          setError(data1.error || data2.error || "Failed to load wallet data");
          return;
        }

        const extractCollections = (data: WalletData) => {
          const seen = new Map<string, string>();

          for (const nft of data.ownedNfts ?? []) {
            const address = nft.contract?.address?.toLowerCase();
            if (!address) continue;

            const label =
              nft.contract?.openSeaMetadata?.collectionName ||
              nft.contract?.name ||
              nft.contract?.symbol ||
              address;

            if (!seen.has(address)) {
              seen.set(address, label);
            }
          }

          return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
        };

        const aCollections = extractCollections(data1);
        const bCollections = extractCollections(data2);
        const shared = aCollections.filter((name) => bCollections.includes(name));

        setWalletACollections(aCollections);
        setWalletBCollections(bCollections);
        setSharedCollections(shared);
        setWalletANfts(data1.ownedNfts?.length ?? 0);
        setWalletBNfts(data2.ownedNfts?.length ?? 0);
      } catch (err) {
        setError("Failed to compare wallets");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [wallet1, wallet2]);

  return (
    <main
      style={{
        padding: "60px",
        fontFamily: "sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
        Collector Chemistry
      </h1>

      <p style={{ opacity: 0.6, marginBottom: "32px" }}>
        Comparing two collectors
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e5e5",
          paddingBottom: "20px",
          marginBottom: "32px",
          gap: "24px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "6px" }}>
            Wallet A
          </div>
          <div style={{ wordBreak: "break-all" }}>{wallet1}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "6px" }}>
            Wallet B
          </div>
          <div style={{ wordBreak: "break-all" }}>{wallet2}</div>
        </div>
      </div>

      {loading ? (
        <p>Loading collections...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: "24px", marginBottom: "40px" }}>
            <div>
              <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "8px" }}>
                Wallet A NFTs
              </div>
              <div style={{ fontSize: "32px" }}>{walletANfts}</div>
            </div>

            <div>
              <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "8px" }}>
                Wallet B NFTs
              </div>
              <div style={{ fontSize: "32px" }}>{walletBNfts}</div>
            </div>

            <div>
              <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "8px" }}>
                Wallet A Collections
              </div>
              <div style={{ fontSize: "32px" }}>{walletACollections.length}</div>
            </div>

            <div>
              <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "8px" }}>
                Wallet B Collections
              </div>
              <div style={{ fontSize: "32px" }}>{walletBCollections.length}</div>
            </div>

            <div>
              <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "8px" }}>
                Shared Collections
              </div>
              <div style={{ fontSize: "32px" }}>{sharedCollections.length}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", opacity: 0.5, marginBottom: "8px" }}>
              Overlap
            </div>

            {sharedCollections.length === 0 ? (
              <p style={{ opacity: 0.6 }}>No direct overlap yet</p>
            ) : (
              <ul style={{ paddingLeft: "18px" }}>
                {sharedCollections.slice(0, 12).map((collection) => (
                  <li key={collection}>{collection}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}