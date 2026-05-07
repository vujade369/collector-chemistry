import { NextResponse } from "next/server";
import { resolveWalletInput } from "@/lib/walletResolver";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const result = await resolveWalletInput(query);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
