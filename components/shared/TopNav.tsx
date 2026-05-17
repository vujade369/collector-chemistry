"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_PATHS = ["/profile", "/orbit", "/compare"];

function isNavRoute(pathname: string) {
  return NAV_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function buildUrl(pathname: string, params: Record<string, string>) {
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const cleanedValue = value.trim();
    if (cleanedValue) nextParams.set(key, cleanedValue);
  });

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function parseWalletParam(value: string) {
  return value
    .split(",")
    .map((wallet) => wallet.trim())
    .filter(Boolean);
}

export default function TopNav() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  if (!isNavRoute(pathname)) return null;

  const walletParam = searchParams.get("wallet")?.trim() || "";
  const compareA = searchParams.get("a")?.trim() || "";
  const compareB = searchParams.get("b")?.trim() || "";
  const seedParam =
    searchParams.get("seed")?.trim() || searchParams.get("seedSlugs")?.trim() || "";
  const orbitNameParam = searchParams.get("name")?.trim() || "";
  const orbitFromParam = searchParams.get("from")?.trim() || "";
  const walletParamParts = parseWalletParam(walletParam);
  const singleContextWallet =
    (pathname.startsWith("/profile") || pathname.startsWith("/orbit")) &&
    walletParamParts.length === 1
      ? walletParamParts[0]
      : "";

  const readWallet = pathname.startsWith("/compare") ? compareA || compareB : walletParam;
  const readHref = readWallet ? buildUrl("/profile", { wallet: readWallet }) : "/profile";
  const orbitWallet = pathname.startsWith("/compare") && compareA && compareB
    ? `${compareA},${compareB}`
    : walletParam;
  const orbitHref = orbitWallet
    ? buildUrl("/orbit", { wallet: orbitWallet })
    : pathname.startsWith("/orbit") && seedParam
      ? buildUrl("/orbit", {
          seed: seedParam,
          name: orbitNameParam,
          from: orbitFromParam,
        })
      : "/orbit";
  const compareHref = compareA && compareB
    ? buildUrl("/compare", { a: compareA, b: compareB })
    : singleContextWallet
      ? buildUrl("/compare", { a: singleContextWallet })
    : "/compare";

  const navItems = [
    { label: "Read", href: readHref, activePath: "/profile" },
    { label: "Orbit", href: orbitHref, activePath: "/orbit" },
    { label: "Compare", href: compareHref, activePath: "/compare", secondary: true },
  ];

  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <div className="top-nav-inner">
        {navItems.map((item) => {
          const isActive =
            pathname === item.activePath || pathname.startsWith(`${item.activePath}/`);
          const className = [
            "top-nav-link",
            item.secondary ? "top-nav-link-secondary" : "",
            isActive ? "top-nav-link-active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={item.activePath}
              href={item.href}
              className={className}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
