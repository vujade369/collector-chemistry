# CLAUDE.md

## Project overview

Collector Chemistry is a read-only app that compares two collectors and reveals overlap in taste.

The goal is not analysis or ranking.

The goal is to make cultural patterns visible.

---
## Required reference for UI/entity display work

Before changing profile UI, compare UI, wallet displays, NFT cards, collection cards, artist/creator displays, image handling, or OpenSea/marketplace links, read:

- `docs/DISPLAY_CONTRACT.md`

Use it as the source of truth for entity display standards, image fallbacks, click behavior, OpenSea integration, empty states, and acceptance criteria.

## Results page philosophy

### Self-recognition as outcome

The comparison is not just about two collectors finding common ground.

It is about each collector learning something about themselves.

When someone sees their own taste interpreted through the lens of another person who made similar choices, the product becomes a mirror.

That moment of recognition — this is what I'm drawn to and why — is what the product should reliably produce.

Every results page decision should be oriented around that outcome.

The score is a hook. The interpretation is what stays.

---

### The mirror principle

The comparison is a mirror, not a match.

This is the most important product principle in the system.

If the output reads like a data summary, it has failed.

If it makes someone pause and recognize something true about themselves, it has succeeded.

Hold every implementation decision against this standard.

---

## Interpretation guidelines

The "why this match" section is the emotional core of the product.

It should:
- read like a thoughtful interpretation, not a report
- describe collectors in identity language, not categories
- go one level deeper than the data
- acknowledge differences before resolving them
- reveal a shared instinct beneath the surface

It should not:
- summarize counts or overlap
- use financial or rarity language
- feel generic or templated

---

## Voice guidelines

- Clear, curious, interpretive, specific
- Human, not analytical
- Observational, not declarative
- Grounded in the data, but not limited to it

Avoid:
- generic SaaS language
- crypto/trading tone
- gamified or competitive framing

---

## Development constraints

When working on this project:

- Do not add unnecessary complexity
- Do not create new data structures without reason
- Do not refactor large files unless explicitly asked
- Keep changes scoped and minimal

When in doubt:
- improve interpretation
- improve clarity
- reduce noise

---

## File editing rules

When making code changes, always follow these rules without exception:

- Never use git apply
- Never generate or apply patches
- Never use the patch tool
- Use str_replace to make targeted edits to existing files
- Use direct file write for new files
- After every change, run git diff <filename> to confirm the change landed
- After every change, run grep -n "<<<<<<\|=======\|>>>>>>" <filename> to confirm no conflict markers
- If git diff shows no changes, the edit failed — retry with str_replace
- Never commit if conflict markers are present in any file
- Never apply more than one logical change per file per prompt
- Never commit without running both checks first

---

## Design system

### Design principles

The product should feel:
- 80% quiet, 20% magic
- calm surface with hidden depth
- editorial structure with selective moments of life

The magic should come from:
- motion on reveal
- depth on interaction
- light and glow used sparingly
- moments of surprise that feel earned

The product should never feel:
- like a neon dashboard
- like a generic web3 site
- loud, overstimulated, or gamified

Collectors appreciate restraint, detail, and discovery.
Design for that audience.

---

### Color palette

Background layers:
- Page background: `#0e0e0e`
- Surface / panel: `#111`
- Elevated surface: `#141414`
- Subtle surface: `#0f0f0f`

Borders:
- Default border: `#222` at `0.5px`
- Subtle border: `#1e1e1e` at `0.5px`
- Active border: `#2e2e2e` at `0.5px`
- Hover border: `#555`

Text:
- Primary: `#f0ede6`
- Secondary: `#e8e5de`
- Muted: `#a8a49d`
- Dim: `#666`
- Very dim: `#555`
- Address / metadata: `rgba(216,213,206,0.56)`

Accents:
- Primary accent (magenta): `#ff3399`
- Secondary accent (purple): `#9575ff`
- Accent gradient: `linear-gradient(90deg, #ff3399, #9575ff)`
- Accent glow (subtle background): `rgba(255,51,153,0.04)`

Use accents only for:
- The dominant taste map segment
- Hover and active states
- Key visual anchors
- Progress fills

Do not use accents for general text, borders, or backgrounds.

---

### Typography

