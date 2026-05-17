import { NextRequest, NextResponse } from "next/server";
import { findCollectorsInOrbit } from "@/lib/orbit/findCollectorsInOrbit";
import { resolveWalletInput } from "@/lib/walletResolver";

function parseIntParam(value: string | null, defaultVal: number, max: number): number {
  if (!value) return defaultVal;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultVal;
  return Math.min(parsed, max);
}

function parseSlugListParam(value: string | null): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawWallet = searchParams.get("wallet") || "";
  const walletInputs = rawWallet
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  const seedLimit = parseIntParam(searchParams.get("seedLimit"), 50, 50);
  const resultLimit = parseIntParam(searchParams.get("resultLimit"), 10, 20);
  const seedSlugs = parseSlugListParam(
    searchParams.get("seedSlugs") ?? searchParams.get("seed")
  );
  const excludeSlugs = parseSlugListParam(searchParams.get("excludeSlugs"));

  if (walletInputs.length === 0 && seedSlugs.length === 0) {
    return NextResponse.json(
      { error: "Provide a wallet address or seed collections." },
      { status: 400 }
    );
  }

  try {
    const resolvedWallets: string[] = [];

    for (const walletInput of walletInputs) {
      const resolved = await resolveWalletInput(walletInput);
      if (!resolved.ok) {
        return NextResponse.json(
          { error: `Could not resolve wallet input: ${walletInput}.` },
          { status: 400 }
        );
      }

      resolvedWallets.push(resolved.address);
    }

    const walletsForOrbit = Array.from(
      new Set(resolvedWallets.map((wallet) => wallet.trim().toLowerCase()).filter(Boolean))
    );

    const result = await findCollectorsInOrbit(walletsForOrbit, {
      seedLimit,
      resultLimit,
      seedSlugs,
      excludeSlugs,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[orbit] unexpected error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
