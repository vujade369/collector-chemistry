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

Collector Chemistry is moving toward a more vivid, playful, collector-facing interface.

The early editorial direction was useful, but the product should now feel more alive.

The desired direction is:

- dark base
- high contrast
- luminous accents
- collector-card energy
- playful visual reward
- restrained glow
- moments of surprise
- object-based exploration
- strong hierarchy
- mobile-first clarity

The page should create curiosity and a little awe when someone sees their result.

It should still feel tasteful.

---

## Core visual feeling

The interface should feel like:

- a collector readout
- a personal taste artifact
- a shared-world map
- a luminous field guide
- a playful dossier
- a visual instrument for understanding collecting behavior

It should not feel like:

- a financial dashboard
- an NFT trading terminal
- a marketplace page
- a leaderboard
- a generic analytics page
- a dating app compatibility app
- a noisy neon web3 template

---

## Accent system

Primary accent:
- magenta / pink

Secondary accent:
- purple

Comparison accent:
- cyan / blue for wallet two

Optional support accents:
- orange, green, or yellow only for small category pills or rare emphasis

Rules:

- use accent color to guide attention
- do not decorate every card equally
- each wallet should have a consistent accent identity
- magenta and cyan should help distinguish collectors in compare
- glows should be subtle and purposeful
- avoid full neon backgrounds
- avoid rainbow color systems unless category-specific

---

## Reference image files

Use a small, curated set of references. Do not add every screenshot or moodboard image to the repo.

### Target profile direction

```txt
/references/profile-neon-pulse.png
```

Use the cropped single-profile Neon Pulse mockup as the target image. Do not use the full five-panel board as the implementation target.

### Optional current-state references

If useful, add current screenshots for comparison:

```txt
/references/profile-current-top.png
/references/profile-current-taste.png
/references/profile-current-cta.png
```

These should only be used to understand what needs improvement. They are not target designs.

### Target compare direction

```txt
/references/compare-chemistry-bridge.png
```

Use the selected Chemistry Bridge mockup as the target direction when redesigning compare.

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

## Profile page direction: Neon Pulse

Preferred direction for the individual wallet profile page.

Reference file:

```txt
/references/profile-neon-pulse.png
```

If this image does not exist yet, add the current selected profile mockup there.

### What to borrow

- dark compact layout
- glowing magenta card border
- collector identity at top
- stats row with strong hierarchy
- archetype / interpretation card
- taste map as a centerpiece
- core signals displayed as compact collectible cards
- top collections as clean ranked rows
- compare CTA as a strong final action

### What not to copy literally

- do not make every card equally neon
- do not overcompress text
- do not use fake data
- do not turn the page into a generic dashboard
- do not let stats overpower interpretation
- do not reduce the collector read to numbers
- do not add heavy animation
- do not hide important information behind hover-only interactions

### Target profile structure

1. Collector header
2. Stats row
3. Archetype / interpretation
4. Taste map
5. Category drill-down
6. Core signals
7. Top collections
8. Representative holdings
9. Compare CTA

---

## Profile visual brief

Use this section as the implementation translation for Codex.

### What is wrong with the current profile page

The current page is clean but too quiet.

It feels like a static report instead of a collector readout.

Specific issues:

- weak visual hierarchy
- too much empty darkness
- cards feel passive
- the taste map is not rewarding enough
- core signals feel like simple rows instead of meaningful collector moments
- compare CTA feels functional, not inviting
- the page does not yet create enough recognition, surprise, or delight

### Target feeling

The page should feel like:

- a collector seeing their taste become visible
- a personal card / readout
- playful but still tasteful
- luminous, not loud
- fast to scan
- rewarding to explore

### Visual hierarchy

Tier 1:
- collector identity
- taste map
- core signals

Tier 2:
- top collections
- supporting stats
- interpretation text

Tier 3:
- metadata
- source details
- fallback information

Do not let every card have the same visual weight.

---

## Profile page core signals

Core signals should feel like collector observations, not dashboard metrics.

Recommended cards:

1. Top Collection / Signal Piece
2. Return Pattern
3. First Mint
4. Most Recent Acquisition
5. Highest Bid / Market Attention
6. Collecting Style

### Signal card behavior

Each card should include:

- small label
- primary object or stat
- one short explanatory line
- image if available
- graceful fallback if data is missing

### Signal card tone

Use:
- “You keep circling back to…”
- “Your largest position sits in…”
- “Recently, you picked up…”
- “Your first recorded mint was…”
- “The strongest current bid sits here…”

Avoid:
- “best”
- “most valuable”
- “top performing”
- “portfolio”
- “investment”
- “ROI”

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
- remaining categories behind “show more”
- hide “Other” from the main drill-down where possible

### Drawer contents

Each drawer should show:

- category label
- total pieces in that category
- NFT thumbnails
- top collections within the category
- collection counts

### Visual style

- dark cards
- subtle accent top line
- active state glow
- compact but readable
- no heavy animation
- hover states should feel tactile

---

## Compare page direction: Chemistry Bridge

Preferred direction for the compare page.

Reference file:

```txt
/references/compare-chemistry-bridge.png
```

If this image does not exist yet, add the current selected compare mockup there.

### What to borrow

- two collectors on opposite sides
- central chemistry bridge
- pink wallet one / cyan wallet two
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

Preferred compare structure:

1. Result hero
2. Bridge stats
3. Shared-world spotlight
4. Exact overlap
5. Shared artists
6. Taste comparison
7. Short interpretation
8. Optional collector profile cards

### Result hero

Should include:

- wallet one identity
- wallet two identity
- chemistry label
- optional percentage as orientation cue
- one short interpretive line

The hero should feel like two collectors entering the same frame.

### Bridge stats

Use strong language:

- Shared Worlds
- Shared Artists
- Exact Matches
- Taste Signals

Avoid overly generic metric labels.

### Shared-world spotlight

This is the most important compare section.

Desktop structure:

```txt
Wallet 1 NFTs        Shared Collection        Wallet 2 NFTs
```

Mobile structure:

```txt
Shared Collection
Wallet 1 NFTs
Wallet 2 NFTs
```

The center collection card should include:

- collection image
- collection name
- category if known
- entry dates for both wallets
- total shared count if available
- clickable link if available

Each wallet side should include:

- wallet name
- number owned in that collection
- NFT previews
- first acquired / first minted date if available
- “goes deeper here” indicator if relevant

### Exact overlap

Exact overlap is the clearest direct intersection.

Show it clearly, but do not let it overpower shared collections unless there are many exact overlaps.

### Shared artists

Shared artists should feel like another layer of shared attention.

If artist data is weak or incomplete, keep this section secondary.

### Taste comparison

Useful, but should not dominate the page.

One main visual is enough by default.

Possible visuals:
- mirrored bars
- overlapping donuts
- radar / spider chart
- category face-off rows

Avoid overloading with multiple charts unless they reveal different truths.

---

## Visual hierarchy rules

Every page should have a clear hierarchy.

### Tier 1

The main moment.

Profile:
- collector identity
- taste readout
- core signals

Compare:
- chemistry hero
- shared-world spotlight

### Tier 2

Supporting proof.

Profile:
- category drill-down
- top collections
- representative holdings

Compare:
- bridge stats
- exact overlap
- shared artists
- taste comparison

### Tier 3

Context.

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
- keep CSS and Tailwind patterns simple

---

## Profile implementation checklist

When implementing the profile visual pass, check:

- Does the collector identity feel like the top of the experience?
- Are the stats immediately scannable?
- Does the taste section feel like a visual reward?
- Do core signals feel like meaningful collector moments?
- Is the compare CTA more inviting than functional?
- Is the page still readable on mobile?
- Did we avoid adding fake data or new API assumptions?
- Did we avoid touching compare or API files during a profile-only pass?

---

## Current design north star

The best version of Collector Chemistry feels like:

> a quiet interface that occasionally surprises you with something beautiful.

For profile:

> a collector seeing their own taste become visible.

For compare:

> two collectors discovering where their worlds overlap.

For future social:

> a taste graph, not a content feed.
