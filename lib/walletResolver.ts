const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

export type WalletResolveSuccessType =
  | "address"
  | "ens"
  | "opensea_url"
  | "opensea_username";

export type WalletResolveFailureType = "empty" | "invalid" | "unresolved";

export type WalletResolveSource = "input" | "opensea_rest";

export type WalletResolveSuccess = {
  ok: true;
  input: string;
  address: string;
  type: WalletResolveSuccessType;
  ensName?: string;
  openseaUsername?: string;
  displayName?: string;
  avatarUrl?: string;
  openseaUrl?: string;
  source: WalletResolveSource;
};

export type WalletResolveFailure = {
  ok: false;
  input: string;
  type: WalletResolveFailureType;
  error: "missing_input" | "invalid_input" | "resolution_failed";
  message: string;
};

export type WalletResolveResult = WalletResolveSuccess | WalletResolveFailure;

type OpenSeaAccountResolveResponse = {
  address?: string | null;
  account?: {
    address?: string | null;
    username?: string | null;
    name?: string | null;
    profile_image_url?: string | null;
  } | null;
  user?: {
    username?: string | null;
    name?: string | null;
  } | null;
  username?: string | null;
  name?: string | null;
  profile_image_url?: string | null;
};

type OpenSeaAccountProfileResponse = {
  username?: string | null;
  name?: string | null;
  profile_image_url?: string | null;
  account?: {
    username?: string | null;
    name?: string | null;
    profile_image_url?: string | null;
  } | null;
  user?: {
    username?: string | null;
    name?: string | null;
  } | null;
};

type OpenSeaIdentity = {
  openseaUsername?: string;
  displayName?: string;
  avatarUrl?: string;
};

type ParsedWalletInput =
  | { ok: true; query: string; type: WalletResolveSuccessType; ensName?: string }
  | { ok: false; type: WalletResolveFailureType; error: "missing_input" | "invalid_input"; message: string };

export function isEthAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isEnsName(value: string) {
  return /^[a-zA-Z0-9-]+\.eth$/i.test(value.trim());
}

function isPlainOpenSeaHandle(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value.trim());
}

function cleanIdentityValue(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed || undefined;
}

function pickIdentity(data?: OpenSeaAccountResolveResponse | OpenSeaAccountProfileResponse | null): OpenSeaIdentity {
  if (!data) return {};

  const openseaUsername =
    cleanIdentityValue(data.username) ||
    cleanIdentityValue(data.account?.username) ||
    cleanIdentityValue(data.user?.username);

  const displayName =
    cleanIdentityValue(data.name) ||
    cleanIdentityValue(data.account?.name) ||
    cleanIdentityValue(data.username) ||
    cleanIdentityValue(data.account?.username) ||
    cleanIdentityValue(data.user?.name) ||
    cleanIdentityValue(data.user?.username);

  const avatarUrl =
    cleanIdentityValue(data.profile_image_url) ||
    cleanIdentityValue(data.account?.profile_image_url);

  return { openseaUsername, displayName, avatarUrl };
}

