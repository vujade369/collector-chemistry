# Collector Chemistry — Profile Spec

## What this is

The complete specification for an individual collector profile.

A profile is the foundation of everything in Collector Chemistry.
The comparison is only as good as each individual read.
Build profiles first. Comparisons second.

---

## The governing principle

A wallet is a constellation.
Each piece is a point.
Together, they describe a person.

A profile should help someone understand their own collecting behavior
as a pattern, not just an inventory.

The goal is not to describe what someone owns.
The goal is to surface patterns they haven't consciously named yet.

---

## What a complete profile contains

### 1. Archetype

The single most descriptive identity label for how this collector moves.

One of five archetypes (defined below).
Inferred from signal data, not selected by the user.
If signals are mixed, use the dominant one — the archetype with the most collection weight behind it.

The archetype is not shown as a raw label.
It informs the written output.

---

### 2. Pattern line

A short, memorable phrase that combines 2–3 signal states.

This is the most compressed expression of the profile.

Examples:
- Focused collector, high conviction
- Broad explorer, selective picker
- Early entrant, long-term holder
- Curious sampler, low repetition

Rules:
- Under 8 words
- Behavior language, not category language
- Slightly revealing, not generic
- Should feel like something the collector might recognize about themselves

---

### 3. Identity paragraph

2–4 sentences that expand on the pattern line.

Structure:
1. How they move (breadth vs depth)
2. Where attention sits (concentration, category lean)
3. What that suggests (the meaning layer)
4. How they behave over time (if time data is available)

Voice rules:
- Write as "You tend to…" not "This wallet has…"
- Interpretive, not descriptive
- One level deeper than the data
- No financial language, no rarity language

Example:

"You tend to move across collections, picking specific pieces rather than
committing fully to any one world. Most of your attention sits in PFP-driven
projects, with smaller, more deliberate movement into independent art.
Your collection is spread broadly rather than concentrated, suggesting
exploration over conviction. Your activity comes in bursts rather than
steadily over time."

---

### 4. Signal summary

The internal structured data that drives the profile.
Not shown directly to the user, but informs all written outputs.

Six signals. Each resolves to a qualitative state.

**Signal 1 — Concentration**
Where attention sits.

Inputs: % of wallet in top 1 collection, % in top 2 collections.

States:
- high_concentration (top collection > 30% of wallet)
- balanced (top collection 15–30%)
- low_concentration (top collection < 15%)

Meaning:
- high_concentration → conviction, strong attachment, identity anchored in one world
- balanced → selective, deliberate
- low_concentration → exploratory, wide attention, non-committal per collection

---

**Signal 2 — Breadth**
How the collector moves across collections.

Inputs: total collections, average NFTs per collection.

States:
- broad_sampler (many collections, low average)
- focused_collector (few collections, high average)
- balanced

Meaning:
- broad_sampler → curious, exploratory
- focused_collector → conviction-driven, identity-anchored
- balanced → selective curiosity

---

**Signal 3 — Time shape**
How collecting behavior unfolds over time.

Inputs: first acquisition date, last acquisition date, clustering vs spread.

States:
- early_entrant (active pre-2022)
- recent_entrant (active post-2023)
- burst_collector (activity clustered in short windows)
- steady_collector (activity distributed consistently)

Meaning:
- early_entrant → present before mainstream attention
- burst_collector → emotionally or moment-driven, reactive
- steady_collector → practice-oriented, long-term

Note: Time data may not always be available. Omit gracefully if absent.

---

**Signal 4 — Category lean**
What kinds of things draw attention.

Inputs: category distribution across the wallet.

States:
- pfp_heavy (PFP > 35%)
- art_heavy (fine_art or generative > 30%)
- meme_heavy (meme > 20%)
- utility_heavy (utility > 30%)
- mixed (no single category > 25%)

Meaning:
- pfp_heavy → identity-driven, community-oriented
- art_heavy → aesthetics-driven, curation-minded
- meme_heavy → internet-native, culturally embedded
- mixed → cross-category curiosity

---

**Signal 5 — Entry behavior**
How the collector enters positions.

Inputs: mint vs secondary acquisition ratio (when available).

States:
- mint_heavy (>60% minted directly)
- secondary_heavy (>60% acquired on secondary)
- mixed

Meaning:
- mint_heavy → early participation, present at origin
- secondary_heavy → reactive entry, confirmation-driven
- mixed → opportunistic

Note: Entry data may not always be available. Omit gracefully if absent.

---

**Signal 6 — Focus index**
The overall concentration of collecting attention.

Inputs: top 3 collections as % of total wallet.

States:
- focused (focus index >= 70)
- balanced (40–69)
- explorer (< 40)

This signal provides a single summary of overall collecting posture.

---

### 5. Category distribution

The full breakdown of the wallet by category.

Shown visually in the profile.
Used to infer signal states and archetype.

Categories (from walletProfile.ts, unchanged):
- meme
- generative
- pfp
- fine_art
- photography
- gaming
- utility
- music
- 3d_animation
- collectibles
- sports
- virtual_worlds
- other

