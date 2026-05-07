import { NextResponse } from "next/server";
import { suggestWalletInputs } from "@/lib/walletResolver";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  try {
    const results = await suggestWalletInputs(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
