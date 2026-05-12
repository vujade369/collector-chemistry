# OpenSea Integration

## Source of truth

- OpenSea LLM discovery map: https://opensea.io/llms.txt
- OpenSea v2 OpenAPI spec: https://api.opensea.io/api/v2/openapi.json
- Local read-only workflow: `.agents/skills/constellate-opensea-readonly/SKILL.md`
- OpenSea safety policy: `.agents/policies/opensea-readonly.yaml`

Use `llms.txt` for high-level capability discovery. Use the OpenAPI spec for endpoint names, params, and response schema. Treat local skills and scripts as developer references for Codex workflows, not runtime dependencies.

## Runtime rules

- Next.js runtime must call OpenSea through server-side REST helpers like `fetchOpenSeaJson`.
- Do not shell out to local `.sh` scripts in runtime code.
- Do not add `@opensea/cli` as app runtime dependency.
- Keep `OPENSEA_API_KEY` server-side only.

## API responsibility split

Use OpenSea for:
- Wallet and account identity.
- Collection slug, image, and destination links.
- NFT destination links.
- Current offers and bids.
- Listings and floor-style signals.
- Verified and canonical collection search.
- Future sell-down estimate and recommendation modules.

Use wallet inventory data for:
- Ownership truth.
- Holdings and distribution math.
- Category and taste analysis.
- Acquisition, mint, and transfer activity.

Use Collector Chemistry for:
- Interpretation.
- Taste and culture signal.
- Profile and compare storytelling.

## Performance and resilience

- Use request-level caching for duplicate lookups.
- Use short per-call timeouts.
- Cap candidate sets for offer or listing checks.
- Avoid one-request-per-NFT across large wallets.
- Gracefully degrade if `OPENSEA_API_KEY` is missing.
- Gracefully degrade on 404, 429, and 5xx responses.
- Avoid aggressive retries inside a single profile request.

## Endpoint guidance

- Prefer OpenSea v2 collection-based offer and listing endpoints where available.
- Avoid deprecated legacy order endpoints unless no current endpoint fits.
- Use OpenAPI as endpoint and schema source of truth.
- Prefer collection slug plus token identifier for item offer and listing checks.
- Use account, collection, and search endpoints for identity and discovery.

## Current product use cases

- Profile wallet identity.
- Top collection images and links.
- Highest current offer signal.
- NFT destination links.
- Canonical collection search for future "If you sold it all" estimates.
- Future recommendation modules.

- Converter uses canonical collection search, target collection floor discovery, and wallet active-offer estimation through the same server-side OpenSea REST helper pattern.
