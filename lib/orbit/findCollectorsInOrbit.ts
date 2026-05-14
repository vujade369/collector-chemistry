import { fetchAndMergeWalletNFTsWithDebug, WalletOwnerNFT } from "@/lib/fetchWalletNFTs";

const ALCHEMY_API_KEY_ENV = process.env.ALCHEMY_API_KEY;
const OPENSEA_API_KEY_ENV = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const DEFAULT_OWNER_PAGES = 1;
const OUTSIDE_OWNER_PAGES = 20;
const MAX_OWNER_PAGES = OUTSIDE_OWNER_PAGES;

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
  sharedRoomHoldings: Record<string, number>;
  score: number;
  proof: string;
};

type OrbitSeedDebugSource =
  | "default_seed_inventory"
  | "selected_seed_inventory"
  | "selected_outside_room";

type OrbitSeedCollectionDebug = {
  slug: string;
  contract: string;
  source: OrbitSeedDebugSource;
  requestedOwnerPages: number;
  ownerPagesFetched: number;
  fetchedOwnerCount: number;
  specificityScore: number | null;
  failed: boolean;
  failureReason?: string;
};

type OrbitReturnedCandidateDebug = {
  wallet: string;
  sharedRoomCount: number;
  serverScore: number;
  sharedSlugs: string[];
  sharedRoomHoldings: Record<string, number>;
  rankingMode: "shared_count_then_specificity" | "outside_seed_priority";
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
  seedCollections: OrbitSeedCollectionDebug[];
  returnedCandidates: OrbitReturnedCandidateDebug[];
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
  seedSlugs?: string[];
  excludeSlugs?: string[];
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

function isEthAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

async function resolveOrbitWalletInput(
  wallet: string,
  openseaApiKey: string | undefined
): Promise<string> {
  const trimmed = wallet.trim();
  if (!trimmed) return trimmed;
  if (isEthAddress(trimmed)) return trimmed.toLowerCase();
  if (!openseaApiKey) return trimmed.toLowerCase();

  try {
    const res = await fetch(`${OPENSEA_BASE_URL}/accounts/resolve/${encodeURIComponent(trimmed)}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-api-key": openseaApiKey,
      },
    });

    if (!res.ok) return trimmed.toLowerCase();

    const json = await res.json();
    const resolved = String(json?.address || "").trim();

    return isEthAddress(resolved) ? resolved.toLowerCase() : trimmed.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
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

async function resolveOpenSeaCollectionSeed(
  slug: string,
  openseaApiKey: string | undefined
): Promise<RawCollection | null> {
  const safeSlug = slug.trim().toLowerCase();
  if (!safeSlug || !openseaApiKey) return null;

  try {
    const [display, nftRes] = await Promise.all([
      fetchOpenSeaCollectionDisplay(safeSlug, openseaApiKey),
      fetch(`${OPENSEA_BASE_URL}/collection/${encodeURIComponent(safeSlug)}/nfts?limit=1`, {
        headers: { "x-api-key": openseaApiKey },
        cache: "no-store",
      }),
    ]);

    if (!nftRes.ok) return null;

    const json = await nftRes.json();
    const nft = Array.isArray(json?.nfts) ? json.nfts[0] : null;
    const contractAddress = pickString(
      nft?.contract,
      nft?.contract_address,
      nft?.asset_contract?.address
    );

    if (!contractAddress) return null;

    return {
      slug: safeSlug,
      name: display?.name || safeSlug,
      contractAddress: contractAddress.toLowerCase(),
      heldCount: 0,
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

function getSeedDebugSource(
  collection: RawCollection,
  selectedSeedSlugs: string[],
  outsideSelectedSlugs: string[]
): OrbitSeedDebugSource {
  if (!selectedSeedSlugs.length) return "default_seed_inventory";
  return outsideSelectedSlugs.includes(collection.slug)
    ? "selected_outside_room"
    : "selected_seed_inventory";
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

function mergeRawCollections(collections: RawCollection[]): RawCollection[] {
  const seen = new Set<string>();
  const merged: RawCollection[] = [];

  for (const collection of collections) {
    const key = collection.slug || collection.contractAddress;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(collection);
  }

  return merged;
}

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

type AlchemyOwnerTokenBalance = {
  tokenId?: string;
  balance?: string | number;
};

type AlchemyOwnerWithBalances = {
  ownerAddress?: string;
  tokenBalances?: AlchemyOwnerTokenBalance[];
};

type AlchemyOwnersResponse = {
  owners?: Array<string | AlchemyOwnerWithBalances>;
  pageKey?: string;
};

type CollectionOwnerHolding = {
  address: string;
  heldCount: number;
};

function parseOwnerHeldCount(owner: string | AlchemyOwnerWithBalances): CollectionOwnerHolding | null {
  if (typeof owner === "string") {
    const address = owner.trim().toLowerCase();
    return address ? { address, heldCount: 1 } : null;
  }

  const address = String(owner?.ownerAddress || "").trim().toLowerCase();
  if (!address) return null;

  const tokenBalances = Array.isArray(owner?.tokenBalances) ? owner.tokenBalances : [];
  if (tokenBalances.length === 0) return { address, heldCount: 1 };

  let total = 0;
  for (const token of tokenBalances) {
    const parsed = Number(token?.balance ?? 1);
    total += Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  return { address, heldCount: Math.max(total, tokenBalances.length, 1) };
}

async function fetchOwnersForContract(
  contractAddress: string,
  alchemyApiKey: string,
  maxPages = DEFAULT_OWNER_PAGES
): Promise<{
  owners: CollectionOwnerHolding[];
  failed: boolean;
  pagesFetched: number;
  failureReason?: string;
}> {
  const fallback = {
    owners: [] as CollectionOwnerHolding[],
    failed: true,
    pagesFetched: 0,
    failureReason: "owner_fetch_failed",
  };
  const ownerMap = new Map<string, CollectionOwnerHolding>();
  let pageKey: string | null = null;
  let pagesFetched = 0;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      contractAddress,
      withTokenBalances: "true",
    });

    if (pageKey) params.set("pageKey", pageKey);

    const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/getOwnersForContract?${params.toString()}`;

    let pageSucceeded = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const request = fetch(url, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            return {
              ok: false,
              status: res.status,
              owners: [] as CollectionOwnerHolding[],
              pageKey: null as string | null,
            };
          }

          try {
            const data = (await res.json()) as AlchemyOwnersResponse;
            const owners = Array.isArray(data.owners)
              ? data.owners
                  .map(parseOwnerHeldCount)
                  .filter((owner): owner is CollectionOwnerHolding => Boolean(owner))
              : [];

            return {
              ok: true,
              status: res.status,
              owners,
              pageKey: typeof data.pageKey === "string" && data.pageKey.trim() ? data.pageKey.trim() : null,
            };
          } catch {
            return {
              ok: false,
              status: res.status,
              owners: [] as CollectionOwnerHolding[],
              pageKey: null as string | null,
            };
          }
        })
        .catch(() => ({
          ok: false,
          status: 0,
          owners: [] as CollectionOwnerHolding[],
          pageKey: null as string | null,
        }));

      const result = await withTimeout(request, 15_000, {
        ok: false,
        status: 0,
        owners: [] as CollectionOwnerHolding[],
        pageKey: null as string | null,
      });

      if (result.ok) {
        pagesFetched += 1;

        for (const owner of result.owners) {
          const existing = ownerMap.get(owner.address);
          if (existing) {
            existing.heldCount += owner.heldCount;
          } else {
            ownerMap.set(owner.address, { ...owner });
          }
        }

        pageKey = result.pageKey;
        pageSucceeded = true;
        break;
      }

      const canRetry = attempt < 3 && (result.status === 0 || result.status === 429 || result.status >= 500);
      if (!canRetry) {
        const failureReason = result.status ? `http_${result.status}` : "owner_fetch_failed";
        return ownerMap.size
          ? { owners: [...ownerMap.values()], failed: false, pagesFetched }
          : { ...fallback, pagesFetched, failureReason };
      }
      await sleep(1000 * attempt);
    }

    if (!pageSucceeded || !pageKey) break;
  }

  return {
    owners: [...ownerMap.values()],
    failed: ownerMap.size === 0,
    pagesFetched,
    failureReason: ownerMap.size === 0 ? "no_owners_returned" : undefined,
  };
}

