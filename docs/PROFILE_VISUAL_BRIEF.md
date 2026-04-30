# Collector Chemistry — Profile Visual Brief

## Purpose

This document translates the current preferred profile mockup into build direction for Codex.

Use this with:
- docs/PRODUCT_SOUL.md
- docs/VISUAL_REFERENCES.md
- docs/PROFILE_SPEC.md
- docs/BUILD_LOG.md

## Reference images

Target direction:
- docs/references/profile-neon-pulse.png

Current state:
- docs/references/profile-current-top.png
- docs/references/profile-current-taste.png
- docs/references/profile-current-cta.png

## What is wrong with the current profile page

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

## Target feeling

The page should feel like:

- a collector seeing their taste become visible
- a personal card / readout
- playful but still tasteful
- luminous, not loud
- fast to scan
- rewarding to explore

## What to borrow from the mockup

Borrow:
- compact single-column card rhythm
- stronger collector identity header
- glowing magenta border treatment
- stats row near the top
- archetype card with concise interpretation
- taste map as a centerpiece
- core signals as small collectible cards
- top collections as ranked rows
- compare CTA as a stronger final action

## What not to copy

Do not:
- use fake data
- make every card equally bright
- overdo neon glow
- add heavy animation
- make the page feel like a finance dashboard
- cram too much text into tiny cards
- hide important information behind hover-only interactions
- add new dependencies

## Page hierarchy

Preferred order:

1. Collector identity
2. Stats row
3. Archetype / interpretation
4. Taste map
5. Core signals
6. Top collections
7. Compare CTA

## Visual hierarchy

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

## Core signal cards

Use cards for:
- Top Collection / Signal Piece
- Return Pattern
- First Mint
- Most Recent Acquisition if data exists
- Highest Bid / Market Attention if data exists
- Collecting Style

If a signal does not have data, hide it gracefully.

## Copy tone

Speak directly to the collector.

Use:
- “You keep returning to…”
- “Your taste leans…”
- “Your wallet seems to trust…”
- “Recently, you picked up…”
- “Your first recorded mint was…”

Avoid:
- “category distribution”
- “dominant category”
- “dashboard”
- “user”
- “data points”
- “portfolio value”

## Implementation guardrails

This first pass is visual structure only.

Do not change:
- API routes
- compare page
- lib files
- data model

Use existing data.

If needed, create one component:
- components/profile/ProfileResultCard.tsx

Keep app/profile/page.tsx from growing into an unstructured file.