async function fetchOpenSeaJson<T>(path: string): Promise<T | null> {
  if (!OPENSEA_API_KEY) return null;

  try {
    const res = await fetch(`${OPENSEA_BASE_URL}${path}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-api-key": OPENSEA_API_KEY,
      },
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function parseOpenSeaUrl(value: string): ParsedWalletInput | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const isOpenSeaHost = host === "opensea.io" || host === "www.opensea.io";
  if (!isOpenSeaHost) {
    return {
      ok: false,
      type: "invalid",
      error: "invalid_input",
      message: "Enter an Ethereum address, ENS name, or OpenSea profile URL.",
    };
  }

  const queryCandidates = [
    parsed.searchParams.get("addresses"),
    parsed.searchParams.get("address"),
    parsed.searchParams.get("owner"),
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  for (const candidate of queryCandidates) {
    const trimmed = candidate.trim();
    if (isEthAddress(trimmed)) return { ok: true, query: trimmed, type: "opensea_url" };
    if (isEnsName(trimmed)) return { ok: true, query: trimmed, type: "opensea_url", ensName: trimmed };
  }

  const pathSegments = parsed.pathname.split("/").map((part) => part.trim()).filter(Boolean);
  const unsupportedOpenSeaPaths = new Set(["assets", "item", "collection", "collections"]);
  if (pathSegments[0] && unsupportedOpenSeaPaths.has(pathSegments[0].toLowerCase())) {
    return {
      ok: false,
      type: "invalid",
      error: "invalid_input",
      message: "This OpenSea URL is not a wallet or profile URL.",
    };
  }

  const profileSegment = pathSegments.find((segment) => isEthAddress(segment) || isEnsName(segment));
  if (profileSegment) {
    return {
      ok: true,
      query: profileSegment,
      type: "opensea_url",
      ensName: isEnsName(profileSegment) ? profileSegment : undefined,
    };
  }

  const lastSegment = pathSegments[pathSegments.length - 1] || "";
  if (lastSegment && isPlainOpenSeaHandle(lastSegment)) {
    return { ok: true, query: lastSegment, type: "opensea_username" };
  }

  return {
    ok: false,
    type: "invalid",
    error: "invalid_input",
    message: "This OpenSea URL does not contain a usable wallet or profile identifier.",
  };
}

function parseWalletInput(input: string): ParsedWalletInput {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      type: "empty",
      error: "missing_input",
      message: "Missing wallet input.",
    };
  }

  if (isEthAddress(trimmed)) {
    return { ok: true, query: trimmed, type: "address" };
  }

  if (isEnsName(trimmed)) {
    return { ok: true, query: trimmed, type: "ens", ensName: trimmed };
  }

  const urlParseResult = parseOpenSeaUrl(trimmed);
  if (urlParseResult) return urlParseResult;

  if (isPlainOpenSeaHandle(trimmed)) {
    return { ok: true, query: trimmed, type: "opensea_username" };
  }

  return {
    ok: false,
    type: "invalid",
    error: "invalid_input",
    message: "Enter an Ethereum address, ENS name, or OpenSea profile URL.",
  };
}

async function resolveAddressViaOpenSea(query: string) {
  const data = await fetchOpenSeaJson<OpenSeaAccountResolveResponse>(
    `/accounts/resolve/${encodeURIComponent(query)}`
  );
  const address = cleanIdentityValue(data?.address || data?.account?.address);
  if (!address || !isEthAddress(address)) return null;
  return {
    address,
    identity: pickIdentity(data),
  };
}

async function fetchOpenSeaIdentity(address: string) {
  const data = await fetchOpenSeaJson<OpenSeaAccountProfileResponse>(
    `/accounts/${encodeURIComponent(address)}`
  );
  return pickIdentity(data);
}

export async function resolveWalletInput(input: string): Promise<WalletResolveResult> {
  const parsed = parseWalletInput(input);
  if (!parsed.ok) {
    return { ok: false, input, type: parsed.type, error: parsed.error, message: parsed.message };
  }

  if (parsed.type === "address" || (parsed.type === "opensea_url" && isEthAddress(parsed.query))) {
    const identity = await fetchOpenSeaIdentity(parsed.query);
    return {
      ok: true,
      input,
      address: parsed.query,
      type: parsed.type,
      ...identity,
      openseaUrl: `https://opensea.io/${parsed.query}`,
      source: "input",
    };
  }

  const resolved = await resolveAddressViaOpenSea(parsed.query);
  if (!resolved) {
    return {
      ok: false,
      input,
      type: "unresolved",
      error: "resolution_failed",
      message: "Could not confirm a wallet address for this input.",
    };
  }

  const profileIdentity = await fetchOpenSeaIdentity(resolved.address);
  const identity = {
    ...resolved.identity,
    ...Object.fromEntries(
      Object.entries(profileIdentity).filter(([, value]) => Boolean(value))
    ),
  };

  return {
    ok: true,
    input,
    address: resolved.address,
    type: parsed.type,
    ensName: parsed.ensName || (isEnsName(parsed.query) ? parsed.query : undefined),
    ...identity,
    openseaUrl: `https://opensea.io/${resolved.address}`,
    source: "opensea_rest",
  };
}
