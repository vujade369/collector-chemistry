"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import CollectionSearchInput, { type CollectionSearchResult } from "@/components/shared/CollectionSearchInput";

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

type WalletOfferEstimate = Omit<ConverterResult, "targetCollection" | "count" | "error"> & {
  error: Exclude<ConverterResult["error"], "no_floor" | "zero_result">;
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

export default function WalletConverter({ wallet, wallets }: { wallet: string; wallets?: string[] }) {
  const [phase, setPhase] = useState<"idle" | "searching" | "loading" | "result" | "error">("idle");
  const [loadingMessage, setLoadingMessage] = useState("Building estimate...");
  const [walletEstimate, setWalletEstimate] = useState<WalletOfferEstimate | null>(null);
  const [walletEstimatePhase, setWalletEstimatePhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<ConverterResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const walletEstimatePromiseRef = useRef<Promise<WalletOfferEstimate | null> | null>(null);

  const walletParam = wallets && wallets.length > 1 ? wallets.join(",") : wallet;

  function buildErrorResult(error: ConverterResult["error"], estimate?: WalletOfferEstimate | null): ConverterResult {
    return {
      targetCollection: null,
      count: 0,
      estimateQuality: estimate?.estimateQuality || "low",
      detectedOfferValueETH: estimate?.detectedOfferValueETH || 0,
      offerCount: estimate?.offerCount || 0,
      checkedNftCount: estimate?.checkedNftCount || 0,
      candidateCount: estimate?.candidateCount || 0,
      error,
    };
  }

  function buildLocalResult(collection: CollectionSearchResult, estimate: WalletOfferEstimate): ConverterResult {
    const floorPriceETH = collection.floorPriceETH;

    if (typeof floorPriceETH !== "number" || !Number.isFinite(floorPriceETH) || floorPriceETH <= 0) {
      return buildErrorResult("no_floor", estimate);
    }

    if (estimate.error) {
      return buildErrorResult(estimate.error, estimate);
    }

    if (estimate.detectedOfferValueETH <= 0) {
      return {
        targetCollection: {
          slug: collection.slug,
          name: collection.name,
          imageUrl: collection.imageUrl ?? null,
          floorPriceETH,
          openseaUrl: collection.openseaUrl,
        },
        count: 0,
        estimateQuality: estimate.estimateQuality,
        detectedOfferValueETH: estimate.detectedOfferValueETH,
        offerCount: estimate.offerCount,
        checkedNftCount: estimate.checkedNftCount,
        candidateCount: estimate.candidateCount,
        error: "no_wallet_offers",
      };
    }

    const rawCount = estimate.detectedOfferValueETH / floorPriceETH;
    const roundedCount = Math.round(rawCount * 100) / 100;
    const count = rawCount > 0 && roundedCount === 0 ? 0.01 : roundedCount;

    return {
      targetCollection: {
        slug: collection.slug,
        name: collection.name,
        imageUrl: collection.imageUrl ?? null,
        floorPriceETH,
        openseaUrl: collection.openseaUrl,
      },
      count,
      estimateQuality: estimate.estimateQuality,
      detectedOfferValueETH: estimate.detectedOfferValueETH,
      offerCount: estimate.offerCount,
      checkedNftCount: estimate.checkedNftCount,
      candidateCount: estimate.candidateCount,
      error: rawCount < 0.01 ? "zero_result" : null,
    };
  }

  function applyResult(nextResult: ConverterResult) {
    setResult(nextResult);

    if (nextResult.error) {
      setErrorMessage(formatError(nextResult.error));
      setPhase("error");
      return;
    }

    setErrorMessage(null);
    setPhase("result");
  }

  async function fetchCalculateFallback(collection: CollectionSearchResult) {
    const res = await fetch(`/api/converter/calculate?wallet=${encodeURIComponent(walletParam)}&slug=${encodeURIComponent(collection.slug)}`);
    const json = (await res.json()) as ConverterResult;
    applyResult(json);
  }

  useEffect(() => {
    if (!walletParam) {
      setWalletEstimate(null);
      setWalletEstimatePhase("idle");
      walletEstimatePromiseRef.current = null;
      return;
    }

    let cancelled = false;
    setWalletEstimate(null);
    setWalletEstimatePhase("loading");

    const promise = fetch(`/api/converter/wallet-offers?wallet=${encodeURIComponent(walletParam)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("wallet-offer-precompute-failed");
        return (await res.json()) as WalletOfferEstimate;
      })
      .then((json) => {
        if (!cancelled) {
          setWalletEstimate(json);
          setWalletEstimatePhase(json.error ? "error" : "ready");
        }
        return json;
      })
      .catch(() => {
        const fallbackEstimate: WalletOfferEstimate = {
          detectedOfferValueETH: 0,
          offerCount: 0,
          checkedNftCount: 0,
          candidateCount: 0,
          estimateQuality: "low",
          error: "estimate_failed",
        };

        if (!cancelled) {
          setWalletEstimate(fallbackEstimate);
          setWalletEstimatePhase("error");
        }

        return fallbackEstimate;
      });

    walletEstimatePromiseRef.current = promise;

    return () => {
      cancelled = true;
    };
  }, [walletParam]);

  useEffect(() => {
    if (phase === "result") {
      const t = setTimeout(() => setVisible(true), 40);
      return () => clearTimeout(t);
    }

    setVisible(false);
  }, [phase]);

  async function handleSelect(collection: CollectionSearchResult) {
    setPhase("loading");
    setLoadingMessage(walletEstimatePhase === "loading" ? "Reading active offers..." : "Building estimate...");

    const currentEstimate =
      walletEstimate ||
      (walletEstimatePhase === "loading" && walletEstimatePromiseRef.current ? await walletEstimatePromiseRef.current : null);

    if (!currentEstimate) {
      await fetchCalculateFallback(collection);
      return;
    }

    applyResult(buildLocalResult(collection, currentEstimate));
  }

  function handleReset() {
    setResult(null);
    setErrorMessage(null);
    setPhase("idle");
  }

  const handleSearchPhaseChange = useCallback((nextPhase: "idle" | "searching") => {
    setPhase(nextPhase);
  }, []);

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
  const proofLine = result
    ? result.offerCount === 1
      ? `1 NFT in this wallet currently has an actionable ETH/WETH offer totaling ${offerValueLabel ?? `${result.detectedOfferValueETH} ETH`}.`
      : `${result.offerCount} NFTs in this wallet currently have actionable ETH/WETH offers totaling ${offerValueLabel ?? `${result.detectedOfferValueETH} ETH`}.`
    : "";

  return (
    <section className="wallet-converter">
      <div className="converter-intro">
        <h2 className="converter-headline">Trade the constellation.</h2>
        <p className="converter-subline">Pick a collection. See what your wallet could turn into.</p>
      </div>

      {(phase === "idle" || phase === "searching") && (
        <CollectionSearchInput
          onSelect={handleSelect}
          onSearchPhaseChange={handleSearchPhaseChange}
        />
      )}

      {phase === "loading" && (
        <div className="converter-loading">
          <span>{loadingMessage}</span>
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

              <p className={`converter-caveat${visible ? " visible" : ""}`}>
                Checked {result.checkedNftCount} unique NFTs. Estimate only. Offers, floors, fees, and royalties can change.
              </p>
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
