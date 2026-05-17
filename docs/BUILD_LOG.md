# Collector Chemistry — Build Log

## Current State

- Comparison page is working.
- NFTs are fetched and displayed.
- Shared collections logic exists.
- Shared artists logic exists.
- Exact NFT overlap logic exists.
- UI shows overlap visually.
- Individual wallet profile page exists, but is not yet as strong as the compare page.
- Compare page is more built out visually, but still needs stronger hierarchy and structure.
- Profile and compare pages currently use different rendering patterns for similar collector data.
- route.ts and page.tsx files are becoming too large and should not be expanded casually.

---

## Recent Decisions

### VS Code + Codex workflow

- Codex is now the default build partner for scoped VS Code implementation sessions.
- Each session should start with the task goal, allowed files, files not to touch, definition of done, and verification commands.
- Codex should identify the product question, inspect files fresh, and make the smallest useful change.
- Workflow documentation sessions must stay docs-only and avoid app behavior changes.
- AGENTS.md is the repo-local source of truth for Codex behavior and verification expectations.

### Product framing

- Collector Chemistry is about taste, resonance, overlap, curiosity, and cultural signal.
- It is not about ranking collectors.
- It is not about financial performance.
- It is not about proving who has the better bag.
- The comparison is a mirror, not a match.
- Self-recognition is the outcome.
- Comparison is the mechanism.

### Visual direction

- Earlier direction leaned editorial, quiet, and museum-like.
- Current direction is moving toward a more vivid collector readout:
  - dark base
  - stronger contrast
  - magenta / cyan wallet distinction
  - luminous accents
  - playful visual energy
  - clearer hierarchy
  - more moments of discovery

The product should feel more alive and fun without becoming noisy or generic web3.

Preferred feel:
- collector readout
- shared-world map
- luminous field guide
- playful dossier
- personal taste artifact

Avoid:
- financial dashboard
- marketplace UI
- leaderboard
- generic analytics page
- dating app compatibility score

### Terminology decisions

- “Signature piece” has been replaced with “Top Collection” or “Signal Piece,” depending on context.
- “Chemistry score” or percentages may appear, but only as orientation cues.
- Scores should not feel like judgment, ranking, or a verdict.
- “Highest bid” can be included as a light market-attention signal, but should not make the product about value.

### Shared display priority

Shared display priority remains:

1. Exact same NFTs
2. Shared collections
3. Shared artists

However, shared collections are now considered the strongest compare-page product surface.

The better framing is:

**Shared worlds, different expressions.**

For each shared collection, the ideal layout is:

- center: shared collection card with collection name and image
- left: wallet 1’s NFTs from that collection
- right: wallet 2’s NFTs from that collection
- entry dates for each wallet
- depth indicator showing who goes deeper
- clickable collection and NFT cards

This should eventually replace flatter shared-collection list layouts.

### NFT preview rules

- Max 4 NFTs per wallet per shared collection by default.
- Expandable states can show more.
- Avoid rendering entire wallets by default.
- Heavy NFT grids should be progressively disclosed or lazy-loaded.

---

## Known Issues

- `app/api/compare/route.ts` is too large.
- Archetype and collector-level logic is still split, but partially resolved: compare-route archetype labels are aligned to the five-archetype spec and ready for interpretation context wiring; full consolidation into `lib/walletProfile.ts` remains pending.
- `app/compare/page.tsx` is too large.
- `app/profile/page.tsx` is at risk of becoming too large if new UI is added directly.
- Repeated logic exists across API routes and page files.
- Profile and compare use different display logic for similar collector data.
- Collection slug/display-name normalization is still fragile.
- Date or time-based NFT pipeline behavior may be unreliable.
- OpenSea enrichment can slow responses.
- Some visual sections depend on enriched data that may fail or be missing.
- npm run lint currently fails due to pre-existing issues, including `app/api/test/route.ts` using `any`.
- Current profile page is visually weaker than the compare page.
- Current compare page has good raw material but lacks a fully resolved hierarchy.
- The compare form remains too prominent after results are loaded.
- Lower dashboard-style sections can compete with the more interesting shared-world sections.

---

## Current Product Priority

The current priority is:

1. Strengthen the individual wallet profile page.
2. Build reusable collector profile components.
3. Use the profile page as the foundation for compare.
4. Redesign compare around shared worlds and relationship structure.
5. Keep API changes focused and minimal.
6. Avoid broad refactors unless they directly support the next build step.

Profile first.  
Comparison second.  
Social/discovery layer later.

---

## Next Focus

### 1. Individual profile page

The profile page should become a complete collector readout.

It should show:

- collector identity
- archetype / collector label
- stats row
- interpretive profile statement
- taste map
- category drill-down
- core signals
- top collections
- representative holdings
- compare CTA

