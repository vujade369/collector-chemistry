"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function isValidInput(value: string): boolean {
  const trimmed = value.trim();
  const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isEns = trimmed.endsWith(".eth");
  return isEthAddress || isEns;
}

export default function Home() {
  const router = useRouter();
  const [wallet, setWallet] = useState("");

  const isValid = isValidInput(wallet);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    router.push(`/profile?wallet=${encodeURIComponent(wallet.trim())}`);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16 sm:px-10 sm:py-24">
        <section className="w-full">
          <div className="mb-12 sm:mb-16">
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-stone-500">
              Collector Chemistry
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-100 sm:text-5xl">
              What your wallet says about you.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-400 sm:text-lg">
              Paste a wallet address or ENS name to see the collecting pattern inside it.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <input
                id="wallet"
                type="text"
                placeholder="Wallet address or ENS"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="block w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-stone-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={!isValid}
                className="inline-flex items-center justify-center rounded-full bg-stone-100 px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-white disabled:opacity-40"
              >
                Read my wallet
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
