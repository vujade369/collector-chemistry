"use client";

import { useEffect, useRef, useState } from "react";

type CollectionSearchResult = {
  slug: string;
  name: string;
  imageUrl?: string;
  floorPriceETH?: number | null;
  openseaUrl?: string;
  verified?: boolean;
  safelistStatus?: string;
  matchConfidence?: "high" | "medium" | "low";
};

type ConverterResult = {
  targetCollection: { slug: string; name: string; imageUrl?: string | null; floorPriceETH: number; openseaUrl?: string } | null;
  count: number;
  estimateQuality: "high" | "medium" | "low";
  detectedOfferValueETH: number;
  offerCount: number;
  checkedNftCount: number;
  candidateCount: number;
  error: null | "invalid_input" | "missing_opensea" | "no_floor" | "no_wallet_offers" | "zero_result" | "estimate_failed";
};

function formatError(error: ConverterResult["error"]): string {
  if (error === "no_floor") return "Couldn’t find a reliable floor for this collection.";
  if (error === "no_wallet_offers") return "No active wallet offers detected yet.";
  if (error === "missing_opensea") return "Marketplace data is unavailable right now.";
  if (error === "zero_result") return "Detected offers are below this collection floor.";
  return "Couldn’t build an estimate right now.";
}

export default function WalletConverter({ wallet, wallets }: { wallet: string; wallets?: string[] }) {
  const [phase, setPhase] = useState<"idle" | "searching" | "loading" | "result" | "error">("idle");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollectionSearchResult[]>([]);
  const [result, setResult] = useState<ConverterResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const walletParam = wallets && wallets.length > 1 ? wallets.join(",") : wallet;

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setPhase("idle");
      return;
    }
    setPhase("searching");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/converter/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setSearchResults(json.results || []);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (phase === "result") {
      const t = setTimeout(() => setVisible(true), 40);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [phase]);

  async function handleSelect(collection: CollectionSearchResult) {
    setPhase("loading");
    const res = await fetch(`/api/converter/calculate?wallet=${encodeURIComponent(walletParam)}&slug=${encodeURIComponent(collection.slug)}`);
    const json = (await res.json()) as ConverterResult;

    if (json.error) {
      setErrorMessage(formatError(json.error));
      setResult(json);
      setPhase("error");
      return;
    }

    setResult(json);
    setErrorMessage(null);
    setPhase("result");
  }

  function handleReset() {
    setResult(null);
    setErrorMessage(null);
    setQuery("");
    setSearchResults([]);
    setPhase("idle");
  }

  if (!walletParam) return null;

  const displayCount = result?.count ?? 0;
  const displayCountLabel = displayCount >= 1 ? displayCount.toFixed(2).replace(/\.00$/, "") : displayCount.toFixed(2);
  const wholeCount = Math.floor(displayCount);
  const fractionalRemainder = displayCount - wholeCount;
  const visibleFullTiles = Math.min(wholeCount, 6);
  const showPartialTile = fractionalRemainder > 0.01;
  const hiddenTileCount = Math.max(0, wholeCount - visibleFullTiles);
  const partialPercent = Math.max(0, Math.min(100, Math.round(fractionalRemainder * 100)));
  const tileImage = result?.targetCollection?.imageUrl || "";

  return (
    <section className="wallet-converter">
      <div className="converter-intro">
        <h2 className="converter-headline">Trade the constellation.</h2>
        <p className="converter-subline">Pick a collection. See what your wallet could turn into.</p>
      </div>

      {(phase === "idle" || phase === "searching") && (
        <div className="converter-search">
          <input type="text" placeholder="Search a collection..." value={query} onChange={(e) => setQuery(e.target.value)} className="converter-input" />
          {query.trim().length > 1 && (
            <ul className="converter-dropdown">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <li key={item.slug} onClick={() => handleSelect(item)}>
                    <div className="converter-row-left">
                      <div className="converter-thumb-wrap">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="converter-thumb" /> : <span className="converter-thumb-fallback">✦</span>}</div>
                      <div>
                        <span className="converter-result-name">{item.name}</span>
                        <div className="converter-result-meta">{(item.verified || item.safelistStatus) && <span className="converter-result-badge">{item.verified ? "Verified" : item.safelistStatus}</span>}</div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  <span className="converter-result-name">No collections found. Try a different name.</span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {phase === "loading" && (
        <div className="converter-loading">
          <span>Building estimate...</span>
        </div>
      )}

      {(phase === "result" || phase === "error") && result && (
        <div className="converter-result">
          {phase === "result" ? (
            <>
              <div className={`converter-count${visible ? " visible" : ""}`} style={{ fontSize: "44px", lineHeight: 1.05, fontWeight: 600 }}>
                ~{displayCountLabel} {result.targetCollection?.name}
              </div>
              {displayCount > 0 && (
                <>
                  {tileImage ? (
                    <div className="converter-tiles-wrap">
                      <div className="converter-tiles">
                        {Array.from({ length: visibleFullTiles }).map((_, index) => (
                          <img key={`full-${index}`} src={tileImage} alt={result.targetCollection?.name || "Collection"} className="converter-tile" />
                        ))}
                        {showPartialTile && (
                          <div className="converter-tile converter-tile-partial">
                            <img src={tileImage} alt={result.targetCollection?.name || "Collection"} className="converter-tile-base" />
                            <div className="converter-tile-color-fill" style={{ height: `${partialPercent}%` }}>
                              <img src={tileImage} alt={result.targetCollection?.name || "Collection"} className="converter-tile-color" />
                            </div>
                          </div>
                        )}
                      </div>
                      {hiddenTileCount > 0 && <span className="converter-tile-more">+{hiddenTileCount} more</span>}
                    </div>
                  ) : null}
                  {displayCount < 0.1 ? <p className={`converter-caveat${visible ? " visible" : ""}`}>Not quite there yet</p> : null}
                  {displayCount >= 0.1 && displayCount < 1 ? <p className={`converter-caveat${visible ? " visible" : ""}`}>~{Math.round(displayCount * 100)}% of one</p> : null}
                  {displayCount >= 100 ? <p className={`converter-caveat${visible ? " visible" : ""}`}>You could fill a room.</p> : null}
                </>
              )}
              <p className={`converter-caveat${visible ? " visible" : ""}`}>
                A rough glimpse at what your current offers could become.
              </p>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>
                Based on the best active ETH/WETH offers currently available across your unique NFTs, divided by the current {result.targetCollection?.name} floor.
              </p>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>
                {result.offerCount} NFTs currently have active offers. {result.checkedNftCount} unique NFTs checked.
              </p>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>Estimate only. Offers, floors, fees, royalties, and liquidity can change.</p>
            </>
          ) : (
            <>
              <p className="converter-zero">{errorMessage}</p>
            </>
          )}

          <button className={`converter-reset visible`} onClick={handleReset}>
            Try another collection →
          </button>
        </div>
      )}
    </section>
  );
}
