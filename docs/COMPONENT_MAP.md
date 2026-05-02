# Collector Chemistry — Component Map

## What this is

A guide for where UI and logic should live.

Use this before creating new components, moving code, or extracting helpers.

The goal is not to create a large component system early.

The goal is to keep page files readable, route files thin, and reusable logic in the right place.

---

## Current principle

Do not create components just to create components.

Create a component when:
- the UI is reused
- the section is complex enough to isolate
- a page file is becoming hard to reason about
- the component has a clear responsibility
- the component has its own interaction state
- extracting it makes the next task safer

Do not extract when:
- it makes the code harder to follow
- it is only used once and very small
- the abstraction name is vague
- the feature is still changing rapidly
- the extraction mixes behavior changes with structure changes

---

## App pages

### `app/profile/page.tsx`

Owns:
- profile route/page composition
- wallet query handling
- loading state
- error state
- high-level section order
- calling the profile API
- passing profile data into sections/components

Should not own:
- large reusable cards
- complex visualizations
- repeated NFT tile logic
- reusable taste map logic
- large category drawer internals
- repeated section styling

---

### `app/compare/page.tsx`

Owns:
- compare page composition
- wallet input state
- result state
- loading state
- error state
- high-level section order
- calling the compare API
- passing compare data into sections/components

Should not own:
- reusable collector profile cards
- shared-world section internals
- repeated NFT tile logic
- repeated taste visual logic
- large interpretation formatting blocks
- reusable section styling

---

## Components

### `components/profile/*`

Use for profile-only UI.

Possible components:
- `ProfileResultCard`
- `ProfileHeader`
- `ProfileStats`
- `ProfileInterpretation`
- `CoreSignals`
- `CategoryDrilldown`
- `TopCollections`
- `RepresentativeHoldings`
- `CompareCTA`

Do not create all of these upfront.

Create only when useful.

Profile components should speak to a single collector.

---

### `components/compare/*`

Use for compare-only UI.

Possible components:
- `CompareHero`
- `BridgeStats`
- `SharedWorldSpotlight`
- `ExactOverlap`
- `SharedArtists`
- `TasteComparison`
- `ChemistrySummary`

Do not create all of these upfront.

Create only when useful.

Compare components should express relationship, overlap, difference, and shared-world context.

---

### `components/shared/*`

Use only for components reused by profile and compare.

Possible components:
- `NFTTile`
- `CollectorAvatar`
- `WalletLabel`
- `SectionCard`
- `TasteMap`
- `StatPill`
- `CollectionBadge`

Only move here when reuse is real.

Do not place one-off page sections in `components/shared`.

Shared components should be generic enough to reuse but still product-specific enough to avoid vague abstractions.

---

## Lib

### `lib/*`

Use for:
- data transformation
- wallet profile inference
- category classification
- collection normalization
- OpenSea helpers
- Alchemy helpers
- scoring logic
- interpretation helpers
- shared data shaping

Do not put visual logic in `lib`.

Do not put React components in `lib`.

Do not put CSS class composition systems in `lib` unless the project later adopts that pattern intentionally.

---

## API routes

API routes should:
- validate input
- orchestrate fetches
- call helpers
- return response
- degrade gracefully

API routes should not:
- contain large business logic
- duplicate classification logic
- include UI formatting
- grow casually
- perform broad data enrichment without caps

If route files become hard to work in, extract named helpers into `lib/`.

---

## CSS

Page-specific styles may live near the page when the project already uses that pattern.

Examples:
- `app/profile/profile.css`
- `app/compare/compare.css`

Use page-local CSS for:
- layout rhythm
- local card styling
- local animations
- page-specific visual polish

Do not place page-specific styles in global CSS unless they are truly global.

---

## Extraction rules

### Extract a UI component when:

- section is over roughly 150 lines
- section is reused
- section has its own state
- section has complex branching
- page readability improves
- the component name is clear

### Extract a lib helper when:

- logic is reused
- route readability improves
- function can be tested mentally in isolation
- behavior is not tied to rendering
- function has a clear product or data responsibility

### Do not extract when:

- the code is small and readable
- the feature is still changing rapidly
- the abstraction name is vague
- it creates more files without improving clarity
- it mixes refactor with behavior changes

---

## Naming rules

Use names that describe product meaning, not implementation mechanics.

Good:
- `SharedWorldSpotlight`
- `CoreSignals`
- `TasteMap`
- `CollectorHeader`
- `CategoryDrilldown`
- `BridgeStats`
- `RepresentativeHoldings`

Avoid:
- `DataBlock`
- `InfoCard`
- `ResultSection`
- `RenderThing`
- `CardWrapper`
- `DisplayModule`
- `ThingList`

---

## Current likely extraction path

Do not do all of this at once.

Likely order:

1. Prove profile page visual structure.
2. Add profile data depth.
3. Build category drill-down UI.
4. Extract profile components only where the page is getting too large.
5. Prove compare redesign.
6. Extract shared compare sections.
7. Move truly shared UI into `components/shared`.

Potential early shared components:
- `NFTTile`
- `TasteMap`
- `SectionCard`

Potential later shared components:
- `CollectorAvatar`
- `WalletLabel`
- `CollectionBadge`

Only extract when there is real reuse.