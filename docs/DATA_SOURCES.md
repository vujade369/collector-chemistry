# Collector Chemistry — Data Sources

## Guiding principle

OpenSea is the source of truth for collection identity, contract addresses, events, and marketplace context.

Alchemy is used for bulk wallet ownership fetching where speed matters.

When OpenSea has the data, use it first. Use Alchemy only as a fallback or for bulk operations where OpenSea is too slow or rate-limited.

---

## Source map

### OpenSea (primary)

Used for:
- Collector profile (PFP, banner, username, bio, joined date)
- Collection identity (name, slug, contract address, floor price)
- NFT metadata enrichment (title, image, traits, artist)
- Transfer events and acquisition dates
- Best offer / highest bid data
- Account inventory (NFTs owned, paginated)

Base URL: `https://api.opensea.io/api/v2`

Auth: `x-api-key` header using `OPENSEA_API_KEY` env variable

Key endpoints in use:
- `GET /accounts/{address}` — collector profile, PFP, banner
- `GET /chain/ethereum/account/{address}/nfts` — account inventory
- `GET /chain/ethereum/contract/{contract}/nfts/{tokenId}` — single NFT metadata
- `GET /events/chain/ethereum/contract/{contract}/nfts/{tokenId}?event_type=transfer` — acquisition events per NFT
- `GET /events/collection/{slug}?event_type=transfer` — collection-level transfer events
- `GET /events/accounts/{address}?event_type=transfer` — wallet-level transfer events
- `GET /offers/collection/{slug}/nfts/{identifier}/best` — best offer for a specific NFT
- `GET /collection/{slug}/nfts?limit=1` — resolve correct contract address from slug

---

### Alchemy (fallback / bulk)

Used for:
- Initial bulk NFT ownership fetch (faster than OpenSea for large wallets)
- Fallback when OpenSea is slow or rate-limited

Base URL: varies by network, configured in `lib/fetchWalletNFTs.ts`

Auth: `ALCHEMY_API_KEY` env variable

Key usage:
- `fetchWalletNFTs()` in `lib/fetchWalletNFTs.ts` — returns all NFTs for a wallet

Known limitation: Alchemy sometimes returns different contract addresses than OpenSea for the same collection. Always prefer OpenSea contract addresses for any OpenSea API call.

---

## Known quirks and gotchas

### Contract address mismatch
Alchemy and OpenSea sometimes resolve collection contracts differently. If you pass an Alchemy contract address to an OpenSea endpoint, you may get "Unrecognized address" errors. Always resolve the correct OpenSea contract address using the collection slug before calling OpenSea events endpoints.

Pattern to resolve correct contract:
```
GET /collection/{slug}/nfts?limit=1
→ extract contract field from first result
→ use that contract for events lookups
```

### event_timestamp is a Unix integer
OpenSea returns `event_timestamp` as a Unix integer (e.g. `1756925927`), not an ISO string. Always convert before using:
```typescript
const timestamp = typeof raw === "number"
  ? new Date(raw * 1000).toISOString()
  : (raw || null);
```

### ERC-1155 tokens
ERC-1155 tokens are editions where multiple wallets can own the same token ID simultaneously. Transfer events use `TransferSingle` or `TransferBatch` instead of `Transfer`. The acquisition date logic still works (find the Transfer where `to` equals the wallet) but "you both own this" is a weaker overlap signal for ERC-1155 than ERC-721.

### Acquisition event types
A token entering a wallet can come from multiple event types. All resolve to the same underlying Transfer event on-chain:
- Minted: Transfer from null address (`0x000...000`) to wallet
- Collected (bought): Transfer from seller to wallet
- Airdropped: Transfer from project to wallet
- Gifted/transferred: Transfer from another wallet

The date that matters is always when the token first appeared in the target wallet, regardless of how it got there.

### OpenSea pagination
Most OpenSea list endpoints paginate using a `next` cursor, not page numbers. Always check for `data.next` and loop until it's null or empty. Set a safety limit on pages to avoid infinite loops.

### OpenSea rate limits
OpenSea rate limits vary by API tier. The current implementation uses a 5000ms timeout per fetch with graceful null fallback. If dates are returning null, rate limiting or slow responses are likely causes. Check server logs for `OPENSEA_OPTIONAL_FETCH_FAILED` entries.

### OpenSea account inventory limit
The current implementation caps account inventory fetches at 60 NFTs (`OPENSEA_MAX_ACCOUNT_ITEMS`). Wallets with more than 60 NFTs will have incomplete data for features that depend on the inventory scan (e.g. best offer lookup, collection candidates). This is intentional for performance.

---

## Acquisition date resolution flow

1. Get NFT from Alchemy bulk fetch (has contract address, token ID)
2. Look up correct OpenSea contract via collection slug: `GET /collection/{slug}/nfts?limit=1`
3. Cache slug → contract to avoid duplicate lookups per request
4. Query transfer events: `GET /events/chain/ethereum/contract/{contract}/nfts/{tokenId}?event_type=transfer`
5. Find first event where `to_address` matches the wallet
6. Convert Unix timestamp to ISO string
7. Format as "Month Year" for display

Scope of acquisition date fetching (for performance):
- Exact overlap NFTs only
- NFTs in the first 3 shared collections only
- Not fetched for shared artists or any other sections

---

## Environment variables required

```
OPENSEA_API_KEY=
ALCHEMY_API_KEY=
```

Both must be present in `.env.local` for full functionality. The app degrades gracefully when either is missing but acquisition dates and profile data will not load without `OPENSEA_API_KEY`.