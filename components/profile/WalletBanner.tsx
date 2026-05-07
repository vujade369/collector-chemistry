"use client";

import { useState } from "react";
import WalletTypeaheadInput from "@/components/shared/WalletTypeaheadInput";

type WalletResolveResponse =
  | { ok: true; address: string; message?: string }
  | { ok: false; message?: string };

async function resolveWalletIdentity(value: string): Promise<WalletResolveResponse> {
  const res = await fetch(`/api/wallet/resolve?q=${encodeURIComponent(value)}`);
  const json = (await res.json()) as WalletResolveResponse;
  return res.ok && json.ok ? json : { ok: false, message: json.message };
}

type Props = {
  wallets: string[];
  maxWallets?: number;
  onAdd: (wallet: string) => void;
  onRemove: (wallet: string) => void;
};

function shorten(value: string) {
  if (value.endsWith(".eth")) return value;
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function WalletBanner({ wallets, maxWallets = 5, onAdd, onRemove }: Props) {
  const canAdd = wallets.length < maxWallets;
  const [resolveError, setResolveError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [walletInput, setWalletInput] = useState("");

  return (
    <section className="wallet-banner">
      <div className="wallet-banner-row">
        <p className="wallet-banner-label">Add another wallet (optional)</p>
      </div>
      {canAdd && (
        <form
          className="wallet-banner-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const value = walletInput.trim();
            if (!value) return;

            setResolveError("");
            setResolving(true);

            try {
              const resolved = await resolveWalletIdentity(value);
              if (!resolved.ok) {
                setResolveError(resolved.message || "Couldn’t resolve that wallet.");
                return;
              }

              onAdd(resolved.address);
              setWalletInput("");
            } catch {
              setResolveError("Couldn’t resolve that wallet.");
            } finally {
              setResolving(false);
            }
          }}
        >
          <WalletTypeaheadInput
            className="profile-input"
            name="wallet"
            value={walletInput}
            placeholder="Wallet address or ENS"
            onValueChange={(nextValue) => {
              setWalletInput(nextValue);
              if (resolveError) setResolveError("");
            }}
          />
          <button type="submit" className="profile-btn-primary" disabled={resolving}>Add</button>
        </form>
      )}
      {resolveError && <p className="profile-error">{resolveError}</p>}
      <div className="wallet-pill-row">
        {wallets.map((wallet) => (
          <button key={wallet} type="button" className="wallet-pill" onClick={() => onRemove(wallet)}>
            {shorten(wallet)} ×
          </button>
        ))}
      </div>
    </section>
  );
}
