"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_PATHS = ["/profile", "/orbit", "/compare"];

function isNavRoute(pathname: string) {
  return NAV_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function TopNav() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  if (!isNavRoute(pathname)) return null;

  const walletParam = searchParams.get("wallet")?.trim() || "";
  const compareA = searchParams.get("a")?.trim() || "";
  const compareB = searchParams.get("b")?.trim() || "";

  const readWallet = pathname.startsWith("/compare") ? compareA || compareB : walletParam;
  const readHref = readWallet ? `/profile?wallet=${encodeURIComponent(readWallet)}` : "/";

  const navItems = [
    { label: "Read", href: readHref, activePath: "/profile" },
    { label: "Orbit", href: "/orbit", activePath: "/orbit" },
    { label: "Compare", href: "/compare", activePath: "/compare", secondary: true },
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
