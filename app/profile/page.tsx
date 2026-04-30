"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <p className="text-sm text-stone-500">Reading your wallet...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <p className="text-sm text-stone-600">
              Nothing found for this wallet.{" "}
              <button
                className="underline underline-offset-4 text-stone-800 hover:text-stone-950"
                onClick={() => router.push("/")}
                type="button"
              >
                Try another wallet
              </button>
            </p>
          </div>
        ) : null}

        {!loading && !error && profile ? (
          <section className="space-y-12 sm:space-y-14">
            <header className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-stone-950 sm:text-3xl">
                {displayName}
              </h1>
              <p className="text-xs text-stone-500 sm:text-sm break-all">{resolvedWallet}</p>
            </header>

            {(profile.patternLine || profile.identityParagraph) ? (
              <section className="space-y-6 sm:space-y-7">
                {profile.patternLine ? (
                  <p className="max-w-2xl text-2xl leading-tight font-semibold tracking-tight text-stone-950 sm:text-3xl">
                    {profile.patternLine}
                  </p>
                ) : null}
                {profile.identityParagraph ? (
                  <p className="max-w-2xl text-base leading-8 text-stone-700 sm:text-lg sm:leading-9">
                    {profile.identityParagraph}
                  </p>
                ) : null}
              </section>
            ) : null}

            {behavioralReads.length > 0 ? (
              <section>
                <div className="flex flex-wrap gap-2">
                  {behavioralReads.map((read, idx) => (
                    <span
                      key={`${read}-${idx}`}
                      className="rounded-full border border-stone-200 px-3 py-1 text-[11px] tracking-[0.04em] text-stone-400"
                    >
                      {read}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {returnPattern ? (
              <section className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Return Pattern</p>
                <p className="text-base text-stone-900">{returnPattern.name}</p>
                <p className="text-sm text-stone-600">
                  returned to {returnPattern.count} {returnPattern.count === 1 ? "time" : "times"}
                </p>
              </section>
            ) : null}

            {tasteRows.length > 0 ? (
              <section className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Taste map</p>
                <div className="space-y-3">
                  {tasteRows.map((row) => {
                    const pct = Math.max(0, Math.min(100, Math.round(row.percentage)));
                    return (
                      <div key={row.category} className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                          <span className="text-sm text-stone-600">{toTitleCase(row.category)}</span>
                          <span className="text-xs text-stone-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-stone-200">
                          <div
                            className="h-1.5 rounded-full bg-stone-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {profile.whatStandsOut ? (
              <section>
                <p className="text-sm italic text-stone-500">{profile.whatStandsOut}</p>
              </section>
            ) : null}

            <section className="pt-6 sm:pt-8 space-y-4">
              <div className="space-y-1.5">
                <p className="text-base font-medium text-stone-900">See who stopped in the same places.</p>
                <p className="text-sm text-stone-600">
                  Add another wallet to see where your taste overlaps.
                </p>
              </div>
              <form className="space-y-3" onSubmit={handleCompareSubmit}>
                <input
                  type="text"
                  value={compareWallet}
                  onChange={(e) => setCompareWallet(e.target.value)}
                  placeholder="Second wallet address or ENS"
                  className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
                />
                <button
                  type="submit"
                  disabled={!canCompare}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-40"
                >
                  Compare
                </button>
              </form>
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}
