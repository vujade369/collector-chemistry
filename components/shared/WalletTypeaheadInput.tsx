"use client";

import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type WalletSuggestion = {
  address: string;
  displayName?: string;
  openseaUsername?: string;
  ensName?: string;
  avatarUrl?: string;
  openseaUrl?: string;
  source: "exact_resolve" | "opensea_search";
};

type WalletSuggestResponse = {
  results?: WalletSuggestion[];
};

type Props = Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  onSuggestionSelect?: (suggestion: WalletSuggestion) => void;
};

function shortenAddress(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 14) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function getSuggestionName(suggestion: WalletSuggestion) {
  return (
    suggestion.displayName ||
    suggestion.openseaUsername ||
    suggestion.ensName ||
    shortenAddress(suggestion.address)
  );
}

function getSuggestionMeta(suggestion: WalletSuggestion) {
  const shortAddress = shortenAddress(suggestion.address);
  const username = suggestion.openseaUsername;
  if (username && username !== getSuggestionName(suggestion)) {
    return `${username} · ${shortAddress}`;
  }
  return shortAddress;
}

export default function WalletTypeaheadInput({
  value,
  onValueChange,
  onSuggestionSelect,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  autoComplete,
  ...inputProps
}: Props) {
  const [suggestions, setSuggestions] = useState<WalletSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cacheRef = useRef(new Map<string, WalletSuggestion[]>());
  const requestIdRef = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useMemo(() => normalizeQuery(value), [value]);
  const canSearch = query.length >= 3;
  const showDropdown = isFocused && canSearch && (loading || hasSearched || suggestions.length > 0);

  useEffect(() => {
    if (!canSearch) {
      requestIdRef.current += 1;
      return;
    }

    if (cacheRef.current.has(query)) {
      setSuggestions(cacheRef.current.get(query) || []);
      setLoading(false);
      setHasSearched(true);
      setHighlightedIndex(-1);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setHasSearched(false);
      setHighlightedIndex(-1);

      try {
        const res = await fetch(`/api/wallet/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as WalletSuggestResponse;
        const nextResults = Array.isArray(json.results) ? json.results : [];
        cacheRef.current.set(query, nextResults);
        if (requestIdRef.current !== requestId) return;
        setSuggestions(nextResults);
      } catch {
        if (requestIdRef.current !== requestId || controller.signal.aborted) return;
        cacheRef.current.set(query, []);
        setSuggestions([]);
      } finally {
        if (requestIdRef.current === requestId && !controller.signal.aborted) {
          setLoading(false);
          setHasSearched(true);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, query]);

  function selectSuggestion(suggestion: WalletSuggestion) {
    onValueChange(suggestion.address);
    onSuggestionSelect?.(suggestion);
    setSuggestions([]);
    setHasSearched(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && suggestions.length > 0 && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (showDropdown && suggestions.length > 0 && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1
      );
      return;
    }

    if (showDropdown && event.key === "Escape") {
      event.preventDefault();
      setSuggestions([]);
      setHasSearched(false);
      setHighlightedIndex(-1);
      return;
    }

    if (
      showDropdown &&
      event.key === "Enter" &&
      highlightedIndex >= 0 &&
      suggestions[highlightedIndex]
    ) {
      event.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
      return;
    }

    onKeyDown?.(event);
  }

  return (
    <div className="wallet-typeahead">
      <input
        {...inputProps}
        autoComplete={autoComplete || "off"}
        className={className}
        value={value}
        onChange={(event) => onValueChange(event.target.value, event)}
        onFocus={(event) => {
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          blurTimerRef.current = setTimeout(() => setIsFocused(false), 120);
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
      />

      {showDropdown && (
        <div className="wallet-typeahead-dropdown" role="listbox">
          {loading ? (
            <div className="wallet-typeahead-status">Looking...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.address}-${suggestion.openseaUsername || index}`}
                type="button"
                className={`wallet-typeahead-option${
                  highlightedIndex === index ? " is-active" : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                role="option"
                aria-selected={highlightedIndex === index}
              >
                <span className="wallet-typeahead-avatar" aria-hidden="true">
                  {suggestion.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={suggestion.avatarUrl} alt="" loading="lazy" />
                  )}
                  <span>{getSuggestionName(suggestion).slice(0, 1).toUpperCase() || "✦"}</span>
                </span>
                <span className="wallet-typeahead-copy">
                  <span className="wallet-typeahead-name">{getSuggestionName(suggestion)}</span>
                  <span className="wallet-typeahead-meta">{getSuggestionMeta(suggestion)}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="wallet-typeahead-status">
              No confirmed wallet found. You can still submit this.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
