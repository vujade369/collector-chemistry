import { NextResponse } from "next/server";
import { resolveWalletInput } from "@/lib/walletResolver";
import {
  buildWalletOfferEstimate,
  fetchCollectionFloorPriceETH,
  fetchOpenSeaJson,
  fetchWalletTotalOfferViaMcp,
} from "../shared";

type WalletResolutionRow = {
  input: string;
  resolvedAddress?: string;
  status: "resolved" | "failed";
  type: "address" | "ens" | "opensea_url" | "opensea_username" | "invalid";
};

function buildCrossWalletDuplicateDebug(
  walletRows: Array<{
    wallet: string;
    debugItems?: Array<{ nftKey: string; tokenStandard?: string }>;
  }>
) {
  const byKey = new Map<string, Array<{ wallet: string; tokenStandard?: string }>>();

  for (const row of walletRows) {
    const walletKeys = new Set<string>();
    for (const item of row.debugItems || []) {
      if (!item.nftKey || walletKeys.has(item.nftKey)) continue;
      walletKeys.add(item.nftKey);
      const existing = byKey.get(item.nftKey) || [];
      existing.push({ wallet: row.wallet, tokenStandard: item.tokenStandard });
      byKey.set(item.nftKey, existing);
    }
  }

  const duplicateRows = Array.from(byKey.entries()).filter(([, rows]) => new Set(rows.map((row) => row.wallet)).size > 1);
  const erc721LikeRows = duplicateRows.filter(([, rows]) =>
    rows.some((row) => String(row.tokenStandard || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === "ERC721")
  );

  return {
    crossWalletDuplicateKeysCount: duplicateRows.length,
    sampleCrossWalletDuplicateKeys: duplicateRows.slice(0, 10).map(([nftKey, rows]) => ({
      nftKey,
      wallets: Array.from(new Set(rows.map((row) => row.wallet))),
      tokenStandards: Array.from(new Set(rows.map((row) => row.tokenStandard).filter(Boolean))),
    })),
    crossWalletDuplicateWarnings: erc721LikeRows.length
      ? [
          {
            type: "erc721_like_key_seen_in_multiple_wallets",
            message: "The same ERC-721-like key appeared in multiple wallets. Totals were not adjusted.",
            count: erc721LikeRows.length,
          },
        ]
      : [],
  };
}

function mapFailedResolutionType(input: string): WalletResolutionRow["type"] {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9-]+\.eth$/i.test(trimmed)) return "ens";

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === "opensea.io" || host === "www.opensea.io") return "opensea_url";
  } catch {}

  return "invalid";
}

