# Collector Chemistry — Data Sources

## Guiding principle

OpenSea is the source of truth for collection identity, contract addresses,
events, and marketplace context.

Alchemy is used for bulk wallet ownership fetching where speed matters.

When OpenSea has the data, use it first. Use Alchemy only as a fallback or
for bulk operations where OpenSea is too slow or rate-limited.

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
- Collection search (name-based, for Wallet Converter)
- Collection stats (floor price, owner count, supply, for Converter and Recommendations)
- Activity timeline data (transfer events bucketed by month)

Base URL: https://api.opensea.io/api/v2

Auth: x-api-key header using OPENSEA_API_KEY env variable

Key endpoints in use:
- GET /accounts/{address} — collector profile, PFP, banner
- GET /chain/ethereum/account/{address}/nfts — account inventory
- GET /chain/ethereum/contract/{contract}/nfts/{tokenId} — single NFT metadata
- GET /events/chain/ethereum/contract/{contract}/nfts/{tokenId}?event_type=transfer — acquisition events per NFT
- GET /events/collection/{slug}?event_type=transfer — collection-level transfer events
- GET /events/accounts/{address}?event_type=transfer — wallet-level transfer events (also used for activity timeline)
- GET /offers/collection/{slug}/nfts/{identifier}/best — best offer for a specific NFT
- GET /collection/{slug}/nfts?limit=1 — resolve correct contract address from slug
- GET /collections/{slug} — collection stats including floor_price, num_owners, total_supply
- GET /collections?collection_name={query} — collection search by name (used in Wallet Converter)

---

### Alchemy (fallback / bulk)

Used for:
- Initial bulk NFT ownership fetch (faster than OpenSea for large wallets)
- Fallback when OpenSea is slow or rate-limited

Base URL: varies by network, configured in lib/fetchWalletNFTs.ts

Auth: ALCHEMY_API_KEY env variable

Key usage:
- fetchWalletNFTs() in lib/fetchWalletNFTs.ts — returns all NFTs for a wallet

Known limitation: Alchemy sometimes returns different contract addresses than
OpenSea for the same collection. Always prefer OpenSea contract addresses for
any OpenSea API call.

---

## Delight layer data paths

These endpoints support Phase 2.5 features. They are all lazy-loaded and
should never run on initial profile page load.

---

### Wallet Converter

Purpose:
Estimate approximate wallet value and divide by a target collection floor price
to produce a fun "how many could you get" count.

Step 1 — Estimate wallet value:
For each of the collector's top collections (by owned count), fetch floor price:
  GET /collections/{slug}
  Extract: stats.floor_price (in ETH)
  Multiply by owned count for that collection
  Sum across all collections for a rough wallet value estimate

Important: this is an approximation. Many NFTs have no active floor listing.
Treat the result as directional, not precise. The product should never
present this as an exact portfolio value.

Step 2 — Collection search (as user types):
  GET /collections?collection_name={query}&limit=10
  Returns: collection name, slug, image, floor price
  Cache search results per query per session to reduce API calls

Step 3 — Target collection floor:
  GET /collections/{slug}
  Extract: stats.floor_price
  Divide wallet value by this number
  Return the integer result as the display count

Display rule:
Show only the count and the collection name. Never show ETH or dollar amounts.

---

### Activity Timeline

Purpose:
Show collecting activity bucketed by month so a collector can see their
patterns over time.

Endpoint:
  GET /events/accounts/{address}?event_type=transfer&limit=200

Repeat with cursor pagination up to 500 events total (V1 cap).

For each event:
- Convert event_timestamp (Unix int) to month/year string
- Check from_address: if null or zero address, classify as mint
- Otherwise classify as secondary acquisition
- Bucket into { year, month, mintCount, buyCount } records

Output shape:
[
  { year: 2022, month: 3, mintCount: 4, buyCount: 2 },
  { year: 2022, month: 4, mintCount: 0, buyCount: 7 },
  ...
]

Display rules:
- Show as a bar or spark chart grouped by year
- Call out the busiest month by name ("Your biggest month was March 2022")
- The framing is Spotify Wrapped, not a spreadsheet
- Do not show counts as raw numbers in the headline — translate to narrative

---

### Collection Recommendations

Purpose:
Suggest 10 collections the collector might like, filtered by a price range
they choose and rooted in their existing taste signals.

Step 1 — Build taste signal inputs from profile:
- Top 3 category labels from categoryDistribution
- Top 3 collection slugs by ownedCount
- Ecosystem signals from existing collections

