---
name: constellate-data-sources
description: Choose the correct data source for Constellate wallet, profile, comparison, converter, visibility, identity, and marketplace-context work.
compatibility: Repo-local guidance for GPT, Claude, Codex, Cursor, and human builders.
metadata:
  owner: Constellate
  status: active
---

# Constellate Data Sources

## Purpose

Use this skill when work touches wallet data, NFT ownership, OpenSea enrichment, Alchemy fetching, profile identity, collection metadata, offers, floors, acquisition history, category grouping, comparison data, or converter math.

The goal is simple:

> Use the right source for the product question.

Do not make one source do another source’s job.

## Core source map

### Alchemy

Alchemy is the bulk ownership and transfer-fact source.

Use Alchemy for:

- wallet NFT ownership
- NFT metadata attached to ownership records
- contract addresses
- token IDs
- transfer history
- acquisition timestamps
- page counts and fetched totals
- ownership pagination observability

Do not use Alchemy as final authority for:

- OpenSea profile visibility
- hidden/spam filtering
- account display identity
- collection marketplace links
- collection images from OpenSea
- offers
- floors
- listings
- collection search
- user-facing interpretation

Alchemy answers:

> What does this wallet appear to hold on-chain?

It does not answer:

> What should Constellate display as culturally visible, marketplace-linked, or socially legible?

## Alchemy guardrails

Do not cap, sample, or skip ownership pages for speed without explicit product approval.

Preserve pagination observability:

- page count
- break reason
- fetched count
- returned count
- visible count when applicable
- fallback reason when applicable

If Alchemy fails on the first page, fallback behavior should be explicit and visible in debug output.

## OpenSea

OpenSea is the marketplace, visibility, identity, and linkability source.

Use OpenSea for:

- account identity
- username
- avatar
- banner
- bio
- joined date
- visible inventory filtering
- hidden/spam filtering
- collection slugs
- collection names
- collection images
- collection categories
- NFT OpenSea URLs
- collection OpenSea URLs
- offers
- bids
- listings
- floors
- collection search
- account/profile URL resolution

OpenSea answers:

> How should this wallet and its NFTs appear in the public marketplace/social layer?

It does not answer:

> What is this person’s identity, worth, status, taste level, or cultural value?

## OpenSea guardrails

OpenSea enrichment should degrade gracefully.

Missing OpenSea data should not block the whole profile unless the specific feature depends on it.

Handle:

- missing API key
- 404
- 429
- 5xx
- missing fields
- incomplete collection metadata
- missing images
- missing slugs
- hidden or spam NFTs

Do not shell out to OpenSea CLI, MCP, or local scripts from production runtime.

Runtime code should use server-side helpers.

Do not invent URLs.

Prefer no link over a wrong link.

## Link rules

NFT links should resolve in this order:

1. Specific OpenSea NFT URL when contract address and token ID are reliable
2. Collection URL fallback when collection slug is reliable
3. No link if destination is unsafe or uncertain

Collection links should resolve in this order:

1. OpenSea collection URL from reliable slug
2. Reliable contract-derived fallback if supported
3. No link if unsafe or uncertain

Every displayed NFT, collection, or artist should link to the deepest reliable destination available.

## Constellate logic

Constellate itself owns interpretation.

Use Constellate logic for:

- taste categories
- category confidence
- archetypes
- profile summaries
- comparison summaries
- overlap scoring
- recognition language
- behavior labels
- collection relationship meaning
- The Read
- user-facing narrative

Do not outsource interpretation to raw marketplace metadata.

Marketplace data can support a claim, but it should not become the claim.

## Category and classification rules

Category classification is confidence-sensitive.

Prefer source order:

1. Known slug/manual override when available
2. OpenSea collection category when reliable
3. Trait-density signals
4. Metadata fallback
5. `other`

Never present inferred categories as certain unless the source supports them.

Use careful language when confidence is medium or low.

## Acquisition data

Acquisition signals are facts only when source-supported.

Useful acquisition signals include:

- mint
- sale
- transfer
- airdrop
- unknown

Do not overstate acquisition type if event data is incomplete.

If a visible NFT lacks enough event history, say the acquisition method is unknown rather than guessing.

## Converter data boundary

The converter does not estimate wallet floor value.

It answers:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

Rules:

- Use active ETH/WETH offers only.
- Include small actionable collection-wide offers.
- Deduplicate unique NFTs before summing.
- Do not count the same NFT twice across pages.
- Do not filter offers merely because they are small.
- Do not replace offer value with floor value.
- Expose debug proof when possible.

## Comparison data boundary

Comparison should show recognition and overlap, not compatibility ranking.

Use data to show:

- shared collections
- shared NFTs
- shared categories
- shared artists when reliable
- shared collecting rhythms when supported
- distinctive differences
- possible conversation starters

Avoid:

- better collector
- higher taste
- more serious
- more valuable
- ranked match
- unsupported personality claims

## Debug expectations

For data/API work, debug output should make the result inspectable.

Useful debug fields:

- wallet input
- resolved address
- source used
- fallback used
- fetched count
- visible count
- page count
- break reason
- enrichment timeout/failure reason
- unique NFT count
- offer count
- total ETH/WETH offer value
- target floor price when converter-related

## Verification

For data/API changes:

```bash
npx tsc --noEmit
```

Then run focused route checks when relevant:

```bash
curl -s "http://localhost:3000/api/profile?wallet=vuja-de.eth" > /tmp/profile.json
curl -s "http://localhost:3000/api/compare?a=vuja-de.eth&b=0x16f3d833bb91aebb5066884501242d8b3c3b5e61" > /tmp/compare.json
curl -s "http://localhost:3000/api/converter/calculate?wallet=vuja-de.eth&slug=pudgypenguins&debug=1" > /tmp/converter.json
```

For docs/agent-only changes:

```bash
npm run agents:check
npm run docs:check
npm run skills:check
git diff --name-only
```

Do not claim verification unless the command was actually run.
