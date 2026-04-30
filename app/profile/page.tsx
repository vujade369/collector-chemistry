"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./profile.css";

type TopCollection = {
  name: string;
  count: number;
  percentage?: number;
};

type CategoryRow = {
  category: string;
  percentage: number;
  count: number;
};

type WalletProfile = {
  patternLine?: string;
  identityParagraph?: string;
  coreInsight?: string;
  tensionInsight?: string;
  whatStandsOut?: string;
  behavioralReads?: string[];
  collectorIdentityLabel?: string;
  anchorCollection?: { name: string; count: number } | null;
  topCollections?: TopCollection[];
  categoryDistribution?: CategoryRow[];
  totalNFTs?: number;
  focusLabel?: "Focused" | "Balanced" | "Explorer";
  dominantCategory?: string;
  secondaryCategory?: string;
};

type ProfileResponse = {
  wallet: string;
  profile?: WalletProfile;
};

function isValidInput(value: string): boolean {
  const trimmed = value.trim();
  const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isEns = trimmed.endsWith(".eth");
  return isEthAddress || isEns;
}

function shortenAddress(value: string): string {
  if (!value) return "";
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function toDisplayName(wallet: string): string {
  const trimmed = wallet.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(".eth")) return trimmed;
  return shortenAddress(trimmed);
}

function toTitleCase(value: string): string {
  return value
    .split("_")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const walletFromQuery = (searchParams.get("wallet") || "").trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProfileResponse | null>(null);
  const [compareWallet, setCompareWallet] = useState("");

  useEffect(() => {
    async function load() {
      if (!walletFromQuery || !isValidInput(walletFromQuery)) {
        setError("Nothing found for this wallet.");
        setResult(null);
        return;
      }

      setLoading(true);
      setError("");
      setResult(null);

      try {
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(walletFromQuery)}`);
        const json = (await res.json()) as ProfileResponse | { error?: string };

        if (!res.ok || !("profile" in json) || !json.profile) {
          setError("Nothing found for this wallet.");
          setResult(null);
          return;
        }

        setResult(json as ProfileResponse);
      } catch {
        setError("Nothing found for this wallet.");
        setResult(null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [walletFromQuery]);

  const profile = result?.profile || null;
  const resolvedWallet = result?.wallet || walletFromQuery;
  const displayName = useMemo(() => toDisplayName(resolvedWallet), [resolvedWallet]);

  const behavioralReads = useMemo(
    () => (profile?.behavioralReads || []).filter(Boolean).slice(0, 3),
    [profile?.behavioralReads]
  );

  const returnPattern = useMemo(() => {
    if (!profile) return null;
    if (profile.anchorCollection?.name && profile.anchorCollection?.count) {
      return { name: profile.anchorCollection.name, count: profile.anchorCollection.count };
    }
    const fallback = (profile.topCollections || [])[0];
    if (fallback?.name && fallback?.count) {
      return { name: fallback.name, count: fallback.count };
    }
    return null;
  }, [profile]);

  const tasteRows = useMemo(
    () =>
      (profile?.categoryDistribution || [])
        .filter((row) => row && typeof row.percentage === "number")
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5),
    [profile?.categoryDistribution]
  );

  const canCompare = isValidInput(compareWallet);

  function handleCompareSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canCompare) return;
    router.push(
      `/compare?a=${encodeURIComponent(walletFromQuery)}&b=${encodeURIComponent(compareWallet.trim())}`
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-shell">
        {loading ? (
          <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="profile-eyebrow">Reading your wallet...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "14px", color: "#666" }}>
              Nothing found for this wallet.{" "}
              <button
                style={{ textDecoration: "underline", color: "#a8a49d" }}
                onClick={() => router.push("/")}
                type="button"
              >
                Try another wallet
              </button>
            </p>
          </div>
        ) : null}

        {!loading && !error && profile ? (
          <>
            <header className="profile-header">
              <p className="profile-eyebrow">Collector profile</p>
              <h1 className="profile-display-name">{displayName}</h1>
              <p className="profile-address">{resolvedWallet}</p>
            </header>

            {profile.patternLine || profile.identityParagraph ? (
              <section style={{ display: "grid", gap: "20px" }}>
                {profile.patternLine ? (
                  <p className="profile-pattern-line">{profile.patternLine}</p>
                ) : null}
                {profile.identityParagraph ? (
                  <p className="profile-identity-paragraph">{profile.identityParagraph}</p>
                ) : null}
              </section>
            ) : null}

            {behavioralReads.length > 0 ? (
              <div className="profile-reads">
                {behavioralReads.map((read, idx) => (
                  <span key={`${read}-${idx}`} className="profile-read-tag">{read}</span>
                ))}
              </div>
            ) : null}

            {returnPattern ? (
              <div className="profile-panel">
                <p className="profile-section-label">Return Pattern</p>
                <p className="profile-return-name">{returnPattern.name}</p>
                <p className="profile-return-count">returned to {returnPattern.count} {returnPattern.count === 1 ? "time" : "times"}</p>
              </div>
            ) : null}

            {tasteRows.length > 0 ? (
              <div className="profile-panel">
                <p className="profile-section-label">Taste map</p>
                <div style={{ display: "grid", gap: "14px" }}>
                  {tasteRows.map((row) => {
                    const pct = Math.max(0, Math.min(100, Math.round(row.percentage)));
                    return (
                      <div key={row.category} className="profile-taste-row">
                        <div className="profile-taste-label-row">
                          <span className="profile-taste-label">{toTitleCase(row.category)}</span>
                          <span className="profile-taste-pct">{pct}%</span>
                        </div>
                        <div className="profile-taste-track">
                          <div className="profile-taste-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {profile.whatStandsOut ? (
              <p className="profile-standout">{profile.whatStandsOut}</p>
            ) : null}

            <section className="profile-compare-section">
              <div style={{ display: "grid", gap: "6px" }}>
                <p className="profile-compare-title">See who stopped in the same places.</p>
                <p className="profile-compare-sub">Add another wallet to see where your taste overlaps.</p>
              </div>
              <form style={{ display: "grid", gap: "12px", maxWidth: "480px" }} onSubmit={handleCompareSubmit}>
                <input
                  type="text"
                  value={compareWallet}
                  onChange={(e) => setCompareWallet(e.target.value)}
                  placeholder="Second wallet address or ENS"
                  className="profile-input"
                />
                <button
                  type="submit"
                  disabled={!canCompare}
                  className="profile-btn-primary"
                >
                  Compare
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