---

### 6. Top collection

The single collection with the most holdings in the wallet.

Shown with:
- collection name
- owned count
- 1–2 preview images

If no named collection exists, fall back to top artist.

---

## The five archetypes

These map to the interpretation spec in `docs/interpretation-handoff.md`.
Each archetype is inferred from the dominant combination of signal states.

---

**The Artist Follower**

Signal pattern:
- high_concentration or focused_collector
- art_heavy or fine_art category dominant
- steady_collector or early_entrant

Behavior: Collects around specific artists and follows their entire trajectory.
The wallet is a record of conviction.
Driven by: who is worth staying with?

---

**The Explorer**

Signal pattern:
- broad_sampler
- low_concentration
- early_entrant
- mixed category lean

Behavior: Early, restless, ecosystem-agnostic.
Always somewhere new, always present at the moment something becomes real.
The wallet is a map of arrivals.
Driven by: what is just becoming real right now?

---

**The Scene Player**

Signal pattern:
- balanced or focused_collector
- pfp_heavy or community-oriented collections
- burst_collector or steady presence in community contexts

Behavior: Multiplayer-native. The collection is a social act.
Community and collection are inseparable.
The wallet only makes sense in context.
Driven by: where is the energy and am I inside it?

---

**The Curator**

Signal pattern:
- focused_collector
- high_concentration
- art_heavy or fine_art dominant
- steady_collector
- secondary_heavy (deliberate entry)

Behavior: Slow, deliberate, building something permanent.
Every piece earns its place. Indifferent to social context or market movement.
The wallet is a room someone has been building for years.
Driven by: what is actually worth keeping?

---

**The World Citizen**

Signal pattern:
- broad_sampler or balanced
- mixed category lean across gaming, music, virtual_worlds, pfp
- low_concentration
- mixed or burst activity

Behavior: Wide range, deep curiosity, present across ecosystems and formats.
Collects things you step into rather than look at.
Driven by: what worlds are worth inhabiting?

---

## Archetype inference rules

1. Score each archetype against the wallet's signal states
2. The archetype with the most matching signal states wins
3. If two archetypes tie, use category lean as the tiebreaker
4. If signals are too sparse to infer reliably (< 10 NFTs), use focus index only
   and label as "Early Collection" rather than forcing an archetype

---

## What a profile is not

- Not a ranking
- Not a financial read
- Not a score
- Not a judgment about taste quality
- Not a comparison (that is the chemistry layer's job)

A profile should feel like a respectful, specific interpretation of a person's
collecting behavior. Not a report. Not a dashboard. Not a verdict.

---

## Quality test

Before any profile output is used, check four things:

1. Does it describe behavior, not inventory?
2. Does it surface a pattern, not just a fact?
3. Could the collector recognize themselves in it?
4. Does it avoid generic language?

If any of these fail, the output is not finished.

---

## Relationship to the comparison layer

The comparison layer takes two complete profiles as input.

The chemistry output is only as specific as the individual profiles that feed it.

If both profiles produce generic reads, the chemistry output will be generic.

Build sharp individual profiles first.
The comparison writes itself from there.

---

## Category drill-down

The category drill-down is the exploration layer of the profile page.
It lives below the taste map donut and turns the percentage breakdown
into something the collector can actually navigate.

### Purpose
A collector should be able to tap any taste category and immediately see
which NFTs and collections sit inside it. This creates a moment of
genuine discovery — not just "I collect 14% meme" but "here is exactly
what that means."

### Data requirements
The profile API must return a `categoryGroups` field alongside the
existing `categoryDistribution`. Each group contains:
- The category name
- Up to 4 NFT preview items (imageUrl, title, collectionName)
- The top collections within that category with piece counts
- Total piece count for the category

### Display rules
- Show the top 6 categories by percentage in the card grid
- Hide remaining categories behind a "show more" interaction
- Do not show categories with 0 pieces
- The `other` category should always appear last if shown at all

### Interaction
- One category open at a time
- Tapping a card reveals its drawer
- Tapping the active card closes it
- The drawer shows NFT thumbnails and a collection breakdown

### Relationship to the taste map donut
The donut and the category grid are two views of the same data.
The donut shows the shape at a glance.
The grid lets you go deeper.
They should always be visually connected — same color system,
same category names, same data source.

### Data source
Category classification uses the `classify()` function from
`app/api/compare/route.ts`, the same function used by the compare page.
Do not use `buildCategoryDistribution()` from `walletProfile.ts` for
the category grid — that function uses a different classification system
and produces inconsistent results.

## Current Profile Page Direction

The individual profile page is the foundation of the product.

It should function as a single-wallet collector readout with:
- identity
- archetype
- taste map
- core signals
- top collections
- compare CTA

The current target layout is the “Neon Pulse” direction described in `docs/VISUAL_REFERENCES.md`.

Profile should be built first. Compare can later reuse the profile components side by side.