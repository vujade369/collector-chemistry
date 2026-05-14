"use client";

import { useEffect, useMemo, useState } from "react";

type OrbitSocialLink = {
  label: string;
  url: string;
  kind?: string;
};

type OrbitCandidate = {
  wallet: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  bioDisplay?: string | null;
  joinedDate?: string | null;
  openseaUrl?: string | null;
  socialLinks?: OrbitSocialLink[];
  strength?: string | null;
  sharedSeedCollections?: string[];
  sharedSeedCount?: number;
  sharedRoomHoldings?: Record<string, number>;
  score?: number;
  proof?: string;
};

type OrbitCollection = {
  slug: string;
  name?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  openseaUrl?: string | null;
  contractAddress?: string | null;
  heldCount?: number;
  holderCount?: number;
  specificityScore?: number;
};

type RoomMode = "focus" | "exclude" | "ignore";

type RoomStateMap = Record<string, RoomMode>;

type OrbitResponse = {
  wallets?: string[];
  displayTopCollections?: OrbitCollection[];
  showMoreCollections?: OrbitCollection[];
  orbitSeedCollections?: OrbitCollection[];
  candidates?: OrbitCandidate[];
  debug?: unknown;
  error?: string;
};

const DEFAULT_WALLET_ROWS = [
  "0x5ffd8de19910efff95df729c54699aebcee8f747",
];

const WALLET_ROWS_STORAGE_KEY = "orbit-test-wallet-rows";

function label(slug?: string | null) {
  if (!slug) return "Unknown";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortWallet(wallet?: string | null) {
  if (!wallet) return "Unknown wallet";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatJoinedDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `Joined ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
}

function collectionUrl(collection?: OrbitCollection | null, slug?: string | null) {
  const finalSlug = collection?.slug || slug;
  return collection?.openseaUrl || (finalSlug ? `https://opensea.io/collection/${finalSlug}` : "#");
}

function collectionImage(collection?: OrbitCollection | null) {
  return collection?.imageUrl || collection?.avatarUrl || collection?.bannerUrl || null;
}

function specificityWeight(holderCount?: number | null) {
  const count = typeof holderCount === "number" && holderCount > 0 ? holderCount : 0;
  return 1 / Math.max(Math.log10(count + 10), 1);
}

function looksInstitutional(candidate: OrbitCandidate) {
  const nameText = [
    candidate.displayName,
    candidate.username,
    candidate.wallet,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const profileText = [
    candidate.bio,
    candidate.bioDisplay,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const allText = `${nameText} ${profileText}`;

  const hardInstitutionalTerms = [
    "marketplace",
    "exchange",
    "blur",
    "looksrare",
    "x2y2",
    "delegate",
    "delegation",
    "escrow",
    "staking",
    "auction",
    "bulk",
    "museum",
  ];

  const softInstitutionalTerms = [
    "treasury",
    "fund",
    "multisig",
    "multi-sig",
    "dao",
    "team wallet",
    "project wallet",
    "official wallet",
  ];

  const hasHardInstitutionalTerm = hardInstitutionalTerms.some((term) => allText.includes(term));
  const hasSoftInstitutionalTerm = softInstitutionalTerms.some((term) => allText.includes(term));

  const hasHumanProfile =
    Boolean(candidate.avatarUrl) &&
    Boolean(candidate.bioDisplay && !candidate.bioDisplay.toLowerCase().includes("no bio found"));

  const hasSocialPresence = Array.isArray(candidate.socialLinks) && candidate.socialLinks.length > 0;
  const looksNamedLikeAddress = /^0x[a-f0-9]{4}/i.test(candidate.displayName || "");

  let score = 0;

  if (hasHardInstitutionalTerm) score += 2;
  if (hasSoftInstitutionalTerm) score += 1;
  if (looksNamedLikeAddress && !hasHumanProfile) score += 1;
  if (!hasHumanProfile && !hasSocialPresence) score += 1;

  // A hard marketplace/delegate signal is enough.
  // Softer institutional language needs another signal before hiding.
  return score >= 2;
}

function strengthLabel(candidate: OrbitCandidate, orbitScore: number) {
  if ((candidate.sharedSeedCount || 0) >= 6 || orbitScore >= 70) return "Strong orbit";
  if ((candidate.sharedSeedCount || 0) >= 4 || orbitScore >= 45) return "Nearby orbit";
  return "Light orbit";
}

function signalStrengthLabel(sharedCount: number) {
  if (sharedCount >= 7) return "Exceptional Signal";
  if (sharedCount >= 5) return "Strong Signal";
  if (sharedCount >= 3) return "Clear Signal";
  if (sharedCount >= 2) return "Light Signal";
  return "Single-Room Signal";
}

function signalTypeLabel(candidate: OrbitCandidate, selectedCount: number) {
  const sharedCount = candidate.sharedSeedCount || candidate.sharedSeedCollections?.length || 0;
  const holdings = Object.values(candidate.sharedRoomHoldings || {});
  const maxHolding = holdings.length ? Math.max(...holdings) : 0;
  const shareRatio = selectedCount > 0 ? sharedCount / selectedCount : 0;

  if (selectedCount > 0 && sharedCount === selectedCount) return "Full Orbit Match";
  if (shareRatio >= 0.7) return "Broad Peer";
  if (shareRatio >= 0.5) return "Nearby Peer";
  if (maxHolding >= 10) return "Deep Room Regular";
  if (sharedCount >= 3) return "Specific Neighbor";
  return "Shared Room";
}

function strongestSharedRooms(
  candidate: OrbitCandidate,
  collectionMap: Map<string, OrbitCollection>,
  limit = 3
) {
  const holdings = candidate.sharedRoomHoldings || {};
  return Object.entries(holdings)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, count]) => {
      const collection = collectionMap.get(slug);
      return {
        slug,
        count,
        name: collection?.name || label(slug),
      };
    });
}

