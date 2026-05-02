# Collector Chemistry — API Patterns

This file documents the API patterns used across the profile and compare routes.
Read this before modifying any file in `app/api/`.

---

## Data source ownership

Two APIs are in use. Each has a defined role. Do not swap them without a reason.

**Alchemy** — bulk wallet data layer
- Fetching all NFTs owned by a wallet
- Fetching most recent incoming NFT transfer per wallet (alchemy_getAssetTransfers order: desc)
- Fetching first mint (alchemy_getAssetTransfers order: asc, fromAddress: zero address)
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