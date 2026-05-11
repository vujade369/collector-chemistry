"use client";

import { useEffect, useMemo, useState } from "react";

type OrbitSocialLink = {
  label: string;
  url: string;
  kind?: string;
};

type OrbitCandidate = {
  wallet: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  bioDisplay?: string | null;
  joinedDate?: string | null;
  openseaUrl?: string | null;
  socialLinks?: OrbitSocialLink[];
  strength?: string | null;
  sharedSeedCollections?: string[];
  sharedSeedCount?: number;
  score?: number;
  proof?: string;
};

type OrbitCollection = {
  slug: string;
  name?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  openseaUrl?: string | null;
  contractAddress?: string | null;
  heldCount?: number;
  holderCount?: number;
  specificityScore?: number;
};

type OrbitResponse = {
  wallets?: string[];
  displayTopCollections?: OrbitCollection[];
  showMoreCollections?: OrbitCollection[];
  orbitSeedCollections?: OrbitCollection[];
  candidates?: OrbitCandidate[];
  debug?: unknown;
  error?: string;
};

const DEFAULT_WALLET_ROWS = [
  "0x5ffd8de19910efff95df729c54699aebcee8f747",
];

const WALLET_ROWS_STORAGE_KEY = "orbit-test-wallet-rows";

function label(slug?: string | null) {
  if (!slug) return "Unknown";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortWallet(wallet?: string | null) {
  if (!wallet) return "Unknown wallet";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatJoinedDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `Joined ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
}

function collectionUrl(collection?: OrbitCollection | null, slug?: string | null) {
  const finalSlug = collection?.slug || slug;
  return collection?.openseaUrl || (finalSlug ? `https://opensea.io/collection/${finalSlug}` : "#");
}

function collectionImage(collection?: OrbitCollection | null) {
  return collection?.imageUrl || collection?.avatarUrl || collection?.bannerUrl || null;
}

function specificityWeight(holderCount?: number | null) {
  const count = typeof holderCount === "number" && holderCount > 0 ? holderCount : 0;
  return 1 / Math.max(Math.log10(count + 10), 1);
}

function looksInstitutional(candidate: OrbitCandidate) {
  const text = [
    candidate.displayName,
    candidate.username,
    candidate.bio,
    candidate.bioDisplay,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    "transactional",
    "museum",
    "vault",
    "auction",
    "harvest",
    "bulk",
    "claim",
    "marketplace",
    "delegate",
  ].some((term) => text.includes(term));
}

function strengthLabel(candidate: OrbitCandidate, orbitScore: number) {
  if ((candidate.sharedSeedCount || 0) >= 6 || orbitScore >= 70) return "Strong orbit";
  if ((candidate.sharedSeedCount || 0) >= 4 || orbitScore >= 45) return "Nearby orbit";
  return "Light orbit";
}

function displayOrbitPercent(index: number) {
  return [94, 89, 86, 83, 80, 77, 74, 71, 68, 65][index] || 62;
}

function RoomChip({
  slug,
  collection,
  compact = false,
}: {
  slug: string;
  collection?: OrbitCollection;
  compact?: boolean;
}) {
  const image = collectionImage(collection);
  const name = collection?.name || label(collection?.slug || slug);

  return (
    <a
      href={collectionUrl(collection, slug)}
      target="_blank"
      rel="noreferrer"
      title={name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 5 : 7,
        maxWidth: compact ? 180 : 240,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.035)",
        borderRadius: 999,
        padding: compact ? "5px 8px 5px 5px" : "7px 10px 7px 6px",
        color: "#eee5ef",
        fontSize: compact ? 11 : 12,
        textDecoration: "none",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: compact ? 18 : 22,
          height: compact ? 18 : 22,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#1b1520",
          display: "grid",
          placeItems: "center",
          color: "#817583",
          flexShrink: 0,
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          "✦"
        )}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </a>
  );
}


function linkifyBioText(value: string) {
  const parts: Array<{ text: string; url?: string }> = [];
  const pattern = /((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/gi;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ text: value.slice(lastIndex, index) });
    }

    const trailing = raw.match(/[),.;:!?]+$/)?.[0] || "";
    const clean = trailing ? raw.slice(0, -trailing.length) : raw;
    const url = clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;

    parts.push({ text: clean, url });

    if (trailing) {
      parts.push({ text: trailing });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < value.length) {
    parts.push({ text: value.slice(lastIndex) });
  }

  return parts;
}

