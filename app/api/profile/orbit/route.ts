import { NextRequest, NextResponse } from "next/server";
import { findCollectorsInOrbit } from "@/lib/orbit/findCollectorsInOrbit";

function isEthAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isEns(value: string) {
  return /^[a-zA-Z0-9-]+\.eth$/.test(value.trim());
}

function isLikelyValidInput(value: string) {
  const trimmed = value.trim();
  return isEthAddress(trimmed) || isEns(trimmed);
}

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

  if (walletInputs.length === 0) {
    return NextResponse.json(
      { error: "Missing wallet parameter. Provide one or more comma-separated Ethereum addresses or ENS names." },
      { status: 400 }
    );
  }

  const invalidInputs = walletInputs.filter((w) => !isLikelyValidInput(w));
  if (invalidInputs.length > 0) {
    return NextResponse.json(
      { error: `Invalid wallet input: ${invalidInputs.join(", ")}. Each must be a 0x address or ENS name.` },
      { status: 400 }
    );
  }

  const seedLimit = parseIntParam(searchParams.get("seedLimit"), 10, 10);
  const resultLimit = parseIntParam(searchParams.get("resultLimit"), 10, 20);
  const seedSlugs = parseSlugListParam(searchParams.get("seedSlugs"));
  const excludeSlugs = parseSlugListParam(searchParams.get("excludeSlugs"));

  try {
    const result = await findCollectorsInOrbit(walletInputs, {
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