Step 2 — Candidate pool:
Use OpenSea collection search and stats to build a candidate pool.
Filter candidates by:
- num_owners / total_supply > 0.4 (unique collector ratio above 40%)
- Floor price within the selected price range
- Not already held by the collector (check against wallet's collection slugs)

Price range options (user selects one):
- Under 0.1 ETH
- 0.1 to 0.5 ETH
- 0.5 to 2 ETH
- 2 ETH and above

Step 3 — Rank by taste alignment:
Prefer collections that share category or ecosystem with the collector's
existing holdings. Do not rank by price or volume.

Step 4 — Return 10 results:
Each result includes: collection name, image, floor price, category label,
a one-line reason for the recommendation.

Caching:
Cache recommendation results per wallet per day. Recompute only when
the wallet or price range filter changes.

---

## Known quirks and gotchas

### Contract address mismatch
Alchemy and OpenSea sometimes resolve collection contracts differently.
If you pass an Alchemy contract address to an OpenSea endpoint, you may
get "Unrecognized address" errors. Always resolve the correct OpenSea
contract address using the collection slug before calling OpenSea events
endpoints.

Pattern to resolve correct contract:
  GET /collection/{slug}/nfts?limit=1
  Extract contract field from first result
  Use that contract for events lookups

### event_timestamp is a Unix integer
OpenSea returns event_timestamp as a Unix integer (e.g. 1756925927), not
an ISO string. Always convert before using:

  const timestamp = typeof raw === "number"
    ? new Date(raw * 1000).toISOString()
    : (raw || null);

### ERC-1155 tokens
ERC-1155 tokens are editions where multiple wallets can own the same token
ID simultaneously. Transfer events use TransferSingle or TransferBatch
instead of Transfer. The acquisition date logic still works (find the
Transfer where to equals the wallet) but "you both own this" is a weaker
overlap signal for ERC-1155 than ERC-721.

### Acquisition event types
A token entering a wallet can come from multiple event types. All resolve
to the same underlying Transfer event on-chain:
- Minted: Transfer from null address (0x000...000) to wallet
- Collected (bought): Transfer from seller to wallet
- Airdropped: Transfer from project to wallet
- Gifted/transferred: Transfer from another wallet

The date that matters is always when the token first appeared in the
target wallet, regardless of how it got there.

### OpenSea pagination
Most OpenSea list endpoints paginate using a next cursor, not page numbers.
Always check for data.next and loop until it is null or empty. Set a safety
limit on pages to avoid infinite loops.

### OpenSea rate limits
OpenSea rate limits vary by API tier. The current implementation uses a
5000ms timeout per fetch with graceful null fallback. If dates are returning
null, rate limiting or slow responses are likely causes. Check server logs
for OPENSEA_OPTIONAL_FETCH_FAILED entries.

### OpenSea account inventory limit
The current implementation caps account inventory fetches at 60 NFTs
(OPENSEA_MAX_ACCOUNT_ITEMS). Wallets with more than 60 NFTs will have
incomplete data for features that depend on the inventory scan (e.g. best
offer lookup, collection candidates). This is intentional for performance.

### Floor price approximation
Floor prices from OpenSea reflect the current lowest active listing.
They are not guaranteed to be accurate for collections with thin order
books. For the Wallet Converter, treat the total estimate as directional
only. Surface this caveat lightly in the UI if needed.

---

## Acquisition date resolution flow

1. Get NFT from Alchemy bulk fetch (has contract address, token ID)
2. Look up correct OpenSea contract via collection slug: GET /collection/{slug}/nfts?limit=1
3. Cache slug to contract to avoid duplicate lookups per request
4. Query transfer events: GET /events/chain/ethereum/contract/{contract}/nfts/{tokenId}?event_type=transfer
5. Find first event where to_address matches the wallet
6. Convert Unix timestamp to ISO string
7. Format as "Month Year" for display

Scope of acquisition date fetching (for performance):
- Exact overlap NFTs only
- NFTs in the first 3 shared collections only
- Not fetched for shared artists or any other sections

---

## Environment variables required

OPENSEA_API_KEY=
ALCHEMY_API_KEY=

Both must be present in .env.local for full functionality. The app degrades
gracefully when either is missing but acquisition dates and profile data
will not load without OPENSEA_API_KEY.

See `docs/OPENSEA_INTEGRATION.md` for OpenSea marketplace/display integration rules and source-of-truth links.
