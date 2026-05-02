import { NextResponse } from "next/server";
import {
  buildWalletEstimate,
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
      error: "invalid_input",
      estimatedValueETH: 0,
      collectionsUsed: [],
    });
  }

  const estimate = await buildWalletEstimate(wallet);

  if (estimate.error) {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      error: "estimate_failed",
      estimatedValueETH: estimate.estimatedValueETH ?? 0,
      collectionsUsed: estimate.collections ?? [],
    });
  }

  const metadata = await fetchOpenSeaJson<{
    name?: string;
    image_url?: string;
    imageUrl?: string;
  }>(`/collections/${encodeURIComponent(slug)}`, {});

  const floorPriceETH = await fetchCollectionFloorPriceETH(slug);

  if (!floorPriceETH || floorPriceETH <= 0) {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: estimate.estimateQuality,
      error: "no_floor",
      estimatedValueETH: estimate.estimatedValueETH,
      collectionsUsed: estimate.collections,
    });
  }

  // One decimal place — show 0.3 Pudgy Penguins instead of hiding the result.
  const count = Math.round((estimate.estimatedValueETH / floorPriceETH) * 10) / 10;

  // Only treat as zero_result if genuinely nothing — not just less than one.
  const error =
    count === 0
      ? "zero_result"
      : estimate.estimateQuality === "low"
        ? "low_quality"
        : null;

  return NextResponse.json({
    targetCollection: {
      slug,
      name: metadata.name || slug,
      imageUrl: metadata.image_url || metadata.imageUrl || null,
      floorPriceETH,
    },
    count,
    estimateQuality: estimate.estimateQuality,
    error,
    estimatedValueETH: estimate.estimatedValueETH,
    collectionsUsed: estimate.collections,
  });
}