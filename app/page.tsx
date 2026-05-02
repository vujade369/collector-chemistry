"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function isLikelyValidInput(value: string) {
  const trimmed = value.trim();
  const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isEns = /^[a-zA-Z0-9-]+\.eth$/.test(trimmed);
  return isEthAddress || isEns;
}

export default function HomePage() {
  const router = useRouter();
  const [walletInput, setWalletInput] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const trimmedInput = useMemo(() => walletInput.trim(), [walletInput]);
  const isValid = useMemo(() => isLikelyValidInput(trimmedInput), [trimmedInput]);

  const submitWallet = () => {
    if (!isValid) return;
    router.push(`/profile?wallet=${encodeURIComponent(trimmedInput)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitWallet();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitWallet();
  };

  return (
    <main
      className="min-h-screen"
      style={{ background: "#fafaf9", color: "#1c1917" }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16 sm:px-10 sm:py-24">
        <section className="w-full" style={{ color: "inherit" }}>
          <div className="mb-12 sm:mb-16">
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-stone-500">Read-only cultural overlap</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Collector Chemistry</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">Compare 2 collectors and see where their taste overlaps.</p>
      className="cc-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px 40px",
      }}
    >
      <style>{`
        .fade-item {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .fade-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          minHeight: "320px",
          borderRadius: "16px",
          padding: "48px 36px 40px",
        }}
      >
        <div
          className={`fade-item eyebrow ${isVisible ? "visible" : ""}`}
          style={{ transitionDelay: "0ms", marginBottom: "24px", color: "var(--text-dimmer)" }}
        >
          COLLECTOR CHEMISTRY
        </div>

        <h1
          className={`fade-item ${isVisible ? "visible" : ""}`}
          style={{
            transitionDelay: "100ms",
            fontSize: "40px",
            fontWeight: 300,
            color: "var(--text)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "28px",
            maxWidth: "460px",
          }}
        >
          Collecting is
          <br />
          <span style={{ color: "var(--accent)" }}>a self-portrait.</span>
        </h1>

        <form
          className={`fade-item ${isVisible ? "visible" : ""}`}
          style={{ transitionDelay: "200ms" }}
          onSubmit={handleSubmit}
        >
          <div style={{ position: "relative", maxWidth: "480px" }}>
            <input
              type="text"
              placeholder="Paste a wallet or ENS name"
              className="input"
              value={walletInput}
              onChange={(event) => setWalletInput(event.target.value)}
              onKeyDown={handleKeyDown}
              style={{ paddingRight: "130px" }}
            />
            <button
              type="submit"
              className="btn-accent"
              disabled={!isValid}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              Read it →
            </button>
          </div>
        </form>

        <p
          className={`fade-item ${isVisible ? "visible" : ""}`}
          style={{
            transitionDelay: "300ms",
            marginTop: "20px",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-dimmer)",
          }}
        >
          Read-only · No wallet connection
        </p>
      </section>
    </main>
  );
}
