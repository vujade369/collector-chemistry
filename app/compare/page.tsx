// app/compare/page.tsx
"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import WalletTypeaheadInput from "@/components/shared/WalletTypeaheadInput";
import "./compare.css";

type NFT = {
  contract: {
    address: string;
    name?: string;
    openSeaMetadata?: {
      imageUrl?: string;
      bannerImageUrl?: string;
    };
  };
  collection?: {
    imageUrl?: string;
  };
  tokenId: string;
  title?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      image?: string;
      image_url?: string;
    };
  };
  contractMetadata?: {
    name?: string;
  };
  metadata?: {
    attributes?: Array<{
      trait_type?: string;
      value?: string;
    }>;
  };
  displayTitle?: string;
  displayCollectionName?: string;
  displayCollectionSlug?: string;
  displayArtist?: string;
  displayImage?: string;
  acquiredDateA?: string | null;
  acquiredDateB?: string | null;
  displayArtistImage?: string;
};

type CollectorProfile = {
  username?: string;
  archetype: string;
  level: number;
  primaryLean: string;
  secondaryLean: string;
  profileLine: string;
  collectorIdentityLabel: string;
  dominantCategory: string;
  secondaryCategory: string;
  topCollection: {
    source: "collection" | "artist";
    name: string;
    ownedCount: number;
    previewImages: string[];
  } | null;
};

type WalletSummary = {
  totalNFTs: number;
  taste: Record<string, number>;
  profile: CollectorProfile;
  pfpUrl?: string | null;
  bannerUrl?: string | null;
  firstMint: {
    nft: {
      contractAddress: string;
      tokenId: string;
      collectionName: string;
      imageUrl: string;
      title: string;
    };
    timestamp: string;
  } | null;
  acquisitionBreakdown: {
    mintCount: number;
    acquiredCount: number;
    totalSampled: number;
    mintPercent: number;
    acquiredPercent: number;
  };
};

type SharedBucket = {
  walletA: NFT[];
  walletB: NFT[];
  walletACount: number;
  walletBCount: number;
  enteredDateA?: string | null;
  enteredDateB?: string | null;
};

type SharedBucketEntry = [string, SharedBucket];

type RecognitionRead = {
  label: string;
  summary: string;
  proof: string[];
  divergence: string[];
};

type CompareResponse = {
  walletA: WalletSummary;
  walletB: WalletSummary;
  scoring: {
    chemistryScore: number;
    label: string;
    similarityType: string;
    tasteAlignment: {
      score: number;
      label: string;
    };
    interpretation: string;
    pairInterpretation: {
      headline: string;
      summary: string;
    };
    breakdown: {
      exact: number;
      collections: number;
      artists: number;
      taste: number;
    };
    summary: {
      headline: string;
      body: string;
    };
  };
  shared: {
    exact: NFT[];
    exactCount: number;
    collections: Record<string, SharedBucket>;
    artists: Record<string, SharedBucket>;
  };
};

type InterpretResponse = {
  headline: string;
  summary: string;
};

type InterpretRequest = {
  nameA: string;
  nameB: string;
  archetypeA: string;
  archetypeB: string;
  interpretationMode?: "compare";
  recognitionLabel?: string;
  recognitionSummary?: string;
  recognitionProof?: string[];
  divergenceNotes?: string[];
  chemistryLabel: string;
  chemistryScore: number;
  profileLineA: string;
  profileLineB: string;
  primaryLeanA: string;
  primaryLeanB: string;
  contrastA: string;
  contrastB: string;
  topCollectionsA: string[];
  topCollectionsB: string[];
  sharedCollections: string[];
  sharedArtists: string[];
  exactCount: number;
  sharedCollectionCount?: number;
  sharedArtistCount?: number;
  sameNftCount?: number;
  sharedTasteTags?: string[];
};

type WalletResolveResponse =
  | { ok: true; address: string; message?: string }
  | { ok: false; message?: string };

async function resolveWalletIdentity(value: string): Promise<WalletResolveResponse> {
  const res = await fetch(`/api/wallet/resolve?q=${encodeURIComponent(value)}`);
  const json = (await res.json()) as WalletResolveResponse;
  return res.ok && json.ok ? json : { ok: false, message: json.message };
}