type OpenSeaAccountData = {
  username?: string | null;
  name?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  profile_image_url?: string | null;
  banner_image_url?: string | null;
  bio?: string | null;
  account?: { username?: string | null; name?: string | null; display_name?: string | null; displayName?: string | null } | null;
  user?: { username?: string | null; name?: string | null; display_name?: string | null; displayName?: string | null } | null;
};

type OpenSeaResolvedAccountData = {
  address?: string | null;
  username?: string | null;
  ens_name?: string | null;
};

async function fetchOpenSeaResolvedAccount(
  address: string,
  apiKey: string
): Promise<OpenSeaResolvedAccountData | null> {
  try {
    const res = await fetch(`${OPENSEA_BASE_URL}/accounts/resolve/${encodeURIComponent(address)}`, {
      cache: "no-store",
      headers: { accept: "application/json", "x-api-key": apiKey },
    });

    if (!res.ok) return null;

    return (await res.json()) as OpenSeaResolvedAccountData;
  } catch {
    return null;
  }
}

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

  const seedLimit = Math.min(options.seedLimit ?? 50, 50);
  const resultLimit = Math.min(options.resultLimit ?? 10, 20);
  const selectedSeedSlugs = Array.from(
    new Set((options.seedSlugs || []).map((slug) => slug.trim().toLowerCase()).filter(Boolean))
  );
  const excludedSlugs = Array.from(
    new Set((options.excludeSlugs || []).map((slug) => slug.trim().toLowerCase()).filter(Boolean))
  );
  const selectedSeedSlugSet = new Set(selectedSeedSlugs);
  const excludedSlugSet = new Set(excludedSlugs);

  const normalizedWallets = wallets.map((w) => w.trim().toLowerCase()).filter(Boolean);
  const resolvedInputWallets = await Promise.all(
    normalizedWallets.map((wallet) =>
      withTimeout(resolveOrbitWalletInput(wallet, openseaApiKey), 2500, wallet)
    )
  );
  const enteredWalletSet = new Set([
    ...normalizedWallets,
    ...resolvedInputWallets.map((wallet) => wallet.trim().toLowerCase()).filter(Boolean),
  ]);

  const debugState: OrbitDebug = {
    seedLimit,
    resultLimit,
    maxOwnerPages: MAX_OWNER_PAGES,
    timing: { walletFetchMs: 0, holderDiscoveryMs: 0, profileEnrichmentMs: 0, totalMs: 0 },
    failedCollections: [],
    failedProfiles: [],
    seedCollections: [],
    returnedCandidates: [],
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

  const showMoreCollections: OrbitCollection[] = allCollections.slice(5, 50).map((c) => ({
    slug: c.slug,
    name: c.name || c.contractAddress,
    contractAddress: c.contractAddress,
    heldCount: c.heldCount,
  }));

  const walletSelectedCollections = selectedSeedSlugs.length
    ? allCollections.filter((collection) => selectedSeedSlugSet.has(collection.slug))
    : [];

  const walletSelectedSlugSet = new Set(walletSelectedCollections.map((collection) => collection.slug));
  const outsideSelectedSlugs = selectedSeedSlugs.filter(
    (slug) => !walletSelectedSlugSet.has(slug) && !excludedSlugSet.has(slug)
  );

  const outsideSelectedResults = selectedSeedSlugs.length
    ? await Promise.allSettled(
        outsideSelectedSlugs.map((slug) =>
          withTimeout(resolveOpenSeaCollectionSeed(slug, openseaApiKey), 3500, null)
        )
      )
    : [];

  const outsideSelectedCollections = outsideSelectedResults
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((collection): collection is RawCollection => Boolean(collection));

  const selectedSeedCollections = mergeRawCollections([
    ...walletSelectedCollections,
    ...outsideSelectedCollections,
  ]);

  const defaultSeedCollections = allCollections
    .filter((collection) => !excludedSlugSet.has(collection.slug))
    .slice(0, seedLimit);

  const seedCollections = (
    selectedSeedSlugs.length ? selectedSeedCollections : defaultSeedCollections
  )
    .filter((collection) => !excludedSlugSet.has(collection.slug))
    .slice(0, seedLimit);

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
    debugState.seedCollections = seedCollections.map((collection) => ({
      slug: collection.slug,
      contract: collection.contractAddress,
      source: getSeedDebugSource(collection, selectedSeedSlugs, outsideSelectedSlugs),
      requestedOwnerPages: outsideSelectedSlugs.includes(collection.slug)
        ? OUTSIDE_OWNER_PAGES
        : DEFAULT_OWNER_PAGES,
      ownerPagesFetched: 0,
      fetchedOwnerCount: 0,
      specificityScore: null,
      failed: true,
      failureReason: alchemyApiKey ? "no_seed_collections" : "missing_alchemy_api_key",
    }));
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
      const maxOwnerPages = outsideSelectedSlugs.includes(collection.slug)
        ? OUTSIDE_OWNER_PAGES
        : DEFAULT_OWNER_PAGES;

      const result = await fetchOwnersForContract(
        collection.contractAddress,
        alchemyApiKey,
        maxOwnerPages
      );

      return {
        collection,
        owners: result.owners,
        failed: result.failed,
        pagesFetched: result.pagesFetched,
        requestedOwnerPages: maxOwnerPages,
        failureReason: result.failureReason,
      };
    })
  );
  debugState.timing.holderDiscoveryMs = Date.now() - holderDiscoveryStart;

  // Step 4: Build candidate set and seed collection stats
  const orbitSeedCollections: OrbitSeedCollection[] = [];
  const candidateMap = new Map<
    string,
    {
      sharedSeedCollections: string[];
      sharedRoomHoldings: Record<string, number>;
      specificitySum: number;
    }
  >();

  for (let index = 0; index < ownerResults.length; index++) {
    const result = ownerResults[index];
    if (result.status === "rejected") {
      const collection = seedCollections[index];
      debugState.failedCollections.push(collection.contractAddress);
      debugState.seedCollections.push({
        slug: collection.slug,
        contract: collection.contractAddress,
        source: getSeedDebugSource(collection, selectedSeedSlugs, outsideSelectedSlugs),
        requestedOwnerPages: outsideSelectedSlugs.includes(collection.slug)
          ? OUTSIDE_OWNER_PAGES
          : DEFAULT_OWNER_PAGES,
        ownerPagesFetched: 0,
        fetchedOwnerCount: 0,
        specificityScore: null,
        failed: true,
        failureReason: "owner_fetch_rejected",
      });
      continue;
    }
    const {
      collection,
      owners,
      failed,
      pagesFetched,
      requestedOwnerPages,
      failureReason,
    } = result.value;

    const holderCount = owners.length;
    const specificityScore = computeSpecificityScore(holderCount);

    debugState.seedCollections.push({
      slug: collection.slug,
      contract: collection.contractAddress,
      source: getSeedDebugSource(collection, selectedSeedSlugs, outsideSelectedSlugs),
      requestedOwnerPages,
      ownerPagesFetched: pagesFetched,
      fetchedOwnerCount: holderCount,
      specificityScore: failed ? null : specificityScore,
      failed,
      failureReason: failed ? failureReason || "owner_fetch_failed" : undefined,
    });

    if (failed) {
      debugState.failedCollections.push(collection.contractAddress);
      continue;
    }

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
      const normalizedOwner = owner.address.toLowerCase();
      if (isExcludedAddress(normalizedOwner, enteredWalletSet)) continue;

      const existing = candidateMap.get(normalizedOwner);
      if (existing) {
        existing.sharedSeedCollections.push(seedIdentifier);
        existing.sharedRoomHoldings[seedIdentifier] = owner.heldCount;
        existing.specificitySum += specificityScore;
      } else {
        candidateMap.set(normalizedOwner, {
          sharedSeedCollections: [seedIdentifier],
          sharedRoomHoldings: { [seedIdentifier]: owner.heldCount },
          specificitySum: specificityScore,
        });
      }
    }
  }

  // Step 5: Rank candidates by sharedSeedCount desc, then specificity sum desc
  const minimumSharedSeedCount = seedCollections.length <= 1 ? 1 : 2;

  const priorityOutsideSeedSlugs = outsideSelectedSlugs.filter((slug) => !excludedSlugSet.has(slug));
  const hasPriorityOutsideSeed = priorityOutsideSeedSlugs.length > 0;

  const rankedCandidates = [...candidateMap.entries()]
    .map(([wallet, data]) => {
      const priorityOutsideScore = priorityOutsideSeedSlugs.reduce((sum, slug) => {
        const heldCount = data.sharedRoomHoldings[slug] || 0;
        if (!heldCount) return sum;

        // Manually added outside rooms are intentional anchors.
        // Presence matters first; extra holdings add signal without letting whales dominate.
        return sum + 2 + Math.min(heldCount, 10) * 0.25;
      }, 0);

      return {
        wallet,
        sharedSeedCollections: data.sharedSeedCollections,
        sharedSeedCount: data.sharedSeedCollections.length,
        sharedRoomHoldings: data.sharedRoomHoldings,
        score: data.specificitySum + priorityOutsideScore,
      };
    })
    .filter((c) => {
      if (c.sharedSeedCount < minimumSharedSeedCount) return false;

      if (!hasPriorityOutsideSeed) return true;

      return priorityOutsideSeedSlugs.some((slug) => (c.sharedRoomHoldings[slug] || 0) > 0);
    })
    .sort((a, b) => {
      if (hasPriorityOutsideSeed && b.score !== a.score) return b.score - a.score;
      if (b.sharedSeedCount !== a.sharedSeedCount) return b.sharedSeedCount - a.sharedSeedCount;
      return b.score - a.score;
    })
    .slice(0, resultLimit);

  const rankingMode: OrbitReturnedCandidateDebug["rankingMode"] = hasPriorityOutsideSeed
    ? "outside_seed_priority"
    : "shared_count_then_specificity";

  const returnedCandidateDebugByWallet = new Map(
    rankedCandidates.map((candidate) => [
      candidate.wallet,
      {
        wallet: candidate.wallet,
        sharedRoomCount: candidate.sharedSeedCount,
        serverScore: Math.round(candidate.score * 10_000) / 10_000,
        sharedSlugs: candidate.sharedSeedCollections,
        sharedRoomHoldings: candidate.sharedRoomHoldings,
        rankingMode,
      },
    ])
  );

  // Step 6: Enrich with OpenSea account profile data
  const profileEnrichmentStart = Date.now();

  const profileResults = await Promise.allSettled(
    rankedCandidates.map(async (candidate) => {
      let accountData: OpenSeaAccountData | null = null;
      let resolvedAccountData: OpenSeaResolvedAccountData | null = null;

      if (openseaApiKey) {
        accountData = await fetchOpenSeaAccount(candidate.wallet, openseaApiKey);

        const hasReadableName = Boolean(
          accountData?.username ||
            accountData?.name ||
            accountData?.display_name ||
            accountData?.displayName ||
            accountData?.account?.username ||
            accountData?.account?.name ||
            accountData?.user?.username ||
            accountData?.user?.name
        );

        if (!hasReadableName) {
          resolvedAccountData = await withTimeout(
            fetchOpenSeaResolvedAccount(candidate.wallet, openseaApiKey),
            2000,
            null
          );
        }
      }

      return { candidate, accountData, resolvedAccountData };
    })
  );

  debugState.timing.profileEnrichmentMs = Date.now() - profileEnrichmentStart;

  const enrichedCandidates: OrbitCandidate[] = [];

  for (const result of profileResults) {
    if (result.status === "rejected") continue;
    const { candidate, accountData, resolvedAccountData } = result.value;

    if (!accountData) {
      debugState.failedProfiles.push(candidate.wallet);
    }

    const username = accountData
      ? [accountData.username, accountData.account?.username, accountData.user?.username]
          .map((v) => String(v || "").trim())
          .find(Boolean) || null
      : null;

    const profileName = accountData
      ? [
          accountData.name,
          accountData.display_name,
          accountData.displayName,
          accountData.account?.name,
          accountData.account?.display_name,
          accountData.account?.displayName,
          accountData.user?.name,
          accountData.user?.display_name,
          accountData.user?.displayName,
        ]
          .map((v) => String(v || "").trim())
          .find(Boolean) || null
      : null;

    const avatarUrl = accountData?.profile_image_url || null;
    const bannerUrl = accountData?.banner_image_url || null;
    const bio = accountData?.bio ? String(accountData.bio).trim() || null : null;
    const joinedDate = (accountData as any)?.joined_date
      ? String((accountData as any).joined_date).trim() || null
      : null;
    const resolvedEnsName = resolvedAccountData?.ens_name
      ? String(resolvedAccountData.ens_name).trim() || null
      : null;

    const displayName = username || profileName || resolvedEnsName || shortenWallet(candidate.wallet);
    const openseaProfilePath = username || resolvedEnsName || (profileName && !profileName.includes(" ") ? profileName : null);
    const openseaUrl = openseaProfilePath
      ? `https://opensea.io/${openseaProfilePath}`
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
      sharedRoomHoldings: candidate.sharedRoomHoldings,
      score: Math.round(candidate.score * 10_000) / 10_000,
      proof: `Appears across ${candidate.sharedSeedCount} of this wallet's top collection rooms.`,
    });
  }

  debugState.returnedCandidates = enrichedCandidates
    .map((candidate) => returnedCandidateDebugByWallet.get(candidate.wallet))
    .filter((candidate): candidate is OrbitReturnedCandidateDebug => Boolean(candidate));

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