The page should speak directly to the collector about themselves.

Use language like:
- where your taste lives
- what you return to
- the collections you keep circling back to
- what your wallet seems to trust
- your collecting pattern
- your signal piece

Avoid:
- dashboard language
- category distribution
- dominant categories
- user
- data points
- generic analytics phrasing

### 2. Category drill-down

The category drill-down should be built for the profile page first.

Desired behavior:

- show top categories as cards
- one category drawer open at a time
- drawer shows NFT previews and collection breakdown
- top 6 categories shown initially
- “show remaining categories” for overflow
- hide “Other” from the drill-down unless needed
- keep the donut/taste visual as overview
- category cards become the exploration layer

Required API support:
- profile response should include category groups
- each category group should include:
  - total count
  - preview NFTs
  - top collections in that category

### 3. Core signals

Core signals should explain collector behavior, not just display metrics.

Recommended signals:

- Top Collection / Signal Piece
- Return Pattern
- First Mint
- Most Recent Acquisition
- Highest Bid / Market Attention
- Collecting Style

Each signal should answer a different question:

- Origin: where did this start?
- Anchor: what do they return to?
- Momentum: what are they doing now?
- Behavior: how do they collect?
- Market signal: where is outside attention strongest?

Do not add too many signals.  
Five or six is enough.

### 4. Compare page redesign

The compare page should eventually be redesigned around:

- two collectors entering the same frame
- a clear center chemistry moment
- bridge stats
- shared-world spotlight
- exact overlap
- shared artists
- taste comparison
- short interpretation

Best current direction:
- dark luminous interface
- pink wallet 1 / cyan wallet 2
- central chemistry bridge
- shared collection spotlight as the hero section
- lower data visuals as supporting proof

The compare form should become less dominant after results are loaded.

### 5. Shared-world layout

The shared collection section should become one of the defining features of the product.

Desired desktop structure:

```txt
Wallet 1 NFTs        Shared Collection        Wallet 2 NFTs
```

Desired mobile structure:

```txt
Shared Collection
Wallet 1 NFTs
Wallet 2 NFTs
```

Each shared collection card should include:

- collection name
- collection image
- entry date for wallet 1
- entry date for wallet 2
- NFT previews for wallet 1
- NFT previews for wallet 2
- total owned by each wallet
- depth comparison
- links to NFTs / collection where available

This section should feel object-based and collector-native, not abstract.

---

## Build Discipline

### General rules

- Do not rewrite everything from scratch.
- Do not expand large files casually.
- Keep route files as orchestrators.
- Move reusable logic into `lib/` only when it directly supports the next build step.
- Move reusable UI into components only after the pattern is proven.
- Avoid adding dependencies.
- Preserve compare behavior when working on profile.
- Preserve profile behavior when working on compare.
- Keep mobile layout in mind from the beginning.

### Preferred build sequence

For each meaningful feature:

1. Define the experience in plain language.
2. Identify the minimum files to touch.
3. Make the smallest useful change.
4. Test visually.
5. Test data correctness.
6. Extract components only if reuse is clear.
7. Update docs after the decision is proven.

### Codex working pattern

Before Codex edits:

- read relevant docs
- inspect current files fresh
- summarize files to touch
- state what will not be touched

After Codex edits:

- summarize files changed
- summarize behavior changed
- confirm compare still works if compare was not the target
- confirm profile still works if profile was not the target
- run TypeScript check when possible
- check for conflict markers

Required conflict marker check:

```bash
grep -n "<<<<<<\|=======\|>>>>>>" <changed-file>
```

Preferred TypeScript check:

```bash
npx tsc --noEmit
```

Known note:
`npm run lint` may fail due to pre-existing issues and should not automatically block focused work unless the new change introduces new lint errors.

---

## Long-term Possibility

Collector Chemistry may eventually become a social surface.

This should not drive current architecture prematurely.

The long-term social layer should grow out of collecting behavior, not posting behavior.

Possible future feed surfaces:

- collectors near your taste
- new overlap found
- someone entered a collection you keep returning to
- an artist appearing across related wallets
- a wallet with similar anchors just collected something new
- shared-world moments between collectors
- pieces gaining attention inside your cultural orbit

The future direction is:

**A taste graph, not a content feed.**

Current priority remains:

1. individual profile
2. comparison experience
3. reusable collector components
4. social / discovery surfaces later

---

## Current Guardrail

Do not let the product become:

- an NFT analytics dashboard
- a price tracker
- a leaderboard
- a social feed clone
- a marketplace skin
- a compatibility app

The product should remain:

- visual
- interpretive
- collector-native
- playful
- respectful
- specific
- grounded in public collecting behavior