function displayOrbitPercent(index: number) {
  return [94, 89, 86, 83, 80, 77, 74, 71, 68, 65][index] || 62;
}

function strongestSharedRoom(
  candidate: OrbitCandidate,
  collectionMap: Map<string, OrbitCollection>
) {
  const holdings = candidate.sharedRoomHoldings || {};
  const entries = Object.entries(holdings)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!entries.length) return null;

  const [slug, count] = entries[0];
  const collection = collectionMap.get(slug);

  return {
    slug,
    count,
    name: collection?.name || label(slug),
  };
}

function candidateReason(
  candidate: OrbitCandidate,
  collectionMap: Map<string, OrbitCollection>
) {
  if (candidate.proof) return candidate.proof;

  const shared = candidate.sharedSeedCollections || [];
  const strongest = strongestSharedRoom(candidate, collectionMap);

  if (shared.length >= 2 && strongest) {
    return `Shares ${shared.length} rooms. Strongest bridge: ${strongest.count} in ${strongest.name}.`;
  }

  if (shared.length === 1 && strongest) {
    return `Shared room: ${strongest.name}, with ${strongest.count} held.`;
  }

  if (shared.length > 0) {
    return `Shares ${shared.length} room${shared.length === 1 ? "" : "s"} with this constellation.`;
  }

  return "Surfaced through visible collector overlap around these rooms.";
}


function RoomChip({
  slug,
  collection,
  compact = false,
  holdingCount,
}: {
  slug: string;
  collection?: OrbitCollection;
  compact?: boolean;
  holdingCount?: number;
}) {
  const image = collectionImage(collection);
  const name = collection?.name || label(collection?.slug || slug);
  const displayCount = typeof holdingCount === "number" && holdingCount > 1 ? holdingCount : null;

  return (
    <a
      href={collectionUrl(collection, slug)}
      target="_blank"
      rel="noreferrer"
      title={name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 5 : 7,
        maxWidth: compact ? 180 : 240,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.035)",
        borderRadius: 999,
        padding: compact ? "5px 8px 5px 5px" : "7px 10px 7px 6px",
        color: "#eee5ef",
        fontSize: compact ? 11 : 12,
        textDecoration: "none",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: compact ? 18 : 22,
          height: compact ? 18 : 22,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#1b1520",
          display: "grid",
          placeItems: "center",
          color: "#817583",
          flexShrink: 0,
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          "✦"
        )}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}{displayCount ? ` · ${displayCount}` : ""}
      </span>
    </a>
  );
}


function linkifyBioText(value: string) {
  const parts: Array<{ text: string; url?: string }> = [];
  const pattern = /((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/gi;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ text: value.slice(lastIndex, index) });
    }

    const trailing = raw.match(/[),.;:!?]+$/)?.[0] || "";
    const clean = trailing ? raw.slice(0, -trailing.length) : raw;
    const url = clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;

    parts.push({ text: clean, url });

    if (trailing) {
      parts.push({ text: trailing });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < value.length) {
    parts.push({ text: value.slice(lastIndex) });
  }

  return parts;
}

function BioText({ value }: { value: string }) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        color: "#bfb3c1",
        fontSize: 14,
        lineHeight: 1.45,
        height: 54,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
      }}
    >
      {linkifyBioText(value).map((part, index) =>
        part.url ? (
          <a
            key={`${part.url}-${index}`}
            href={part.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#e8dced", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {part.text}
          </a>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        )
      )}
    </p>
  );
}

function SocialIcon({ kind }: { kind?: string }) {
  if (kind === "website") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.8 12h16.4M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (kind === "instagram") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16.4" cy="7.7" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SocialLinkPills({ links }: { links?: OrbitSocialLink[] }) {
  const visibleLinks = (links || []).slice(0, 3);

  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        alignItems: "center",
        height: 22,
        marginTop: 0,
      }}
    >
      {visibleLinks.map((link) => (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          title={link.url}
          aria-label={link.label}
          style={{
            width: 22,
            height: 22,
            color: "#d8cddd",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.055)",
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            textDecoration: "none",
          }}
        >
          <SocialIcon kind={link.kind} />
        </a>
      ))}
    </div>
  );
}

function mergeUniqueRooms(collections: OrbitCollection[]) {
  const seen = new Set<string>();
  const rooms: OrbitCollection[] = [];

  for (const collection of collections) {
    const slug = collection.slug?.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    rooms.push(collection);
  }

  return rooms;
}

function buildAvailableRooms(data: OrbitResponse | null) {
  if (!data) return [];

  return mergeUniqueRooms([
    ...(data.orbitSeedCollections || []),
    ...(data.displayTopCollections || []),
    ...(data.showMoreCollections || []),
  ]).slice(0, 15);
}

