import { NextResponse } from "next/server";
import {
  fetchWalletNFTs,
  WalletFetchError,
  type WalletOwnerNFT,
} from "@/lib/fetchWalletNFTs";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TEST_WALLET = "0x5ffd8de19910efff95df729c54699aebcee8";
const NFT_LIMIT = 15;
const MAX_EVENT_PAGES = 6;
const EVENT_PAGE_LIMIT = 50;

interface OwnerNFT extends WalletOwnerNFT {
  tokenId?: string;
  title?: string;
  metadata?: {
    name?: string;
  };
  contract?: {
    address?: string;
    name?: string;
    openSea?: {
      collectionName?: string;
    };
  };
  collection?: string | { name?: string };
}

type OpenSeaNftEvent = {
  event_timestamp?: string;
  from_address?: string;
  to_address?: string;
  transaction?: {
    hash?: string;
  };
};

type OpenSeaNftEventsResponse = {
  asset_events?: OpenSeaNftEvent[];
  events?: OpenSeaNftEvent[];
  next?: string | null;
};

type AcquisitionType = "minted" | "collected" | "transferred";

type AcquisitionResult = {
  name: string;
  collection: string;
  contractAddress: string;
  tokenId: string;
  acquiredAt: string | null;
  acquisitionType: AcquisitionType;
  txHash: string | null;
};

function normalizeAddress(value?: string) {
  return String(value || "").toLowerCase();
}

function resolveCollectionName(nft: OwnerNFT) {
  if (typeof nft.collection === "object" && nft.collection?.name) {
    return nft.collection.name;
  }

  if (typeof nft.collection === "string" && nft.collection.trim()) {
    return nft.collection;
  }

  return nft.contract?.openSea?.collectionName || nft.contract?.name || "Unknown Collection";
}

function resolveNftName(nft: OwnerNFT) {
  return nft.title || nft.metadata?.name || `Token #${nft.tokenId || "unknown"}`;
}

function isValidTimestamp(value?: string) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function classifyAcquisitionType(params: {
  walletAddress: string;
  acquisitionEvent: OpenSeaNftEvent;
  orderedEvents: OpenSeaNftEvent[];
}): AcquisitionType {
  const { walletAddress, acquisitionEvent, orderedEvents } = params;

  const fromAddress = normalizeAddress(acquisitionEvent.from_address);
  const toAddress = normalizeAddress(acquisitionEvent.to_address);

  if (fromAddress === ZERO_ADDRESS) {
    return "minted";
  }

  if (toAddress !== walletAddress) {
    return "transferred";
  }

  const acquisitionIndex = orderedEvents.findIndex(
    (event) =>
      normalizeAddress(event.from_address) === fromAddress &&
      normalizeAddress(event.to_address) === toAddress &&
      String(event.event_timestamp || "") === String(acquisitionEvent.event_timestamp || "")
  );

  if (acquisitionIndex > 0) {
    const previousEvent = orderedEvents[acquisitionIndex - 1];
    const previousTo = normalizeAddress(previousEvent.to_address);
    const previousAt = previousEvent.event_timestamp ? new Date(previousEvent.event_timestamp) : null;
    const acquiredAt = acquisitionEvent.event_timestamp ? new Date(acquisitionEvent.event_timestamp) : null;

    if (
      previousTo &&
      previousTo === fromAddress &&
      previousTo !== walletAddress &&
      previousTo !== ZERO_ADDRESS &&
      previousAt &&
      acquiredAt &&
      Math.abs(acquiredAt.getTime() - previousAt.getTime()) <= 1000 * 60 * 60
    ) {
      return "transferred";
    }
  }

  return "collected";
}

