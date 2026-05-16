"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Read", href: "/profile" },
  { label: "Orbit", href: "/orbit" },
  { label: "Compare", href: "/compare", secondary: true },
];

const NAV_PATHS = ["/profile", "/orbit", "/compare"];

function isNavRoute(pathname: string) {
  return NAV_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function TopNav() {
  const pathname = usePathname() || "";

  if (!isNavRoute(pathname)) return null;

  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <div className="top-nav-inner">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const className = [
            "top-nav-link",
            item.secondary ? "top-nav-link-secondary" : "",
            isActive ? "top-nav-link-active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={item.href}
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