function buildDefaultRoomStates(rooms: OrbitCollection[]) {
  const states: RoomStateMap = {};

  rooms.forEach((room, index) => {
    if (!room.slug) return;
    states[room.slug] = index < 10 ? "focus" : "ignore";
  });

  return states;
}

function getFocusedSlugs(roomStates: RoomStateMap) {
  return Object.entries(roomStates)
    .filter(([, mode]) => mode === "focus")
    .map(([slug]) => slug);
}

function getExcludedSlugs(roomStates: RoomStateMap) {
  return Object.entries(roomStates)
    .filter(([, mode]) => mode === "exclude")
    .map(([slug]) => slug);
}

export default function OrbitTestPage() {
  const [walletRows, setWalletRows] = useState<string[]>(DEFAULT_WALLET_ROWS);
  const [data, setData] = useState<OrbitResponse | null>(null);
  const [expandedCollections, setExpandedCollections] = useState(false);
  const [hideInstitutional, setHideInstitutional] = useState(false);
  const [roomStates, setRoomStates] = useState<RoomStateMap>({});
  const [outsideRooms, setOutsideRooms] = useState<OrbitCollection[]>([]);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
  const [collectionSearchResults, setCollectionSearchResults] = useState<OrbitCollection[]>([]);
  const [collectionSearchLoading, setCollectionSearchLoading] = useState(false);
  const [collectionSearchMessage, setCollectionSearchMessage] = useState("");
  const [activeFocusCount, setActiveFocusCount] = useState(0);
  const [activeExcludeCount, setActiveExcludeCount] = useState(0);
  const [activeVaultTooltipWallet, setActiveVaultTooltipWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WALLET_ROWS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.some((value) => String(value || "").trim())) {
        setWalletRows(parsed.map((value) => String(value || "")));
      }
    } catch {
      // Ignore invalid local cache.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(WALLET_ROWS_STORAGE_KEY, JSON.stringify(walletRows));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [walletRows]);

  useEffect(() => {
    const query = collectionSearchQuery.trim();

    if (query.length < 2) {
      setCollectionSearchResults([]);
      setCollectionSearchLoading(false);
      setCollectionSearchMessage("");
      return;
    }

    let cancelled = false;
    setCollectionSearchLoading(true);
    setCollectionSearchMessage("");

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/converter/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        const rawResults = Array.isArray(json?.results) ? json.results : [];

        const results = rawResults
          .map((item: any): OrbitCollection | null => {
            const slug = String(item?.slug || item?.collection || "").trim();
            if (!slug) return null;

            return {
              slug,
              name: String(item?.name || item?.title || slug),
              imageUrl: item?.imageUrl || item?.image_url || item?.bannerImageUrl || item?.banner_image_url || null,
              avatarUrl: item?.imageUrl || item?.image_url || null,
              bannerUrl: item?.bannerImageUrl || item?.banner_image_url || null,
              openseaUrl: item?.openseaUrl || item?.opensea_url || `https://opensea.io/collection/${slug}`,
            } as OrbitCollection;
          })
          .filter(Boolean) as OrbitCollection[];

        if (!cancelled) {
          setCollectionSearchResults(results.slice(0, 8));
          setCollectionSearchMessage(results.length ? "" : "No collections found.");
        }
      } catch {
        if (!cancelled) {
          setCollectionSearchResults([]);
          setCollectionSearchMessage("Collection search is unavailable right now.");
        }
      } finally {
        if (!cancelled) setCollectionSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [collectionSearchQuery]);

  const joinedWallets = walletRows
    .map((value) => value.trim())
    .filter(Boolean)
    .join(",");

  const walletAvailableRooms = buildAvailableRooms(data);
  const availableRooms = useMemo(
    () => mergeUniqueRooms([...walletAvailableRooms, ...outsideRooms]),
    [walletAvailableRooms, outsideRooms]
  );

  const addedRooms = useMemo(
    () =>
      outsideRooms.filter(
        (room) => room.slug && !walletAvailableRooms.some((walletRoom) => walletRoom.slug === room.slug)
      ),
    [outsideRooms, walletAvailableRooms]
  );
  const focusedSlugs = getFocusedSlugs(roomStates);
  const excludedSlugs = getExcludedSlugs(roomStates);

  function updateWalletRow(index: number, value: string) {
    setWalletRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? value : row))
    );
  }

  function addWalletRow() {
    setWalletRows((rows) => [...rows, ""]);
  }

  function removeWalletRow(index: number) {
    setWalletRows((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function initializeRoomStatesFromData(nextData: OrbitResponse) {
    const rooms = mergeUniqueRooms([...buildAvailableRooms(nextData), ...outsideRooms]);

    setRoomStates((current) => {
      if (Object.keys(current).length === 0) {
        return buildDefaultRoomStates(rooms);
      }

      const allowed = new Set(rooms.map((room) => room.slug).filter(Boolean));
      const next: RoomStateMap = {};

      for (const [slug, mode] of Object.entries(current)) {
        if (allowed.has(slug)) next[slug] = mode;
      }

      for (const room of rooms) {
        if (room.slug && !next[room.slug]) next[room.slug] = "ignore";
      }

      return next;
    });
  }

  function cycleRoomMode(slug?: string | null) {
    if (!slug) return;

    setRoomStates((current) => {
      const currentMode = current[slug] || "ignore";
      const focusedCount = Object.values(current).filter((mode) => mode === "focus").length;

      let nextMode: RoomMode;
      if (currentMode === "focus") {
        nextMode = "exclude";
      } else if (currentMode === "exclude") {
        nextMode = "ignore";
      } else {
        if (focusedCount >= 10) return current;
        nextMode = "focus";
      }

      return {
        ...current,
        [slug]: nextMode,
      };
    });
  }

  function addOutsideRoom(room: OrbitCollection) {
    if (!room.slug) return;

    const alreadyExists = availableRooms.some((existing) => existing.slug === room.slug);

    if (!alreadyExists) {
      setOutsideRooms((current) => mergeUniqueRooms([...current, room]));
    }

    setRoomStates((current) => {
      const existingMode = current[room.slug || ""];
      if (existingMode === "focus") return current;

      const focusedCount = Object.values(current).filter((mode) => mode === "focus").length;
      if (focusedCount >= 10) {
        setCollectionSearchMessage("Collection limit reached. Remove a selected collection before adding another.");
        return current;
      }

      return {
        ...current,
        [room.slug || ""]: "focus",
      };
    });

    setCollectionSearchQuery("");
    setCollectionSearchResults([]);
  }

  function removeOutsideRoom(slug?: string | null) {
    if (!slug) return;

    setOutsideRooms((current) => current.filter((room) => room.slug !== slug));
    setRoomStates((current) => {
      const next = { ...current };
      delete next[slug];
      return next;
    });
  }

  function resetFocusRooms() {
    setRoomStates(buildDefaultRoomStates(availableRooms));
  }

  async function findCollectors() {
    setLoading(true);
    setError("");

    const queryWallets = walletRows
      .map((value) => value.trim())
      .filter(Boolean)
      .join(",");

    if (!queryWallets) {
      setError("Enter at least one wallet.");
      setLoading(false);
      return;
    }

    if (availableRooms.length > 0 && focusedSlugs.length === 0) {
      setError("Choose at least one focus room.");
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        wallet: queryWallets,
        debug: "1",
        resultLimit: "20",
      });

      const currentFocusedSlugs = getFocusedSlugs(roomStates);
      const currentExcludedSlugs = getExcludedSlugs(roomStates);

      if (currentFocusedSlugs.length > 0) {
        params.set("seedSlugs", currentFocusedSlugs.join(","));
      }

      if (currentExcludedSlugs.length > 0) {
        params.set("excludeSlugs", currentExcludedSlugs.join(","));
      }

      setActiveFocusCount(currentFocusedSlugs.length);
      setActiveExcludeCount(currentExcludedSlugs.length);

      const res = await fetch(`/api/profile/orbit?${params.toString()}`);
      const json = (await res.json()) as OrbitResponse;

      if (!res.ok) {
        throw new Error(json.error || "Orbit request failed");
      }

      setData(json);
      initializeRoomStatesFromData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const collectionMap = useMemo(() => {
    const map = new Map<string, OrbitCollection>();
    for (const collection of [
      ...(data?.orbitSeedCollections || []),
      ...(data?.displayTopCollections || []),
      ...(data?.showMoreCollections || []),
    ]) {
      if (collection.slug) map.set(collection.slug, collection);
    }
    return map;
  }, [data]);

  const totalSeedWeight = useMemo(() => {
    const collections = data?.orbitSeedCollections || [];
    const total = collections.reduce(
      (sum, collection) => sum + specificityWeight(collection.holderCount),
      0
    );
    return total || 1;
  }, [data]);

  function orbitScore(candidate: OrbitCandidate) {
    const shared = candidate.sharedSeedCollections || [];
    const sharedWeight = shared.reduce((sum, slug) => {
      const collection = collectionMap.get(slug);
      return sum + specificityWeight(collection?.holderCount);
    }, 0);

    return Math.round((sharedWeight / totalSeedWeight) * 100);
  }

  const topCollections = data?.displayTopCollections || [];
  const moreCollections = data?.showMoreCollections || [];
  const visibleCollections = expandedCollections
    ? [...topCollections, ...moreCollections]
    : topCollections;

  const candidates = (data?.candidates || []).filter((candidate) => {
    if (!hideInstitutional) return true;
    return !looksInstitutional(candidate);
  });

  const visibleCandidates = candidates.slice(0, 10);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#08070a",
        color: "#f4edf4",
        padding: "48px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            marginBottom: 30,
            padding: "10px 0 4px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "-38px auto auto -80px",
              width: 420,
              height: 220,
              background:
                "radial-gradient(circle at 30% 30%, rgba(236,72,153,0.12), transparent 58%), radial-gradient(circle at 68% 42%, rgba(34,211,238,0.08), transparent 48%)",
              filter: "blur(4px)",
              opacity: 0.8,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <h1 style={{ margin: "0 0 12px", fontSize: 46, letterSpacing: "-0.055em", lineHeight: 0.95 }}>
              Collectors in Your Orbit
            </h1>

            <p style={{ margin: 0, maxWidth: 760, color: "#bdb0bd", lineHeight: 1.55 }}>
              Find nearby collectors who share your collecting rooms, then see exactly why each person surfaced.
            </p>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.085)",
            background:
              "radial-gradient(circle at 18% 0%, rgba(34,211,238,0.055), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018))",
            borderRadius: 24,
            padding: 18,
            marginBottom: 32,
            boxShadow: "0 18px 42px rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                margin: "0 0 5px",
                color: "#f4edf4",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Start with your wallet
            </p>
            <p style={{ margin: 0, color: "#a99daa", fontSize: 13 }}>
              Add one or more wallets. The search uses their visible collection rooms as the starting point.
            </p>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {walletRows.map((value, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: walletRows.length > 1 ? "1fr auto" : "1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <input
                  value={value}
                  onChange={(event) => updateWalletRow(index, event.target.value)}
                  placeholder={index === 0 ? "Wallet, ENS, or OpenSea handle" : "Additional wallet"}
                  style={{
                    background: "rgba(8,7,10,0.72)",
                    color: "#f4edf4",
                    border: "1px solid rgba(255,255,255,0.11)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                {walletRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWalletRow(index)}
                    disabled={walletRows.length <= 1}
                    style={{
                      background: "rgba(255,255,255,0.026)",
                      color: "#b7aab8",
                      border: "1px solid rgba(255,255,255,0.11)",
                      borderRadius: 14,
                      padding: "0 13px",
                      height: 46,
                      cursor: walletRows.length <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={addWalletRow}
              style={{
                background: "transparent",
                color: "#f4edf4",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              + Add another wallet
            </button>

            <button
              onClick={findCollectors}
              disabled={loading}
              style={{
                background: loading ? "#312636" : "#f4edf4",
                color: loading ? "#978a99" : "#08070a",
                border: "none",
                borderRadius: 999,
                padding: "11px 18px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Finding…" : "Find nearby collectors"}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              border: "1px solid rgba(255,80,120,0.35)",
              background: "rgba(255,80,120,0.08)",
              padding: 16,
              borderRadius: 16,
              marginBottom: 24,
              color: "#ff9ab0",
            }}
          >
            {error}
          </div>
        )}

        {data && (
          <>
            <section
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                borderRadius: 24,
                padding: 22,
                marginBottom: 28,
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Build your collector search</h2>
                <p style={{ margin: "7px 0 0", color: "#a99daa", fontSize: 13 }}>
                  Start from your wallet collections, then add more to shape who appears below.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
                  gap: 18,
                  alignItems: "start",
                }}
              >
              {availableRooms.length > 0 && (
                <section
                  style={{
                    border: "1px solid rgba(255,255,255,0.085)",
                    background:
                      "radial-gradient(circle at 24% 0%, rgba(236,72,153,0.075), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018))",
                    borderRadius: 24,
                    padding: 18,
                    marginBottom: 0,
                    boxShadow: "0 18px 42px rgba(0,0,0,0.18)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h2 style={{ margin: 0, fontSize: 20 }}>Your search collections</h2>
                        <span
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 3,
                            border: "1px solid rgba(164,139,255,0.34)",
                            background: "rgba(108,79,255,0.16)",
                            color: "#d9d0ff",
                            borderRadius: 14,
                            padding: "7px 10px",
                            fontSize: 11,
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <strong style={{ color: "#f1ecff", fontSize: 12 }}>
                            {focusedSlugs.length} / 10 selected
                          </strong>
                          <span style={{ color: "#a99ee8", fontSize: 10 }}>
                            {focusedSlugs.length >= 10
                              ? "Collection limit reached"
                              : focusedSlugs.length === 0
                                ? "Choose at least one collection"
                                : `Add up to ${10 - focusedSlugs.length} more`}
                          </span>
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0", color: "#a99daa", fontSize: 13 }}>
                        We start with your top 15 visible collection rooms by holding count. Select up to 10 to shape who appears below.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={resetFocusRooms}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "#d8cddd",
                        borderRadius: 999,
                        padding: "8px 11px",
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Reset
                    </button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                    {walletAvailableRooms.map((room) => {
                      const mode = roomStates[room.slug] || "ignore";
                      const image = room.imageUrl || room.avatarUrl || room.bannerUrl;
                      const isFocus = mode === "focus";
                      const isExclude = mode === "exclude";

                      return (
                        <button
                          key={room.slug}
                          type="button"
                          onClick={() => cycleRoomMode(room.slug)}
                          title={isFocus ? "Click to remove from search" : "Click to add to search"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 9,
                            borderRadius: 999,
                            padding: "8px 12px 8px 8px",
                            border: isFocus
                              ? "1px solid rgba(196,171,255,0.42)"
                              : isExclude
                                ? "1px solid rgba(255,255,255,0.13)"
                                : "1px solid rgba(255,255,255,0.09)",
                            background: isFocus
                              ? "rgba(139,92,246,0.13)"
                              : isExclude
                                ? "rgba(255,255,255,0.022)"
                                : "rgba(255,255,255,0.026)",
                            color: isFocus ? "#f3edf8" : isExclude ? "#9c8f9f" : "#8d808f",
                            cursor: "pointer",
                            maxWidth: 340,
                            outline: "none",
                            boxShadow: isFocus ? "0 0 0 1px rgba(196,171,255,0.10)" : "none",
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: "rgba(255,255,255,0.08)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                              fontSize: 10,
                            }}
                          >
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              "✦"
                            )}
                          </span>

                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 12,
                            }}
                          >
                            {room.name || room.slug}{typeof room.heldCount === "number" && room.heldCount > 0 ? ` · ${room.heldCount} held` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {addedRooms.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ margin: "0 0 8px", color: "#a99daa", fontSize: 12 }}>
                        Added rooms
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {addedRooms.map((room) => (
                          <button
                            key={room.slug}
                            type="button"
                            onClick={() => removeOutsideRoom(room.slug)}
                            title="Remove added collection"
                            style={{
                              border: "1px solid rgba(164,139,255,0.42)",
                              background: "rgba(108,79,255,0.18)",
                              color: "#f1ecff",
                              borderRadius: 999,
                              padding: "7px 10px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {room.name || room.slug} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section
                style={{
                  border: "1px solid rgba(255,255,255,0.075)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.014))",
                  borderRadius: 24,
                  padding: 18,
                  marginBottom: 28,
                  boxShadow: "0 14px 34px rgba(0,0,0,0.14)",
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Explore more collections</h2>
                  <p style={{ margin: "6px 0 0", color: "#a99daa", fontSize: 13 }}>
                    Search any collection to add it to this search, whether or not it appears in your top holdings.
                  </p>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    value={collectionSearchQuery}
                    onChange={(event) => setCollectionSearchQuery(event.target.value)}
                    placeholder="Search collections…"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#120f15",
                      color: "#f4edf4",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 14,
                      padding: "13px 15px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />

                  {!collectionSearchQuery && collectionSearchResults.length === 0 && !collectionSearchMessage && (
                    <p style={{ margin: "10px 0 0", color: "#8f8292", fontSize: 12 }}>
                      Added collections will appear on the left.
                    </p>
                  )}

                  {(collectionSearchLoading || collectionSearchResults.length > 0 || collectionSearchMessage) && (
                    <div
                      style={{
                        marginTop: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "#100d13",
                        borderRadius: 18,
                        overflow: "hidden",
                      }}
                    >
                      {collectionSearchLoading && (
                        <p style={{ margin: 0, padding: 13, color: "#a99daa", fontSize: 13 }}>
                          Searching…
                        </p>
                      )}

                      {!collectionSearchLoading && collectionSearchResults.map((room) => {
                        const image = room.imageUrl || room.avatarUrl || room.bannerUrl;
                        const alreadyAdded = availableRooms.some((existing) => existing.slug === room.slug);
                        const mode = room.slug ? roomStates[room.slug] : undefined;

                        return (
                          <button
                            key={room.slug}
                            type="button"
                            onClick={() => addOutsideRoom(room)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "11px 13px",
                              background: "transparent",
                              border: "none",
                              borderBottom: "1px solid rgba(255,255,255,0.07)",
                              color: "#f4edf4",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <span
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  background: "rgba(255,255,255,0.08)",
                                  display: "grid",
                                  placeItems: "center",
                                  flexShrink: 0,
                                  color: "#817583",
                                }}
                              >
                                {image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={image}
                                    alt=""
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  "✦"
                                )}
                              </span>

                              <span style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    display: "block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: 14,
                                  }}
                                >
                                  {room.name || room.slug}
                                </span>
                                <span style={{ display: "block", color: "#8f8292", fontSize: 11 }}>
                                  {room.slug}
                                </span>
                              </span>
                            </span>

                            <span style={{ color: alreadyAdded ? "#a99daa" : "#d8cddd", fontSize: 12, flexShrink: 0 }}>
                              {mode === "focus" ? "Focused" : alreadyAdded ? "Added" : "+ Focus"}
                            </span>
                          </button>
                        );
                      })}

                      {!collectionSearchLoading && collectionSearchMessage && (
                        <p style={{ margin: 0, padding: 13, color: "#a99daa", fontSize: 13 }}>
                          {collectionSearchMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  marginTop: 18,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.026)",
                  borderRadius: 18,
                  flexWrap: "wrap",
                }}
              >
                  <div>
                    <p style={{ margin: "5px 0 0", color: "#c8bdca", fontSize: 13 }}>
                      Ready to search with these collections?
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={findCollectors}
                    disabled={loading || focusedSlugs.length === 0}
                    style={{
                      background: loading || focusedSlugs.length === 0 ? "#312636" : "#f4edf4",
                      color: loading || focusedSlugs.length === 0 ? "#978a99" : "#08070a",
                      border: "none",
                      borderRadius: 999,
                      padding: "11px 18px",
                      minWidth: 168,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: loading || focusedSlugs.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Finding…" : "Find nearby collectors"}
                  </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                  justifyContent: "space-between",
                  gap: 16,
                  marginTop: 6,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>Collectors in Your Orbit</h2>
                  <p style={{ margin: "7px 0 0", color: "#a99daa", fontSize: 13 }}>
                    {loading ? "Updating this scenario…" : focusedSlugs.length > 0
                      ? `These collectors share your selected rooms. Signal reflects overlap breadth, holding depth, and how specific the match appears.`
                      : "Collectors who overlap with the rooms currently shaping this search."}
                  </p>
                </div>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: hideInstitutional ? "#f0d6ff" : "#b7aab8",
                    fontSize: 13,
                    cursor: "pointer",
                    userSelect: "none",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: hideInstitutional ? "rgba(126,87,194,0.18)" : "rgba(255,255,255,0.04)",
                    borderRadius: 999,
                    padding: "8px 11px",
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1 }}>🏛</span>
                  <span>Hide institutional wallets</span>
                  <input
                    type="checkbox"
                    checked={hideInstitutional}
                    onChange={(event) => setHideInstitutional(event.target.checked)}
                    style={{ accentColor: "#8f6bea", margin: 0 }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(292px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleCandidates.map((candidate, index) => {
                  const rawScore = orbitScore(candidate);
                  const score = displayOrbitPercent(index);
                  const institutional = looksInstitutional(candidate);
                  const sharedRooms = candidate.sharedSeedCollections || [];
                  const visibleSharedRooms = sharedRooms;
                  const hiddenSharedRoomCount = 0;
                  const sharedCount = candidate.sharedSeedCount || sharedRooms.length;
                  const selectedCount = Math.max(focusedSlugs.length, activeFocusCount, sharedCount);
                  const signalStrength = signalStrengthLabel(sharedCount);
                  const signalType = signalTypeLabel(candidate, selectedCount);
                  return (
                    <article
                      key={candidate.wallet}
                      style={{
                        border: "1px solid rgba(255,255,255,0.085)",
                        background:
                          "radial-gradient(circle at 50% 0%, rgba(142, 99, 255, 0.12), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))",
                        borderRadius: 24,
                        padding: 0,
                        position: "relative",
                        overflow: "visible",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 520,
                        boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
                      }}
                    >
                      <div
                        style={{
                          height: 84,
                          background: candidate.bannerUrl
                            ? undefined
                            : "linear-gradient(135deg, rgba(73,54,86,0.42), rgba(12,10,15,0.96))",
                          backgroundImage: candidate.bannerUrl ? `url(${candidate.bannerUrl})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          top: -10,
                          right: -10,
                          width: 70,
                          height: 70,
                          borderRadius: "50%",
                          border: "1px solid rgba(232,200,255,0.32)",
                          background: "rgba(14,10,18,0.82)",
                          boxShadow: "0 16px 38px rgba(0,0,0,0.42)",
                          backdropFilter: "blur(8px)",
                          display: "grid",
                          placeItems: "center",
                          color: "#f0d6ff",
                          zIndex: 2,
                        }}
                      >
                        <div style={{ textAlign: "center", lineHeight: 1 }}>
                          <div style={{ fontWeight: 850, fontSize: 20 }}>{score}%</div>
                          <div style={{ fontSize: 9, color: "#c8b7cf", marginTop: 5 }}>
                            SIGNAL
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 14,
                          minHeight: 84,
                          padding: "10px 16px 8px",
                          background: "rgba(16,12,20,0.92)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div style={{ display: "flex", gap: 13, alignItems: "flex-start", minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 7,
                              width: 76,
                              flexShrink: 0,
                            }}
                          >
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 16,
                              overflow: "hidden",
                              background: "#1a141e",
                              border: "1px solid rgba(255,255,255,0.12)",
                              display: "grid",
                              placeItems: "center",
                              color: "#7e7081",
                              flexShrink: 0,
                            }}
                          >
                            {candidate.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={candidate.avatarUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              "✦"
                            )}
                          </div>

                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                minWidth: 0,
                              }}
                            >
                              <h3
                                title={candidate.displayName || shortWallet(candidate.wallet)}
                                style={{
                                  margin: 0,
                                  fontSize: 17,
                                  lineHeight: 1.15,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "100%",
                                }}
                              >
                                {candidate.displayName || shortWallet(candidate.wallet)}
                              </h3>

                              <button
                                type="button"
                                onClick={() => navigator.clipboard?.writeText(candidate.wallet)}
                                title="Copy wallet address"
                                aria-label="Copy wallet address"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 8,
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  background: "rgba(255,255,255,0.04)",
                                  color: "#a99daa",
                                  display: "grid",
                                  placeItems: "center",
                                  cursor: "pointer",
                                  flexShrink: 0,
                                  padding: 0,
                                  fontSize: 13,
                                }}
                              >
                                ⧉
                              </button>
                            </div>

                            {(candidate.socialLinks && candidate.socialLinks.length > 0) || formatJoinedDate(candidate.joinedDate) ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  marginTop: 8,
                                  width: "100%",
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    minWidth: 0,
                                  }}
                                >
                                  {candidate.socialLinks && candidate.socialLinks.length > 0 && (
                                    <SocialLinkPills links={candidate.socialLinks} />
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    flexShrink: 0,
                                  }}
                                >
                                  {institutional && (
                                    <span
                                      aria-label="Likely institutional wallet"
                                      tabIndex={0}
                                      onMouseEnter={() => setActiveVaultTooltipWallet(candidate.wallet)}
                                      onMouseLeave={() => setActiveVaultTooltipWallet(null)}
                                      onFocus={() => setActiveVaultTooltipWallet(candidate.wallet)}
                                      onBlur={() => setActiveVaultTooltipWallet(null)}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 22,
                                        height: 22,
                                        borderRadius: 999,
                                        background: "rgba(255,255,255,0.065)",
                                        border: "1px solid rgba(255,255,255,0.16)",
                                        color: "#cbbfd0",
                                        fontSize: 11,
                                        lineHeight: 1,
                                        cursor: "help",
                                        position: "relative",
                                      }}
                                    >
                                      🏛
                                      {activeVaultTooltipWallet === candidate.wallet && (
                                        <span
                                          role="tooltip"
                                          style={{
                                            position: "absolute",
                                            left: "50%",
                                            bottom: "calc(100% + 8px)",
                                            transform: "translateX(-50%)",
                                            width: 220,
                                            padding: "8px 10px",
                                            borderRadius: 10,
                                            border: "1px solid rgba(255,255,255,0.14)",
                                            background: "rgba(18,15,21,0.96)",
                                            color: "#f0e7f1",
                                            fontSize: 11,
                                            lineHeight: 1.35,
                                            boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
                                            zIndex: 20,
                                            pointerEvents: "none",
                                            textAlign: "left",
                                          }}
                                        >
                                          Likely institutional wallet. Hide these with the filter above.
                                        </span>
                                      )}
                                    </span>
                                  )}

                                  {formatJoinedDate(candidate.joinedDate) && (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 999,
                                        padding: "4px 8px",
                                        background: "rgba(108, 79, 255, 0.32)",
                                        border: "1px solid rgba(164, 139, 255, 0.5)",
                                        color: "#f1ecff",
                                        fontSize: 10,
                                        lineHeight: 1,
                                        whiteSpace: "nowrap",
                                        boxSizing: "border-box",
                                      }}
                                    >
                                      {formatJoinedDate(candidate.joinedDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                      </div>

                      <div
                        style={{
                          padding: "10px 16px 0",
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}
                      >
                        <div style={{ marginBottom: 14 }}>
                        <div
                          title="Signal is a directional match score based on shared selected collections, holding depth, and collection specificity. It is not a ranking of taste, status, or wallet value."
                          style={{
                            border: "1px solid rgba(232,200,255,0.14)",
                            background: "rgba(232,200,255,0.045)",
                            borderRadius: 16,
                            padding: "11px 12px",
                            marginBottom: 12,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#f0d6ff",
                              fontSize: 13,
                              fontWeight: 800,
                              letterSpacing: "0.01em",
                            }}
                          >
                            {signalStrength} · {signalType}
                          </p>
                          <p style={{ margin: "5px 0 0", color: "#b9adb9", fontSize: 12, lineHeight: 1.45 }}>
                            Shares {sharedCount} / {selectedCount} selected collection{selectedCount === 1 ? "" : "s"}.
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            margin: "0 0 8px",
                          }}
                        >
                          <p style={{ margin: 0, color: "#817583", fontSize: 12 }}>
                            Shared rooms
                          </p>
                          <p style={{ margin: 0, color: "#7d717f", fontSize: 11 }}>
                            {candidate.sharedSeedCount || sharedRooms.length} total
                          </p>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gap: 9,
                          }}
                        >
                          {visibleSharedRooms.map((slug) => {
                            const collection = collectionMap.get(slug);
                            const image = collectionImage(collection);
                            const roomName = collection?.name || label(collection?.slug || slug);
                            const count = candidate.sharedRoomHoldings?.[slug] || 1;

                            return (
                              <a
                                key={`${candidate.wallet}-${slug}`}
                                href={collectionUrl(collection, slug)}
                                target="_blank"
                                rel="noreferrer"
                                title={`${roomName} · ${count} held`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "44px 22px minmax(0, 1fr)",
                                  alignItems: "center",
                                  gap: 9,
                                  minHeight: 36,
                                  border: "1px solid rgba(255,255,255,0.085)",
                                  background: "rgba(255,255,255,0.026)",
                                  borderRadius: 14,
                                  padding: "5px 8px 5px 6px",
                                  color: "#eee5ef",
                                  fontSize: 12,
                                  textDecoration: "none",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: 26,
                                    minWidth: 38,
                                    borderRadius: 10,
                                    background: "rgba(164,139,255,0.2)",
                                    border: "1px solid rgba(164,139,255,0.34)",
                                    color: "#f1ecff",
                                    fontSize: 14,
                                    fontWeight: 850,
                                    lineHeight: 1,
                                  }}
                                >
                                  {count}
                                </span>

                                <span
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "#1b1520",
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#817583",
                                  }}
                                >
                                  {image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={image}
                                      alt=""
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  ) : (
                                    "✦"
                                  )}
                                </span>

                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: 12,
                                  }}
                                >
                                  {roomName}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      </div>

                      

                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                          padding: 16,
                          marginTop: "auto",
                          borderTop: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(0,0,0,0.2)",
                        }}
                      >
                        {candidate.openseaUrl && (
                          <a
                            href={candidate.openseaUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "#08070a",
                              background: "#f4edf4",
                              borderRadius: 999,
                              padding: "9px 12px",
                              fontSize: 13,
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            View profile
                          </a>
                        )}

                        <a
                          href={`/compare?a=${encodeURIComponent(joinedWallets)}&b=${candidate.wallet}`}
                          style={{
                            color: "#f4edf4",
                            border: "1px solid rgba(255,255,255,0.16)",
                            borderRadius: 999,
                            padding: "9px 12px",
                            fontSize: 13,
                            textDecoration: "none",
                          }}
                        >
                          Compare with me
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
