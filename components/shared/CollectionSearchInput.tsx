"use client";

import { useEffect, useRef, useState } from "react";

export type CollectionSearchResult = {
  slug: string;
  name: string;
  imageUrl?: string;
  floorPriceETH?: number | null;
  openseaUrl?: string;
  verified?: boolean;
  safelistStatus?: string;
  matchConfidence?: "high" | "medium" | "low";
};

type Props = {
  onSelect: (collection: CollectionSearchResult) => void;
  onSearchPhaseChange?: (phase: "idle" | "searching") => void;
};

function getCollectionBadgeLabel(item: CollectionSearchResult): string | null {
  if (item.verified === true) return "Verified";

  const safelistStatus = String(item.safelistStatus || "").trim().toLowerCase();
  if (safelistStatus === "verified") return "Verified";
  if (safelistStatus === "approved") return "Approved";
  return null;
}

export default function CollectionSearchInput({ onSelect, onSearchPhaseChange }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollectionSearchResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      onSearchPhaseChange?.("idle");
      return;
    }

    onSearchPhaseChange?.("searching");

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/converter/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setSearchResults(json.results || []);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, onSearchPhaseChange]);

  return (
    <div className="converter-search">
      <input
        type="text"
        placeholder="Search a collection..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="converter-input"
      />

      {query.trim().length > 1 && (
        <ul className="converter-dropdown">
          {searchResults.length > 0 ? (
            searchResults.map((item) => {
              const badgeLabel = getCollectionBadgeLabel(item);

              return (
                <li key={item.slug} onClick={() => onSelect(item)}>
                  <div className="converter-row-left">
                    <div className="converter-thumb-wrap">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="converter-thumb" />
                      ) : (
                        <span className="converter-thumb-fallback">✦</span>
                      )}
                    </div>

                    <div>
                      <span className="converter-result-name">{item.name}</span>
                      <div className="converter-result-meta">
                        {badgeLabel && <span className="converter-result-badge">{badgeLabel}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li>
              <span className="converter-result-name">No collections found. Try a different name.</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
