// app/compare/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
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
  return (
    nft?.displayCollectionName ||
    nft?.contractMetadata?.name ||
    nft?.contract?.name ||
    "Unknown collection"
  );
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

  const dateA = nft.acquiredDateA || "Date not available";
  const dateB = nft.acquiredDateB || "Date not available";

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
        <div className="compare-acquired-row compare-mono">
          <div className="compare-acquired-item">
            <span className="compare-acquired-label">{labelA}</span>
            <span className="compare-acquired-date">Acquired {dateA}</span>
          </div>
          <div className="compare-acquired-item">
            <span className="compare-acquired-label">{labelB}</span>
            <span className="compare-acquired-date">Acquired {dateB}</span>
          </div>
        </div>
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
  label,
  wallet,
  submitted,
  tone,
}: {
  label: string;
  wallet: WalletSummary;
  submitted: string;
  tone: "a" | "b";
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
          <div className="eyebrow">{label}</div>
          <h3 className="compare-profile-archetype">{wallet.profile.archetype}</h3>
          <p className="compare-profile-line">{wallet.profile.profileLine}</p>
        </div>
        <div className="compare-profile-level">
          <span className="compare-profile-level-label">Level</span>
          <span className="compare-profile-level-value compare-mono">
            {wallet.profile.level}
          </span>
        </div>
      </div>

      <div className="compare-profile-identity">
        <div className="compare-profile-address-label">{shortenAddress(submitted)}</div>
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
            <div className="compare-profile-piece-title truncate-2">
              {topCollection.name}
            </div>
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

function scoreLabel(score: number) {
  if (score < 25) return "Very different";
  if (score < 50) return "Some overlap";
  if (score < 75) return "Shared taste";
  return "Strong alignment";
}

function buildDivergenceLines(
  tasteA: Record<string, number>,
  tasteB: Record<string, number>,
  labelA: string,
  labelB: string
) {
  const keys = new Set([...Object.keys(tasteA || {}), ...Object.keys(tasteB || {})]);
  const ranked = [...keys]
    .map((key) => {
      const left = tasteA?.[key] || 0;
      const right = tasteB?.[key] || 0;
      return { key, left, right, diff: Math.abs(left - right) };
    })
    .filter((item) => item.diff >= 8)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  return ranked.map((item) => {
    if (item.left > item.right) {
      return `${labelA} leans ${item.key.toLowerCase()}, while ${labelB} gives less weight there.`;
    }
    return `${labelB} leans ${item.key.toLowerCase()}, while ${labelA} gives less weight there.`;
  });
}

export default function ComparePage() {
  const [walletA, setWalletA] = useState("");
  const [walletB, setWalletB] = useState("");
  const [submittedA, setSubmittedA] = useState("");
  const [submittedB, setSubmittedB] = useState("");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const divergenceLines = useMemo(() => {
    if (!data) return [];
    return buildDivergenceLines(
      data.walletA.taste,
      data.walletB.taste,
      "Wallet one",
      "Wallet two"
    );
  }, [data]);

  const [showMoreCollections, setShowMoreCollections] = useState(false);
  const [showMoreArtists, setShowMoreArtists] = useState(false);

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

    try {
      setLoading(true);
      setError("");
      setData(null);

      const url = `/api/compare?walletA=${encodeURIComponent(walletA.trim())}&walletB=${encodeURIComponent(walletB.trim())}`;
      const res = await fetch(url);
      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`API returned non-JSON response: ${text.slice(0, 120)}`);
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Something went wrong.");
      }

      setData(json);
      setSubmittedA(walletA.trim());
      setSubmittedB(walletB.trim());
      setShowMoreCollections(false);
      setShowMoreArtists(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to compare wallets.";
      setError(message);
    } finally {
      setLoading(false);
    }
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

  return (
    <main className="compare-page">
      <div className="page-shell stack-lg">
        <section className="compare-hero">
          <div className="compare-hero-copy">
            <div className="eyebrow">Collector Chemistry</div>
            <h1 className="title-xl compare-hero-title">
              What you collect is a reflection of you.
            </h1>
            <p className="compare-hero-text">
              For the first time, that reflection is visible. Compare two wallets to
              see where taste, curiosity, and identity start to overlap.
            </p>
          </div>

          <div className="accent-rule" />

          <form className="compare-form" onSubmit={runCompare}>
            <div className="compare-inputs">
              <div className="compare-input-wrap">
                <label className="compare-label" htmlFor="walletA">Wallet one</label>
                <input
                  id="walletA"
                  className="input"
                  placeholder="0x... or ENS"
                  value={walletA}
                  onChange={(e) => setWalletA(e.target.value)}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="compare-input-wrap">
                <label className="compare-label" htmlFor="walletB">Wallet two</label>
                <input
                  id="walletB"
                  className="input"
                  placeholder="0x... or ENS"
                  value={walletB}
                  onChange={(e) => setWalletB(e.target.value)}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="compare-actions">
              <button type="submit" className="btn compare-btn-primary">
                {loading ? "Comparing..." : "Compare wallets"}
              </button>
              <button type="button" className="btn compare-btn-secondary" onClick={resetAll}>
                Reset
              </button>
            </div>

            <p className="compare-note">Enter an Ethereum wallet or ENS name.</p>
          </form>
        </section>

        {loading && (
          <div className="compare-loading">
            Pulling holdings, mapping overlap, and scoring chemistry...
          </div>
        )}

        {error && <div className="compare-error">{error}</div>}

        {data && (
          <div className="compare-results">

            {/* ── Identity pair — first thing eyes land on ── */}
            <section className="panel compare-relationship-summary">
              <div className="compare-identity-pair">
                <div className="compare-identity-item compare-identity-a">
                  <div className="compare-identity-address compare-mono">
                    {shortenAddress(submittedA)}
                  </div>
                  <div className="compare-identity-label">
                    {data.walletA.profile.collectorIdentityLabel}
                  </div>
                </div>
                <div className="compare-identity-divider">vs</div>
                <div className="compare-identity-item compare-identity-b">
                  <div className="compare-identity-address compare-mono">
                    {shortenAddress(submittedB)}
                  </div>
                  <div className="compare-identity-label">
                    {data.walletB.profile.collectorIdentityLabel}
                  </div>
                </div>
              </div>

              <p className="compare-pair-connective">
                {data.scoring.pairInterpretation.headline}
              </p>

              <div className="compare-relationship-meta">
                <div className="compare-relationship-score">
                  <div className="compare-chemistry-value compare-mono">
                    {data.scoring.chemistryScore}
                  </div>
                  <div className="compare-chemistry-label">
                    {scoreLabel(data.scoring.chemistryScore)}
                  </div>
                </div>
                <ul className="compare-relationship-bullets">
                  <li>Shared collections: {sharedCollections.length}</li>
                  <li>Shared artists: {sharedArtists.length}</li>
                  {exactCount > 0 ? <li>Exact same NFTs: {exactCount}</li> : null}
                </ul>
              </div>

              <p className="compare-relationship-interpretation">
                {data.scoring.pairInterpretation.summary}
              </p>
            </section>

            {/* ── Overlap proof ── */}
            <section className="panel compare-section compare-overlap-proof">
              <div className="compare-section-head">
                <div className="eyebrow">Overlap proof</div>
                <h2 className="compare-section-title">Where your overlap becomes visible</h2>
              </div>
              <ScoreBreakdownBars breakdown={data.scoring.breakdown} />
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
                  {sharedExact.slice(0, 8).map((nft) => {
                    const key = `${nft.contract.address}-${nft.tokenId}`;
                    return (
                      <SpotlightCard
                        key={key}
                        nft={nft}
                        submittedA={submittedA}
                        submittedB={submittedB}
                      />
                    );
                  })}
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
                    .map(([name, bucket]) => (
                      <article key={name} className="panel-subtle compare-group-card">
                        <div className="compare-group-head">
                          <div className="compare-group-title-wrap">
                            <h3 className="compare-group-title">{name}</h3>
                            <div className="compare-group-entry-dates compare-mono">
                              <span>
                                {shortenAddress(submittedA)} entered{" "}
                                <strong>{bucket.enteredDateA || "Date not available"}</strong>
                              </span>
                              <span className="compare-entry-divider">·</span>
                              <span>
                                {shortenAddress(submittedB)} entered{" "}
                                <strong>{bucket.enteredDateB || "Date not available"}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="compare-group-columns">
                          <div className="compare-column compare-column-a">
                            <div className="compare-column-head">
                              <div className="compare-column-title">
                                Wallet one
                                <span className="compare-column-address">
                                  {shortenAddress(submittedA)}
                                </span>
                              </div>
                              <div className="compare-column-meta compare-mono">
                                {bucket.walletA.length} shown · {bucket.walletACount} total
                              </div>
                            </div>
                            {bucket.walletA.length > 0 ? (
                              <>
                                <div className="compare-nft-grid">
                                  {bucket.walletA.map((nft) => (
                                    <NFTCard
                                      key={`${nft.contract.address}-${nft.tokenId}-a`}
                                      nft={nft}
                                      walletTone="a"
                                    />
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
                              <div className="compare-column-title">
                                Wallet two
                                <span className="compare-column-address">
                                  {shortenAddress(submittedB)}
                                </span>
                              </div>
                              <div className="compare-column-meta compare-mono">
                                {bucket.walletB.length} shown · {bucket.walletBCount} total
                              </div>
                            </div>
                            {bucket.walletB.length > 0 ? (
                              <>
                                <div className="compare-nft-grid">
                                  {bucket.walletB.map((nft) => (
                                    <NFTCard
                                      key={`${nft.contract.address}-${nft.tokenId}-b`}
                                      nft={nft}
                                      walletTone="b"
                                    />
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
                {sharedCollections.length > 3 ? (
                  <button
                    type="button"
                    className="btn compare-btn-secondary compare-show-more"
                    onClick={() => setShowMoreCollections((value) => !value)}
                  >
                    {showMoreCollections ? "Show less" : `Show more (${sharedCollections.length - 3})`}
                  </button>
                ) : null}
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
                              <div className="compare-column-title">
                                Wallet one
                                <span className="compare-column-address">
                                  {shortenAddress(submittedA)}
                                </span>
                              </div>
                              <div className="compare-column-meta compare-mono">
                                {bucket.walletA.length} shown · {bucket.walletACount} total
                              </div>
                            </div>
                            {bucket.walletA.length > 0 ? (
                              <>
                                <div className="compare-nft-grid">
                                  {bucket.walletA.map((nft) => (
                                    <NFTCard
                                      key={`${nft.contract.address}-${nft.tokenId}-artist-a`}
                                      nft={nft}
                                      walletTone="a"
                                    />
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
                              <div className="compare-column-title">
                                Wallet two
                                <span className="compare-column-address">
                                  {shortenAddress(submittedB)}
                                </span>
                              </div>
                              <div className="compare-column-meta compare-mono">
                                {bucket.walletB.length} shown · {bucket.walletBCount} total
                              </div>
                            </div>
                            {bucket.walletB.length > 0 ? (
                              <>
                                <div className="compare-nft-grid">
                                  {bucket.walletB.map((nft) => (
                                    <NFTCard
                                      key={`${nft.contract.address}-${nft.tokenId}-artist-b`}
                                      nft={nft}
                                      walletTone="b"
                                    />
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
                {sharedArtists.length > 3 ? (
                  <button
                    type="button"
                    className="btn compare-btn-secondary compare-show-more"
                    onClick={() => setShowMoreArtists((value) => !value)}
                  >
                    {showMoreArtists ? "Show less" : `Show more (${sharedArtists.length - 3})`}
                  </button>
                ) : null}
              </section>
            )}

            {/* ── Where paths split ── */}
            <section className="panel compare-section">
              <div className="compare-section-head">
                <div className="eyebrow">Where you diverge</div>
                <h2 className="compare-section-title">Where your paths split</h2>
              </div>
              <div className="compare-divergence-list">
                {divergenceLines.map((line) => (
                  <p key={line} className="compare-divergence-item">
                    {line}
                  </p>
                ))}
                {divergenceLines.length === 0 ? (
                  <div className="compare-empty">
                    Differences are subtle. Both wallets distribute taste in a similar way.
                  </div>
                ) : null}
              </div>
            </section>

            {/* ── Collector profiles ── */}
            <section className="compare-overview">
              <div className="compare-overview-grid">
                <article className="panel compare-wallet-card wallet-tone-a">
                  <div className="compare-wallet-top">
                    <div className="compare-wallet-id">
                      <div className="eyebrow">Wallet one</div>
                      <div className="compare-wallet-name">{shortenAddress(submittedA)}</div>
                      <div className="compare-wallet-address">{submittedA}</div>
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
                      <div className="eyebrow">Wallet two</div>
                      <div className="compare-wallet-name">{shortenAddress(submittedB)}</div>
                      <div className="compare-wallet-address">{submittedB}</div>
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
                  label="Collector profile"
                  wallet={data.walletA}
                  submitted={submittedA}
                  tone="a"
                />
                <CollectorProfileCard
                  label="Collector profile"
                  wallet={data.walletB}
                  submitted={submittedB}
                  tone="b"
                />
              </div>
            </section>

            {/* ── Taste map ── */}
            <section className="panel compare-section compare-section-compact">
              <div className="compare-section-head">
                <div className="eyebrow">Taste map</div>
                <h2 className="compare-section-title">Where your taste lives</h2>
                <p className="compare-section-text">Not how much you own. How each wallet tends to think.</p>
              </div>

              {tasteKeys.length > 0 ? (
                <div className="compare-bars">
                  <div className="compare-bar-legend">
                    <span className="wallet-a">Wallet one</span>
                    <span className="wallet-b">Wallet two</span>
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
