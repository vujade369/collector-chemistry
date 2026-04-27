# Collector Chemistry — Architecture

## What this is

A map of how the app currently works.
Data flow, file responsibilities, API contracts.

Read this before touching any code.

---

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Alchemy API (NFT data fetching)
- OpenSea API v2 (enrichment, events, profiles)
- Anthropic API (interpretation generation — in progress)

---

## File map

```
app/
  page.tsx                   — Homepage with two wallet inputs
  layout.tsx                 — Root layout, metadata
  globals.css                — Global styles, CSS variables
  api/
    compare/
      route.ts               — Core compare endpoint (GET)
    profile/
      route.ts               — Single wallet profile endpoint (GET)
    env-check/
      route.ts               — Dev utility to check env vars
  compare/
    page.tsx                 — Compare results page (client)
    compare.css              — Compare page styles
  profile/
    page.tsx                 — Single wallet profile page (client)
  wallet/                    — Wallet-related pages (if any)
  test/                      — Test routes (dev only)

lib/
  fetchWalletNFTs.ts         — Alchemy NFT fetching, pagination
  walletProfile.ts           — Core profile inference logic
  getWalletCollection.ts     — Collection-level data helpers

docs/
  ARCHITECTURE.md            — This file
  PROFILE_SPEC.md            — Individual profile spec
  DATA_MODEL.md              — Type definitions and API shapes
  DATA_SOURCES.md            — Alchemy and OpenSea API details
  INSIGHT_ENGINE.md          — Signal framework and meaning layer
  PRODUCT_SOUL.md            — Product identity, voice, principles
  interpretation-handoff.md  — AI interpretation spec (pair chemistry)
  API_PATTERNS.md            — API conventions and patterns
  BUILD_LOG.md               — Running build history
  KNOWN_ISSUES.md            — Known issues and workarounds
```

---

## Data flow

### Compare flow

```
User inputs two wallets (address or ENS)
  ↓
app/compare/page.tsx
  ↓ GET /api/compare?walletA=...&walletB=...
app/api/compare/route.ts
  ↓
fetchWalletNFTs() × 2          — Alchemy: full NFT holdings per wallet
fetchOpenSeaProfile() × 2      — OpenSea: pfp, banner
buildTasteDNA() × 2            — Category distribution from NFT metadata
buildWalletProfile() × 2       — lib/walletProfile.ts: full profile inference
buildWalletAcquiredMap() × 2   — OpenSea events: acquisition timestamps
enrichSharedExact()            — OpenSea asset: display metadata for exact overlaps
enrichSharedBuckets()          — OpenSea asset: display metadata for collections/artists
buildPairInterpretation()      — Currently static template logic (to be replaced)
  ↓
JSON response → compare page renders
```

### Profile flow (if separate profile page exists)

```
User inputs one wallet
  ↓
app/profile/page.tsx
  ↓ GET /api/profile?wallet=...
app/api/profile/route.ts
  ↓
fetchWalletNFTs()
buildWalletProfile()           — lib/walletProfile.ts
  ↓
JSON response → profile page renders
```

---

## Core modules

### lib/fetchWalletNFTs.ts

Fetches all NFTs for a wallet via Alchemy.
Handles pagination.
Returns raw NFT array.

Input: wallet address, Alchemy API key
Output: NFT[]

---

### lib/walletProfile.ts

The core profile inference engine.
Takes raw NFT array and returns a structured WalletProfile.

Key functions:
- buildWalletProfile(nfts) → WalletProfile
- buildCategoryDistribution(nfts) → CategoryDistribution
- calculateFocusIndex(collections, totalNFTs) → number
- classifyCollectorFocus(focusIndex) → "Focused" | "Balanced" | "Explorer"
- buildCollectorIdentityLabel(...) → string
- resolveCollectionName(nft) → string

This is where individual profile inference lives.
This is the module most in need of improvement for Phase 2.

---

### app/api/compare/route.ts

The main compare endpoint. ~800 lines.
Orchestrates all data fetching, scoring, and output construction.