Eyebrow / label:
- Size: `10px`
- Weight: `400`
- Letter spacing: `0.18em` to `0.2em`
- Transform: uppercase
- Color: `#555`

Display / headline:
- Size: `26px` to `32px`
- Weight: `300`
- Letter spacing: `-0.025em` to `-0.03em`
- Color: `#f0ede6`

Body:
- Size: `14px` to `15px`
- Weight: `400`
- Line height: `1.75`
- Color: `#a8a49d`

Card label / name:
- Size: `13px`
- Color: `#d8d5ce`
- Letter spacing: `0.01em`

Supporting text:
- Size: `11px` to `12px`
- Color: `#666`

---

### Spacing and layout

Page shell max width: `700px`
Page padding: `48px 24px 96px`
Section gap: `32px`

Panel padding: `22px`
Panel border radius: `18px`
Panel gap: `18px`

Card image size (standard): `72px × 72px`
Card image border radius: `10px`
Card image border: `0.5px solid #1e1e1e`

---

### Animation principles

Interaction states (hover, focus): `150ms ease`
Reveal animations (fade-in, stagger): `600ms ease`
Breathing / ambient animations: `6s ease-in-out infinite`
Maximum animation duration: `800ms`

What should animate:
- Taste map segments on load (stagger fade-in)
- Hover states on interactive elements
- Focus states on inputs
- Segment isolation on donut hover

What should not animate:
- Text content
- Page layout
- Card positions
- Anything that could feel distracting on repeat visits

Animation should feel like things finding their place, not things performing.

---

### Taste map conventions

The taste map is the most personal element in the product.
It is a visual fingerprint, not a chart.

Donut size: `188px × 188px`
Donut radius: `64px`
Stroke width base: `18px`
Dominant segment stroke width: `19.2px` (base + 1.2)
Hovered segment stroke width: `22px` (base + 4)
Track color: `#1b1b1b`
Inner fill: `#111`
Start angle: `-100deg`
Gap between segments: `1.2deg`

Color tone:
- Profile page: `#ff3399` (magenta)
- Compare page wallet A: `#ff3399` (magenta)
- Compare page wallet B: `#29b6f6` (cyan)

Opacity ranks for segments: `[1, 0.74, 0.56, 0.4]`
Other category opacity: `0.28`
Dimmed (non-hovered) opacity: `baseOpacity * 0.45` minimum `0.14`

---

## CSS conventions

All profile page styles live in `app/profile/profile.css`.
All compare page styles live in `app/compare/compare.css`.
Global styles live in `app/globals.css`.

When editing CSS:
- Do not use inline styles for anything that belongs in a CSS file
- Do not create new CSS files without explicit instruction
- Do not add Tailwind classes to profile or compare pages
- Always check for an existing class before creating a new one
- Do not duplicate styles that already exist elsewhere
- Color values must match the palette defined above
- Never hardcode a color that differs from the palette without a clear reason

When Codex touches CSS:
- Read the full CSS file before making any changes
- List existing classes before adding new ones
- Confirm no class names conflict before committing
- Run grep -n for any class name you are about to create to verify it does not already exist

---

## Data sources

Alchemy is used for bulk NFT ownership fetching.
OpenSea is the primary source for:
- Collector profiles (PFP, username)
- Acquisition event timestamps
- Minted vs acquired breakdown
- First mint lookup
- Collection metadata enrichment

When building profile or compare data, always prefer OpenSea event data
over Alchemy metadata inference for anything time-based or acquisition-based.
Alchemy metadata alone produces inaccurate minted/acquired ratios.

---

## Codex session rules

At the start of every Codex session that touches existing files:

1. Read every file you plan to modify fresh using cat or sed.
   Do not rely on memory of previous file state.

2. Summarize what you see in each file before writing any code.

3. After every change, run:
   grep -rn "<<<<<<\|=======\|>>>>>>" <filename>
   Output must be empty before committing.

4. Run npx tsc --noEmit and confirm no errors before committing.

5. Run git diff --name-only and confirm only the intended files changed.

6. Never commit if conflict markers are present anywhere.

Conflict markers appearing in files means a patch was applied against
a stale file state. If this happens, do not retry the patch.
Read the current file fresh and apply the change using str_replace instead.