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
    });
  }

  if (estimate.error && estimate.error !== "missing_alchemy") {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      error: "estimate_failed",
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
  });
}
