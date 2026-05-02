import { NextResponse } from "next/server";
import { buildWalletOfferEstimate, isEns, isEthAddress } from "./shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = String(searchParams.get("wallet") || "").trim();

  if (!wallet || (!isEthAddress(wallet) && !isEns(wallet))) {
    return NextResponse.json({
      wallet,
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      estimateQuality: "low",
      error: "invalid_wallet",
    });
  }

  try {
    return NextResponse.json(await buildWalletOfferEstimate(wallet));
  } catch {
    return NextResponse.json({
      wallet,
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      estimateQuality: "low",
      error: "estimate_failed",
    });
  }
}
