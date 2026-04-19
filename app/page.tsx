"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [wallet1, setWallet1] = useState("");
  const [wallet2, setWallet2] = useState("");
  const router = useRouter();

  const handleCompare = () => {
    console.log("clicked", wallet1, wallet2);
    alert("clicked");

    if (!wallet1 || !wallet2) return;

    router.push(`/compare?wallet1=${wallet1}&wallet2=${wallet2}`);
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "24px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "32px" }}>Collector Chemistry</h1>

      <p style={{ opacity: 0.6 }}>
        Compare two wallets. See what connects them.
      </p>

      <div style={{ display: "flex", gap: "12px" }}>
        <input
          placeholder="Wallet 1"
          value={wallet1}
          onChange={(e) => setWallet1(e.target.value)}
          style={{ padding: "10px", width: "240px" }}
        />
        <input
          placeholder="Wallet 2"
          value={wallet2}
          onChange={(e) => setWallet2(e.target.value)}
          style={{ padding: "10px", width: "240px" }}
        />
      </div>

      <button
        onClick={handleCompare}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Compare
      </button>
    </main>
  );
}