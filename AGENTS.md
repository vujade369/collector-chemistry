# Constellate — Agent Entry Point

Constellate was formerly called Collector Chemistry.

This repo may still contain legacy Collector Chemistry language in code, docs, routes, types, and API contracts. Do not rename internal systems casually just because the product language has changed.

Constellate is a product for reading cultural signal, taste, overlap, and collecting behavior from wallets.

The product is not about ranking collectors. It is about helping people see the pattern in what they keep, then discover where that pattern overlaps with someone else’s.

Core thesis:

> What you keep becomes a pattern.  
> What overlaps becomes recognition.

---

## Before making changes

Before making changes, read:

1. `.agents/agents/ORCHESTRATOR.md`
2. The relevant specialist agent doc
3. The relevant product/spec docs listed by the orchestrator
4. `docs/00_CONSTELLATE_CANON.md`
5. `docs/01_CONSTELLATE_TRANSITION_PLAN.md`

Before making edits, agents must consult `.agents/registry.yaml` when it exists.

If the task touches design, profile hierarchy, copy, or product language, also read:

- `docs/DESIGN_SYSTEM.md`
- `docs/PROFILE_VISUAL_BRIEF.md`
- `docs/PRODUCT_SOUL.md`

If the task touches profile data, compare data, wallet fetching, OpenSea, Alchemy, converter logic, or API response shape, also read the relevant implementation docs before editing.

---

## Product question first

Before editing, identify the user-facing product question the change is answering.

Examples:

- What pattern does this wallet reveal?
- How did this wallet form?
- Where do these two wallets overlap?
- Which collections does this wallet return to?
- What active offer value could this wallet convert into?

If the product question is unclear, return a plan instead of editing.

Do not start by refactoring.

Start by asking:

- What exact user-facing question are we answering?
- What data source answers that question most directly?
- What is the smallest safe code path to make the answer accurate?
- How do we verify it with terminal output or visible UI?

---

## What Constellate is not

Do not treat this as:

- a finance dashboard
- a marketplace
- a leaderboard
- a generic analytics app
- a compatibility score
- a trading product
- a portfolio valuation tool
- a social ranking system

Market, floor, and offer data may appear in utility modules, but financial value should not become the center of the product experience.

---

## Language rules

Prefer language like:

- constellation
- pattern
- recognition
- overlap
- shared worlds
- shared stars
- crossing points
- signal points
- what people keep
- where this wallet returns
- how this wallet formed
- collecting rhythm

Avoid user-facing language like:

- compatibility
- match score
- ranking
- portfolio score
- alpha
- financial performance
- generic dashboard
- wallet analytics
- chemistry, unless preserving legacy internals

Internal legacy names such as `chemistryScore`, `chemistryLabel`, route names, helper names, CSS classes, or API fields should not be renamed unless explicitly requested and scoped.

---

## General rules

- One task = one concern
- Define the product question first
- Scope before implementation
- Do not mix UI, API, and refactor work unless explicitly requested
- Keep API routes thin
- Prefer existing data before adding new data
- Preserve existing behavior unless the task says otherwise
- Do not change API response contracts casually
- Do not rename routes, APIs, types, helpers, or CSS classes just because the brand language changed
- Avoid broad refactors unless explicitly requested
- Prefer small, safe, testable changes
- Run checks after editing

---

## Scope guard

Every implementation task should clearly identify:

- files to inspect
- files allowed to touch
- files not to touch
- definition of done
- verification commands

Do not edit outside the allowed files unless the user explicitly approves it.

If the correct fix requires touching files outside the allowed scope, stop and explain the need before editing.

---

## Display contract

For any work that touches profile pages, compare pages, wallet identity, NFT cards, collection cards, artist/creator displays, images, marketplace links, OpenSea links, empty states, or entity click behavior, read:

- `docs/DISPLAY_CONTRACT.md`

Follow its rules for:

- no hardcoded wallet-specific values
- no naked entities
- image fallbacks
- OpenSea / marketplace link behavior
- truthful labels and confidence
- enrichment budgets
- empty states
- accessibility basics
- profile and compare acceptance criteria

Do not scatter raw OpenSea links across components. Prefer consistent link/helper patterns when available.

OpenSea is the preferred marketplace destination when reliable data exists, but missing OpenSea data must never block the Constellate experience.

---

## Linkability rule

Every displayed NFT, collection, or artist should link to the deepest reliable destination available.

### NFT links

Priority:

1. Specific OpenSea NFT URL when contract address + token ID are reliable
2. Collection URL fallback when the NFT URL cannot be built safely
3. No link if the destination is unsafe or uncertain

### Collection links

Priority:

1. OpenSea collection URL from reliable slug
2. Reliable contract-derived OpenSea collection URL fallback
3. No link if the destination is unsafe or uncertain

### Artist / creator links

Priority:

1. OpenSea account / creator URL when available
2. Trusted external artist URL from metadata when available
3. No link if attribution is uncertain

Rules:

- Do not invent URLs
- Do not link to misleading destinations
- Do not link artist names to generic search pages unless explicitly designed as a fallback
- Prefer no link over a wrong link
- Any NFT, collection, or artist shown in the UI should support digging deeper when reliable data exists

---

## Data honesty and confidence

Separate facts from interpretation.

Hard facts include things like:

- wallet address
- token ID
- contract address
- collection slug
- OpenSea URL
- NFT count
- collection count
- event timestamp, when source-supported

Interpretive or confidence-sensitive fields include:

- category classification
- artist attribution
- acquisition type
- collector archetype
- recommendations
- taste pattern
- behavior labels
- recognition language

Do not present inferred categories, artists, acquisition types, recommendations, or behavioral reads as certain unless the source supports them.

Use fallbacks and careful language when data is incomplete.

Prefer:

- “appears to”
- “based on visible wallet activity”
- “where metadata is available”
- “unresolved”
- “unknown”

Avoid overclaiming.

---

## Ethical design rules

Constellate should illuminate, not expose.

Do not:

- frame wallet data as a judgment of the person
- imply psychological certainty
- shame collectors for financial behavior, taste, volume, inactivity, or airdrops
- create manipulative ranking or status mechanics
- turn overlap into compatibility scoring
- make social pairing feel creepy or deterministic
- expose sensitive-seeming patterns unnecessarily

Do:

- keep the experience opt-in where social comparison is involved
- explain uncertainty where appropriate
- make interpretation feel human and respectful
- show proof behind claims
- treat wallets as partial records, not complete identities

---

## API and data rules

Protect these areas from casual edits:

- API response contracts
- profile and compare route shapes
- NFT fetching and spam/hidden filtering
- OpenSea / Alchemy integration logic
- converter offer math
- interpretation copy contracts
- large page files

Before changing a response shape, identify:

- current consumer
- new field
- fallback behavior
- whether UI needs to change
- whether docs need updating
- how to verify with terminal output or UI

---

## Converter rule

The wallet converter answers one specific question:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

This is not the same as OpenSea floor-based wallet value.

Do not change the converter into floor-based wallet valuation unless the product question explicitly changes.

Small collection-wide bids should count if they are actionable offers.

Do not filter out small actionable offers merely because they are small.

The correct fix for inflated converter totals is unique NFT deduplication before summing offers, not arbitrary offer filtering.

---

## Verification

After implementation, run the checks requested in the prompt.

Default checks:

```bash
git diff --name-only
npx tsc --noEmit
git status