async function fetchOpenSeaEvents(
  contractAddress: string,
  tokenId: string,
  openseaApiKey: string
): Promise<OpenSeaNftEvent[]> {
  const events: OpenSeaNftEvent[] = [];
  let next = "";

  for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
    const params = new URLSearchParams({
      event_type: "transfer",
      limit: String(EVENT_PAGE_LIMIT),
    });

    if (next) {
      params.set("next", next);
    }

    const res = await fetch(
      `${OPENSEA_BASE_URL}/events/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}?${params.toString()}`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "x-api-key": openseaApiKey,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.log("ACQUISITION_EVENT_FETCH_FAILED", {
        contractAddress,
        tokenId,
        status: res.status,
        body: body.slice(0, 240),
      });
      break;
    }

    const data = (await res.json()) as OpenSeaNftEventsResponse;
    const pageEvents = data.events || data.asset_events || [];
    events.push(...pageEvents);

    next = String(data.next || "");

    if (!next || pageEvents.length === 0) {
      break;
    }
  }

  return events;
}

export async function GET() {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;
  const openseaApiKey = process.env.OPENSEA_API_KEY;

  if (!alchemyApiKey || !openseaApiKey) {
    return NextResponse.json(
      {
        wallet: TEST_WALLET,
        results: [],
        error: "ALCHEMY_API_KEY and OPENSEA_API_KEY are required",
      },
      { status: 500 }
    );
  }

  const wallet = normalizeAddress(TEST_WALLET);

  try {
    const ownedNfts = await fetchWalletNFTs<OwnerNFT>(wallet, alchemyApiKey);
    const sample = ownedNfts
      .filter((nft) => nft.contract?.address && nft.tokenId)
      .slice(0, NFT_LIMIT);

    const results: AcquisitionResult[] = [];

    for (let index = 0; index < sample.length; index += 1) {
      const nft = sample[index];
      const contractAddress = String(nft.contract?.address || "").toLowerCase();
      const tokenId = String(nft.tokenId || "");

      if (!contractAddress || !tokenId) {
        continue;
      }

      const rawEvents = await fetchOpenSeaEvents(contractAddress, tokenId, openseaApiKey);

      if (index < 3) {
        console.log("ACQUISITION_DEBUG_RAW_EVENTS", {
          contractAddress,
          tokenId,
          rawEvents: rawEvents.slice(0, 6),
        });
      }

      const orderedEvents = [...rawEvents].sort((a, b) => {
        const aTime = a.event_timestamp ? new Date(a.event_timestamp).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.event_timestamp ? new Date(b.event_timestamp).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });

      const acquisitionEvent = orderedEvents.find(
        (event) => normalizeAddress(event.to_address) === wallet
      );

      if (!acquisitionEvent) {
        console.log("ACQUISITION_EVENT_NOT_FOUND", { contractAddress, tokenId, wallet });

        results.push({
          name: resolveNftName(nft),
          collection: resolveCollectionName(nft),
          contractAddress,
          tokenId,
          acquiredAt: null,
          acquisitionType: "transferred",
          txHash: null,
        });

        continue;
      }

      const acquiredAt = isValidTimestamp(acquisitionEvent.event_timestamp)
        ? String(acquisitionEvent.event_timestamp)
        : null;

      const acquisitionType = classifyAcquisitionType({
        walletAddress: wallet,
        acquisitionEvent,
        orderedEvents,
      });

      results.push({
        name: resolveNftName(nft),
        collection: resolveCollectionName(nft),
        contractAddress,
        tokenId,
        acquiredAt,
        acquisitionType,
        txHash: acquisitionEvent.transaction?.hash || null,
      });
    }

    return NextResponse.json({
      wallet,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown acquisition test failure";
    const diagnostics =
      error instanceof WalletFetchError
        ? {
            errorType: error.errorType,
            resolverStage: error.resolverStage,
            upstreamStatus: error.upstreamStatus,
            diagnostics: error.diagnostics,
          }
        : null;

    console.log("ACQUISITION_VALIDATION_FAILED", {
      wallet,
      message,
      diagnostics,
    });

    return NextResponse.json(
      {
        wallet,
        results: [],
        error: message,
        diagnostics,
      },
      { status: 500 }
    );
  }
}