---

## 2026-05-07 Session

### Summary

- Fixed animated / GIF NFT rendering in profile preview cards.
- Removed the market-attention offer lookup from the blocking profile response path.
- Diagnosed and fixed OpenSea category enrichment producing zero category source signal.
- Made category enrichment and latest-arrival signal bounded so the profile response no longer waits on 10s+ optional enrichment work.
- Preserved the Signal Piece / Market Attention feature for a later lazy implementation.

### Files changed

- `app/api/profile/route.ts`
  - Removed `marketAttentionTask` from the main profile `Promise.all` chain.
  - Set market attention to `null` in the initial profile response.
  - Added a bounded category enrichment response budget.
  - Bounded latest-arrival lookup so it can return `null` instead of blocking profile load.
- `lib/walletProfile.ts`
  - Fixed double normalization of already-normalized OpenSea category values.
- Profile media component files from the GIF fix
  - Fixed the animated media fallback path so GIF / animation URLs render instead of falling back incorrectly.

### Key findings

- OpenSea category enrichment was spending about 11 seconds but producing `categorySourceBreakdown.opensea: 0`.
- Root cause: `enrichCollectionCategories` wrote normalized internal values such as `fine_art` into `displayCollectionCategory`, but `classifyCategoryWithSource` passed that value through `normalizeOpenSeaCategory()` again.
- `normalizeOpenSeaCategory("fine_art")` returns an empty string, while `normalizeOpenSeaCategory("art")` returns `fine_art`.
- Market attention was the first large bottleneck: MCP plus OpenSea inventory fallback plus per-NFT offer checks could block profile responses for 15-20 seconds.
- After market attention was removed from the blocking path, category enrichment and latest arrival became the dominant costs.
- Latest arrival was hitting a 5s OpenSea events timeout and is better treated as an optional signal piece.
- GIF rendering root cause: animation media data from Alchemy was not typed / checked consistently, so animated assets could fall through the wrong image fallback path.

### Performance

- Before the session, `vuja-de.eth` profile responses could take about 28 seconds.
- After removing blocking market attention, fixing category normalization, and bounding optional enrichment, warmed profile responses are about 5-7 seconds.
- Latest verified warmed response:
  - HTTP `200`
  - `5.397520s`
  - `categorySourceBreakdown.opensea: 12`
  - `marketAttentionMs: 0`
- A cold/cache-miss profile load still measured about 7.3 seconds because wallet fetching and OpenSea visibility filtering can dominate.

### Commits

1. `41c51fd` — `fix animated and GIF NFT rendering in profile preview cards`
2. `bb43e84` — `fix Other category filter capitalization in buildCategoryGroups`
3. `0289bef` — `fix double normalization of OpenSea category in classifyCategoryWithSource`
4. `283e456` — `make category enrichment and latest arrival non-blocking in profile response`

### Still pending

- Step 3B: build `lib/marketAttention.ts` with the two-pass capped OpenSea offer scan.
- Step 3C: add lazy `/api/profile/market-attention` route.
- Step 3D: wire the profile page to fetch Market Attention after the main profile response.

### Known follow-ups

- Alchemy animation object is still under-typed and not checked deeply enough.
- Cold profile load can still be around 7 seconds due to wallet fetching and OpenSea visibility filtering.
- Market attention currently returns `null` in the main profile response until the lazy implementation is added.

---

## 2026-05-16 — Social Share V1 paused

### Completed

- Defined `docs/SOCIAL_SHARE_V1_SCOPE.md`
- Added Named Orbit share preview
- Added editable Orbit share name
- Preserved seed-only remix URLs
- Fixed shared `/orbit` URL hydration mismatch
- Aligned local page, metadata, and OG seed labels for known collections

### Current status

Named Orbit is locally share-ready.

The local `/orbit` share URL now:
- preserves `seed`, `name`, and `from`
- server-renders the Named Orbit state
- avoids the previous hydration mismatch
- includes Open Graph and X/Twitter metadata
- renders the `/orbit/og` preview image locally
- uses consistent labels such as `mfers`, `Milady`, and `goblintown.wtf`
- Verified canonical `/orbit?seed=mfers,milady,goblintownwtf&name=The%20Chaos%20Canon%20Orbit` cold-loads from URL state after hard refresh, preserves URL params, renders Named Orbit identity, seed pills, and candidate cards, and requests `/api/profile/orbit` with the seed set. No code changes needed.

### Not yet done

- Public deployment
- X/Farcaster unfurl testing
- Production-domain OG image verification
- Compare share preview
- Wallet Read share preview

### Next time

Resume with public deployment or production share verification before expanding social share work to Compare or Wallet Read.
