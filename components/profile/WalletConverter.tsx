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

  return (
    <section className="wallet-converter">
      <div className="converter-intro">
        <h2 className="converter-headline">Trade the constellation.</h2>
        <p className="converter-subline">See what your collection could become.</p>
      </div>

      {(phase === "idle" || phase === "searching") && (
        <div className="converter-search">
          <input type="text" placeholder="Search any collection..." value={query} onChange={(e) => setQuery(e.target.value)} className="converter-input" />
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
                ~{result.count} {result.targetCollection?.name}
              </div>
              {result.count > 0 && (
                <>
                  {(() => {
                    const fullImages = Math.min(Math.floor(result.count), 5);
                    const fractional = result.count % 1;
                    const showFractional = fractional > 0.05 && fullImages < 5;
                    const overflowCount = Math.floor(result.count) - 5;
                    const imageUrl = result.targetCollection?.imageUrl || "";
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {Array.from({ length: fullImages }).map((_, index) => (
                            <img
                              key={`full-${index}`}
                              src={imageUrl}
                              alt={result.targetCollection?.name || "Collection"}
                              style={{ width: "64px", height: "64px", borderRadius: "10px", objectFit: "cover", background: "#efefef" }}
                            />
                          ))}
                          {showFractional && (
                            <div style={{ width: `${Math.round(fractional * 64)}px`, height: "64px", overflow: "hidden", borderRadius: "10px", background: "#efefef" }}>
                              <img
                                src={imageUrl}
                                alt={result.targetCollection?.name || "Collection"}
                                style={{ width: "64px", height: "64px", objectFit: "cover", objectPosition: "left" }}
                              />
                            </div>
                          )}
                        </div>
                        {overflowCount > 0 && <span style={{ fontSize: "12px", color: "#555" }}>+{overflowCount} more</span>}
                      </div>
                    );
                  })()}
                  {result.count < 0.1 ? <p className={`converter-caveat${visible ? " visible" : ""}`}>Not quite there yet</p> : null}
                  {result.count >= 0.1 && result.count < 1 ? (
                    <p className={`converter-caveat${visible ? " visible" : ""}`}>~{Math.round(result.count * 100)}% of one</p>
                  ) : null}
                  {result.count >= 100 ? <p className={`converter-caveat${visible ? " visible" : ""}`}>You could fill a room.</p> : null}
                </>
              )}
              <p className={`converter-caveat${visible ? " visible" : ""}`}>Offers detected: {result.offerCount} across {result.checkedNftCount} checked NFTs.</p>
              <p className={`converter-caveat${visible ? " visible" : ""}`}>Based on current offers across your NFTs and the current entry point for this collection.</p>
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
