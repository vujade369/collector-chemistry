// app/compare/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./compare.css";

type NFT = {
  contract: {
    address: string;
    name?: string;
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
};

type CollectorProfile = {
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
};

type SharedBucket = {
  walletA: NFT[];
  walletB: NFT[];
  walletACount: number;
  walletBCount: number;
  enteredDateA?: string | null;
  enteredDateB?: string | null;
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

function isLikelyValidInput(value: string) {
  const trimmed = value.trim();
  const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isEns = /^[a-zA-Z0-9-]+\.eth$/.test(trimmed);
  return isEthAddress || isEns;
}

const BREAKDOWN_META: Record<string, string> = {
  exact: "Same NFTs held by both wallets",
  collections: "Same collections, different pieces",
  artists: "Same artists across both wallets",
  taste: "Similarity in collecting categories",
};

function scoreLabel(score: number) {
  if (score < 25) return "Very different";
  if (score < 50) return "Some overlap";
  if (score < 75) return "Shared taste";
  return "Strong alignment";
}

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
      <span className="cc-wallet-label-address">{shortenAddress(address)}</span>
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
  submitted,
  tone,
  pfpUrl,
}: {
  wallet: WalletSummary;
  submitted: string;
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
  const topCollectionLabel =
    topCollection?.source === "artist" ? "Top Artist" : "Top Collection";
  const topCollectionSupport = "Most owned across wallet";

  return (
    <article className={`panel compare-profile-card wallet-tone-${tone}`}>
      <div className="compare-profile-header">
        <div>
          <WalletLabel address={submitted} tone={tone} pfpUrl={pfpUrl} />
          <h3 className="compare-profile-archetype" style={{ marginTop: "10px" }}>
            {wallet.profile.archetype}
          </h3>
          <p className="compare-profile-line">{wallet.profile.profileLine}</p>
        </div>
      </div>

      <div className="compare-profile-identity">
        <div className="compare-profile-address-full">{submitted}</div>
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
        <span className="compare-profile-piece-kicker">{topCollectionLabel}</span>
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
            <div className="compare-profile-piece-support">{topCollectionSupport}</div>
            <div className="compare-profile-piece-subtitle truncate-2">
              <span className="compare-profile-piece-count compare-mono">
                {topCollection.ownedCount}
              </span>{" "}
              owned
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
    </article>
  );
}

export default function ComparePage() {
  const [walletA, setWalletA] = useState("");
  const [walletB, setWalletB] = useState("");
  const [submittedA, setSubmittedA] = useState("");
  const [submittedB, setSubmittedB] = useState("");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMoreCollections, setShowMoreCollections] = useState(false);
  const [showMoreArtists, setShowMoreArtists] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const a = searchParams.get("walletA") || "";
    const b = searchParams.get("walletB") || "";
    if (a && b && isLikelyValidInput(a) && isLikelyValidInput(b)) {
      setWalletA(a);
      setWalletB(b);
      setTimeout(() => { runCompareWith(a, b); }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tasteKeys = useMemo(() => {
    if (!data) return [];
    return sortTasteKeys(data.walletA.taste, data.walletB.taste);
  }, [data]);

  const sharedCollections = useMemo(
    () =>
      safeEntries(data?.shared?.collections).sort(
        (a, b) =>
          b[1].walletACount + b[1].walletBCount - (a[1].walletACount + a[1].walletBCount)
      ),
    [data]
  );

  const sharedArtists = useMemo(
    () =>
      safeEntries(data?.shared?.artists).sort(
        (a, b) =>
          b[1].walletACount + b[1].walletBCount - (a[1].walletACount + a[1].walletBCount)
      ),
    [data]
  );

  const sharedExact = data?.shared?.exact || [];
  const exactCount = data?.shared?.exactCount || 0;

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

  async function runCompareWith(a: string, b: string) {
    try {
      setLoading(true);
      setError("");
      setData(null);
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
      setShowMoreCollections(false);
      setShowMoreArtists(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to compare wallets.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function runCompare(e?: FormEvent) {
    e?.preventDefault();
    if (!walletA.trim() || !walletB.trim()) {
      setError("Enter two wallet addresses or ENS names to compare.");
      return;
    }
    if (!isLikelyValidInput(walletA) || !isLikelyValidInput(walletB)) {
      setError("Enter a valid Ethereum address or ENS name.");
      return;
    }
    await runCompareWith(walletA.trim(), walletB.trim());
  }

  function resetAll() {
    setWalletA("");
    setWalletB("");
    setSubmittedA("");
    setSubmittedB("");
    setData(null);
    setError("");
    setLoading(false);
    setShowMoreCollections(false);
    setShowMoreArtists(false);
  }

  const canCompare = isLikelyValidInput(walletA) && isLikelyValidInput(walletB);

  return (
    <main className="compare-page">
      <div className="cc-shell">

        {/* ── Input form ── */}
        <section className="cc-input-section">
          <div className="cc-input-header">
            <p className="cc-eyebrow">Collector Chemistry</p>
            <h1 className="cc-hero-title">Compare two collectors.</h1>
            <p className="cc-hero-sub">
              Paste two wallet addresses or ENS names to see where their taste overlaps.
            </p>
          </div>

          <form className="cc-form" onSubmit={runCompare}>
            <div className="cc-inputs">
              <div className="cc-input-wrap">
                <label className="cc-label" htmlFor="walletA">Collector one</label>
                <input
                  id="walletA"
                  className="cc-input"
                  placeholder="0x... or ENS"
                  value={walletA}
                  onChange={(e) => setWalletA(e.target.value)}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="cc-input-wrap">
                <label className="cc-label" htmlFor="walletB">Collector two</label>
                <input
                  id="walletB"
                  className="cc-input"
                  placeholder="0x... or ENS"
                  value={walletB}
                  onChange={(e) => setWalletB(e.target.value)}
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
              <p className="cc-loading">
                Pulling holdings, mapping overlap, and scoring chemistry...
              </p>
            )}
          </form>
        </section>

        {/* ── Results ── */}
        {data && (
          <div className="cc-results">

            {/* ── Hero card ── */}
            <section className="cc-hero-card">
              <div className="cc-identity-row">
                <div className="cc-identity cc-identity-a">
                  <Avatar address={submittedA} tone="a" pfpUrl={data.walletA.pfpUrl} />
                  <p className="cc-identity-name">{shortenAddress(submittedA)}</p>
                  <p className="cc-identity-sub">{data.walletA.profile.archetype}</p>
                </div>

                <div className="cc-score-center">
                  <p className="cc-score-eyebrow">chemistry</p>
                  <p className="cc-score-label">{scoreLabel(data.scoring.chemistryScore)}</p>
                </div>

                <div className="cc-identity cc-identity-b">
                  <Avatar address={submittedB} tone="b" pfpUrl={data.walletB.pfpUrl} />
                  <p className="cc-identity-name">{shortenAddress(submittedB)}</p>
                  <p className="cc-identity-sub">{data.walletB.profile.archetype}</p>
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
                    return (
                      <div key={name} className="cc-bar-row">
                        <p className="cc-bar-name">{displayName}</p>
                        <div className="cc-bar-track-wrap">
                          <div className="cc-bar-track">
                            <div className="cc-bar-fill cc-bar-a" style={{ width: `${(totalA / max) * 100}%` }} />
                          </div>
                          <div className="cc-bar-track">
                            <div className="cc-bar-fill cc-bar-b" style={{ width: `${(totalB / max) * 100}%` }} />
                          </div>
                        </div>
                        <p className="cc-bar-counts">{totalA} · {totalB}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="cc-editorial-footer">
                <p className="cc-editorial-text">{data.scoring.pairInterpretation.summary}</p>
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

            {/* ── Exact overlap ── */}
            {sharedExact.length > 0 && (
              <section className="panel compare-section">
                <div className="compare-section-head">
                  <div className="eyebrow">Exact overlap</div>
                  <h2 className="compare-section-title">You both chose this</h2>
                  <p className="compare-section-text">The clearest direct intersection.</p>
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

            {/* ── Shared collections ── */}
            {sharedCollections.length > 0 && (
              <section className="panel compare-section">
                <div className="compare-section-head">
                  <div className="eyebrow">Shared collections</div>
                  <h2 className="compare-section-title">Different pieces, same world</h2>
                  <p className="compare-section-text">Similar gravity, different selections.</p>
                </div>
                <div className="compare-group-list">
                  {sharedCollections
                    .slice(0, showMoreCollections ? sharedCollections.length : 3)
                    .map(([name, bucket]) => {
                      const enteredDateA = sanitizeDisplayDate(bucket.enteredDateA);
                      const enteredDateB = sanitizeDisplayDate(bucket.enteredDateB);
                      const displayName = humanizeCollectionName(name) || name;
                      return (
                        <article key={name} className="panel-subtle compare-group-card">
                          <div className="compare-group-head">
                            <div className="compare-group-title-wrap">
                              <h3 className="compare-group-title">{displayName}</h3>
                              {enteredDateA && enteredDateB ? (
                                <div className="compare-group-entry-dates compare-mono">
                                  <span>{shortenAddress(submittedA)} entered <strong>{enteredDateA}</strong></span>
                                  <span className="compare-entry-divider">·</span>
                                  <span>{shortenAddress(submittedB)} entered <strong>{enteredDateB}</strong></span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="compare-group-columns">
                            <div className="compare-column compare-column-a">
                              <div className="compare-column-head">
                                <WalletLabel address={submittedA} tone="a" pfpUrl={data.walletA.pfpUrl} />
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
                                <WalletLabel address={submittedB} tone="b" pfpUrl={data.walletB.pfpUrl} />
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
                {sharedCollections.length > 3 && (
                  <button
                    type="button"
                    className="btn compare-btn-secondary compare-show-more"
                    onClick={() => setShowMoreCollections((v) => !v)}
                  >
                    {showMoreCollections ? "Show less" : `Show more (${sharedCollections.length - 3})`}
                  </button>
                )}
              </section>
            )}

            {/* ── Shared artists ── */}
            {sharedArtists.length > 0 && (
              <section className="panel compare-section">
                <div className="compare-section-head">
                  <div className="eyebrow">Shared artists</div>
                  <h2 className="compare-section-title">Drawn to the same artists</h2>
                  <p className="compare-section-text">
                    Sometimes the strongest overlap sits beneath the collection name.
                  </p>
                </div>
                <div className="compare-group-list">
                  {sharedArtists
                    .slice(0, showMoreArtists ? sharedArtists.length : 3)
                    .map(([name, bucket]) => (
                      <article key={name} className="panel-subtle compare-group-card">
                        <div className="compare-group-head">
                          <div className="compare-group-title-wrap">
                            <h3 className="compare-group-title compare-group-title-lower">{name}</h3>
                            <div className="compare-group-meta">Shared artist</div>
                          </div>
                        </div>
                        <div className="compare-group-columns">
                          <div className="compare-column compare-column-a">
                            <div className="compare-column-head">
                              <WalletLabel address={submittedA} tone="a" pfpUrl={data.walletA.pfpUrl} />
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
                              <WalletLabel address={submittedB} tone="b" pfpUrl={data.walletB.pfpUrl} />
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
                    ))}
                </div>
                {sharedArtists.length > 3 && (
                  <button
                    type="button"
                    className="btn compare-btn-secondary compare-show-more"
                    onClick={() => setShowMoreArtists((v) => !v)}
                  >
                    {showMoreArtists ? "Show less" : `Show more (${sharedArtists.length - 3})`}
                  </button>
                )}
              </section>
            )}

            {/* ── Collector profiles ── */}
            <section className="compare-overview">
              <div className="compare-overview-grid">
                <article className="panel compare-wallet-card wallet-tone-a">
                  <div className="compare-wallet-top">
                    <div className="compare-wallet-id">
                      <WalletLabel address={submittedA} tone="a" pfpUrl={data.walletA.pfpUrl} />
                      <div className="compare-wallet-address" style={{ marginTop: "6px" }}>{submittedA}</div>
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
                      <WalletLabel address={submittedB} tone="b" pfpUrl={data.walletB.pfpUrl} />
                      <div className="compare-wallet-address" style={{ marginTop: "6px" }}>{submittedB}</div>
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
                  submitted={submittedA}
                  tone="a"
                  pfpUrl={data.walletA.pfpUrl}
                />
                <CollectorProfileCard
                  wallet={data.walletB}
                  submitted={submittedB}
                  tone="b"
                  pfpUrl={data.walletB.pfpUrl}
                />
              </div>
            </section>

            {/* ── Taste map ── */}
            <section className="panel compare-section compare-section-compact">
              <div className="compare-section-head">
                <div className="eyebrow">Taste map</div>
                <h2 className="compare-section-title">Where your taste lives</h2>
                <p className="compare-section-text">
                  Not how much you own. How each wallet tends to think.
                </p>
              </div>
              {tasteKeys.length > 0 ? (
                <div className="compare-bars">
                  <div className="compare-bar-legend">
                    <WalletLabel address={submittedA} tone="a" pfpUrl={data.walletA.pfpUrl} />
                    <WalletLabel address={submittedB} tone="b" pfpUrl={data.walletB.pfpUrl} />
                  </div>
                  {tasteKeys.map((key) => {
                    const left = data.walletA.taste[key] || 0;
                    const right = data.walletB.taste[key] || 0;
                    return (
                      <div key={key} className="compare-bar-row">
                        <div className="compare-bar-top">
                          <div className="compare-bar-left compare-mono wallet-a">{left}%</div>
                          <div className="compare-bar-label">{key}</div>
                          <div className="compare-bar-right compare-mono wallet-b">{right}%</div>
                        </div>
                        <div className="compare-bar-track">
                          <div className="compare-bar-side left">
                            <div className="compare-bar-fill" style={{ width: `${Math.max(left, 0)}%` }} />
                          </div>
                          <div className="compare-bar-side right">
                            <div className="compare-bar-fill" style={{ width: `${Math.max(right, 0)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
