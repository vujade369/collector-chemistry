# Collector Chemistry — Alchemy Capabilities

This document defines how Collector Chemistry uses Alchemy. It is not a full
Alchemy API reference.

## Role

Alchemy is Collector Chemistry's bulk wallet data source.

Use Alchemy for:

- NFT ownership fetching
- NFT metadata included with ownership records
- Transfer-history queries for wallet activity signals

Do not use Alchemy as the final authority for profile visibility,
marketplace offers, collection search, or interpretation.

## Data-Source Boundary

- **Alchemy**: ownership, NFT metadata, transfer history.
- **OpenSea**: profile visibility, hidden/spam filtering, collection slugs,
  collection identity, offers, collection search, marketplace destinations.
- **Collector Chemistry**: interpretation, classification, narrative, taste
  pattern, archetype, chemistry score, and profile text.

Alchemy can provide source facts. It should not decide what those facts mean.

## Auth

Use `ALCHEMY_API_KEY` from the server environment.

Rules:

- No hardcoded keys.
- Do not print or expose keys in logs, docs, responses, or errors.
- Keep Alchemy calls server-side.

## NFT Ownership: getNFTsForOwner

Collector Chemistry uses:

```text
GET https://eth-mainnet.g.alchemy.com/nft/v3/{ALCHEMY_API_KEY}/getNFTsForOwner
```

Required behavior:

- `owner`: wallet address or ENS-compatible owner input after route validation.
- `withMetadata=true`.
- `pageSize=100`.
- `pageKey`: pagination cursor for subsequent pages.
- Response cursor field: `pageKey`.

Alchemy's documented `pageSize` max for this endpoint is `100`; do not raise it
as a performance optimization.

## Pagination Safety

Treat `pageKey` as untrusted external data.

Rules:

- Build request params fresh for every page.
- Append `pageKey` only after validation.
- A valid page key must be a non-empty string.
- Reject:
  - `null`
  - `undefined`
  - empty string
  - whitespace-only string
  - literal `"null"` in any casing
- Guard against repeated `pageKey` values to avoid loops.
- Expose pagination observability:
  - `alchemyPageCount`
  - `alchemyBreakReason`
  - `totalFetchedNFTs`

Diagnostics must not alter request behavior. Build the actual request from the
validated cursor, then derive diagnostics from the same validated state.

## Current Known Issue

Alchemy may return a non-empty `pageKey` that later fails when passed back to
`getNFTsForOwner` with:

```text
For input string: "null"
```

Collector Chemistry must not silently present a complete-looking profile from
partial ownership data. If pagination stops early because Alchemy rejects a
cursor, the response/debug data must make that visible through
`alchemyBreakReason` and page/count fields.

Do not switch endpoints, cap ownership, or sample NFTs without explicit product
approval.

## NFT Identity Keys

Use NFT identity keys in this order:

1. Contract address
2. Token ID

Normalize contract addresses to lowercase before comparison, dedupe, or joining
with OpenSea-visible token results.

Token IDs should be normalized consistently before key construction.

## Hidden And Spam Filtering Boundary

Do not remove OpenSea visible-token filtering.

Alchemy spam flags are useful context, but they are not a replacement for
OpenSea profile visibility in Collector Chemistry unless explicitly scoped and
approved.

Rules:

- Hidden/spam NFTs must not enter the visible profile when OpenSea visibility
  filtering succeeds.
- Do not bypass OpenSea visible-token filtering for speed.
- Do not replace OpenSea filtering with Alchemy `isSpam`, `spamClassifications`,
  `excludeFilters`, or `spamConfidenceLevel` without a specific task.

## Transfers

Use `alchemy_getAssetTransfers` for transfer-history-backed profile signals,
including latest arrival and acquisition-style signals.

Relevant request behavior:

- JSON-RPC POST to `https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}`.
- NFT categories should include `erc721` and `erc1155` where appropriate.
- Use `withMetadata=true` when timestamps are needed.
- Use `order` deliberately:
  - `desc` for latest arrival style signals.
  - `asc` for first/earliest acquisition style signals.
- Transfer pagination uses its own `pageKey`; do not confuse it with NFT API
  page keys.

## Performance Notes

Large wallets can require many Alchemy pages.

Known example:

- A wallet with about 1,500 NFTs required 16 Alchemy ownership pages at
  `pageSize=100`.

Rules:

- Do not cap ownership without product approval.
- Do not sample ownership without product approval.
- Do not change profile meaning to improve speed without an explicit product
  decision.
- Prefer instrumentation first: page counts, break reasons, fetched counts, and
  source-specific timings.

## What Alchemy Should Not Decide

Alchemy should not decide:

- taste category
- archetype
- chemistry score
- interpretation text
- marketplace offer value
- whether a collection search result should be selected
- whether an NFT hidden on OpenSea should appear in the profile

Collector Chemistry owns interpretation. OpenSea owns visibility and marketplace
context. Alchemy owns bulk ownership and transfer facts.
