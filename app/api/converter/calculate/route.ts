import { NextResponse } from "next/server";
import {
  buildWalletOfferEstimate,
  fetchCollectionFloorPriceETH,
  fetchOpenSeaJson,
  isEns,
  isEthAddress,
} from "../shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = String(searchParams.get("wallet") || "").trim();
  const slug = String(searchParams.get("slug") || "").trim().toLowerCase();
  const includeDebug = searchParams.get("debug") === "1";

  const debugPayload = (debug: any) =>
    includeDebug && debug
      ? {
          ...debug,
          candidatesChecked: Array.isArray(debug.candidatesChecked) ? debug.candidatesChecked.slice(0, 20) : [],
          offersFound: Array.isArray(debug.offersFound) ? debug.offersFound.slice(0, 20) : [],
        }
      : undefined;

  if (!wallet || (!isEthAddress(wallet) && !isEns(wallet)) || !slug) {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      error: "invalid_input",
    });
  }

  const estimate = await buildWalletOfferEstimate(wallet);
  if (estimate.error === "missing_opensea") {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      error: "missing_opensea",
      debug: debugPayload(estimate.debug),
    });
  }

  if (estimate.error) {
    if (estimate.error === "no_wallet_offers") {
      return NextResponse.json({
        targetCollection: null,
        count: 0,
        estimateQuality: estimate.estimateQuality,
        detectedOfferValueETH: 0,
        offerCount: 0,
        checkedNftCount: estimate.checkedNftCount,
        candidateCount: estimate.candidateCount,
        error: "no_wallet_offers",
        debug: debugPayload(estimate.debug),
      });
    }
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      error: "estimate_failed",
      debug: debugPayload(estimate.debug),
    });
  }

  const metadata = await fetchOpenSeaJson<{ name?: string; image_url?: string; imageUrl?: string }>(
    `/collections/${encodeURIComponent(slug)}`,
    {}
  );

  const floor = await fetchCollectionFloorPriceETH(slug);
  if (!floor.floorPriceETH || floor.floorPriceETH <= 0) {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: estimate.estimateQuality,
      detectedOfferValueETH: estimate.detectedOfferValueETH,
      offerCount: estimate.offerCount,
      checkedNftCount: estimate.checkedNftCount,
      candidateCount: estimate.candidateCount,
      error: "no_floor",
      debug: debugPayload(estimate.debug),
    });
  }

  if (estimate.detectedOfferValueETH <= 0) {
    return NextResponse.json({
      targetCollection: {
        slug,
        name: metadata.name || slug,
        imageUrl: metadata.image_url || metadata.imageUrl || null,
        floorPriceETH: floor.floorPriceETH,
        openseaUrl: `https://opensea.io/collection/${slug}`,
      },
      count: 0,
      estimateQuality: estimate.estimateQuality,
      detectedOfferValueETH: estimate.detectedOfferValueETH,
      offerCount: estimate.offerCount,
      checkedNftCount: estimate.checkedNftCount,
      candidateCount: estimate.candidateCount,
      error: "no_wallet_offers",
      debug: debugPayload(estimate.debug),
    });
  }

  const rawCount = estimate.detectedOfferValueETH / floor.floorPriceETH;
  const count = rawCount < 1 ? Math.round(rawCount * 10) / 10 : Math.round(rawCount);
  const error = count < 0.1 ? "zero_result" : null;

  return NextResponse.json({
    targetCollection: {
      slug,
      name: metadata.name || slug,
      imageUrl: metadata.image_url || metadata.imageUrl || null,
      floorPriceETH: floor.floorPriceETH,
      openseaUrl: `https://opensea.io/collection/${slug}`,
    },
    count,
    estimateQuality: estimate.estimateQuality,
    detectedOfferValueETH: estimate.detectedOfferValueETH,
    offerCount: estimate.offerCount,
    checkedNftCount: estimate.checkedNftCount,
    candidateCount: estimate.candidateCount,
    error,
    debug: debugPayload(estimate.debug),
  });
}
