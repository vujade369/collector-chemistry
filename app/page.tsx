"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [wallet1, setWallet1] = useState("");
  const [wallet2, setWallet2] = useState("");

  function handleCompare() {
    if (!wallet1 || !wallet2) return;

    router.push(
      `/compare?wallet1=${encodeURIComponent(wallet1)}&wallet2=${encodeURIComponent(wallet2)}`
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          Collector Chemistry
        </h1>

        <p className="text-sm text-neutral-500 text-center mb-8">
          Compare two wallets and see where their taste overlaps
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Wallet one (0x… or ENS)"
            value={wallet1}
            onChange={(e) => setWallet1(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-sm"
          />

          <input
            type="text"
            placeholder="Wallet two (0x… or ENS)"
            value={wallet2}
            onChange={(e) => setWallet2(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-sm"
          />

          <button
            onClick={handleCompare}
            className="w-full bg-black text-white rounded-lg py-3 text-sm"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}