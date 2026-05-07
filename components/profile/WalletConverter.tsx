"use client";

import type { CSSProperties } from "react";
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
  error:
    | null
    | "invalid_input"
    | "invalid_wallet"
    | "wallet_resolution_failed"
    | "missing_opensea"
    | "no_floor"
    | "no_wallet_offers"
    | "zero_result"
    | "estimate_failed";
};

type ConverterCountTier = "fractional" | "small" | "medium" | "large" | "huge";

function formatError(error: ConverterResult["error"]): string {
  if (error === "invalid_wallet") return "Enter a valid Ethereum address or ENS name.";
  if (error === "wallet_resolution_failed") return "One of these wallets couldn’t be resolved. Check the ENS name or wallet address and try again.";
  if (error === "no_floor") return "Couldn’t find a reliable floor for this collection.";
  if (error === "no_wallet_offers") return "No active wallet offers detected yet.";
  if (error === "missing_opensea") return "Marketplace data is unavailable right now.";
  if (error === "zero_result") return "Detected offers are below this collection floor.";
  return "Couldn’t build an estimate right now.";
}

function getConverterCountTier(count: number): ConverterCountTier {
  if (count < 1) return "fractional";
  if (count < 6) return "small";
  if (count < 25) return "medium";
  if (count < 100) return "large";
  return "huge";
}

function getConverterTierCopy(count: number): string {
  if (count < 1) return "Almost enough to summon one.";
  if (count < 6) return "Enough to start a little shelf.";
  if (count < 25) return "Now it starts to look like a collection.";
  if (count < 100) return "The shelf is no longer enough.";
  if (count < 1000) return "That’s no longer a stack. That’s a room.";
  return "That’s not a collection. That’s a census.";
}

function getConverterChipCap(tier: ConverterCountTier): number {
  if (tier === "fractional" || tier === "small") return 5;
  if (tier === "medium") return 8;
  if (tier === "large") return 10;
  return 12;
}

function formatEth(value?: number | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(2).replace(/\.00$/, "");
  if (value >= 1) return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return value.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

function getCollectionBadgeLabel(item: CollectionSearchResult): string | null {
  if (item.verified === true) return "Verified";

  const safelistStatus = String(item.safelistStatus || "").trim().toLowerCase();
  if (safelistStatus === "verified") return "Verified";
  if (safelistStatus === "approved") return "Approved";
  return null;
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
  const countTier = getConverterCountTier(displayCount);
  const tierCopy = getConverterTierCopy(displayCount);
  const wholeCount = Math.floor(displayCount);
  const fractionalRemainder = displayCount - wholeCount;
  const chipCap = getConverterChipCap(countTier);
  const visualFullTileCount = displayCount > 0 && wholeCount === 0 ? 0 : Math.min(wholeCount, chipCap);
  const showPartialTile = displayCount > 0 && countTier !== "medium" && countTier !== "large" && countTier !== "huge" && fractionalRemainder > 0.01;
  const renderedChipCount = visualFullTileCount + (showPartialTile ? 1 : 0);
  const hiddenTileCount = Math.max(0, wholeCount - visualFullTileCount);
  const partialPercent = Math.max(0, Math.min(100, Math.round(fractionalRemainder * 100)));
  const tileImage = result?.targetCollection?.imageUrl || "";
  const offerValueLabel = formatEth(result?.detectedOfferValueETH);
  const floorPriceLabel = formatEth(result?.targetCollection?.floorPriceETH);
  const showEquation = Boolean(offerValueLabel && floorPriceLabel && result?.targetCollection?.name);
  const proofLine = result ? `${result.offerCount} active offers · ${result.checkedNftCount} unique NFTs checked` : "";

  return (
    <section className="wallet-converter">
      <div className="converter-intro">
        <h2 className="converter-headline">Trade the constellation.</h2>
        <p className="converter-subline">Pick a collection. See what your wallet could turn into.</p>
      </div>

      {(phase === "idle" || phase === "searching") && (
        <div className="converter-search">
          <input
            type="text"
            placeholder="Search a collection..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="converter-input"
          />

          {query.trim().length > 1 && (
            <ul className="converter-dropdown">
              {searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const badgeLabel = getCollectionBadgeLabel(item);

                  return (
                    <li key={item.slug} onClick={() => handleSelect(item)}>
                      <div className="converter-row-left">
                        <div className="converter-thumb-wrap">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="converter-thumb" />
                          ) : (
                            <span className="converter-thumb-fallback">✦</span>
                          )}
                        </div>

                        <div>
                          <span className="converter-result-name">{item.name}</span>
                          <div className="converter-result-meta">
                            {badgeLabel && <span className="converter-result-badge">{badgeLabel}</span>}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
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
              <div className={`converter-count${visible ? " visible" : ""}`}>
                ~{displayCountLabel} {result.targetCollection?.name}
              </div>

              {displayCount > 0 && (
                <>
                  {tileImage ? (
                    <div className={`converter-visual converter-visual--${countTier}`} aria-hidden="true">
                      <div className="converter-tiles">
                        {Array.from({ length: visualFullTileCount }).map((_, index) => (
                          <img
                            key={`full-${index}`}
                            src={tileImage}
                            alt=""
                            className="converter-tile"
                            style={{ "--tile-index": index } as CSSProperties & Record<"--tile-index", number>}
                          />
                        ))}

                        {showPartialTile && (
                          <div className="converter-tile converter-tile-partial">
                            <img src={tileImage} alt="" className="converter-tile-base" />
                            <div className="converter-tile-color-fill" style={{ height: `${partialPercent}%` }}>
                              <img src={tileImage} alt="" className="converter-tile-color" />
                            </div>
                          </div>
                        )}
                      </div>

                      {hiddenTileCount > 0 && <span className="converter-tile-more">+{hiddenTileCount} beyond view</span>}
                      {renderedChipCount === 0 && <span className="converter-tile-more">A partial piece, still taking shape.</span>}
                    </div>
                  ) : null}
                </>
              )}

              <p className={`converter-tier-copy${visible ? " visible" : ""}`}>{tierCopy}</p>

              {showEquation && (
                <p className={`converter-equation${visible ? " visible" : ""}`}>
                  {offerValueLabel} ETH in active offers ÷ {floorPriceLabel} ETH floor = ~{displayCountLabel} {result.targetCollection?.name}
                </p>
              )}

              <p className={`converter-caveat${visible ? " visible" : ""}`}>
                {proofLine}
              </p>

              <p className={`converter-caveat${visible ? " visible" : ""}`}>Estimate only. Offers, floors, fees, royalties, and liquidity can move.</p>
            </>
          ) : (
            <p className="converter-zero">{errorMessage}</p>
          )}

          <button className="converter-reset visible" onClick={handleReset}>
            Try another collection →
          </button>
        </div>
      )}
    </section>
  );
}
