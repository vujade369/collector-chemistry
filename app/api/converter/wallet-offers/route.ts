import { NextResponse } from "next/server";
import { buildConverterWalletOfferPrecompute } from "../shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletParam = String(searchParams.get("wallet") || "").trim();
  const includeDebug = searchParams.get("debug") === "1";

  const result = await buildConverterWalletOfferPrecompute(walletParam, includeDebug);

  return NextResponse.json(result);
}
