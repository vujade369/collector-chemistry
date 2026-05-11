import { fetchAndMergeWalletNFTsWithDebug, WalletOwnerNFT } from "@/lib/fetchWalletNFTs";

const ALCHEMY_API_KEY_ENV = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY_ENV = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const MAX_OWNER_PAGES = 1;

export type OrbitCollection = {
  slug: string;
  name: string;
  contractAddress: string;
  heldCount: number;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  openseaUrl?: string | null;
};

export type OrbitSeedCollection = OrbitCollection & {
  holderCount: number;
  specificityScore: number;
};

export type CandidateStrength = "strong" | "nearby" | "light";

export type OrbitSocialLink = {
  label: string;
  url: string;
  kind: "x" | "instagram" | "website" | "other";
};

export type OrbitCandidate = {
  wallet: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  bioDisplay: string;
  joinedDate: string | null;
  openseaUrl: string;
  socialLinks: OrbitSocialLink[];
  strength: CandidateStrength;
  sharedSeedCollections: string[];
  sharedSeedCount: number;
  score: number;
  proof: string;
};

export type OrbitDebug = {
  seedLimit: number;
  resultLimit: number;
  maxOwnerPages: number;
  timing: {
    walletFetchMs: number;
    holderDiscoveryMs: number;
    profileEnrichmentMs: number;
    totalMs: number;
  };
  failedCollections: string[];
  failedProfiles: string[];
};

export type OrbitResponse = {
  wallets: string[];
  displayTopCollections: OrbitCollection[];
  showMoreCollections: OrbitCollection[];
  orbitSeedCollections: OrbitSeedCollection[];
  candidates: OrbitCandidate[];
  debug: OrbitDebug;
};

export type OrbitOptions = {
  seedLimit?: number;
  resultLimit?: number;
};

// --- private helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let handle: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    handle = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeout]).then((result) => {
    clearTimeout(handle);
    return result;
  });
}

function isExcludedAddress(address: string, enteredWallets: Set<string>): boolean {
  const lower = address.toLowerCase();
  if (lower === ZERO_ADDRESS || lower === BURN_ADDRESS) return true;
  return enteredWallets.has(lower);
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeSocialHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^@/, "");
  return trimmed || null;
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function buildSocialLinks(accountData: OpenSeaAccountData | null): OrbitSocialLink[] {
  if (!accountData) return [];

  const links: OrbitSocialLink[] = [];
  const seen = new Set<string>();

  function add(label: string, url: string | null, kind: OrbitSocialLink["kind"]) {
    if (!url) return;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ label, url, kind });
  }

  add("Web", normalizeUrl((accountData as any).website), "website");

  const socialMediaAccounts = (accountData as any).social_media_accounts;
  if (Array.isArray(socialMediaAccounts)) {
    for (const item of socialMediaAccounts) {
      const platform = String(item?.platform || item?.provider || item?.site || "").toLowerCase();
      const username = normalizeSocialHandle(item?.username || item?.handle);
      const url = normalizeUrl(item?.url);

      if (platform.includes("twitter") || platform === "x") {
        add("X", url || (username ? `https://x.com/${username}` : null), "x");
      } else if (platform.includes("instagram")) {
        add("IG", url || (username ? `https://instagram.com/${username}` : null), "instagram");
      } else if (url) {
        add("Link", url, "other");
      }
    }
  }

  return links.slice(0, 3);
}

type OpenSeaCollectionDisplay = {
  name: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  openseaUrl?: string | null;
};