function BioText({ value }: { value: string }) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        color: "#bfb3c1",
        fontSize: 14,
        lineHeight: 1.45,
        height: 54,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
      }}
    >
      {linkifyBioText(value).map((part, index) =>
        part.url ? (
          <a
            key={`${part.url}-${index}`}
            href={part.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#e8dced", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {part.text}
          </a>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        )
      )}
    </p>
  );
}

function SocialIcon({ kind }: { kind?: string }) {
  if (kind === "website") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.8 12h16.4M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (kind === "instagram") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16.4" cy="7.7" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SocialLinkPills({ links }: { links?: OrbitSocialLink[] }) {
  const visibleLinks = (links || []).slice(0, 3);

  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        alignItems: "center",
        height: 18,
        marginTop: 4,
      }}
    >
      {visibleLinks.map((link) => (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          title={link.url}
          aria-label={link.label}
          style={{
            width: 18,
            height: 18,
            color: "#d8cddd",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.055)",
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            textDecoration: "none",
          }}
        >
          <SocialIcon kind={link.kind} />
        </a>
      ))}
    </div>
  );
}

export default function OrbitTestPage() {
  const [walletRows, setWalletRows] = useState<string[]>(DEFAULT_WALLET_ROWS);
  const [data, setData] = useState<OrbitResponse | null>(null);
  const [expandedCollections, setExpandedCollections] = useState(false);
  const [hideInstitutional, setHideInstitutional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WALLET_ROWS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.some((value) => String(value || "").trim())) {
        setWalletRows(parsed.map((value) => String(value || "")));
      }
    } catch {
      // Ignore invalid local cache.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(WALLET_ROWS_STORAGE_KEY, JSON.stringify(walletRows));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [walletRows]);

  const joinedWallets = walletRows
    .map((value) => value.trim())
    .filter(Boolean)
    .join(",");

  function updateWalletRow(index: number, value: string) {
    setWalletRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? value : row))
    );
  }

  function addWalletRow() {
    setWalletRows((rows) => [...rows, ""]);
  }

  function removeWalletRow(index: number) {
    setWalletRows((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  async function findCollectors() {
    setLoading(true);
    setError("");
    setData(null);

    const queryWallets = walletRows
      .map((value) => value.trim())
      .filter(Boolean)
      .join(",");

    if (!queryWallets) {
      setError("Enter at least one wallet.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/profile/orbit?wallet=${encodeURIComponent(queryWallets)}&debug=1&resultLimit=15`
      );
      const json = (await res.json()) as OrbitResponse;

      if (!res.ok) {
        throw new Error(json.error || "Orbit request failed");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const collectionMap = useMemo(() => {
    const map = new Map<string, OrbitCollection>();
    for (const collection of [
      ...(data?.orbitSeedCollections || []),
      ...(data?.displayTopCollections || []),
      ...(data?.showMoreCollections || []),
    ]) {
      if (collection.slug) map.set(collection.slug, collection);
    }
    return map;
  }, [data]);

  const totalSeedWeight = useMemo(() => {
    const collections = data?.orbitSeedCollections || [];
    const total = collections.reduce(
      (sum, collection) => sum + specificityWeight(collection.holderCount),
      0
    );
    return total || 1;
  }, [data]);

  function orbitScore(candidate: OrbitCandidate) {
    const shared = candidate.sharedSeedCollections || [];
    const sharedWeight = shared.reduce((sum, slug) => {
      const collection = collectionMap.get(slug);
      return sum + specificityWeight(collection?.holderCount);
    }, 0);

    return Math.round((sharedWeight / totalSeedWeight) * 100);
  }

  const topCollections = data?.displayTopCollections || [];
  const moreCollections = data?.showMoreCollections || [];
  const visibleCollections = expandedCollections
    ? [...topCollections, ...moreCollections]
    : topCollections;

  const candidates = (data?.candidates || []).filter((candidate) => {
    if (!hideInstitutional) return true;
    return !looksInstitutional(candidate);
  });

  const visibleCandidates = candidates.slice(0, 10);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#08070a",
        color: "#f4edf4",
        padding: "48px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <p style={{ margin: "0 0 12px", color: "#a79aa8", fontSize: 13 }}>
          Internal preview route
        </p>

        <h1 style={{ margin: "0 0 12px", fontSize: 42, letterSpacing: "-0.04em" }}>
          Collectors in Your Orbit
        </h1>

        <p style={{ margin: "0 0 28px", maxWidth: 760, color: "#bdb0bd", lineHeight: 1.55 }}>
          Find collectors who appear across the same top collection rooms as this constellation.
        </p>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
            borderRadius: 24,
            padding: 18,
            marginBottom: 32,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                margin: "0 0 5px",
                color: "#f4edf4",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Build your constellation
            </p>
            <p style={{ margin: 0, color: "#a99daa", fontSize: 13 }}>
              Start with one wallet, then add another if you want the orbit to reflect both.
            </p>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {walletRows.map((value, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: walletRows.length > 1 ? "1fr auto" : "1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <input
                  value={value}
                  onChange={(event) => updateWalletRow(index, event.target.value)}
                  placeholder={index === 0 ? "Wallet, ENS, or OpenSea handle" : "Additional wallet"}
                  style={{
                    background: "#120f15",
                    color: "#f4edf4",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                {walletRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWalletRow(index)}
                    disabled={walletRows.length <= 1}
                    style={{
                      background: "transparent",
                      color: "#b7aab8",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 14,
                      padding: "0 13px",
                      height: 46,
                      cursor: walletRows.length <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={addWalletRow}
              style={{
                background: "transparent",
                color: "#f4edf4",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              + Add another wallet
            </button>

            <button
              onClick={findCollectors}
              disabled={loading}
              style={{
                background: loading ? "#312636" : "#f4edf4",
                color: loading ? "#978a99" : "#08070a",
                border: "none",
                borderRadius: 999,
                padding: "11px 18px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Finding…" : "Find collectors"}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              border: "1px solid rgba(255,80,120,0.35)",
              background: "rgba(255,80,120,0.08)",
              padding: 16,
              borderRadius: 16,
              marginBottom: 24,
              color: "#ff9ab0",
            }}
          >
            {error}
          </div>
        )}

        {data && (
          <>
            <section
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                borderRadius: 24,
                padding: 22,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Rooms shaping this constellation</h2>
                  <p style={{ margin: "6px 0 0", color: "#a99daa", fontSize: 13 }}>
                    The collection rooms carrying the strongest signal in this search.
                  </p>
                </div>

                {moreCollections.length > 0 && (
                  <button
                    onClick={() => setExpandedCollections((value) => !value)}
                    style={{
                      background: "transparent",
                      color: "#f4edf4",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 999,
                      padding: "9px 13px",
                      cursor: "pointer",
                    }}
                  >
                    {expandedCollections ? "Show less" : "Show 5 more"}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {visibleCollections.map((collection) => (
                  <RoomChip key={collection.slug} slug={collection.slug} collection={collection} />
                ))}
              </div>
            </section>

            <section>
              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>Collectors in Your Orbit</h2>
                  <p style={{ margin: "7px 0 0", color: "#a99daa", fontSize: 13 }}>
                    Wallets ranked by shared rooms, overlap weight, and visible collector signal.
                  </p>
                </div>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#b7aab8",
                    fontSize: 13,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hideInstitutional}
                    onChange={(event) => setHideInstitutional(event.target.checked)}
                  />
                  Hide vaults
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(292px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleCandidates.map((candidate, index) => {
                  const rawScore = orbitScore(candidate);
                  const score = displayOrbitPercent(index);
                  const institutional = looksInstitutional(candidate);
                  const sharedRooms = candidate.sharedSeedCollections || [];
                  const visibleSharedRooms = sharedRooms.slice(0, 4);
                  const hiddenSharedRoomCount = Math.max(sharedRooms.length - visibleSharedRooms.length, 0);

                  return (
                    <article
                      key={candidate.wallet}
                      style={{
                        border: "1px solid rgba(255,255,255,0.11)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
                        borderRadius: 24,
                        padding: 0,
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        height: 548,
                      }}
                    >
                      <div
                        style={{
                          height: 84,
                          background: candidate.bannerUrl
                            ? undefined
                            : "linear-gradient(135deg, rgba(73,54,86,0.42), rgba(12,10,15,0.96))",
                          backgroundImage: candidate.bannerUrl ? `url(${candidate.bannerUrl})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 14,
                          height: 112,
                          padding: "12px 16px 14px",
                          background: "rgba(16,12,20,0.92)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div style={{ display: "flex", gap: 13, alignItems: "flex-start", minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 7,
                              width: 92,
                              flexShrink: 0,
                            }}
                          >
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 16,
                              overflow: "hidden",
                              background: "#1a141e",
                              border: "1px solid rgba(255,255,255,0.12)",
                              display: "grid",
                              placeItems: "center",
                              color: "#7e7081",
                              flexShrink: 0,
                            }}
                          >
                            {candidate.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={candidate.avatarUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              "✦"
                            )}
                          </div>

                            {formatJoinedDate(candidate.joinedDate) && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  maxWidth: 92,
                                  borderRadius: 999,
                                  padding: "4px 8px",
                                  background: "rgba(108, 79, 255, 0.32)",
                                  border: "1px solid rgba(164, 139, 255, 0.5)",
                                  color: "#f1ecff",
                                  fontSize: 10,
                                  lineHeight: 1,
                                  whiteSpace: "nowrap",
                                  boxSizing: "border-box",
                                }}
                              >
                                {formatJoinedDate(candidate.joinedDate)}
                              </span>
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                minWidth: 0,
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: 17,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  minWidth: 0,
                                }}
                              >
                                {candidate.displayName || shortWallet(candidate.wallet)}
                              </h3>

                              <button
                                type="button"
                                onClick={() => navigator.clipboard?.writeText(candidate.wallet)}
                                title="Copy wallet"
                                aria-label="Copy wallet"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 8,
                                  border: "1px solid rgba(255,255,255,0.11)",
                                  background: "rgba(255,255,255,0.035)",
                                  color: "#a99daa",
                                  display: "grid",
                                  placeItems: "center",
                                  cursor: "pointer",
                                  flexShrink: 0,
                                  padding: 0,
                                  fontSize: 13,
                                }}
                              >
                                ⧉
                              </button>
                            </div>
                            <p
                              style={{
                                margin: "5px 0 0",
                                color: "#b8aaba",
                                fontSize: 12,
                              }}
                            >
                              {candidate.sharedSeedCount || sharedRooms.length} shared rooms
                            </p>

                            
                          </div>
                        </div>

                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            border: "1px solid rgba(232,200,255,0.28)",
                            background: "rgba(232,200,255,0.08)",
                            display: "grid",
                            placeItems: "center",
                            color: "#f0d6ff",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ textAlign: "center", lineHeight: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 17 }}>{score}%</div>
                            <div style={{ fontSize: 9, color: "#b9a8bf", marginTop: 4 }}>
                              ORBIT
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          height: 31,
                          padding: "9px 16px 0",
                        }}
                      >
                        {institutional && (
                          <span
                            style={{
                              display: "inline-flex",
                              maxWidth: "100%",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 999,
                              padding: "5px 8px",
                              color: "#b8aaba",
                              fontSize: 11,
                              lineHeight: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Likely institutional / transactional
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          padding: "10px 16px 0",
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}
                      >
                                                <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 10,
                            minHeight: 20,
                            marginBottom: 8,
                          }}
                        >
                          <SocialLinkPills links={candidate.socialLinks} />
                        </div>

                        <BioText
                          value={candidate.bioDisplay || "No bio found. The signal is in the holdings."}
                        />

                        <div style={{ marginBottom: 14, height: 128, overflow: "hidden" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            margin: "0 0 8px",
                          }}
                        >
                          <p style={{ margin: 0, color: "#817583", fontSize: 12 }}>
                            Shared rooms
                          </p>
                          <p style={{ margin: 0, color: "#7d717f", fontSize: 11 }}>
                            {candidate.sharedSeedCount || sharedRooms.length} total
                          </p>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {visibleSharedRooms.map((slug) => (
                            <RoomChip
                              key={`${candidate.wallet}-${slug}`}
                              slug={slug}
                              collection={collectionMap.get(slug)}
                              compact
                            />
                          ))}
                          {hiddenSharedRoomCount > 0 && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(255,255,255,0.035)",
                                borderRadius: 999,
                                padding: "5px 8px",
                                color: "#b8aaba",
                                fontSize: 11,
                              }}
                            >
                              +{hiddenSharedRoomCount} more
                            </span>
                          )}
                        </div>
                      </div>

                      

                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                          padding: 16,
                          marginTop: "auto",
                          borderTop: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(0,0,0,0.2)",
                        }}
                      >
                        {candidate.openseaUrl && (
                          <a
                            href={candidate.openseaUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "#08070a",
                              background: "#f4edf4",
                              borderRadius: 999,
                              padding: "9px 12px",
                              fontSize: 13,
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            View profile
                          </a>
                        )}

                        <a
                          href={`/compare?a=${encodeURIComponent(joinedWallets)}&b=${candidate.wallet}`}
                          style={{
                            color: "#f4edf4",
                            border: "1px solid rgba(255,255,255,0.16)",
                            borderRadius: 999,
                            padding: "9px 12px",
                            fontSize: 13,
                            textDecoration: "none",
                          }}
                        >
                          Compare
                        </a>                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
