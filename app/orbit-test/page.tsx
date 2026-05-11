"use client";

import { useState } from "react";

type OrbitCandidate = {
  wallet: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bioDisplay?: string | null;
  openseaUrl?: string | null;
  strength?: string | null;
  sharedSeedCollections?: string[];
  sharedSeedCount?: number;
  score?: number;
  proof?: string;
};

type OrbitCollection = {
  slug: string;
  name?: string | null;
  heldCount?: number;
  holderCount?: number;
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

const DEFAULT_WALLETS =
  "0x5ffd8de19910efff95df729c54699aebcee8f747,0x16f3d833bb91aebb5066884501242d8b3c3b5e61";

function label(slug?: string | null) {
  if (!slug) return "Unknown";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OrbitTestPage() {
  const [wallet, setWallet] = useState(DEFAULT_WALLETS);
  const [data, setData] = useState<OrbitResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findCollectors() {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`/api/profile/orbit?wallet=${encodeURIComponent(wallet)}&debug=1`);
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

  const topCollections = data?.displayTopCollections || [];
  const moreCollections = data?.showMoreCollections || [];
  const visibleCollections = expanded ? [...topCollections, ...moreCollections] : topCollections;

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
      <section style={{ maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ margin: "0 0 12px", color: "#a79aa8", fontSize: 13 }}>
          Internal preview route
        </p>

        <h1 style={{ margin: "0 0 12px", fontSize: 42, letterSpacing: "-0.04em" }}>
          Collectors in Your Orbit
        </h1>

        <p style={{ margin: "0 0 28px", maxWidth: 680, color: "#bdb0bd", lineHeight: 1.55 }}>
          Wallets that appear across the same top collection rooms as this constellation.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <input
            value={wallet}
            onChange={(event) => setWallet(event.target.value)}
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

          <button
            onClick={findCollectors}
            disabled={loading}
            style={{
              background: loading ? "#312636" : "#f4edf4",
              color: loading ? "#978a99" : "#08070a",
              border: "none",
              borderRadius: 14,
              padding: "0 20px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Finding…" : "Find collectors"}
          </button>
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
                  <h2 style={{ margin: 0, fontSize: 20 }}>Top Collection Rooms</h2>
                  <p style={{ margin: "6px 0 0", color: "#a99daa", fontSize: 13 }}>
                    The first five stay visible. The next five are available as deeper context.
                  </p>
                </div>

                {moreCollections.length > 0 && (
                  <button
                    onClick={() => setExpanded((value) => !value)}
                    style={{
                      background: "transparent",
                      color: "#f4edf4",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 999,
                      padding: "9px 13px",
                      cursor: "pointer",
                    }}
                  >
                    {expanded ? "Show less" : "Show 5 more"}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {visibleCollections.map((collection) => (
                  <div
                    key={collection.slug}
                    style={{
                      border: "1px solid rgba(255,255,255,0.11)",
                      background: "#100d13",
                      borderRadius: 999,
                      padding: "9px 12px",
                      color: "#ded4df",
                      fontSize: 13,
                    }}
                  >
                    {label(collection.name || collection.slug)}
                    {typeof collection.heldCount === "number" && (
                      <span style={{ color: "#867988", marginLeft: 7 }}>
                        {collection.heldCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ margin: "0 0 16px", fontSize: 24 }}>Nearby Collectors</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {(data.candidates || []).slice(0, 5).map((candidate) => (
                  <article
                    key={candidate.wallet}
                    style={{
                      border: "1px solid rgba(255,255,255,0.11)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
                      borderRadius: 24,
                      padding: 18,
                    }}
                  >
                    <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
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

                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 17,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {candidate.displayName || candidate.wallet}
                        </h3>
                        <p
                          style={{
                            margin: "5px 0 0",
                            color: candidate.strength === "strong" ? "#e8c8ff" : "#b8aaba",
                            fontSize: 13,
                            textTransform: "capitalize",
                          }}
                        >
                          {candidate.strength || "nearby"} orbit
                        </p>
                      </div>
                    </div>

                    <p
                      style={{
                        margin: "16px 0",
                        color: "#bfb3c1",
                        fontSize: 14,
                        lineHeight: 1.45,
                        minHeight: 40,
                      }}
                    >
                      {candidate.bioDisplay || "No bio found. The signal is in the holdings."}
                    </p>

                    <div style={{ marginBottom: 14 }}>
                      <p style={{ margin: "0 0 8px", color: "#817583", fontSize: 12 }}>
                        Shared rooms
                      </p>
                      <p style={{ margin: 0, color: "#f1e8f2", fontSize: 13, lineHeight: 1.45 }}>
                        {(candidate.sharedSeedCollections || []).map(label).join(" · ")}
                      </p>
                    </div>

                    <p style={{ margin: "0 0 16px", color: "#9e91a1", fontSize: 13 }}>
                      {candidate.proof}
                    </p>

                    <div style={{ display: "flex", gap: 10 }}>
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
                        href={`/compare?a=${encodeURIComponent(wallet)}&b=${candidate.wallet}`}
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
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