async function fetchOpenSeaCollectionDisplay(
  slug: string,
  openseaApiKey: string | undefined
): Promise<OpenSeaCollectionDisplay | null> {
  if (!slug || !openseaApiKey) return null;

  try {
    const res = await fetch(`${OPENSEA_BASE_URL}/collections/${encodeURIComponent(slug)}`, {
      headers: { "x-api-key": openseaApiKey },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();

    return {
      name: pickString(json.name, json?.collection?.name),
      imageUrl: pickString(
        json.image_url,
        json.imageUrl,
        json.image,
        json.display_image_url,
        json.large_image_url,
        json?.collection?.image_url,
        json?.collection?.imageUrl,
        json?.collection?.image
      ),
      avatarUrl: pickString(
        json.avatar_url,
        json.avatarUrl,
        json?.collection?.avatar_url,
        json?.collection?.avatarUrl
      ),
      bannerUrl: pickString(
        json.banner_image_url,
        json.bannerImageUrl,
        json.banner_url,
        json?.collection?.banner_image_url,
        json?.collection?.bannerImageUrl,
        json?.collection?.banner_url
      ),
      openseaUrl:
        pickString(json.opensea_url, json.openseaUrl, json?.collection?.opensea_url) ||
        `https://opensea.io/collection/${slug}`,
    };
  } catch {
    return null;
  }
}

async function enrichOrbitCollections<T extends OrbitCollection>(
  collections: T[],
  openseaApiKey: string | undefined
): Promise<T[]> {
  if (!collections.length) return collections;

  const displays = await Promise.all(
    collections.map((collection) =>
      withTimeout(fetchOpenSeaCollectionDisplay(collection.slug, openseaApiKey), 2500, null)
    )
  );

  return collections.map((collection, index) => {
    const display = displays[index];

    return {
      ...collection,
      name: display?.name || collection.name,
      imageUrl: display?.imageUrl || collection.imageUrl || null,
      avatarUrl: display?.avatarUrl || collection.avatarUrl || null,
      bannerUrl: display?.bannerUrl || collection.bannerUrl || null,
      openseaUrl:
        display?.openseaUrl ||
        collection.openseaUrl ||
        (collection.slug ? `https://opensea.io/collection/${collection.slug}` : null),
    };
  });
}

function shortenWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function computeSpecificityScore(holderCount: number): number {
  return 1 / Math.max(Math.log10(holderCount + 10), 1);
}

function computeCandidateStrength(sharedSeedCount: number): CandidateStrength | null {
  if (sharedSeedCount >= 6) return "strong";
  if (sharedSeedCount >= 4) return "nearby";
  if (sharedSeedCount >= 2) return "light";
  return null;
}

function getContractAddressFromNFT(nft: WalletOwnerNFT): string {
  const contract = nft.contract as { address?: string } | undefined;
  return String(contract?.address || "").toLowerCase();
}

function getCollectionSlugFromNFT(nft: WalletOwnerNFT): string {
  const n = nft as Record<string, unknown>;

  // Set on OpenSea fallback path
  const displaySlug = String(n.displayCollectionSlug || "").trim();
  if (displaySlug) return displaySlug.toLowerCase();

  // Alchemy v3 includes openSeaMetadata on the contract object
  const contract = nft.contract as { address?: string; openSeaMetadata?: { collectionSlug?: string } } | undefined;
  const alchemySlug = String(contract?.openSeaMetadata?.collectionSlug || "").trim();
  if (alchemySlug) return alchemySlug.toLowerCase();

  // Alchemy v3 also has collection.slug at the top level
  const collection = n.collection as { slug?: string; name?: string } | string | undefined;
  if (collection && typeof collection === "object") {
    const collSlug = String(collection.slug || "").trim();
    if (collSlug) return collSlug.toLowerCase();
  }

  return "";
}

function getCollectionNameFromNFT(nft: WalletOwnerNFT): string {
  const n = nft as Record<string, unknown>;

  const displayName = String(n.displayCollectionName || "").trim();
  if (displayName) return displayName;

  const contract = nft.contract as {
    address?: string;
    name?: string;
    openSeaMetadata?: { collectionName?: string };
  } | undefined;

  const alchemyMeta = String(contract?.openSeaMetadata?.collectionName || "").trim();
  if (alchemyMeta) return alchemyMeta;

  const contractName = String(contract?.name || "").trim();
  if (contractName) return contractName;

  const collection = n.collection as { name?: string } | string | undefined;
  if (collection && typeof collection === "object") {
    const collName = String(collection.name || "").trim();
    if (collName) return collName;
  }

  return "";
}

type RawCollection = {
  contractAddress: string;
  slug: string;
  name: string;
  heldCount: number;
};

function buildTopCollectionsFromNFTs(nfts: WalletOwnerNFT[]): RawCollection[] {
  const collectionMap = new Map<string, RawCollection>();

  for (const nft of nfts) {
    const contractAddress = getContractAddressFromNFT(nft);
    if (!contractAddress) continue;

    const existing = collectionMap.get(contractAddress);
    if (existing) {
      existing.heldCount += 1;
      if (!existing.slug) {
        const slug = getCollectionSlugFromNFT(nft);
        if (slug) existing.slug = slug;
      }
      if (!existing.name) {
        const name = getCollectionNameFromNFT(nft);
        if (name) existing.name = name;
      }
    } else {
      collectionMap.set(contractAddress, {
        contractAddress,
        slug: getCollectionSlugFromNFT(nft),
        name: getCollectionNameFromNFT(nft),
        heldCount: 1,
      });
    }
  }

  return [...collectionMap.values()]
    .filter((c) => c.contractAddress)
    .sort((a, b) => b.heldCount - a.heldCount);
}

type AlchemyOwnersResponse = {
  owners?: string[];
};

async function fetchOwnersForContract(
  contractAddress: string,
  alchemyApiKey: string
): Promise<{ owners: string[]; failed: boolean }> {
  const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/getOwnersForContract?contractAddress=${contractAddress}&withTokenBalances=false`;
  const fallback = { owners: [] as string[], failed: true };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const request = fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return { ok: false, status: res.status, owners: [] as string[] };
        try {
          const data = (await res.json()) as AlchemyOwnersResponse;
          return { ok: true, status: res.status, owners: Array.isArray(data.owners) ? data.owners : [] };
        } catch {
          return { ok: false, status: res.status, owners: [] as string[] };
        }
      })
      .catch(() => ({ ok: false, status: 0, owners: [] as string[] }));

    const result = await withTimeout(request, 10_000, { ok: false, status: 0, owners: [] as string[] });

    if (result.ok) return { owners: result.owners, failed: false };

    const canRetry = attempt < 3 && (result.status === 0 || result.status === 429 || result.status >= 500);
    if (!canRetry) return fallback;
    await sleep(1000 * attempt);
  }

  return fallback;
}

type OpenSeaAccountData = {
  username?: string | null;
  name?: string | null;
  profile_image_url?: string | null;
  banner_image_url?: string | null;
  bio?: string | null;
  account?: { username?: string | null; name?: string | null } | null;
  user?: { username?: string | null; name?: string | null } | null;
};

async function fetchOpenSeaAccount(
  address: string,
  apiKey: string
): Promise<OpenSeaAccountData | null> {
  const url = `${OPENSEA_BASE_URL}/accounts/${address}`;
  const fallback = { ok: false, status: 0, data: null as OpenSeaAccountData | null };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const request = fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json", "X-API-KEY": apiKey },
    })
      .then(async (res) => {
        if (!res.ok) return { ok: false, status: res.status, data: null as OpenSeaAccountData | null };
        try {
          const data = (await res.json()) as OpenSeaAccountData;
          return { ok: true, status: res.status, data };
        } catch {
          return { ok: false, status: res.status, data: null as OpenSeaAccountData | null };
        }
      })
      .catch(() => fallback);

    const result = await withTimeout(request, 6_000, fallback);

    if (result.ok) return result.data;

    const canRetry = attempt < 2 && (result.status === 0 || result.status === 429 || result.status >= 500);
    if (!canRetry) return null;
    await sleep(800);
  }

  return null;
}

// --- main export ---

export async function findCollectorsInOrbit(
  wallets: string[],
  options: OrbitOptions = {}
): Promise<OrbitResponse> {
  const totalStart = Date.now();
  const alchemyApiKey = ALCHEMY_API_KEY_ENV;
  const openseaApiKey = OPENSEA_API_KEY_ENV;

  const seedLimit = Math.min(options.seedLimit ?? 10, 10);
  const resultLimit = Math.min(options.resultLimit ?? 10, 20);

  const normalizedWallets = wallets.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const enteredWalletSet = new Set(normalizedWallets);

  const debugState: OrbitDebug = {
    seedLimit,
    resultLimit,
    maxOwnerPages: MAX_OWNER_PAGES,
    timing: { walletFetchMs: 0, holderDiscoveryMs: 0, profileEnrichmentMs: 0, totalMs: 0 },
    failedCollections: [],
    failedProfiles: [],
  };

  // Step 1: Fetch merged wallet NFTs
  const walletFetchStart = Date.now();
  const { mergedNFTs } = await fetchAndMergeWalletNFTsWithDebug(wallets, alchemyApiKey);
  debugState.timing.walletFetchMs = Date.now() - walletFetchStart;

  // Step 2: Build top collections from merged inventory
  const allCollections = buildTopCollectionsFromNFTs(mergedNFTs);

  const displayTopCollections: OrbitCollection[] = allCollections.slice(0, 5).map((c) => ({
    slug: c.slug,
    name: c.name || c.contractAddress,
    contractAddress: c.contractAddress,
    heldCount: c.heldCount,
  }));

  const showMoreCollections: OrbitCollection[] = allCollections.slice(5, 10).map((c) => ({
    slug: c.slug,
    name: c.name || c.contractAddress,
    contractAddress: c.contractAddress,
    heldCount: c.heldCount,
  }));

  const seedCollections = allCollections.slice(0, seedLimit);

  const enrichedDisplayTopCollections = await enrichOrbitCollections(
    displayTopCollections,
    openseaApiKey
  );
  const enrichedShowMoreCollections = await enrichOrbitCollections(
    showMoreCollections,
    openseaApiKey
  );

  // Step 3: Fetch owners for each seed collection
  const holderDiscoveryStart = Date.now();

  if (!alchemyApiKey || seedCollections.length === 0) {
    debugState.failedCollections = seedCollections.map((c) => c.contractAddress);
    debugState.timing.holderDiscoveryMs = Date.now() - holderDiscoveryStart;
    debugState.timing.totalMs = Date.now() - totalStart;
    return {
      wallets: normalizedWallets,
      displayTopCollections: enrichedDisplayTopCollections,
      showMoreCollections: enrichedShowMoreCollections,
      orbitSeedCollections: [],
      candidates: [],
      debug: debugState,
    };
  }

  const ownerResults = await Promise.allSettled(
    seedCollections.map(async (collection) => {
      const result = await fetchOwnersForContract(collection.contractAddress, alchemyApiKey);
      return { collection, owners: result.owners, failed: result.failed };
    })
  );
  debugState.timing.holderDiscoveryMs = Date.now() - holderDiscoveryStart;

  // Step 4: Build candidate set and seed collection stats
  const orbitSeedCollections: OrbitSeedCollection[] = [];
  const candidateMap = new Map<string, { sharedSeedCollections: string[]; specificitySum: number }>();

  for (const result of ownerResults) {
    if (result.status === "rejected") continue;
    const { collection, owners, failed } = result.value;

    if (failed) {
      debugState.failedCollections.push(collection.contractAddress);
      continue;
    }

    const holderCount = owners.length;
    const specificityScore = computeSpecificityScore(holderCount);

    orbitSeedCollections.push({
      slug: collection.slug,
      name: collection.name || collection.contractAddress,
      contractAddress: collection.contractAddress,
      heldCount: collection.heldCount,
      imageUrl: null,
      avatarUrl: null,
      bannerUrl: null,
      openseaUrl: collection.slug ? `https://opensea.io/collection/${collection.slug}` : null,
      holderCount,
      specificityScore,
    });

    const seedIdentifier = collection.slug || collection.contractAddress;

    for (const owner of owners) {
      const ownerLower = owner.toLowerCase();
      if (isExcludedAddress(ownerLower, enteredWalletSet)) continue;

      const existing = candidateMap.get(ownerLower);
      if (existing) {
        existing.sharedSeedCollections.push(seedIdentifier);
        existing.specificitySum += specificityScore;
      } else {
        candidateMap.set(ownerLower, {
          sharedSeedCollections: [seedIdentifier],
          specificitySum: specificityScore,
        });
      }
    }
  }

  // Step 5: Rank candidates by sharedSeedCount desc, then specificity sum desc
  const rankedCandidates = [...candidateMap.entries()]
    .map(([wallet, data]) => ({
      wallet,
      sharedSeedCollections: data.sharedSeedCollections,
      sharedSeedCount: data.sharedSeedCollections.length,
      score: data.specificitySum,
    }))
    .filter((c) => c.sharedSeedCount >= 2)
    .sort((a, b) => {
      if (b.sharedSeedCount !== a.sharedSeedCount) return b.sharedSeedCount - a.sharedSeedCount;
      return b.score - a.score;
    })
    .slice(0, resultLimit);

  // Step 6: Enrich with OpenSea account profile data
  const profileEnrichmentStart = Date.now();

  const profileResults = await Promise.allSettled(
    rankedCandidates.map(async (candidate) => {
      let accountData: OpenSeaAccountData | null = null;
      if (openseaApiKey) {
        accountData = await fetchOpenSeaAccount(candidate.wallet, openseaApiKey);
      }
      return { candidate, accountData };
    })
  );

  debugState.timing.profileEnrichmentMs = Date.now() - profileEnrichmentStart;

  const enrichedCandidates: OrbitCandidate[] = [];

  for (const result of profileResults) {
    if (result.status === "rejected") continue;
    const { candidate, accountData } = result.value;

    if (!accountData) {
      debugState.failedProfiles.push(candidate.wallet);
    }

    const username = accountData
      ? [accountData.username, accountData.account?.username, accountData.user?.username]
          .map((v) => String(v || "").trim())
          .find(Boolean) || null
      : null;

    const avatarUrl = accountData?.profile_image_url || null;
    const bannerUrl = accountData?.banner_image_url || null;
    const bio = accountData?.bio ? String(accountData.bio).trim() || null : null;
    const joinedDate = (accountData as any)?.joined_date
      ? String((accountData as any).joined_date).trim() || null
      : null;
    const displayName = username || shortenWallet(candidate.wallet);
    const openseaUrl = username
      ? `https://opensea.io/${username}`
      : `https://opensea.io/${candidate.wallet}`;
    const socialLinks = buildSocialLinks(accountData);
    const strength = computeCandidateStrength(candidate.sharedSeedCount)!;

    enrichedCandidates.push({
      wallet: candidate.wallet,
      displayName,
      username,
      avatarUrl,
      bannerUrl,
      bio,
      bioDisplay: bio || "No bio found. The signal is in the holdings.",
      joinedDate,
      openseaUrl,
      socialLinks,
      strength,
      sharedSeedCollections: candidate.sharedSeedCollections,
      sharedSeedCount: candidate.sharedSeedCount,
      score: Math.round(candidate.score * 10_000) / 10_000,
      proof: `Appears across ${candidate.sharedSeedCount} of this wallet's top collection rooms.`,
    });
  }

  const enrichedOrbitSeedCollections = await enrichOrbitCollections(
    orbitSeedCollections,
    openseaApiKey
  );

  debugState.timing.totalMs = Date.now() - totalStart;

  return {
    wallets: normalizedWallets,
    displayTopCollections: enrichedDisplayTopCollections,
    showMoreCollections: enrichedShowMoreCollections,
    orbitSeedCollections: enrichedOrbitSeedCollections,
    candidates: enrichedCandidates,
    debug: debugState,
  };
}
