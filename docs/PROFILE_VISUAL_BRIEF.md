# Collector Chemistry — Profile Visual Brief

## Purpose

This document translates the current preferred profile mockup into build direction for Codex.

Use this with:
- `docs/PRODUCT_SOUL.md`
- `docs/VISUAL_REFERENCES.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/PROFILE_SPEC.md`
- `docs/BUILD_LOG.md`

---
This visual brief defines the look and feel of the profile page. For entity display rules, image/link behavior, fallbacks, OpenSea integration, and required dynamic data standards, follow `docs/DISPLAY_CONTRACT.md`.

## Reference image

Target direction:
- `docs/references/Wallet-Results-Mockup-1.png`

The earlier `profile-neon-pulse.png` reference has been superseded. Do not use it as the implementation target.

---

## What the page is now

The profile page has been rebuilt as a dark collector dossier. Data is wiring correctly. The section structure is in place.

Current implemented section order:
1. Hero (three-column: identity left, profile image center, first mint card right)
2. Stats row (four cards: Holdings, Collections, Top Category, Market Attention)
3. The Pattern (taste map donut + Taste DNA bars side by side)
4. Key Signals (First Mint, Signal Piece, Anchor Collection)
5. Collected Works (summary strip)
6. Top Collections (ranked cards with progress bars)
7. Compare CTA

---

## Current known gaps

These are the issues to fix in future passes, in priority order:

1. **Color system not fully applied.** Stats row cards all use the same magenta. Each card needs its own accent color per the DESIGN_SYSTEM.md accent assignments. Taste DNA bars need per-category colors, not a single gradient. Top collection bars need rank-ordered colors.

2. **Taste DNA bars are too thin and low contrast.** Bar height needs to increase to 6px. Each bar needs a distinct category color.

3. **Hero identity paragraph is too long.** Truncate to 2 sentences maximum in the hero area.

4. **First Mint card shows a broken placeholder.** The `?` character reads as an error. Replace with a clean empty frame using `✦` in `#333` and "First mint unavailable" below in `11px` `#444`.

5. **Wallet input is in the wrong place.** The "Add Another Wallet" input sits between the hero and stats row, breaking the reading flow. Move it to the Compare CTA section at the bottom.

6. **Taste Map hover behavior is not implemented.** The current donut is a conic-gradient. The full spec requires SVG arcs with segment isolation, opacity dimming, and center label on hover. This is a separate focused pass.

---

## Target feeling

The page should feel like:

- a collector seeing their own taste become visible
- a personal dossier — specific, legible, a little playful
- dark but not oppressive
- multi-colored but not noisy
- fast to scan, rewarding to explore

It should not feel like:
- a finance dashboard
- a generic NFT tracker
- a single-color neon template
- a report

---

## What to borrow from the mockup

- three-column hero with collector identity left, PFP center, first mint artifact right
- stats row with four cards, each a distinct accent color
- taste map donut as a visual centerpiece
- Taste DNA bars using real category data with per-category colors
- key signals with accent top borders
- ranked top collections with rank-colored progress bars
- compare CTA at the bottom as an invitation, not a utility form

## What not to copy from the mockup

- the sidebar navigation — does not exist in this product
- the top navigation bar — does not exist yet
- the neon gallery hallway image — AI-generated mood reference, not a real UI element
- the "Pro Tip" footer strip — omit
- the invented Taste DNA scores ("Meme Gravity 86/100") — use real category percentages only
- hardcoded collection descriptions — never hardcode copy tied to specific collections

---

## Accent color assignments (summary)

Full detail is in `docs/DESIGN_SYSTEM.md` under "Accent color assignments by context."

Stats row:
- Holdings: `#ff3399`
- Collections: `#29b6f6`
- Top Category: `#9575ff`
- Market Attention: `#39d353`

Taste DNA bars: each category gets its own fixed color from the category-to-color mapping in DESIGN_SYSTEM.md.

Top Collections bars: rank 1 = `#ff3399`, rank 2 = `#29b6f6`, rank 3 = `#9575ff`, rank 4+ = `#444`.

Key Signals top borders: First Mint = `#9575ff`, Signal Piece = `#ff3399`, Anchor = `#29b6f6`.

---

## Copy tone

Speak directly to the collector.

Use:
- "Where it started."
- "Your wallet keeps returning here."
- "Your taste leans toward..."
- "Your largest anchor."

Avoid:
- "category distribution"
- "dominant category"
- "dashboard"
- "user"
- "data points"
- "portfolio value"
- "best"
- "most valuable"

---

## Implementation guardrails

- Edit `app/profile/page.tsx` and `app/profile/profile.css` only
- Do not change API routes
- Do not change the compare page
- Do not change lib files
- Do not add new dependencies
- Do not hardcode wallet-specific values
- Do not invent metrics the API does not return
- Run `npx tsc --noEmit` after changes
- Check for conflict markers after changes