async function resolveConverterWalletInput(input: string): Promise<WalletResolutionRow> {
  const result = await resolveWalletInput(input);
  if (result.ok) {
    return {
      input,
      resolvedAddress: result.address,
      status: "resolved",
      type: result.type,
    };
  }

  return {
    input,
    status: "failed",
    type: mapFailedResolutionType(input),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletParam = String(searchParams.get("wallet") || "").trim();
  const slug = String(searchParams.get("slug") || "").trim().toLowerCase();
  const includeDebug = searchParams.get("debug") === "1";

  const walletInputs = walletParam
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (!walletInputs.length || walletInputs.length > 3 || !slug) {
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

  const walletResolutionRows = await Promise.all(
    walletInputs.map(resolveConverterWalletInput)
  );

  const failedResolutionRows = walletResolutionRows.filter((row) => row.status === "failed");

  if (failedResolutionRows.length) {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      error: walletInputs.length > 1 ? "wallet_resolution_failed" : "invalid_wallet",
      walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
    });
  }

  const resolvedWallets = walletResolutionRows
    .map((row) => row.resolvedAddress)
    .filter((wallet): wallet is string => Boolean(wallet));

  if (!resolvedWallets.length) {
    return NextResponse.json({
      targetCollection: null,
      count: 0,
      estimateQuality: "low",
      detectedOfferValueETH: 0,
      offerCount: 0,
      checkedNftCount: 0,
      candidateCount: 0,
      error: "no_wallet_offers",
      walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
    });
  }

  let estimate;
  if (resolvedWallets.length === 1) {
    estimate = await buildWalletOfferEstimate(resolvedWallets[0], includeDebug);
  } else {
    const walletResults = await Promise.all(resolvedWallets.map((wallet) => fetchWalletTotalOfferViaMcp(wallet, includeDebug)));
    const successes = walletResults.filter((r) => r.error === null || r.error === "no_offers");
    const hasMissingOpenSea = walletResults.some((r) => r.error === "missing_opensea");

    if (hasMissingOpenSea) {
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

    if (!successes.length) {
      return NextResponse.json({
        targetCollection: null,
        count: 0,
        estimateQuality: "low",
        detectedOfferValueETH: 0,
        offerCount: 0,
        checkedNftCount: 0,
        candidateCount: 0,
        error: "no_wallet_offers",
      });
    }

    const detectedOfferValueETH = successes.reduce((sum, row) => sum + row.totalOfferETH, 0);
    const offerCount = successes.reduce((sum, row) => sum + row.offerCount, 0);
    const checkedNftCount = successes.reduce((sum, row) => sum + row.itemCount, 0);
    const debugWalletRows = resolvedWallets.map((wallet, index) => ({
      wallet,
      debugItems: walletResults[index]?.debugItems,
    }));

    estimate = {
      wallet: walletParam,
      detectedOfferValueETH,
      offerCount,
      checkedNftCount,
      candidateCount: checkedNftCount,
      estimateQuality: offerCount >= 5 ? "high" : offerCount >= 2 ? "medium" : "low",
      error: detectedOfferValueETH > 0 ? null : "no_wallet_offers",
      debug: includeDebug
        ? {
            ...buildCrossWalletDuplicateDebug(debugWalletRows),
            walletRows: resolvedWallets.map((wallet, index) => ({
              wallet,
              totalOfferETH: walletResults[index]?.totalOfferETH ?? 0,
              offerCount: walletResults[index]?.offerCount ?? 0,
              itemCount: walletResults[index]?.itemCount ?? 0,
              error: walletResults[index]?.error ?? "mcp_failed",
              debug: walletResults[index]?.debug,
            })),
          }
        : undefined,
    };
  }

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
      walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
    });
  }

  const multiWalletDebug = estimate.debug as
    | {
        walletRows?: unknown[];
        crossWalletDuplicateKeysCount?: number;
        sampleCrossWalletDuplicateKeys?: unknown[];
        crossWalletDuplicateWarnings?: unknown[];
      }
    | undefined;
  const multiWalletDebugFields =
    includeDebug && resolvedWallets.length > 1 && multiWalletDebug
      ? {
          walletRows: multiWalletDebug.walletRows || [],
          crossWalletDuplicateKeysCount: multiWalletDebug.crossWalletDuplicateKeysCount ?? 0,
          sampleCrossWalletDuplicateKeys: multiWalletDebug.sampleCrossWalletDuplicateKeys || [],
          crossWalletDuplicateWarnings: multiWalletDebug.crossWalletDuplicateWarnings || [],
        }
      : {};

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
        debug: includeDebug ? estimate.debug : undefined,
        walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
        ...multiWalletDebugFields,
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
      walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
    });
  }

  const metadata = await fetchOpenSeaJson<{ name?: string; image_url?: string; imageUrl?: string }>(`/collections/${encodeURIComponent(slug)}`, {});
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
      debug: includeDebug ? estimate.debug : undefined,
      walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
      ...multiWalletDebugFields,
    });
  }

  if (estimate.detectedOfferValueETH <= 0) {
    return NextResponse.json({
      targetCollection: { slug, name: metadata.name || slug, imageUrl: metadata.image_url || metadata.imageUrl || null, floorPriceETH: floor.floorPriceETH, openseaUrl: `https://opensea.io/collection/${slug}` },
      count: 0,
      estimateQuality: estimate.estimateQuality,
      detectedOfferValueETH: estimate.detectedOfferValueETH,
      offerCount: estimate.offerCount,
      checkedNftCount: estimate.checkedNftCount,
      candidateCount: estimate.candidateCount,
      error: "no_wallet_offers",
      debug: includeDebug ? estimate.debug : undefined,
      walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
      ...multiWalletDebugFields,
    });
  }

  const rawCount = estimate.detectedOfferValueETH / floor.floorPriceETH;
  const roundedCount = Math.round(rawCount * 100) / 100;
  const count = rawCount > 0 && roundedCount === 0 ? 0.01 : roundedCount;
  const error = rawCount < 0.01 ? "zero_result" : null;

  return NextResponse.json({
    targetCollection: { slug, name: metadata.name || slug, imageUrl: metadata.image_url || metadata.imageUrl || null, floorPriceETH: floor.floorPriceETH, openseaUrl: `https://opensea.io/collection/${slug}` },
    count,
    estimateQuality: estimate.estimateQuality,
    detectedOfferValueETH: estimate.detectedOfferValueETH,
    offerCount: estimate.offerCount,
    checkedNftCount: estimate.checkedNftCount,
    candidateCount: estimate.candidateCount,
    error,
    debug: includeDebug ? estimate.debug : undefined,
    walletResolutionRows: includeDebug ? walletResolutionRows : undefined,
    ...multiWalletDebugFields,
  });
}
