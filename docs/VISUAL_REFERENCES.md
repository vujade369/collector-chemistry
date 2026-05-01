# Collector Chemistry — Visual References

## What this is

This document captures current visual direction for Collector Chemistry.

Use it alongside:

- `docs/PRODUCT_SOUL.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/PROFILE_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/BUILD_LOG.md`

This is not a moodboard dump.

It is a translation layer between reference images, product intent, and implementation.

---

## Current visual direction

Collector Chemistry is a dark collector dossier. Immersive, personal, culturally readable, and slightly playful without tipping into noise.

The desired direction is:

- deep black base
- high contrast text and accents
- multi-color accent system (not just one color)
- collector-card energy
- playful visual reward
- restrained glow on featured elements only
- moments of surprise
- object-based exploration
- strong hierarchy
- mobile-first clarity

The page should create curiosity and a little awe when someone sees their result.

It should still feel tasteful. Not a casino. Not a trading terminal.

---

## Core visual feeling

The interface should feel like:

- a collector dossier
- a personal taste artifact
- a dark gallery readout
- a luminous field guide
- a playful character sheet for a collector
- a visual instrument for understanding collecting behavior

It should not feel like:

- a financial dashboard
- an NFT trading terminal
- a marketplace page
- a leaderboard
- a generic analytics page
- a dating app compatibility score
- a noisy neon web3 template
- a casino dashboard

---

## Accent system

The product uses a multi-color accent system. Colors are assigned by context, not used randomly.

Primary accent: `#ff3399` magenta — collector identity, wallet A, primary highlights
Secondary accent: `#9575ff` purple — secondary signals, third-ranked elements
Cyan accent: `#29b6f6` — wallet B in compare, second-ranked elements
Green accent: `#39d353` — market attention, external signals
Orange accent: `#ff8c42` — fine art category
Teal accent: `#00e5cc` — music category
Yellow accent: `#ffcc00` — photography category

Rules:

- each stat card, signal card, and category bar gets its own assigned accent (see DESIGN_SYSTEM.md)
- do not use all colors on every page — use them where they are contextually assigned
- glows should be subtle and purposeful, not decorative
- avoid full neon backgrounds
- avoid rainbow color systems outside of category-specific contexts

---

## Reference image files

Use a small, curated set of references. Do not add every screenshot or moodboard image to the repo.

### Target profile direction

```txt
docs/references/Wallet-Results-Mockup-1.png
```

This is the current target for the individual wallet profile page.

### Legacy reference (for historical context only)

```txt
docs/references/profile-neon-pulse.png
```

This was the earlier target direction. It has been superseded by Wallet-Results-Mockup-1. Do not use it as the current implementation target.

### Target compare direction

```txt
docs/references/compare-chemistry-bridge.png
```

Use the Chemistry Bridge mockup as the target direction when redesigning compare. This has not changed.

---

## How to use visual references with Codex

Visual references should guide layout, hierarchy, and feeling. They should not be copied blindly.

Every Codex visual task should include:

1. the target reference image
2. the relevant docs
3. a written list of what to borrow
4. a written list of what not to copy
5. the exact files Codex may edit

Never rely on the screenshot alone.

The image shows vibe.
The docs define behavior.

---

## Profile page direction: Wallet-Results-Mockup-1

Current target for the individual wallet profile page.

Reference file:

```txt
docs/references/Wallet-Results-Mockup-1.png
```

### What to borrow

- dark dossier layout with three-column hero
- collector identity on the left (name, class, statement, short paragraph)
- center framed profile/PFP image (gallery-wall treatment, bordered, slight glow)
- First Minted NFT artifact card on the right of the hero
- stats row with four cards, each using a distinct accent color
- taste map donut as a visual centrepiece
- Taste DNA bars using real category data and per-category accent colors
- Key Signals panel with accent top borders per signal type
- ranked top collections with progress bars in rank-ordered accent colors
- compare CTA at the bottom with NFT imagery cluster

### What not to copy from the mockup

- the left sidebar navigation — it does not exist in this product
- the top navigation bar — it does not exist yet
- the "Pro Tip" footer strip — omit it
- the neon gallery hallway image in Collected Works — that is AI-generated mood reference, not a real UI element
- the invented Taste DNA scores ("Meme Gravity 86/100", "Conviction 71/100") — these are mockup copy, not real data. Use actual category percentages from the API.
- hardcoded collection descriptions ("Keeping it real since forever") — mockup copy only, never hardcode

### Current implemented profile page structure

This is what is currently built. Future passes should extend this structure, not replace it.

1. Hero (three-column: identity left, profile image center, first mint card right)
2. Stats row (four cards: Holdings, Collections, Top Category, Market Attention)
3. The Pattern (taste map donut + Taste DNA bars side by side)
4. Key Signals (First Mint, Signal Piece, Anchor Collection)
5. Collected Works (summary strip)
6. Top Collections (ranked cards with progress bars)
7. Compare CTA

### Current known gaps

