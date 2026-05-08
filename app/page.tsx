"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WalletTypeaheadInput from "@/components/shared/WalletTypeaheadInput";

type WalletResolveResponse =
  | { ok: true; address: string; message?: string }
  | { ok: false; message?: string };

async function resolveWalletIdentity(value: string): Promise<WalletResolveResponse> {
  const res = await fetch(`/api/wallet/resolve?q=${encodeURIComponent(value)}`);
  const json = (await res.json()) as WalletResolveResponse;
  return res.ok && json.ok ? json : { ok: false, message: json.message };
}

export default function HomePage() {
  const router = useRouter();
  const [walletInput, setWalletInput] = useState("");
  const [resolveError, setResolveError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const trimmedInput = useMemo(() => walletInput.trim(), [walletInput]);
  const canSubmit = trimmedInput.length > 0 && !resolving;

  const submitWallet = async () => {
    if (!canSubmit) return;
    setResolveError("");
    setResolving(true);

    try {
      const resolved = await resolveWalletIdentity(trimmedInput);
      if (!resolved.ok) {
        setResolveError(resolved.message || "Couldn’t resolve that wallet.");
        return;
      }

      router.push(`/profile?wallet=${encodeURIComponent(resolved.address)}`);
    } catch {
      setResolveError("Couldn’t resolve that wallet.");
    } finally {
      setResolving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitWallet();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void submitWallet();
  };

  return (
    <main
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
          CONSTELLATE
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
            <WalletTypeaheadInput
              placeholder="Paste a wallet or ENS name"
              className="input"
              value={walletInput}
              onValueChange={(nextValue) => {
                setWalletInput(nextValue);
                if (resolveError) setResolveError("");
              }}
              onSuggestionSelect={(suggestion) => {
                router.push(`/profile?wallet=${encodeURIComponent(suggestion.address)}`);
              }}
              onKeyDown={handleKeyDown}
              onDropdownOpenChange={setWalletDropdownOpen}
              style={{ paddingRight: "130px" }}
            />
            <button
              type="submit"
              className="btn-accent"
              disabled={!canSubmit}
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

        {resolveError && (
          <p
            className={`fade-item ${isVisible ? "visible" : ""}`}
            style={{
              transitionDelay: "250ms",
              marginTop: "12px",
              fontSize: "12px",
              color: "var(--text-dimmer)",
            }}
          >
            {resolveError}
          </p>
        )}

        <p
          className={`fade-item ${isVisible ? "visible" : ""}`}
          style={{
            transitionDelay: "300ms",
            marginTop: "20px",
            paddingTop: walletDropdownOpen ? "276px" : 0,
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-dimmer)",
            transition: "padding-top 160ms ease",
          }}
        >
          Read-only · No wallet connection
        </p>
      </section>
    </main>
  );
}