Key functions inside route.ts:
- fetchNFTs() — calls fetchWalletNFTs
- buildTasteDNA() — simple category distribution for taste map
- buildSharedBuckets() — groups shared collections and artists
- scoreExact() / scoreSharedBuckets() / scoreTaste() — chemistry scoring
- buildPairInterpretation() — currently static template (replace with AI call)
- getChemistryLabel() — maps score to label (needs updating to spec labels)
- enrichNFT() — calls OpenSea for display metadata
- buildWalletAcquiredMap() — fetches acquisition timestamps from OpenSea events

Note: buildTasteDNA() in route.ts is a simpler version of buildCategoryDistribution()
in walletProfile.ts. These should be consolidated.

---

## API dependencies

### Alchemy
- Used for: full NFT holdings per wallet
- Env var: ALCHEMY_API_KEY
- Called via: lib/fetchWalletNFTs.ts
- Notes: paginated, handles large wallets

### OpenSea API v2
- Used for: NFT display metadata, collection events, acquisition timestamps, wallet profiles
- Env var: OPENSEA_API_KEY
- Base URL: https://api.opensea.io/api/v2
- Key endpoints:
  - /chain/ethereum/contract/{address}/nfts/{tokenId} — display metadata
  - /events/accounts/{address} — acquisition history
  - /events/collection/{slug} — collection entry dates
  - /accounts/{address} — pfp, banner
  - /chain/ethereum/account/{address}/nfts — inventory (for bounty lookup)
- Timeout: 5000ms with fallback
- Notes: optional enrichment only; app degrades gracefully without it

### Anthropic API
- Used for: pair interpretation generation (in progress)
- Env var: ANTHROPIC_API_KEY
- Called via: app/api/compare/route.ts (buildPairInterpretation replacement)
- Model: claude-sonnet-4-20250514

---

## Response shape

### GET /api/compare

```typescript
{
  walletA: WalletSummary;
  walletB: WalletSummary;
  scoring: {
    chemistryScore: number;       // internal only
    label: string;                // deprecated — use chemistryLabel
    chemistryLabel: string;       // Strong Signal | Kindred | Interesting Tension | Distant But Related
    confidence: "High" | "Medium" | "Low";
    similarityType: string;
    tasteAlignment: { score: number; label: string };
    interpretation: string;
    pairInterpretation: {
      headline: string;
      summary: string;            // multi-paragraph, AI-generated
    };
    breakdown: { exact; collections; artists; taste };
    summary: { headline; body };
  };
  shared: {
    exact: NFT[];
    exactCount: number;
    collections: Record<string, SharedBucket>;
    artists: Record<string, SharedBucket>;
  };
}
```

### GET /api/profile

```typescript
{
  wallet: string;
  profile: WalletProfile;
  previewNFTs: NFT[];    // small array for visual rendering
}
```

---

## Current limitations and known issues

See docs/KNOWN_ISSUES.md for the full list.

Key ones to be aware of:

1. buildTasteDNA() in route.ts duplicates buildCategoryDistribution() in walletProfile.ts.
   They use slightly different category names. This causes inconsistency.
   Consolidate to walletProfile.ts as the canonical source.

2. buildPairInterpretation() is static template logic.
   It produces generic output because it does not use the Insight Engine signals.
   Replace with AI-generated interpretation using the spec in interpretation-handoff.md.

3. getChemistryLabel() in route.ts uses a different label set than the spec.
   The spec labels are: Strong Signal, Kindred, Interesting Tension, Distant But Related.
   The current labels are: Extremely aligned, Strong match, Clear overlap, etc.
   Update to match the spec.

4. Archetype inference in buildCollectorCardProfile() inside route.ts
   is separate from the archetype system in walletProfile.ts.
   These should be unified. walletProfile.ts is the canonical source.

5. The profile page (if it exists) and the compare page use different
   rendering logic for the same profile data. Consolidate to shared components.

---

## Build philosophy

Keep route.ts as an orchestrator, not a logic file.
Business logic belongs in lib/.
New inference or interpretation logic goes in lib/, not inline in the route.

Prefer small, named functions over large anonymous ones.
Prefer explicit over clever.
Prefer readable over compressed.

Do not add dependencies without a clear reason.
Do not abstract prematurely.
Do not solve for scale before the product works.