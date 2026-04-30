"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./profile.css";

type TopCollection = {
  name: string;
  count: number;
  percentage?: number;
  imageUrl?: string;
  previewImages?: string[];
  source?: "collection" | "artist";
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
  anchorCollection?: { name: string; count: number; imageUrl?: string } | null;
  topCollections?: TopCollection[];
  categoryDistribution?: CategoryRow[];
  totalNFTs?: number;
  focusLabel?: "Focused" | "Balanced" | "Explorer";
  dominantCategory?: string;
  secondaryCategory?: string;
  signalPiece?: {
    collectionName?: string;
    imageUrl?: string;
  } | null;
  firstMint?: {
    nft?: {
      imageUrl?: string;
      title?: string;
      collectionName?: string;
    };
    timestamp?: string;
  } | null;
  acquisitionBreakdown?: {
    mintCount: number;
    acquiredCount: number;
    totalSampled: number;
    mintPercent: number;
    acquiredPercent: number;
  } | null;
};

type ProfileResponse = {
  wallet: string;
  profile?: WalletProfile;
};

type TasteSlice = {
  label: string;
  value: number;
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

function normalizeImageUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("ipfs://ipfs/")) return url.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
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

function TasteSignature({ title, slices }: { title: string; slices: TasteSlice[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const toneHex = "#9575ff";
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
    <div className="profile-panel">
      <p className="profile-section-label">{title}</p>
      <div style={{ display: "grid", gap: "18px", justifyItems: "center" }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${title} taste signature`}
          style={{ width: "188px", height: "188px" }}
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
        <div style={{ width: "100%", display: "grid", gap: "8px" }}>
          {legendRows.map((row) => (
            <div key={`legend-${row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span className="profile-taste-label">{row.label}</span>
              <span className="profile-taste-pct">{Math.round(row.value)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
      return {
        name: profile.anchorCollection.name,
        count: profile.anchorCollection.count,
        imageUrl: normalizeImageUrl(profile.anchorCollection.imageUrl),
      };
    }
    const fallback = (profile.topCollections || [])[0];
    if (fallback?.name && fallback?.count) {
      const imageUrl = normalizeImageUrl(fallback.imageUrl || fallback.previewImages?.[0]);
      return { name: fallback.name, count: fallback.count, imageUrl };
    }
    return null;
  }, [profile]);

  const signalPiece = useMemo(() => {
    if (!profile) return null;
    if (profile.signalPiece?.collectionName && profile.signalPiece?.imageUrl) {
      return {
        collectionName: profile.signalPiece.collectionName,
        imageUrl: normalizeImageUrl(profile.signalPiece.imageUrl),
      };
    }
    if (returnPattern?.name && returnPattern?.imageUrl) {
      return {
        collectionName: returnPattern.name,
        imageUrl: returnPattern.imageUrl,
      };
    }
    return null;
  }, [profile, returnPattern]);

  const firstMint = useMemo(() => {
    const mint = profile?.firstMint;
    if (!mint?.nft?.collectionName || !mint?.timestamp) return null;
    return {
      imageUrl: normalizeImageUrl(mint.nft.imageUrl),
      title: mint.nft.title || mint.nft.collectionName,
      collectionName: mint.nft.collectionName,
      date: formatMintDate(mint.timestamp),
    };
  }, [profile]);

  const tasteSlices = useMemo(() => {
    const tasteRecord = Object.fromEntries(
      (profile?.categoryDistribution || []).map((row) => [toTitleCase(row.category), row.percentage])
    );
    return buildTasteSlices(tasteRecord, 6);
  }, [profile?.categoryDistribution]);

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
                {returnPattern.imageUrl ? (
                  <img
                    src={returnPattern.imageUrl}
                    alt={returnPattern.name}
                    style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover" }}
                  />
                ) : null}
                <p className="profile-return-name">{returnPattern.name}</p>
                <p className="profile-return-count">
                  returned to {returnPattern.count} {returnPattern.count === 1 ? "time" : "times"}
                </p>
              </div>
            ) : null}

            {signalPiece ? (
              <div className="profile-panel">
                <p className="profile-section-label">Signal Piece</p>
                {signalPiece.imageUrl ? (
                  <img
                    src={signalPiece.imageUrl}
                    alt={signalPiece.collectionName}
                    style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover" }}
                  />
                ) : null}
                <p className="profile-return-name">{signalPiece.collectionName}</p>
              </div>
            ) : null}

            {firstMint ? (
              <div className="profile-panel">
                <p className="profile-section-label">First Mint</p>
                {firstMint.imageUrl ? (
                  <img
                    src={firstMint.imageUrl}
                    alt={firstMint.title}
                    style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover" }}
                  />
                ) : null}
                <p className="profile-return-name">{firstMint.collectionName}</p>
                {firstMint.date ? (
                  <p className="profile-return-count">{firstMint.date}</p>
                ) : null}
              </div>
            ) : null}

            {profile.acquisitionBreakdown && profile.acquisitionBreakdown.totalSampled > 0 ? (
              <div className="profile-panel">
                <p className="profile-section-label">How they collect</p>
                <div style={{ display: "grid", gap: "10px" }}>
                  <div className="profile-taste-label-row">
                    <span className="profile-taste-label">Minted</span>
                    <span className="profile-taste-pct">{profile.acquisitionBreakdown.mintPercent}%</span>
                  </div>
                  <div className="profile-taste-track">
                    <div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.mintPercent}%` }} />
                  </div>
                  <div className="profile-taste-label-row">
                    <span className="profile-taste-label">Acquired</span>
                    <span className="profile-taste-pct">{profile.acquisitionBreakdown.acquiredPercent}%</span>
                  </div>
                  <div className="profile-taste-track">
                    <div className="profile-taste-fill" style={{ width: `${profile.acquisitionBreakdown.acquiredPercent}%`, opacity: 0.55 }} />
                  </div>
                </div>
              </div>
            ) : null}

            {tasteSlices.length > 0 ? <TasteSignature title="Taste map" slices={tasteSlices} /> : null}

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
