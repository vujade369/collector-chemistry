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

export default function WalletConverter({ wallet }: { wallet: string }) {
  const [phase, setPhase] = useState<"idle" | "searching" | "loading" | "result" | "error">("idle");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollectionSearchResult[]>([]);
  const [result, setResult] = useState<ConverterResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const res = await fetch(`/api/converter/calculate?wallet=${encodeURIComponent(wallet)}&slug=${encodeURIComponent(collection.slug)}`);
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

  if (!wallet) return null;

  return (
    <section className="wallet-converter">
      <div className="converter-intro">
        <h2 className="converter-headline">If you sold it all...</h2>
        <p className="converter-subline">See what your wallet could become.</p>
      </div>

      {(phase === "idle" || phase === "searching") && (
        <div className="converter-search">
          <input
            type="text"
            placeholder="Search any collection..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="converter-input"
          />
          {query.trim().length > 1 && (
            <ul className="converter-dropdown">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <li key={item.slug} onClick={() => handleSelect(item)}>
                    <div className="converter-row-left">
                      <div className="converter-thumb-wrap">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="converter-thumb" /> : <span className="converter-thumb-fallback">✦</span>}
                      </div>
                      <div>
                        <span className="converter-result-name">{item.name}</span>
                        <div className="converter-result-meta">
                          {item.floorPriceETH ? <span className="converter-result-floor">{item.floorPriceETH.toFixed(2)} ETH floor</span> : <span className="converter-result-floor">Floor unavailable</span>}
                          {(item.verified || item.safelistStatus) && (
                            <span className="converter-result-badge">{item.verified ? "Verified" : item.safelistStatus}</span>
                          )}
                        </div>
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
              <div className={`converter-count${visible ? " visible" : ""}`}>Estimated reach: {result.count} {result.targetCollection?.name}</div>
              <div className={`converter-collection-name${visible ? " visible" : ""}`}>Detected offer value: {result.detectedOfferValueETH.toFixed(3)} ETH</div>
              <div className={`converter-collection-name${visible ? " visible" : ""}`}>Target floor: {result.targetCollection?.floorPriceETH.toFixed(3)} ETH</div>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>Offers detected: {result.offerCount} across {result.checkedNftCount} checked NFTs.</p>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>Based on active offers detected across this wallet.</p>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>Estimate only. Offers, floors, fees, royalties, and liquidity change.</p>
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
