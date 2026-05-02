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
    <main className="min-h-screen bg-[#0e0e0e] text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[700px] items-center px-6 py-16">
        <section className="relative w-full overflow-hidden rounded-[20px] border border-[#222] bg-[#111] p-8 shadow-[0_0_0_0.5px_rgba(255,51,153,0.08)]">
          <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_14%_16%,rgba(255,51,153,0.12),transparent_46%),radial-gradient(circle_at_86%_84%,rgba(149,117,255,0.09),transparent_42%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff3399]/50 to-transparent" aria-hidden="true" />
          <div className="relative grid gap-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">COLLECTOR CHEMISTRY</p>
            <h1 className="text-4xl font-light tracking-[-0.03em] text-[#f0ede6]">What your wallet says about you.</h1>
            <p className="text-[15px] leading-7 text-[#a8a49d]">Paste a wallet address or ENS name to see the collecting pattern inside it.</p>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <input
                id="wallet"
                type="text"
                placeholder="Wallet address or ENS"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full rounded-[10px] border border-[#2e2e2e] bg-[#141414] px-4 py-3 text-sm text-[#f0ede6] outline-none placeholder:text-[#3a3a3a] focus:border-[#555]"
              />

              <button
                type="submit"
                disabled={!isValid}
                className="inline-flex items-center justify-center rounded-full bg-[#f0ede6] px-6 py-3 text-sm font-medium text-[#0e0e0e] transition hover:opacity-90 disabled:opacity-40"
              >
                Read my wallet
              </button>
            </form>

            <p className="text-xs text-[#666]">Also works with ENS. Try vitalik.eth</p>
          </div>
        </section>
      </div>
    </main>
  );
}
