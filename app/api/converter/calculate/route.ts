import { NextResponse } from "next/server";
import {
  buildWalletOfferEstimate,
  fetchCollectionFloorPriceETH,
  fetchOpenSeaJson,
  fetchWalletTotalOfferViaMcp,
  isEns,
  isEthAddress,
} from "../shared";

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

async function resolveEnsViaMcp(ensName: string): Promise<string | null> {
  if (!OPENSEA_API_KEY) return null;

  try {
    const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
      import("@modelcontextprotocol/sdk/client/index.js"),
      import("@modelcontextprotocol/sdk/client/streamableHttp.js"),
    ]);

    const client = new Client({ name: "collector-chemistry-converter-ens", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL("https://mcp.opensea.io/mcp"), {
      requestInit: {
        headers: { "X-API-KEY": OPENSEA_API_KEY },
      },
    });

    try {
      await client.connect(transport);
      const toolResult = await client.callTool({
        name: "account_lookup",
        arguments: { query: ensName },
      });
      const textPayload = Array.isArray(toolResult?.content)
        ? toolResult.content.find((part) => part?.type === "text")?.text
        : null;
      if (!textPayload) return null;

      const parsed = JSON.parse(textPayload) as {
        address?: string;
        account?: { address?: string };
        data?: { address?: string; account?: { address?: string } };
      };
      const address = String(parsed?.address || parsed?.account?.address || parsed?.data?.address || parsed?.data?.account?.address || "").trim();
      return isEthAddress(address) ? address : null;
    } finally {
      await client.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
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

  if (!walletInputs.every((w) => isEthAddress(w) || isEns(w))) {
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

  const resolvedWallets = (
    await Promise.all(
      walletInputs.map(async (input) => {
        if (isEthAddress(input)) return input;
        if (isEns(input)) return resolveEnsViaMcp(input);
        return null;
      })
    )
  ).filter((w): w is string => Boolean(w));

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
    });
  }

  let estimate;
  if (resolvedWallets.length === 1) {
    estimate = await buildWalletOfferEstimate(resolvedWallets[0], includeDebug);
  } else {
    const walletResults = await Promise.all(resolvedWallets.map((wallet) => fetchWalletTotalOfferViaMcp(wallet)));
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

    estimate = {
      wallet: walletParam,
      detectedOfferValueETH,
      offerCount,
      checkedNftCount,
      candidateCount: checkedNftCount,
      estimateQuality: offerCount >= 5 ? "high" : offerCount >= 2 ? "medium" : "low",
      error: detectedOfferValueETH > 0 ? null : "no_wallet_offers",
    };
  }

  if (estimate.error === "missing_opensea") {
    return NextResponse.json({ targetCollection: null, count: 0, estimateQuality: "low", detectedOfferValueETH: 0, offerCount: 0, checkedNftCount: 0, candidateCount: 0, error: "missing_opensea" });
  }

  if (estimate.error) {
    if (estimate.error === "no_wallet_offers") {
      return NextResponse.json({ targetCollection: null, count: 0, estimateQuality: estimate.estimateQuality, detectedOfferValueETH: 0, offerCount: 0, checkedNftCount: estimate.checkedNftCount, candidateCount: estimate.candidateCount, error: "no_wallet_offers" });
    }
    return NextResponse.json({ targetCollection: null, count: 0, estimateQuality: "low", detectedOfferValueETH: 0, offerCount: 0, checkedNftCount: 0, candidateCount: 0, error: "estimate_failed" });
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
    });
  }

  const rawCount = estimate.detectedOfferValueETH / floor.floorPriceETH;
  const count = rawCount < 1 ? Math.round(rawCount * 10) / 10 : Math.round(rawCount);
  const error = count < 0.1 ? "zero_result" : null;

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
  });
}
