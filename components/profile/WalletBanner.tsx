"use client";

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
  return (
    <section className="wallet-banner">
      <div className="wallet-banner-row">
        <p className="wallet-banner-label">Add another wallet (optional)</p>
      </div>
      {canAdd && (
        <form
          className="wallet-banner-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.elements.namedItem("wallet") as HTMLInputElement | null;
            const value = String(input?.value || "").trim();
            if (!value) return;
            onAdd(value);
            if (input) input.value = "";
          }}
        >
          <input className="profile-input" name="wallet" placeholder="Wallet address or ENS" />
          <button type="submit" className="profile-btn-primary">Add</button>
        </form>
      )}
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