- First Minted NFT card is hitting the fallback state (image unavailable) for the current test wallet
- Taste Map does not yet implement full segment-hover isolation behavior from DESIGN_SYSTEM.md spec
- Hero identity paragraph may be too long — target is 2 sentences maximum in the hero
- Wallet input should be moved to the compare CTA section, not sitting between hero and stats row

---

## Profile page core signals

Core signals should feel like collector observations, not dashboard metrics.

Implemented signals:

1. First Mint — where this wallet started
2. Signal Piece — the collection the wallet keeps returning to
3. Anchor Collection — if different from signal piece

If a signal does not have data, hide the card gracefully. Do not show empty cards.

### Signal card tone

Use:
- "Where it started."
- "Your wallet keeps returning here."
- "Your largest anchor."

Avoid:
- "best"
- "most valuable"
- "top performing"
- "portfolio"
- "investment"
- "ROI"

---

## Category drill-down direction

The category drill-down is the main exploration layer on the profile page.

It should not feel like a simple chart.

It should feel like:

> tap into a part of your taste and see what lives there.

### Behavior

- top categories shown as cards
- one drawer open at a time
- tap open card again to close
- drawer shows NFT previews and collection breakdown
- top 6 categories shown initially
- remaining categories behind "show more"
- hide "Other" from the main drill-down where possible

### Drawer contents

Each drawer should show:

- category label
- total pieces in that category
- NFT thumbnails
- top collections within the category
- collection counts

### Visual style

- dark cards
- subtle accent top line in the category's assigned accent color
- active state glow
- compact but readable
- no heavy animation
- hover states should feel tactile

---

## Compare page direction: Chemistry Bridge

Preferred direction for the compare page. Not yet redesigned.

Reference file:

```txt
docs/references/compare-chemistry-bridge.png
```

### What to borrow

- two collectors on opposite sides
- central chemistry bridge
- magenta for wallet one, cyan for wallet two
- strong central relationship moment
- shared-world section as the primary proof
- object-based NFT comparison
- glowing connection lines used sparingly
- lower analytical visuals as support, not the main event

### What to refine

- reduce the compare form after results are loaded
- simplify side collector cards
- make shared collection spotlight the hero section
- avoid too many sections with equal visual weight
- make the page feel less like a report
- keep the strongest product concept visible early

---

## Compare page structure

Preferred compare structure (not yet implemented):

1. Result hero
2. Bridge stats
3. Shared-world spotlight
4. Exact overlap
5. Shared artists
6. Taste comparison
7. Short interpretation
8. Optional collector profile cards

---

## Visual hierarchy rules

Every page should have a clear hierarchy.

### Tier 1 — The main moment

Profile:
- collector identity
- taste readout
- core signals

Compare:
- chemistry hero
- shared-world spotlight

### Tier 2 — Supporting proof

Profile:
- category drill-down
- top collections
- representative holdings

Compare:
- bridge stats
- exact overlap
- shared artists
- taste comparison

### Tier 3 — Context

- footnotes
- methodology
- secondary badges
- expanded details
- debug or fallback states

Do not let every card have the same visual weight.

---

## Interaction principles

Use interaction to create discovery, not complexity.

Good interactions:
- tap category to open drawer
- expand shared collection
- reveal more NFTs
- hover card glow
- click NFT to view source
- click collection to view source
- collapse compare form after results

Avoid:
- constant motion
- too many animated elements
- hidden critical information
- complex filters too early
- interactions that require explanation

---

## Motion principles

Motion should be subtle and rare.

Use motion for:
- initial reveal
- hover affordance
- active drawer expansion
- soft glow or pulse on primary connection
- loading states

Avoid:
- constant animation
- distracting neon effects
- parallax everywhere
- heavy transitions that slow the app

Motion should feel like something becoming visible.

---

## Performance rules

Visual ambition should not make the site slow.

Rules:

- render previews first
- cap NFT thumbnails by default
- lazy load deeper grids
- avoid fetching unnecessary enrichment before first render
- use graceful fallbacks for missing images
- avoid adding dependencies for visual effects
- keep CSS patterns simple

---

## Profile implementation checklist

When implementing or refining the profile visual pass, check:

- Does the collector identity feel like the top of the experience?
- Is the First Mint card showing real data or a clean fallback (not a broken placeholder)?
- Are the stats immediately scannable with distinct accent colors per card?
- Does the taste section feel like a visual reward?
- Do Taste DNA bars use real category data, not invented scores?
- Do core signals feel like meaningful collector moments?
- Is the compare CTA more inviting than functional?
- Is the page readable on mobile?
- Did we avoid adding fake data or new API assumptions?
- Did we avoid touching compare or API files during a profile-only pass?

---

## Current design north star

The best version of Collector Chemistry feels like:

> a dark, personal readout that makes a collector's taste visible and legible for the first time.

For profile:

> a collector seeing their own taste become visible.

For compare:

> two collectors discovering where their worlds overlap.

For future social:

> a taste graph, not a content feed.
