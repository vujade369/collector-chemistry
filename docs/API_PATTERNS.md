# Collector Chemistry — API Patterns

This file documents the API patterns used across the profile and compare routes.
Read this before modifying any file in `app/api/`.

---

## Data source ownership

Two APIs are in use. Each has a defined role. Do not swap them without a reason.

**Alchemy** — bulk wallet data layer
- Fetching all NFTs owned by a wallet
- Fetching most recently transferred NFTs (orderBy=transferTime)
- Fetching first mint via alchemy_getAssetTransfers
- Multi-wallet merging and deduplication

**OpenSea** — enrichment and marketplace layer
- Collection identity (name, slug, image, category)
- NFT display metadata (title, image, traits)
- Best offer per NFT
- Wallet profile identity (avatar, username, banner)
- Acquisition dates via transfer events

Never use OpenSea for bulk wallet fetches.
Never use Alchemy for offers, collection metadata, or profile identity.

---

## Alchemy endpoints in use

### getNFTsForOwner — full wallet fetch
GET https://eth-mainnet.g.alchemy.com/nft/v3/{apiKey}/getNFTsForOwner
?owner={address}
&withMetadata=true
&pageSize=100
Used in: `lib/fetchWalletNFTs.ts`
Paginates via `pageKey`. Loop until `pageKey` is null.
Returns the complete NFT holdings for a wallet.

### getNFTsForOwner — recent arrival fetch
GET https://eth-mainnet.g.alchemy.com/nft/v3/{apiKey}/getNFTsForOwner
?owner={address}
&orderBy=transferTime
&pageSize=10
&withMetadata=true
Used in: `fetchLatestArrivalSignal` in `app/api/profile/route.ts`
Returns NFTs sorted by when they entered the wallet, newest first.
`ownedNfts[0]` is the most recently transferred NFT.
Supported on Ethereum Mainnet on the free tier.
This replaces the previous approach of reading `acquiredAt`, `mintedAt`,
and `timeLastUpdated` fields from the already-fetched NFT array — those
fields pick up metadata refreshes and self-transfers and produce incorrect
results as the recent signal.

### alchemy_getAssetTransfers — first mint fetch
POST https://eth-mainnet.g.alchemy.com/v2/{apiKey}
Body: {
method: "alchemy_getAssetTransfers",
params: [{
fromAddress: "0x000...000",   // zero address = mints only
toAddress: {wallet},
category: ["erc721", "erc1155"],
order: "asc",
maxCount: "0xa"
}]
}
Used in: `fetchFirstMint` in `app/api/profile/route.ts`
Returns the earliest NFT minted to this wallet.
`transfers[0]` with `order: "asc"` is the first ever mint.

---

## OpenSea endpoints in use

### Best offer per NFT
GET /offers/collection/{slug}/nfts/{identifier}/best
Used in: `fetchMarketAttention` in `app/api/profile/route.ts`
Returns the highest of: item offer, trait offers, collection floor offer.
Handles ERC-1155 correctly — returns the specific token's best offer,
not just the collection floor.
Call per NFT candidate. Run in parallel. Take the highest ETH result.

### Collection metadata
GET /collections/{slug}
GET /chain/ethereum/contract/{contractAddress}
Used for: resolving slug from contract address, fetching collection image and category.

### NFT display metadata
GET /chain/ethereum/contract/{contractAddress}/nfts/{tokenId}
Used for: title, image, collection name enrichment on specific NFTs.

### Transfer events — acquisition dates
GET /events/chain/ethereum/contract/{contract}/nfts/{tokenId}?event_type=transfer
GET /events/accounts/{address}?event_type=transfer
Used for: acquisition timestamps on exact overlap NFTs and shared collections.
`event_timestamp` is a Unix integer — always convert: `new Date(raw * 1000).toISOString()`

### Account events — mint vs acquired breakdown
GET /events/accounts/{address}?event_type=transfer&limit=50
Used in: `fetchAcquisitionBreakdown`
Distinguishes mints (from_address = zero address) from purchases.

### Profile identity
GET /accounts/{address}
Used for: display name, avatar URL, banner URL, OpenSea username.

---

## Timeout pattern

All OpenSea fetches use a shared timeout wrapper:

```typescript
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T>
```

Default timeout: 5000ms for most fetches.
Best offer task timeout: 4000ms (covers parallel candidate pool).
First mint fetch timeout: 8000ms (historical scan is slower).

If a fetch times out it returns the fallback silently.
Null dates and missing signals are often timeout issues, not missing data.

---

## fetchMarketAttention — candidate selection rules

The highest offer signal checks individual NFTs against OpenSea's best offer
endpoint. Candidate selection follows these rules:

1. Sort the incoming NFT array by collection size descending before iterating —
   larger collections are more likely to have active offers.
2. Do not deduplicate by collection slug. Multiple NFTs from the same collection
   must each be checked individually — per-NFT offers can differ significantly
   from the collection floor (especially ERC-1155).
3. Cap at 30 candidates total.
4. Skip NFTs with no resolvable slug.
5. Run all candidate offer fetches in parallel via Promise.all.
6. Filter responses to ETH > 0, sort descending, take index 0.

---

## fetchLatestArrivalSignal — recent signal rules

The recent signal must reflect a genuine acquisition — a mint or a purchase
that brought a new NFT into the wallet. It must not reflect:
- Metadata refreshes (timeLastUpdated changes without a transfer)
- Wallet-to-wallet self-transfers between the user's own wallets
- Airdrops the user didn't initiate

Implementation rules:
1. Call getNFTsForOwner with orderBy=transferTime per wallet.
2. Take ownedNfts[0] from each wallet response.
3. Compare timestamps across wallets, take the most recent.
4. Build ProfileNFTSignal from the winning NFT.
5. sourceLabel: "Recent Signal"

---

## Promise.allSettled pattern

When fetching multiple items in parallel, use Promise.allSettled not Promise.all.
One failed fetch must not kill the entire batch:

```typescript
const results = await Promise.allSettled(items.map(item => fetchSomething(item)));
results.forEach(result => {
  if (result.status === "fulfilled") {
    // use result.value
  }
  // silently skip rejections
});
```

---

## Adding a new API call

When adding any new endpoint call:
1. Add the response type at the top of the file
2. Use fetchOpenSeaJson<T>() for all OpenSea requests — handles auth, timeout,
   and error fallback automatically
3. Never call fetch() directly for OpenSea requests
4. For Alchemy requests, follow the existing pattern in fetchWalletNFTs.ts —
   check for the API key first, wrap in try/catch, return null on failure
5. Always check for the relevant API key before making a call and return a
   sensible fallback if missing

---

## Known quirks

**Contract address mismatch**
Alchemy and OpenSea sometimes return different contract addresses for the same
collection. Always resolve the correct OpenSea contract via collection slug
before calling OpenSea events endpoints.

**event_timestamp is a Unix integer**
OpenSea returns event_timestamp as a number like 1756925927, not an ISO string.
Always convert: `new Date(raw * 1000).toISOString()`

**ERC-1155 offers**
ERC-1155 tokens have per-token offer prices that differ from the collection floor.
The best offer endpoint handles this correctly when called with a specific tokenId.
Never assume the collection floor represents a specific ERC-1155 token's offer.

**timeLastUpdated is not an acquisition date**
The timeLastUpdated field on Alchemy NFT objects updates on metadata refreshes,
not just transfers. Never use it as a proxy for when an NFT entered a wallet.
Use orderBy=transferTime on getNFTsForOwner instead.