function shortenAddress(value: string) {
  if (!value) return "";
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

function getNftImage(nft: NFT) {
  return normalizeImageUrl(
    nft?.displayImage ||
      nft?.image?.cachedUrl ||
      nft?.image?.pngUrl ||
      nft?.image?.thumbnailUrl ||
      nft?.image?.originalUrl ||
      nft?.raw?.metadata?.image ||
      nft?.raw?.metadata?.image_url ||
      ""
  );
}

function getCollectionName(nft: NFT) {
  const slugFallback = humanizeCollectionName(nft?.displayCollectionSlug);
  return (
    nft?.displayCollectionName ||
    nft?.contractMetadata?.name ||
    nft?.contract?.name ||
    slugFallback ||
    "Unknown collection"
  );
}

function humanizeCollectionName(value?: string | null) {
  if (!value) return "";
  const withSpaces = value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .replace(/\s+/g, " ");
  if (!withSpaces) return "";
  return withSpaces
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (word === word.toUpperCase()) return word;
      if (/\d/.test(word) && word.length <= 4) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatMintDate(timestamp: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function sanitizeDisplayDate(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const blocked = new Set(["date not available", "date unknown", "entered date not available"]);
  if (blocked.has(trimmed.toLowerCase())) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getUTCFullYear() < 2010) return null;
  return trimmed;
}

function getNftTitle(nft: NFT) {
  return nft?.displayTitle || nft?.title || `#${nft?.tokenId || ""}`;
}

function getOpenSeaUrl(nft: NFT) {
  const address = nft?.contract?.address;
  const tokenId = nft?.tokenId;
  if (!address || tokenId === undefined || tokenId === null) return "";
  return `https://opensea.io/assets/ethereum/${address}/${tokenId}`;
}

function safeEntries<T>(obj?: Record<string, T>) {
  return obj ? Object.entries(obj) : [];
}

function sortSharedBucketEntries(entries: SharedBucketEntry[]) {
  return [...entries].sort(
    (a, b) =>
      b[1].walletACount + b[1].walletBCount - (a[1].walletACount + a[1].walletBCount)
  );
}

function sortTasteKeys(a: Record<string, number>, b: Record<string, number>) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  return [...keys].sort((x, y) => {
    if (x === "Other") return 1;
    if (y === "Other") return -1;
    const totalY = (a?.[y] || 0) + (b?.[y] || 0);
    const totalX = (a?.[x] || 0) + (b?.[x] || 0);
    if (totalY !== totalX) return totalY - totalX;
    const closenessY = Math.abs((a?.[y] || 0) - (b?.[y] || 0));
    const closenessX = Math.abs((a?.[x] || 0) - (b?.[x] || 0));
    return closenessX - closenessY;
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getTopTasteEntry(taste: Record<string, number>) {
  return Object.entries(taste || {})
    .filter(([key, value]) => key !== "Other" && Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0] || null;
}

function getSharedTasteTags(a: Record<string, number>, b: Record<string, number>) {
  return sortTasteKeys(a, b).filter((key) => {
    const aValue = Number(a?.[key]) || 0;
    const bValue = Number(b?.[key]) || 0;
    return key !== "Other" && aValue > 0 && bValue > 0;
  });
}

function getDepthSignal(sharedCollections: SharedBucketEntry[]) {
  let strongest: {
    name: string;
    a: number;
    b: number;
    gap: number;
    ratio: number;
  } | null = null;

  for (const [name, bucket] of sharedCollections) {
    const a = bucket.walletACount || 0;
    const b = bucket.walletBCount || 0;
    const smaller = Math.max(1, Math.min(a, b));
    const larger = Math.max(a, b);
    const gap = Math.abs(a - b);
    const ratio = larger / smaller;
    if (!strongest || gap > strongest.gap || (gap === strongest.gap && ratio > strongest.ratio)) {
      strongest = { name, a, b, gap, ratio };
    }
  }

  if (!strongest || strongest.gap < 3 || strongest.ratio < 2.5) return null;
  return strongest;
}

function buildRecognitionRead(
  data: CompareResponse,
  sharedCollections: SharedBucketEntry[],
  sharedArtists: SharedBucketEntry[]
): RecognitionRead {
  const sharedCollectionCount = sharedCollections.length;
  const sharedArtistCount = sharedArtists.length;
  const exactCount = data.shared.exactCount || 0;
  const sharedTasteTags = getSharedTasteTags(data.walletA.taste, data.walletB.taste);
  const topA = getTopTasteEntry(data.walletA.taste);
  const topB = getTopTasteEntry(data.walletB.taste);
  const samePrimaryTaste = Boolean(topA && topB && topA[0] === topB[0]);
  const depthSignal = getDepthSignal(sharedCollections);
  const directSignals = sharedCollectionCount + sharedArtistCount + exactCount;
  const connectiveSignals = directSignals + sharedTasteTags.length;
  const score = data.scoring.chemistryScore || 0;
  const strongestCollection = sharedCollections[0]?.[0]
    ? humanizeCollectionName(sharedCollections[0][0]) || sharedCollections[0][0]
    : "";
  const strongestArtist = sharedArtists[0]?.[0] || "";
  const sharedTasteLabel = sharedTasteTags[0] || "";

  const proof: string[] = [];
  if (sharedCollectionCount > 0) proof.push(pluralize(sharedCollectionCount, "shared collection"));
  if (sharedArtistCount > 0) proof.push(pluralize(sharedArtistCount, "shared artist signal"));
  if (exactCount > 0) proof.push(pluralize(exactCount, "same NFT"));
  if (sharedTasteLabel) proof.push(`both show ${sharedTasteLabel.toLowerCase()} activity`);
  if (depthSignal) {
    const depthName = humanizeCollectionName(depthSignal.name) || depthSignal.name;
    proof.push(`${depthName}: ${depthSignal.a} vs ${depthSignal.b} held`);
  }

  const divergence: string[] = [];
  if (topA && topB) {
    const [labelA, valueA] = topA;
    const [labelB, valueB] = topB;
    if (labelA === labelB) {
      const gap = Math.abs(Number(valueA) - Number(valueB));
      divergence.push(
        gap >= 15
          ? `Both wallets lean toward ${labelA.toLowerCase()}, but the weight lands unevenly.`
          : `Both wallets share a ${labelA.toLowerCase()} center, then separate in the surrounding signals.`
      );
    } else {
      divergence.push(
        `One wallet leans more heavily into ${labelA.toLowerCase()}, while the other gives more weight to ${labelB.toLowerCase()}.`
      );
    }
  }
  if (depthSignal) {
    const depthName = humanizeCollectionName(depthSignal.name) || depthSignal.name;
    divergence.push(
      `The shared rooms are present, but ${depthName} shows the depth clearly: ${depthSignal.a} held on one side and ${depthSignal.b} on the other.`
    );
  }

  if (
    sharedCollectionCount >= 4 &&
    sharedArtistCount >= 2 &&
    sharedTasteTags.length >= 2 &&
    samePrimaryTaste &&
    score >= 70
  ) {
    return {
      label: "Deeply Aligned",
      summary:
        "These wallets appear to move through the same cultural lanes with unusual consistency, across collections, artist signals, and category shape.",
      proof: proof.slice(0, 4),
      divergence,
    };
  }

  if (sharedCollectionCount >= 3 && depthSignal) {
    const depthName = humanizeCollectionName(depthSignal.name) || depthSignal.name;
    return {
      label: "Same Rooms, Different Depths",
      summary:
        `These wallets meet in several rooms, then separate in depth. ${depthName} carries the clearest proof: one wallet returns there with more weight.`,
      proof: proof.slice(0, 4),
      divergence,
    };
  }

  if (connectiveSignals >= 2 && topA && topB && !samePrimaryTaste) {
    return {
      label: "Adjacent Scenes",
      summary:
        "These wallets surface real crossing points while keeping different centers of gravity. They appear to move through neighboring scenes rather than one exact lane.",
      proof: proof.slice(0, 4),
      divergence,
    };
  }

  if (exactCount === 0 && sharedCollectionCount <= 1 && (sharedArtistCount >= 2 || sharedTasteTags.length >= 2)) {
    return {
      label: "Mirror Signal",
      summary:
        "The connection appears less literal than reflective. They do not share much directly, but the artist signals or category shape suggest nearby instincts.",
      proof: proof.slice(0, 4),
      divergence,
    };
  }

  if (exactCount === 0 && sharedArtistCount === 0 && sharedCollectionCount === 0 && sharedTasteTags.length <= 1 && score < 40) {
    return {
      label: "Different Constellations",
      summary:
        "These wallets appear to be moving through different collecting worlds right now. The distance gives the relationship its shape.",
      proof: proof.length ? proof.slice(0, 3) : ["minimal direct overlap surfaced"],
      divergence,
    };
  }

  const anchor = strongestArtist || strongestCollection || sharedTasteLabel;
  return {
    label: "Distant But Related",
    summary: anchor
      ? `The overlap is limited, but ${anchor} gives the relationship a visible thread. The signal suggests recognition at the edge.`
      : "The overlap is light, but the distance between the two collecting patterns is still legible.",
    proof: proof.length ? proof.slice(0, 4) : ["light overlap across visible signals"],
    divergence,
  };
}

function polishRelationshipRead(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (
    trimmed.includes("not enough reliable context") ||
    trimmed.includes("full interpretation")
  ) {
    return [
      "There is enough overlap here to suggest a real point of contact. The signal is less about one shared category and more about the way both wallets respond to nearby cultural cues.",
      "That kind of relationship can be more interesting than simple sameness. It leaves room for difference, distance, and recognition without forcing the wallets into the same shape.",
    ].join("\n\n");
  }

  return trimmed
    .replace(
      "There is enough overlap here to suggest a real point of contact, but not enough reliable context to turn that signal into a full interpretation.",
      "There is enough overlap here to suggest a real point of contact."
    )
    .replace("cannot conclude", "does not need to overstate");
}

type TasteSlice = {
  label: string;
  value: number;
};

function buildTasteSlices(taste: Record<string, number>, maxSegments = 6): TasteSlice[] {
  const entries = Object.entries(taste || {})
    .map(([label, value]) => ({ label, value: Number(value) || 0 }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const merged = new Map<string, number>();
  for (const entry of entries) {
    merged.set(entry.label, (merged.get(entry.label) || 0) + entry.value);
  }
  const normalized = [...merged.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (normalized.length <= maxSegments) {
    const nonOther = normalized.filter((entry) => entry.label !== "Other");
    const other = normalized.filter((entry) => entry.label === "Other");
    return [...nonOther, ...other];
  }

  const nonOther = normalized.filter((entry) => entry.label !== "Other");
  const otherTotal = normalized
    .filter((entry) => entry.label === "Other")
    .reduce((sum, entry) => sum + entry.value, 0);
  const head = nonOther.slice(0, maxSegments - 1);
  const tailTotal =
    nonOther.slice(maxSegments - 1).reduce((sum, entry) => sum + entry.value, 0) + otherTotal;
  if (tailTotal <= 0) return head;
  return [...head, { label: "Other", value: tailTotal }];
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((x) => `${x}${x}`).join("") : clean;
  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(alpha, 1))})`;
}

function getCollectorDisplayName(
  profile: Pick<CollectorProfile, "username"> | null | undefined,
  inputLabel: string,
  address: string
) {
  const username = String(profile?.username || "").trim();
  if (username) return username;

  const input = String(inputLabel || "").trim();
  if (input) return input;

  return shortenAddress(address);
}

function getCollectorSecondaryAddress(primaryLabel: string, address: string) {
  const secondary = shortenAddress(address);
  if (!secondary) return "";
  if (primaryLabel.trim().toLowerCase() === secondary.trim().toLowerCase()) return "";
  return secondary;
}

function getEntryPillName(
  profile: Pick<CollectorProfile, "username"> | null | undefined,
  address: string
) {
  const username = String(profile?.username || "").trim();
  if (username) return username;
  return shortenAddress(address);
}

function getOfficialCollectionImageFromNft(nft?: NFT | null) {
  if (!nft) return "";
  const primary = normalizeImageUrl(nft.contract?.openSeaMetadata?.imageUrl || "");
  if (primary) return primary;
  const fromCollection = normalizeImageUrl(nft.collection?.imageUrl || "");
  if (fromCollection) return fromCollection;
  return normalizeImageUrl(nft.contract?.openSeaMetadata?.bannerImageUrl || "");
}

function getOfficialArtistImageFromNft(nft?: NFT | null) {
  if (!nft) return "";
  const fromDisplay = normalizeImageUrl(nft.displayArtistImage || "");
  if (fromDisplay) return fromDisplay;
  const fromRaw = normalizeImageUrl(
    String(
      (nft.raw?.metadata as Record<string, unknown> | undefined)?.artist_image_url ||
      (nft.raw?.metadata as Record<string, unknown> | undefined)?.artistImageUrl ||
      ""
    )
  );
  return fromRaw;
}

function getGroupOfficialAvatar(nfts: NFT[], mode: "collection" | "artist") {
  let nftImageFallback = "";

  for (const nft of nfts) {
    const official =
      mode === "artist" ? getOfficialArtistImageFromNft(nft) : getOfficialCollectionImageFromNft(nft);
    if (official) return { url: official, source: "official" as const };
    if (!nftImageFallback) nftImageFallback = getNftImage(nft);
  }

  if (mode === "artist") {
    const byCollection = new Map<string, { count: number; image: string }>();
    for (const nft of nfts) {
      const key =
        String(nft.displayCollectionSlug || "").trim().toLowerCase() ||
        String(nft.displayCollectionName || "").trim().toLowerCase() ||
        String(nft.contract?.address || "").trim().toLowerCase();
      if (!key) continue;
      const image = getOfficialCollectionImageFromNft(nft);
      const current = byCollection.get(key);
      byCollection.set(key, {
        count: (current?.count || 0) + 1,
        image: current?.image || image,
      });
    }
    const ranked = [...byCollection.values()].sort((a, b) => b.count - a.count);
    const collectionImage = ranked.find((entry) => entry.image)?.image || "";
    if (collectionImage) return { url: collectionImage, source: "official" as const };
  }

  if (nftImageFallback) return { url: nftImageFallback, source: "fallback" as const };
  return { url: "", source: "none" as const };
}

const BREAKDOWN_META: Record<string, string> = {
  exact: "Same NFTs held by both wallets",
  collections: "Same collections, different pieces",
  artists: "Same artists across both wallets",
  taste: "Similarity in collecting categories",
};

const SPECTRUM_COLORS = [
  { color: "#ff0080", bg: "#1a0814", border: "#ff008055" },
  { color: "#00b0ff", bg: "#0a0e1a", border: "#00b0ff55" },
  { color: "#00e676", bg: "#0a1a0e", border: "#00e67655" },
  { color: "#7c4dff", bg: "#0e0a1a", border: "#7c4dff55" },
  { color: "#ffcc00", bg: "#1a1000", border: "#ffcc0055" },
  { color: "#ff4500", bg: "#1a0a00", border: "#ff450055" },
];

function getSpectrumColor(index: number) {
  return SPECTRUM_COLORS[index % SPECTRUM_COLORS.length];
}

function Avatar({
  address,
  tone,
  pfpUrl,
}: {
  address: string;
  tone: "a" | "b";
  pfpUrl?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = address ? address.slice(0, 1).toUpperCase() : "?";
  const borderColor = tone === "a" ? "#ff0080" : "#00b0ff";
  const bgColor = tone === "a" ? "#1a0814" : "#0a0e1a";
  const textColor = tone === "a" ? "#ff0080" : "#00b0ff";
  const showImage = pfpUrl && !imgError;

  return (
    <div
      className="cc-avatar"
      style={{ background: bgColor, border: `1.5px solid ${borderColor}` }}
    >
      {showImage ? (
        <img src={pfpUrl} alt={address} onError={() => setImgError(true)} />
      ) : (
        <span style={{ color: textColor }}>{initial}</span>
      )}
    </div>
  );
}

function WalletLabel({
  address,
  tone,
  pfpUrl,
  displayName,
  secondaryAddress,
}: {
  address: string;
  tone: "a" | "b";
  pfpUrl?: string | null;
  displayName?: string;
  secondaryAddress?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = address ? address.slice(0, 1).toUpperCase() : "?";
  const borderColor = tone === "a" ? "#ff0080" : "#00b0ff";
  const bgColor = tone === "a" ? "#1a0814" : "#0a0e1a";
  const textColor = tone === "a" ? "#ff0080" : "#00b0ff";
  const showImage = pfpUrl && !imgError;

  return (
    <div className="cc-wallet-label">
      <div
        className="cc-wallet-label-avatar"
        style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      >
        {showImage ? (
          <img src={pfpUrl} alt={address} onError={() => setImgError(true)} />
        ) : (
          <span style={{ color: textColor, fontSize: "9px", fontWeight: 500 }}>
            {initial}
          </span>
        )}
      </div>
      <div className="cc-wallet-label-text">
        <span className="cc-wallet-label-name">{displayName || shortenAddress(address)}</span>
        {secondaryAddress ? (
          <span className="cc-wallet-label-secondary">{secondaryAddress}</span>
        ) : null}
      </div>
    </div>
  );
}

function NFTCard({ nft, walletTone }: { nft: NFT; walletTone: "a" | "b" }) {
  const image = getNftImage(nft);
  const title = getNftTitle(nft);
  const subtitle = getCollectionName(nft);
  const href = getOpenSeaUrl(nft);

  const content = (
    <>
      <div className="compare-nft-image">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "grid";
            }}
          />
        ) : null}
        <div className="compare-image-fallback" style={{ display: image ? "none" : "grid" }}>
          Image unavailable
        </div>
      </div>
      <div className="compare-nft-meta">
        <div className="compare-nft-title truncate-2">{title}</div>
        <div className="compare-nft-subtitle truncate-2">{subtitle}</div>
      </div>
    </>
  );

  if (!href) {
    return (
      <article className={`compare-nft-card motion-safe wallet-tone-${walletTone}`}>
        {content}
      </article>
    );
  }

  return (
    <a
      className={`compare-nft-card motion-safe wallet-tone-${walletTone}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${title} on OpenSea`}
      title="Open on OpenSea"
    >
      {content}
    </a>
  );
}

function SpotlightCard({
  nft,
  submittedA,
  submittedB,
}: {
  nft: NFT;
  submittedA?: string;
  submittedB?: string;
}) {
  const image = getNftImage(nft);
  const title = getNftTitle(nft);
  const subtitle = getCollectionName(nft);
  const href = getOpenSeaUrl(nft);
  const labelA = submittedA ? shortenAddress(submittedA) : "Wallet one";
  const labelB = submittedB ? shortenAddress(submittedB) : "Wallet two";
  const dateA = sanitizeDisplayDate(nft.acquiredDateA);
  const dateB = sanitizeDisplayDate(nft.acquiredDateB);
  const hasAcquiredDates = Boolean(dateA || dateB);

  const content = (
    <>
      <div className="compare-spotlight-image">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "grid";
            }}
          />
        ) : null}
        <div
          className="compare-image-fallback compare-image-fallback-large"
          style={{ display: image ? "none" : "grid" }}
        >
          Image unavailable
        </div>
      </div>
      <div className="compare-spotlight-meta">
        <div className="compare-spotlight-title truncate-2">{title}</div>
        <div className="compare-spotlight-subtitle truncate-2">{subtitle}</div>
        {hasAcquiredDates ? (
          <div className="compare-acquired-row compare-mono">
            {dateA ? (
              <div className="compare-acquired-item">
                <span className="compare-acquired-label">{labelA}</span>
                <span className="compare-acquired-date">Acquired {dateA}</span>
              </div>
            ) : null}
            {dateB ? (
              <div className="compare-acquired-item">
                <span className="compare-acquired-label">{labelB}</span>
                <span className="compare-acquired-date">Acquired {dateB}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  if (!href) {
    return <article className="compare-spotlight-card motion-safe">{content}</article>;
  }

  return (
    <a
      className="compare-spotlight-card motion-safe"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${title} on OpenSea`}
      title="Open on OpenSea"
    >
      {content}
    </a>
  );
}

function ScoreBreakdownBars({
  breakdown,
}: {
  breakdown: CompareResponse["scoring"]["breakdown"];
}) {
  const items = [
    { key: "exact", label: "Exact overlap", value: breakdown.exact },
    { key: "collections", label: "Shared collections", value: breakdown.collections },
    { key: "artists", label: "Shared artists", value: breakdown.artists },
    { key: "taste", label: "Taste alignment", value: breakdown.taste },
  ];

  return (
    <div className="compare-breakdown-bars">
      {items.map(({ key, label, value }) => (
        <div key={key} className="compare-breakdown-row">
          <div className="compare-breakdown-header">
            <span className="compare-breakdown-label">{label}</span>
            <span className="compare-breakdown-value compare-mono">{value}</span>
          </div>
          <div className="compare-breakdown-track">
            <div
              className="compare-breakdown-fill"
              style={{ width: `${Math.max(value, 0)}%` }}
            />
          </div>
          <div className="compare-breakdown-desc">{BREAKDOWN_META[key]}</div>
        </div>
      ))}
    </div>
  );
}

function CollectorProfileCard({
  wallet,
  address,
  displayName,
  secondaryAddress,
  tone,
  pfpUrl,
}: {
  wallet: WalletSummary;
  address: string;
  displayName: string;
  secondaryAddress: string;
  tone: "a" | "b";
  pfpUrl?: string | null;
}) {
  const topCollection = wallet.profile.topCollection;
  const previewImages = (topCollection?.previewImages || [])
    .map((url) => normalizeImageUrl(url))
    .filter(Boolean)
    .slice(0, 2);
  const topImage = previewImages[0] || "";
  const secondaryPreview = previewImages[1] || "";
  const returnPatternLabel =
    topCollection?.source === "artist" ? "Where they keep coming back" : "Return Pattern";
  const returnPatternLine = topCollection
    ? `Keeps returning to ${topCollection.name}`
    : "Return pattern not available yet.";
  const signalPieceLabel = "Signal Piece";
  const signalPieceSupport = "Representative piece from this pattern";

  return (
    <article className={`panel compare-profile-card wallet-tone-${tone}`}>
      <div className="compare-profile-header">
        <div>
          <WalletLabel
            address={address}
            tone={tone}
            pfpUrl={pfpUrl}
            displayName={displayName}
            secondaryAddress={secondaryAddress}
          />
          <h3 className="compare-profile-archetype" style={{ marginTop: "10px" }}>
            {wallet.profile.archetype}
          </h3>
          <p className="compare-profile-line">{wallet.profile.profileLine}</p>
        </div>
      </div>

      <div className="compare-profile-identity">
        {secondaryAddress ? (
          <div className="compare-profile-address-full">{secondaryAddress}</div>
        ) : null}
      </div>

      <div className="compare-profile-stats">
        <div className="compare-profile-stat">
          <span className="compare-profile-stat-label">Primary</span>
          <span className="compare-profile-stat-value">{wallet.profile.primaryLean}</span>
        </div>
        <div className="compare-profile-stat">
          <span className="compare-profile-stat-label">Secondary</span>
          <span className="compare-profile-stat-value">{wallet.profile.secondaryLean}</span>
        </div>
        <div className="compare-profile-stat">
          <span className="compare-profile-stat-label">Holdings</span>
          <span className="compare-profile-stat-value compare-mono">{wallet.totalNFTs}</span>
        </div>
      </div>

      <div className="compare-profile-piece-head">
        <span className="compare-profile-piece-kicker">{returnPatternLabel}</span>
      </div>

      {topCollection ? (
        <div className={`compare-profile-piece wallet-tone-${tone}`}>
          <div className="compare-profile-piece-image">
            {topImage ? (
              <img
                src={topImage}
                alt={topCollection.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "grid";
                }}
              />
            ) : null}
            <div
              className="compare-image-fallback"
              style={{ display: topImage ? "none" : "grid" }}
            >
              Image unavailable
            </div>
          </div>
          <div className="compare-profile-piece-meta">
            <div className="compare-profile-piece-title truncate-2">{topCollection.name}</div>
            <div className="compare-profile-piece-support">{returnPatternLine}</div>
            <div className="compare-profile-piece-subtitle truncate-2">
              <span className="compare-profile-piece-count compare-mono">
                {topCollection.ownedCount}
              </span>{" "}
              works held
            </div>
            {secondaryPreview ? (
              <div className="compare-profile-preview-row">
                <img
                  src={secondaryPreview}
                  alt={`${topCollection.name} preview`}
                  loading="lazy"
                  className="compare-profile-preview-thumb"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="compare-empty">No top collection available yet.</div>
      )}

      {topImage ? (
        <div className="compare-profile-piece-head">
          <span className="compare-profile-piece-kicker">{signalPieceLabel}</span>
        </div>
      ) : null}
      {topImage ? (
        <div className={`compare-profile-piece wallet-tone-${tone}`}>
          <div className="compare-profile-piece-image">
            <img src={topImage} alt={`${topCollection?.name || "Collection"} signal piece`} loading="lazy" />
          </div>
          <div className="compare-profile-piece-meta">
            <div className="compare-profile-piece-title truncate-2">
              {topCollection?.name || "Return pattern collection"}
            </div>
            <div className="compare-profile-piece-support">{signalPieceSupport}</div>
          </div>
        </div>
      ) : null}

      {wallet.firstMint && (
        <div className="compare-first-mint">
          <div className="compare-first-mint-label">First mint</div>
          <div className="compare-first-mint-card">
            <div className="compare-first-mint-image">
              {wallet.firstMint.nft.imageUrl ? (
                <img
                  src={normalizeImageUrl(wallet.firstMint.nft.imageUrl)}
                  alt={wallet.firstMint.nft.title}
                  loading="lazy"
                />
              ) : (
                <div className="compare-image-fallback">No image</div>
              )}
            </div>
            <div className="compare-first-mint-meta">
              <div className="compare-first-mint-title">
                {wallet.firstMint.nft.title || wallet.firstMint.nft.collectionName}
              </div>
              <div className="compare-first-mint-collection">
                {wallet.firstMint.nft.collectionName}
              </div>
              <div className="compare-first-mint-date compare-mono">
                {formatMintDate(wallet.firstMint.timestamp)}
              </div>
            </div>
          </div>
        </div>
      )}

      {wallet.acquisitionBreakdown?.totalSampled > 0 && (
        <div className="compare-acquisition">
          <div className="compare-acquisition-label">How they collect</div>
          <div className="compare-acquisition-rows">
            <div className="compare-acquisition-row">
              <span className="compare-acquisition-type">Minted</span>
              <div className="compare-acquisition-bar-track">
                <div
                  className="compare-acquisition-bar-fill"
                  style={{ width: `${wallet.acquisitionBreakdown.mintPercent}%` }}
                />
              </div>
              <span className="compare-acquisition-pct compare-mono">
                {wallet.acquisitionBreakdown.mintPercent}%
              </span>
            </div>
            <div className="compare-acquisition-row">
              <span className="compare-acquisition-type">Acquired</span>
              <div className="compare-acquisition-bar-track">
                <div
                  className="compare-acquisition-bar-fill compare-acquisition-bar-secondary"
                  style={{ width: `${wallet.acquisitionBreakdown.acquiredPercent}%` }}
                />
              </div>
              <span className="compare-acquisition-pct compare-mono">
                {wallet.acquisitionBreakdown.acquiredPercent}%
              </span>
            </div>
          </div>
          <div className="compare-acquisition-note compare-mono">
            Based on {wallet.acquisitionBreakdown.totalSampled} recent events
          </div>
        </div>
      )}
    </article>
  );
}

function TasteSignature({
  title,
  tone,
  pfpUrl,
  address,
  displayName,
  secondaryAddress,
  slices,
}: {
  title: string;
  tone: "a" | "b";
  pfpUrl?: string | null;
  address: string;
  displayName: string;
  secondaryAddress: string;
  slices: TasteSlice[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const toneHex = tone === "a" ? "#ff3399" : "#29b6f6";
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const size = 188;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 64;
  const baseStrokeWidth = 18;
  const startAngle = -100;
  const gapAngle = slices.length > 1 ? 1.2 : 0;
  const rankOpacity = [1, 0.74, 0.56, 0.4];

  const rankedNonOther = [...slices]
    .filter((slice) => slice.label !== "Other")
    .sort((a, b) => b.value - a.value);

  let currentAngle = startAngle;
  const arcs = slices.map((slice, index) => {
    const rawSweep = (slice.value / total) * 360;
    const adjustedSweep = Math.max(rawSweep - gapAngle, 0.85);
    const arcStart = currentAngle + gapAngle / 2;
    const arcEnd = arcStart + adjustedSweep;
    currentAngle += rawSweep;

    const rank = rankedNonOther.findIndex((item) => item.label === slice.label) + 1;
    const isOther = slice.label === "Other";
    const baseOpacity = isOther
      ? 0.28
      : rank > 0
      ? rankOpacity[Math.min(rank - 1, rankOpacity.length - 1)] || 0.26
      : 0.26;
    const isDimmed = hoveredIndex !== null && hoveredIndex !== index;
    const opacity = isDimmed ? Math.max(0.14, baseOpacity * 0.45) : baseOpacity;
    const strokeWidth = rank === 1 ? baseStrokeWidth + 1.2 : baseStrokeWidth;

    return {
      index,
      label: slice.label,
      value: Math.round(slice.value),
      path: describeArcPath(cx, cy, radius, arcStart, arcEnd),
      stroke: toRgba(toneHex, opacity),
      strokeWidth,
    };
  });

  const legendRows = (() => {
    const bucket = new Map<string, number>();
    for (const slice of slices) {
      bucket.set(slice.label, (bucket.get(slice.label) || 0) + slice.value);
    }
    const merged = [...bucket.entries()].map(([label, value]) => ({ label, value }));
    const nonOther = merged
      .filter((entry) => entry.label !== "Other")
      .sort((a, b) => b.value - a.value);
    const other = merged.filter((entry) => entry.label === "Other");
    return [...nonOther, ...other].slice(0, 5);
  })();

  return (
    <article className={`compare-signature-card wallet-tone-${tone}`}>
      <div className="compare-signature-head">
        <WalletLabel
          address={address}
          tone={tone}
          pfpUrl={pfpUrl}
          displayName={displayName}
          secondaryAddress={secondaryAddress}
        />
        <div className="compare-signature-title">{title}</div>
      </div>
      <div className="compare-signature-visual">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="compare-signature-svg"
          role="img"
          aria-label={`${title} taste signature`}
        >
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1b1b1b" strokeWidth={baseStrokeWidth} />
          {arcs.map((arc) => (
            <path
              key={`${arc.label}-${arc.index}`}
              d={arc.path}
              fill="none"
              stroke={arc.stroke}
              strokeWidth={arc.strokeWidth}
              strokeLinecap="butt"
              onMouseEnter={() => setHoveredIndex(arc.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={radius - baseStrokeWidth / 2 + 1} fill="#111" />
        </svg>
      </div>
      <div className="compare-signature-legend">
        {legendRows.map((row) => (
          <div key={`legend-${row.label}`} className="compare-signature-legend-row">
            <span className="compare-signature-legend-name">{row.label}</span>
            <span className={`compare-signature-legend-value compare-mono wallet-${tone}`}>
              {Math.round(row.value)}%
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ComparePageContent() {
  const router = useRouter();
  const inputSectionRef = useRef<HTMLElement | null>(null);
  const [walletA, setWalletA] = useState("");
  const [walletB, setWalletB] = useState("");
  const [submittedA, setSubmittedA] = useState("");
  const [submittedB, setSubmittedB] = useState("");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretResponse | null>(null);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(false);
  const [isArtistsExpanded, setIsArtistsExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const searchParams = useSearchParams();

  const initialWalletAParam = (searchParams.get("a") || searchParams.get("walletA") || "").trim();
  const initialWalletBParam = (searchParams.get("b") || searchParams.get("walletB") || "").trim();
  const anchoredSide = !data && initialWalletAParam && !initialWalletBParam
    ? "a"
    : !data && initialWalletBParam && !initialWalletAParam
      ? "b"
      : null;

  useEffect(() => {
    const a = (searchParams.get("a") || searchParams.get("walletA") || "").trim();
    const b = (searchParams.get("b") || searchParams.get("walletB") || "").trim();

    if (a) setWalletA(a);
    if (b) setWalletB(b);

    if (a && b) {
      setTimeout(() => {
        void runCompareFromInputs(a, b, {
          replaceUrl: true,
          writeResolvedUrl: false,
        });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tasteKeys = useMemo(() => {
    if (!data) return [];
    return sortTasteKeys(data.walletA.taste, data.walletB.taste);
  }, [data]);

  const sharedCollections = useMemo(
    () => sortSharedBucketEntries(safeEntries(data?.shared?.collections)),
    [data]
  );

  const sharedArtists = useMemo(
    () => sortSharedBucketEntries(safeEntries(data?.shared?.artists)),
    [data]
  );

  const sharedExact = data?.shared?.exact || [];

  const recognition = useMemo(
    () => (data ? buildRecognitionRead(data, sharedCollections, sharedArtists) : null),
    [data, sharedCollections, sharedArtists]
  );

  const overlapTasteTags = useMemo(() => {
    if (!data) return [];
    return tasteKeys
      .filter((key) => {
        const a = data.walletA.taste[key] || 0;
        const b = data.walletB.taste[key] || 0;
        return a > 0 && b > 0 && key !== "Other";
      })
      .slice(0, 6);
  }, [data, tasteKeys]);

  const walletATasteSlices = useMemo(
    () => buildTasteSlices(data?.walletA?.taste || {}, 6),
    [data]
  );

  const walletBTasteSlices = useMemo(
    () => buildTasteSlices(data?.walletB?.taste || {}, 6),
    [data]
  );

  function buildInterpretRequest(
    json: CompareResponse,
    walletInputA: string,
    walletInputB: string
  ): InterpretRequest {
    const sharedCollectionKeys = Object.keys(json.shared.collections || {});
    const sharedArtistKeys = Object.keys(json.shared.artists || {});
    const sortedSharedCollections = sortSharedBucketEntries(safeEntries(json.shared.collections));
    const sortedSharedArtists = sortSharedBucketEntries(safeEntries(json.shared.artists));
    const recognitionRead = buildRecognitionRead(
      json,
      sortedSharedCollections,
      sortedSharedArtists
    );
    const sharedTasteTags = getSharedTasteTags(json.walletA.taste, json.walletB.taste).slice(0, 6);
    const interpretNameA = getCollectorDisplayName(json.walletA.profile, walletInputA, walletInputA);
    const interpretNameB = getCollectorDisplayName(json.walletB.profile, walletInputB, walletInputB);

    const primaryA = json.walletA.profile.primaryLean || "";
    const primaryB = json.walletB.profile.primaryLean || "";
    const secondaryA = json.walletA.profile.secondaryLean || "";
    const secondaryB = json.walletB.profile.secondaryLean || "";

    const contrastA =
      primaryA && secondaryA && primaryA !== secondaryA
        ? `${primaryA}-heavy with ${secondaryA} undercurrent`
        : primaryA || "";

    const contrastB =
      primaryB && secondaryB && primaryB !== secondaryB
        ? `${primaryB}-heavy with ${secondaryB} undercurrent`
        : primaryB || "";

    const sortedCollectionsForA = [...sharedCollectionKeys].sort(
      (a, b) =>
        (json.shared.collections[b]?.walletACount || 0) -
        (json.shared.collections[a]?.walletACount || 0)
    );

    const sortedCollectionsForB = [...sharedCollectionKeys].sort(
      (a, b) =>
        (json.shared.collections[b]?.walletBCount || 0) -
        (json.shared.collections[a]?.walletBCount || 0)
    );

    return {
      nameA: interpretNameA,
      nameB: interpretNameB,
      archetypeA: json.walletA.profile.archetype || "",
      archetypeB: json.walletB.profile.archetype || "",
      interpretationMode: "compare",
      recognitionLabel: recognitionRead.label,
      recognitionSummary: recognitionRead.summary,
      recognitionProof: recognitionRead.proof,
      divergenceNotes: recognitionRead.divergence,
      chemistryLabel: (json.scoring as { chemistryLabel?: string }).chemistryLabel || json.scoring.label || "",
      chemistryScore: json.scoring.chemistryScore || 0,
      profileLineA: json.walletA.profile.profileLine || "",
      profileLineB: json.walletB.profile.profileLine || "",
      primaryLeanA: primaryA,
      primaryLeanB: primaryB,
      contrastA,
      contrastB,
      topCollectionsA: sortedCollectionsForA.slice(0, 3),
      topCollectionsB: sortedCollectionsForB.slice(0, 3),
      sharedCollections: sortedSharedCollections.map(([name]) => name).slice(0, 5),
      sharedArtists: sortedSharedArtists.map(([name]) => name).slice(0, 3),
      exactCount: json.shared.exactCount || 0,
      sharedCollectionCount: sharedCollectionKeys.length,
      sharedArtistCount: sharedArtistKeys.length,
      sameNftCount: json.shared.exactCount || 0,
      sharedTasteTags,
    };
  }

  async function fetchInterpretation(body: InterpretRequest) {
    setInterpretationLoading(true);
    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as Partial<InterpretResponse>;
      if (json.headline || json.summary) {
        setInterpretation({
          headline: json.headline || "",
          summary: json.summary || "",
        });
      } else {
        setInterpretation(null);
      }
    } catch {
      setInterpretation(null);
    } finally {
      setInterpretationLoading(false);
    }
  }

  async function runCompareWith(a: string, b: string) {
    try {
      setLoading(true);
      setError("");
      setData(null);
      setInterpretation(null);
      setInterpretationLoading(false);
      const url = `/api/compare?walletA=${encodeURIComponent(a)}&walletB=${encodeURIComponent(b)}`;
      const res = await fetch(url);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`API returned non-JSON response: ${text.slice(0, 120)}`);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      setData(json);
      setSubmittedA(a);
      setSubmittedB(b);
      setIsCollectionsExpanded(false);
      setIsArtistsExpanded(false);
      void fetchInterpretation(buildInterpretRequest(json, a, b));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to compare wallets.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function runCompareFromInputs(
    inputA: string,
    inputB: string,
    options: { replaceUrl?: boolean; writeResolvedUrl?: boolean } = {}
  ) {
    if (!inputA.trim() || !inputB.trim()) {
      setError("Enter two wallet addresses or ENS names to compare.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [resolvedA, resolvedB] = await Promise.all([
        resolveWalletIdentity(inputA.trim()),
        resolveWalletIdentity(inputB.trim()),
      ]);

      if (!resolvedA.ok || !resolvedB.ok) {
        setError(resolvedA.message || resolvedB.message || "Couldn’t resolve that wallet.");
        return;
      }

      if (options.writeResolvedUrl !== false) {
        const nextUrl = `/compare?a=${encodeURIComponent(resolvedA.address)}&b=${encodeURIComponent(resolvedB.address)}`;
        if (options.replaceUrl) {
          router.replace(nextUrl);
        } else {
          router.push(nextUrl);
        }
      }

      await runCompareWith(resolvedA.address, resolvedB.address);
    } catch {
      setError("Couldn’t resolve that wallet.");
    } finally {
      setLoading(false);
    }
  }

  async function runCompare(e?: FormEvent) {
    e?.preventDefault();
    await runCompareFromInputs(walletA, walletB);
  }

  function resetAll() {
    setWalletA("");
    setWalletB("");
    setSubmittedA("");
    setSubmittedB("");
    setData(null);
    setInterpretation(null);
    setInterpretationLoading(false);
    setError("");
    setLoading(false);
    setIsCollectionsExpanded(false);
    setIsArtistsExpanded(false);
  }

  async function copyCurrentUrl() {
    if (typeof window === "undefined") return;

    const url = window.location.href;
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  function focusCompareForm() {
    inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById("walletA")?.focus();
    }, 250);
  }

  const canCompare = walletA.trim().length > 0 && walletB.trim().length > 0;
  const collectorNameA = getCollectorDisplayName(data?.walletA?.profile, submittedA, submittedA);
  const collectorNameB = getCollectorDisplayName(data?.walletB?.profile, submittedB, submittedB);
  const collectorSecondaryA = getCollectorSecondaryAddress(collectorNameA, submittedA);
  const collectorSecondaryB = getCollectorSecondaryAddress(collectorNameB, submittedB);
  const entryPillNameA = getEntryPillName(data?.walletA?.profile, submittedA);
  const entryPillNameB = getEntryPillName(data?.walletB?.profile, submittedB);
  const orbitWalletA = (searchParams.get("a") || searchParams.get("walletA") || submittedA).trim();
  const orbitWalletB = (searchParams.get("b") || searchParams.get("walletB") || submittedB).trim();
  const orbitBridgeHref =
    orbitWalletA && orbitWalletB
      ? `/orbit?wallet=${encodeURIComponent(orbitWalletA)},${encodeURIComponent(orbitWalletB)}`
      : "";

  return (
    <main className="compare-page">
      <div className="cc-shell">

        {/* Input form */}
        <section className="cc-input-section" ref={inputSectionRef}>
          <div className="cc-input-header">
            <p className="cc-eyebrow">Constellate</p>
            <h1 className="cc-hero-title">Compare two wallets.</h1>
            <p className="cc-hero-sub">
              Paste two wallets or ENS names to see where their patterns overlap.
            </p>
          </div>

          {anchoredSide && (
            <div className="cc-anchored-prompt" aria-live="polite">
              <p className="cc-anchored-title">Compare with this wallet.</p>
              <p className="cc-anchored-copy">
                Add your wallet to see where the patterns overlap.
              </p>
            </div>
          )}

          <form className="cc-form" onSubmit={runCompare}>
            <div className="cc-inputs">
              <div className="cc-input-wrap">
                <div className="cc-label-row">
                  <label className="cc-label" htmlFor="walletA">
                    {anchoredSide === "a" ? "Anchored wallet" : "Collector one"}
                  </label>
                  {anchoredSide === "a" && <span className="cc-anchor-badge">Already in view</span>}
                  {anchoredSide === "b" && <span className="cc-anchor-badge">Add yours</span>}
                </div>
                <WalletTypeaheadInput
                  id="walletA"
                  className="cc-input"
                  placeholder={anchoredSide === "b" ? "Your wallet or ENS" : "0x... or ENS"}
                  value={walletA}
                  onValueChange={(nextValue) => {
                    setWalletA(nextValue);
                    if (error) setError("");
                  }}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="cc-input-wrap">
                <div className="cc-label-row">
                  <label className="cc-label" htmlFor="walletB">
                    {anchoredSide === "b" ? "Anchored wallet" : "Collector two"}
                  </label>
                  {anchoredSide === "b" && <span className="cc-anchor-badge">Already in view</span>}
                  {anchoredSide === "a" && <span className="cc-anchor-badge">Add yours</span>}
                </div>
                <WalletTypeaheadInput
                  id="walletB"
                  className="cc-input"
                  placeholder={anchoredSide === "a" ? "Your wallet or ENS" : "0x... or ENS"}
                  value={walletB}
                  onValueChange={(nextValue) => {
                    setWalletB(nextValue);
                    if (error) setError("");
                  }}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="cc-form-actions">
              <button type="submit" className="cc-btn-primary" disabled={!canCompare || loading}>
                {loading ? "Comparing..." : "Compare"}
              </button>
              {(submittedA || submittedB) && (
                <button type="button" className="cc-btn-ghost" onClick={resetAll}>
                  Reset
                </button>
              )}
            </div>

            {error && <p className="cc-error">{error}</p>}
            {loading && (
              <div className="cc-loading-block" aria-live="polite">
                <p className="cc-loading-primary">Looking for recognition…</p>
                <p className="cc-loading-secondary">
                  We’re comparing shared collections, artists, depth, and where the two wallets diverge.
                </p>
                <div className="cc-loading-phrases" aria-label="Compare progress">
                  <span>Finding overlap</span>
                  <span>Checking shared artists</span>
                  <span>Reading the distance</span>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Results */}
        {data && (
          <div className="cc-results">

            {/* Hero card */}
            <section className="cc-hero-card">
              <div className="cc-recognition-header">
                <p className="cc-score-eyebrow">recognition</p>
                <h2 className="cc-score-label">{recognition?.label || data.scoring.label}</h2>
                {recognition?.summary ? (
                  <p className="cc-score-summary">{recognition.summary}</p>
                ) : null}
              </div>

              <div className="cc-visitor-actions">
                <div className="cc-visitor-copy">
                  <button
                    type="button"
                    onClick={() => void copyCurrentUrl()}
                    className={`cc-copy-link${linkCopied ? " is-copied" : ""}`}
                  >
                    {linkCopied ? "Copied" : "Copy link"}
                  </button>
                </div>
                <div className="cc-visitor-cta">
                  <button
                    type="button"
                    onClick={focusCompareForm}
                    className="cc-btn-primary"
                  >
                    Compare your wallet
                  </button>
                  <p>Use the form above to replace one collector and run a new comparison.</p>
                </div>
              </div>

              <div className="cc-editorial-footer cc-editorial-footer-primary">
                {interpretationLoading && (
                  <p className="cc-editorial-text cc-editorial-muted">Reading the relationship...</p>
                )}

                {!interpretationLoading && interpretation?.summary && (
                  <div className="cc-interpretation">
                    {interpretation.headline && (
                      <p className="cc-interpretation-headline">{interpretation.headline}</p>
                    )}
                    <div className="cc-interpretation-body">
                      {polishRelationshipRead(interpretation.summary)
                        .split("\n\n")
                        .filter(Boolean)
                        .map((paragraph, i) => (
                          <p key={i} className="cc-editorial-text">
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  </div>
                )}

                {!interpretationLoading && !interpretation?.summary && (
                  <p className="cc-editorial-text">
                    {polishRelationshipRead(data.scoring.pairInterpretation.summary)}
                  </p>
                )}

                {recognition?.proof.length ? (
                  <div className="cc-proof-row" aria-label="Recognition proof">
                    {recognition.proof.map((item) => (
                      <span key={item} className="cc-proof-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {orbitBridgeHref && (
                <div style={{ display: "flex", justifyContent: "center", padding: "0 4px 18px" }}>
                  <Link href={orbitBridgeHref} className="cc-btn-primary">
                    Find collectors near both wallets
                  </Link>
                </div>
              )}

              <div className="cc-identity-row">
                <div className="cc-identity cc-identity-a">
                  <Avatar address={submittedA} tone="a" pfpUrl={data.walletA.pfpUrl} />
                  <p className="cc-identity-name">{collectorNameA}</p>
                  {collectorSecondaryA ? (
                    <p className="cc-identity-address">{collectorSecondaryA}</p>
                  ) : null}
                  <p className="cc-identity-sub">{data.walletA.profile.archetype}</p>
                  {submittedA && (
                    <Link
                      href={`/profile?wallet=${encodeURIComponent(submittedA)}`}
                      className="cc-identity-read-link"
                    >
                      Read wallet
                    </Link>
                  )}
                </div>

                <div className="cc-identity cc-identity-b">
                  <Avatar address={submittedB} tone="b" pfpUrl={data.walletB.pfpUrl} />
                  <p className="cc-identity-name">{collectorNameB}</p>
                  {collectorSecondaryB ? (
                    <p className="cc-identity-address">{collectorSecondaryB}</p>
                  ) : null}
                  <p className="cc-identity-sub">{data.walletB.profile.archetype}</p>
                  {submittedB && (
                    <Link
                      href={`/profile?wallet=${encodeURIComponent(submittedB)}`}
                      className="cc-identity-read-link"
                    >
                      Read wallet
                    </Link>
                  )}
                </div>
              </div>

              <div className="cc-stat-trio">
                <div className="cc-stat cc-stat-pink">
                  <span className="cc-stat-value">{sharedCollections.length}</span>
                  <span className="cc-stat-label">shared collections</span>
                </div>
                <div className="cc-stat cc-stat-blue">
                  <span className="cc-stat-value">{sharedArtists.length}</span>
                  <span className="cc-stat-label">shared artists</span>
                </div>
                <div className="cc-stat cc-stat-purple">
                  <span className="cc-stat-value">{overlapTasteTags.length}</span>
                  <span className="cc-stat-label">taste signals</span>
                </div>
              </div>

              {sharedCollections.length > 0 && (
                <div className="cc-collection-bars">
                  {sharedCollections.slice(0, 4).map(([name, bucket]) => {
                    const displayName = humanizeCollectionName(name) || name;
                    const totalA = bucket.walletACount;
                    const totalB = bucket.walletBCount;
                    const max = Math.max(totalA, totalB, 1);
                    const depthGap = Math.abs(totalA - totalB);
                    const localMax = Math.max(totalA, totalB);
                    const imbalanceLabel =
                      depthGap === 0
                        ? "even depth"
                        : depthGap >= Math.max(4, Math.ceil(localMax * 0.6))
                          ? "much deeper"
                          : depthGap >= Math.max(2, Math.ceil(localMax * 0.35))
                            ? "goes deeper here"
                            : "one-sided";
                    return (
                      <div key={name} className="cc-bar-row">
                        <p className="cc-bar-name">{displayName}</p>
                        <div className="cc-bar-track-wrap">
                          <div style={{ display: "grid", gap: "4px" }}>
                            <div className="compare-mono" style={{ fontSize: "10px", color: "#8a8a8a" }}>
                              {collectorNameA}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center" }}>
                              <div className="cc-bar-track">
                                <div className="cc-bar-fill cc-bar-a" style={{ width: `${(totalA / max) * 100}%` }} />
                              </div>
                              <span className="compare-mono" style={{ fontSize: "11px", color: "#ff0080" }}>{totalA}</span>
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <div className="compare-mono" style={{ fontSize: "10px", color: "#8a8a8a" }}>
                              {collectorNameB}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center" }}>
                              <div className="cc-bar-track">
                                <div className="cc-bar-fill cc-bar-b" style={{ width: `${(totalB / max) * 100}%` }} />
                              </div>
                              <span className="compare-mono" style={{ fontSize: "11px", color: "#00b0ff" }}>{totalB}</span>
                            </div>
                          </div>
                        </div>
                        <p className="cc-bar-counts" style={{ color: "#6f6f6f", fontSize: "10px" }}>{imbalanceLabel}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="cc-editorial-footer">
                {overlapTasteTags.length > 0 && (
                  <div className="cc-tag-row">
                    {overlapTasteTags.map((tag, i) => {
                      const spec = getSpectrumColor(i);
                      return (
                        <span
                          key={tag}
                          className="cc-tag"
                          style={{ color: spec.color, background: spec.bg, border: `1px solid ${spec.border}` }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Shared artists */}
            {sharedArtists.length > 0 && (
              <section className="panel compare-section">
                <div className="compare-section-head compare-section-head-band">
                  <div className="eyebrow">Shared artists</div>
                  <h2 className="compare-section-title">Drawn to the same artists</h2>
                  <p className="compare-section-text">
                    Sometimes the strongest overlap sits beneath the collection name.
                  </p>
                </div>
                <div className="compare-group-list">
                  {sharedArtists
                    .slice(0, isArtistsExpanded ? sharedArtists.length : 2)
                    .map(([name, bucket]) => {
                      const enteredDateA = sanitizeDisplayDate(bucket.enteredDateA);
                      const enteredDateB = sanitizeDisplayDate(bucket.enteredDateB);
                      const groupAvatar = getGroupOfficialAvatar(
                        [...bucket.walletA, ...bucket.walletB],
                        "artist"
                      );

                      return (
                        <article key={name} className="panel-subtle compare-group-card">
                          <div className="compare-group-head">
                            <div className="compare-group-title-wrap">
                              <div className="compare-group-title-row">
                                {groupAvatar.url ? (
                                  <img
                                    className={`compare-group-avatar ${groupAvatar.source === "fallback" ? "is-fallback" : ""}`}
                                    src={groupAvatar.url}
                                    alt={`${name} avatar`}
                                    loading="lazy"
                                  />
                                ) : null}
                                <h3 className="compare-group-title compare-group-title-lower">{name}</h3>
                              </div>
                              <div className="compare-group-meta">Shared artist signal</div>
                              {enteredDateA || enteredDateB ? (
                                <div className="compare-group-entry-pills compare-mono">
                                  {enteredDateA ? (
                                    <span className="compare-group-entry-pill compare-group-entry-pill-a">
                                      {entryPillNameA} entered {enteredDateA}
                                    </span>
                                  ) : null}
                                  {enteredDateB ? (
                                    <span className="compare-group-entry-pill compare-group-entry-pill-b">
                                      {entryPillNameB} entered {enteredDateB}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="compare-group-columns">
                            <div className="compare-column compare-column-a">
                              <div className="compare-column-head">
                                <WalletLabel
                                  address={submittedA}
                                  tone="a"
                                  pfpUrl={data.walletA.pfpUrl}
                                  displayName={collectorNameA}
                                  secondaryAddress={collectorSecondaryA}
                                />
                                <div className="compare-column-meta compare-mono">
                                  {bucket.walletA.length} shown · {bucket.walletACount} total
                                </div>
                              </div>
                              {bucket.walletA.length > 0 ? (
                                <>
                                  <div className="compare-nft-grid">
                                    {bucket.walletA.map((nft) => (
                                      <NFTCard key={`${nft.contract.address}-${nft.tokenId}-artist-a`} nft={nft} walletTone="a" />
                                    ))}
                                  </div>
                                  {bucket.walletACount > bucket.walletA.length && (
                                    <div className="compare-more-pill compare-mono">
                                      +{bucket.walletACount - bucket.walletA.length} more
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="compare-empty">No NFTs to show.</div>
                              )}
                            </div>
                            <div className="compare-column compare-column-b">
                              <div className="compare-column-head">
                                <WalletLabel
                                  address={submittedB}
                                  tone="b"
                                  pfpUrl={data.walletB.pfpUrl}
                                  displayName={collectorNameB}
                                  secondaryAddress={collectorSecondaryB}
                                />
                                <div className="compare-column-meta compare-mono">
                                  {bucket.walletB.length} shown · {bucket.walletBCount} total
                                </div>
                              </div>
                              {bucket.walletB.length > 0 ? (
                                <>
                                  <div className="compare-nft-grid">
                                    {bucket.walletB.map((nft) => (
                                      <NFTCard key={`${nft.contract.address}-${nft.tokenId}-artist-b`} nft={nft} walletTone="b" />
                                    ))}
                                  </div>
                                  {bucket.walletBCount > bucket.walletB.length && (
                                    <div className="compare-more-pill compare-mono">
                                      +{bucket.walletBCount - bucket.walletB.length} more
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="compare-empty">No NFTs to show.</div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
                {sharedArtists.length > 2 && !isArtistsExpanded && (
                  <button
                    type="button"
                    className="btn compare-btn-secondary compare-show-more"
                    onClick={() => setIsArtistsExpanded(true)}
                  >
                    {`Show more (${sharedArtists.length - 2})`}
                  </button>
                )}
              </section>
            )}

            {/* Shared collections */}
            {sharedCollections.length > 0 && (
              <section className="panel compare-section">
                <div className="compare-section-head compare-section-head-band">
                  <div className="eyebrow">Shared collections</div>
                  <h2 className="compare-section-title">Different pieces, same world</h2>
                  <p className="compare-section-text">Similar gravity, different selections.</p>
                </div>
                <div className="compare-group-list">
                  {sharedCollections
                    .slice(0, isCollectionsExpanded ? sharedCollections.length : 2)
                    .map(([name, bucket]) => {
                      const enteredDateA = sanitizeDisplayDate(bucket.enteredDateA);
                      const enteredDateB = sanitizeDisplayDate(bucket.enteredDateB);
                      const displayName = humanizeCollectionName(name) || name;
                      const groupAvatar = getGroupOfficialAvatar(
                        [...bucket.walletA, ...bucket.walletB],
                        "collection"
                      );
                      return (
                        <article key={name} className="panel-subtle compare-group-card">
                          <div className="compare-group-head">
                            <div className="compare-group-title-wrap">
                              <div className="compare-group-title-row">
                                {groupAvatar.url ? (
                                  <img
                                    className={`compare-group-avatar ${groupAvatar.source === "fallback" ? "is-fallback" : ""}`}
                                    src={groupAvatar.url}
                                    alt={`${displayName} avatar`}
                                    loading="lazy"
                                  />
                                ) : null}
                                <h3 className="compare-group-title">{displayName}</h3>
                              </div>
                              {enteredDateA || enteredDateB ? (
                                <div className="compare-group-entry-pills compare-mono">
                                  {enteredDateA ? (
                                    <span className="compare-group-entry-pill compare-group-entry-pill-a">
                                      {entryPillNameA} entered {enteredDateA}
                                    </span>
                                  ) : null}
                                  {enteredDateB ? (
                                    <span className="compare-group-entry-pill compare-group-entry-pill-b">
                                      {entryPillNameB} entered {enteredDateB}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="compare-group-columns">
                            <div className="compare-column compare-column-a">
                              <div className="compare-column-head">
                                <WalletLabel
                                  address={submittedA}
                                  tone="a"
                                  pfpUrl={data.walletA.pfpUrl}
                                  displayName={collectorNameA}
                                  secondaryAddress={collectorSecondaryA}
                                />
                                <div className="compare-column-meta compare-mono">
                                  {bucket.walletA.length} shown · {bucket.walletACount} total
                                </div>
                              </div>
                              {bucket.walletA.length > 0 ? (
                                <>
                                  <div className="compare-nft-grid">
                                    {bucket.walletA.map((nft) => (
                                      <NFTCard key={`${nft.contract.address}-${nft.tokenId}-a`} nft={nft} walletTone="a" />
                                    ))}
                                  </div>
                                  {bucket.walletACount > bucket.walletA.length && (
                                    <div className="compare-more-pill compare-mono">
                                      +{bucket.walletACount - bucket.walletA.length} more
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="compare-empty">No NFTs to show.</div>
                              )}
                            </div>
                            <div className="compare-column compare-column-b">
                              <div className="compare-column-head">
                                <WalletLabel
                                  address={submittedB}
                                  tone="b"
                                  pfpUrl={data.walletB.pfpUrl}
                                  displayName={collectorNameB}
                                  secondaryAddress={collectorSecondaryB}
                                />
                                <div className="compare-column-meta compare-mono">
                                  {bucket.walletB.length} shown · {bucket.walletBCount} total
                                </div>
                              </div>
                              {bucket.walletB.length > 0 ? (
                                <>
                                  <div className="compare-nft-grid">
                                    {bucket.walletB.map((nft) => (
                                      <NFTCard key={`${nft.contract.address}-${nft.tokenId}-b`} nft={nft} walletTone="b" />
                                    ))}
                                  </div>
                                  {bucket.walletBCount > bucket.walletB.length && (
                                    <div className="compare-more-pill compare-mono">
                                      +{bucket.walletBCount - bucket.walletB.length} more
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="compare-empty">No NFTs to show.</div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
                {sharedCollections.length > 2 && !isCollectionsExpanded && (
                  <button
                    type="button"
                    className="btn compare-btn-secondary compare-show-more"
                    onClick={() => setIsCollectionsExpanded(true)}
                  >
                    {`Show more (${sharedCollections.length - 2})`}
                  </button>
                )}
              </section>
            )}

            {/* Same NFTs */}
            {sharedExact.length > 0 && (
              <section className="panel compare-section">
                <div className="compare-section-head compare-section-head-band">
                  <div className="eyebrow">Same NFTs</div>
                  <h2 className="compare-section-title">A rare direct signal</h2>
                  <p className="compare-section-text">A rarer overlap: both wallets hold the same piece.</p>
                </div>
                <div className={`compare-exact-grid ${sharedExact.length === 1 ? "single" : ""}`}>
                  {sharedExact.slice(0, 8).map((nft) => (
                    <SpotlightCard
                      key={`${nft.contract.address}-${nft.tokenId}`}
                      nft={nft}
                      submittedA={submittedA}
                      submittedB={submittedB}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Divergence */}
            {recognition?.divergence.length ? (
              <section className="panel compare-section">
                <div className="compare-section-head compare-section-head-band">
                  <div className="eyebrow">Divergence</div>
                  <h2 className="compare-section-title">Where they diverge</h2>
                  <p className="compare-section-text">
                    These wallets overlap in some rooms, then place their weight differently.
                  </p>
                </div>
                <div className="compare-divergence-list">
                  {recognition.divergence.map((item) => (
                    <p key={item} className="compare-divergence-item">
                      {item}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Collector profiles */}
            <section className="compare-overview">
              <div className="compare-section-head compare-section-head-band compare-overview-head">
                <div className="eyebrow">Supporting read</div>
                <h2 className="compare-section-title">Collector movement</h2>
                <p className="compare-section-text">
                  The wallet-level patterns behind the relationship.
                </p>
              </div>
              <div className="compare-overview-grid">
                <article className="panel compare-wallet-card wallet-tone-a">
                  <div className="compare-wallet-top">
                    <div className="compare-wallet-id">
                      <WalletLabel
                        address={submittedA}
                        tone="a"
                        pfpUrl={data.walletA.pfpUrl}
                        displayName={collectorNameA}
                        secondaryAddress={collectorSecondaryA}
                      />
                    </div>
                    <div className="compare-wallet-count">
                      <div className="compare-wallet-count-value compare-mono">{data.walletA.totalNFTs}</div>
                      <div className="compare-wallet-count-label">Holdings indexed</div>
                    </div>
                  </div>
                </article>
                <article className="panel compare-wallet-card wallet-tone-b">
                  <div className="compare-wallet-top">
                    <div className="compare-wallet-id">
                      <WalletLabel
                        address={submittedB}
                        tone="b"
                        pfpUrl={data.walletB.pfpUrl}
                        displayName={collectorNameB}
                        secondaryAddress={collectorSecondaryB}
                      />
                    </div>
                    <div className="compare-wallet-count">
                      <div className="compare-wallet-count-value compare-mono">{data.walletB.totalNFTs}</div>
                      <div className="compare-wallet-count-label">Holdings indexed</div>
                    </div>
                  </div>
                </article>
              </div>
              <div className="compare-profile-grid">
                <CollectorProfileCard
                  wallet={data.walletA}
                  address={submittedA}
                  displayName={collectorNameA}
                  secondaryAddress={collectorSecondaryA}
                  tone="a"
                  pfpUrl={data.walletA.pfpUrl}
                />
                <CollectorProfileCard
                  wallet={data.walletB}
                  address={submittedB}
                  displayName={collectorNameB}
                  secondaryAddress={collectorSecondaryB}
                  tone="b"
                  pfpUrl={data.walletB.pfpUrl}
                />
              </div>
            </section>

            {/* Taste map */}
            <section className="panel compare-section compare-section-compact">
              <div className="compare-section-head compare-section-head-band">
                <div className="eyebrow">Taste map</div>
                <h2 className="compare-section-title">Category shape</h2>
                <p className="compare-section-text">
                  A quieter view of where each wallet places attention.
                </p>
              </div>
              {tasteKeys.length > 0 ? (
                <div className="compare-signatures">
                  <TasteSignature
                    title="Collector one"
                    tone="a"
                    address={submittedA}
                    pfpUrl={data.walletA.pfpUrl}
                    displayName={collectorNameA}
                    secondaryAddress={collectorSecondaryA}
                    slices={walletATasteSlices}
                  />
                  <TasteSignature
                    title="Collector two"
                    tone="b"
                    address={submittedB}
                    pfpUrl={data.walletB.pfpUrl}
                    displayName={collectorNameB}
                    secondaryAddress={collectorSecondaryB}
                    slices={walletBTasteSlices}
                  />
                </div>
              ) : (
                <div className="compare-empty">No taste profile available yet.</div>
              )}
            </section>

          </div>
        )}
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="compare-page">
          <div className="cc-shell">
            <section className="cc-input-section">
              <p className="cc-loading">Loading compare experience...</p>
            </section>
          </div>
        </main>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
