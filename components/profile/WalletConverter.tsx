"use client";
import { useEffect, useRef, useState } from "react";

type CollectionSearchResult = { slug: string; name: string; imageUrl: string; floorPriceETH: number | null };
type ConverterResult = { targetCollection: { slug: string; name: string; imageUrl: string; floorPriceETH: number }; count: number; estimateQuality: "high" | "medium" | "low"; error: null | "no_floor" | "zero_result" | "low_quality" };

export default function WalletConverter({ wallet }: { wallet: string }) {
  const [phase, setPhase] = useState<"idle" | "searching" | "selected" | "loading" | "result" | "error">("idle");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollectionSearchResult[]>([]);
  const [result, setResult] = useState<ConverterResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setPhase("idle"); return; }
    setPhase("searching");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/converter/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setSearchResults(json.results || []);
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  useEffect(() => {
    if (phase === "result") {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [phase]);

  async function handleSelect(collection: CollectionSearchResult) {
    setPhase("loading");
    const res = await fetch(
      `/api/converter/calculate?wallet=${encodeURIComponent(wallet)}&slug=${encodeURIComponent(collection.slug)}`
    );
    const json = await res.json();

    // Hard errors with no result
    if (json.error === "no_floor" || json.error === "invalid_input" || json.error === "estimate_failed") {
      setErrorMessage(json.error);
      setPhase("error");
      return;
    }

    // Show result if we have any count at all, even 0.1
    if (json.count > 0) {
      setResult(json);
      setErrorMessage(null);
      setPhase("result");
      return;
    }

    // Genuinely zero
    setErrorMessage("zero_result");
    setPhase("error");
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
          {query.trim().length > 0 && (
            <ul className="converter-dropdown">
              {searchResults.length > 0
                ? searchResults.map((item) => (
                    <li key={item.slug} onClick={() => handleSelect(item)}>
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : null}
                      <span className="converter-result-name">{item.name}</span>
                      {item.floorPriceETH ? (
                        <span className="converter-result-floor">{item.floorPriceETH.toFixed(2)} ETH floor</span>
                      ) : null}
                    </li>
                  ))
                : <li><span className="converter-result-name">No collections found. Try a different name.</span></li>}
            </ul>
          )}
        </div>
      )}

      {phase === "loading" && (
        <div className="converter-loading">
          <span>Counting...</span>
        </div>
      )}

      {phase === "result" && result && (
        <div className="converter-result">
          <div className={`converter-count${visible ? " visible" : ""}`}>{result.count}</div>
          <div className={`converter-collection-name${visible ? " visible" : ""}`}>
            {result.targetCollection.name}
          </div>
          {result.estimateQuality === "low" && (
            <p className={`converter-caveat${visible ? " visible" : ""}`}>
              Limited floor data for your collections. This is a very rough estimate
            </p>
          )}
          <p className={`converter-caveat${visible ? " visible" : ""}`}>
            Based on floor prices of your most-held collections. Actual value may differ
          </p>
          <button className={`converter-reset${visible ? " visible" : ""}`} onClick={handleReset}>
            Try another collection →
          </button>
        </div>
      )}

      {phase === "error" && errorMessage === "zero_result" && (
        <div className="converter-result">
          <p className="converter-zero">Not quite enough.</p>
          <p className="converter-zero-sub">Try a different collection.</p>
          <button className="converter-reset visible" onClick={handleReset}>
            Try another collection →
          </button>
        </div>
      )}

      {phase === "error" && errorMessage === "no_floor" && (
        <div className="converter-result">
          <p className="converter-zero">No active listings found for this collection.</p>
          <button className="converter-reset visible" onClick={handleReset}>
            Try another collection →
          </button>
        </div>
      )}
    </section>
  );
}
