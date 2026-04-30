# Collector Chemistry — Design System

## Purpose

This document is the single source of truth for all visual decisions in Collector Chemistry.

Before making any UI or CSS change, read this file.
Before creating any new color, spacing value, or animation, check if it already exists here.
If something is not in this document, it should not be in the product.

---

## Design principles

### The core balance
80% quiet. 20% magic.

The product should feel calm and restrained by default.
Moments of visual life are earned through interaction and reveal, not decoration.

### Calm surface, hidden depth
Default state: restrained, editorial, minimal.
Interaction state: expressive, alive, rewarding.

Nothing should feel loud at rest.
Everything should feel satisfying when touched.

### Collector sensibility
The audience appreciates:
- restraint
- detail
- discovery
- things that reveal themselves slowly

The product should never feel:
- like a neon dashboard
- like a generic web3 site
- overstimulated or gamified
- like it is trying too hard

### What the magic should feel like
- motion that feels like things finding their place
- glow that feels like depth, not decoration
- reveals that feel earned
- hover states that feel responsive, not performative

---

## Color palette

### Backgrounds

| Name | Value | Usage |
|---|---|---|
| Page background | `#0e0e0e` | Root page background |
| Panel / surface | `#111` | Cards, panels, sections |
| Elevated surface | `#141414` | Inputs, tags, raised elements |
| Deep surface | `#0f0f0f` | Image containers, standout blocks |

Never use pure black (`#000000`) or pure white (`#ffffff`).

### Borders

| Name | Value | Usage |
|---|---|---|
| Default border | `0.5px solid #222` | Standard panel borders |
| Subtle border | `0.5px solid #1e1e1e` | Image containers, inner borders |
| Muted border | `0.5px solid #2e2e2e` | Tags, inputs at rest |
| Active border | `#555` | Input focus, hover states |

All borders are `0.5px`. Never use `1px` borders on dark surfaces.

### Text

| Name | Value | Usage |
|---|---|---|
| Primary text | `#f0ede6` | Headlines, display names, key labels |
| Secondary text | `#e8e5de` | Body text, page-level content |
| Muted text | `#a8a49d` | Supporting paragraphs, descriptions |
| Dim text | `#666` | Counts, dates, secondary metadata |
| Very dim text | `#555` | Eyebrow labels, section labels |
| Address text | `rgba(216,213,206,0.56)` | Wallet addresses, ENS below names |
| Tag text | `#c8c5be` | Behavioral read tags |

### Accents

| Name | Value | Usage |
|---|---|---|
| Primary accent | `#ff3399` | Taste map (profile), wallet A (compare), active fills |
| Secondary accent | `#9575ff` | Taste map alternate, purple fills |
| Cyan accent | `#29b6f6` | Wallet B taste map (compare page only) |
| Accent gradient | `linear-gradient(90deg, #ff3399, #9575ff)` | Progress bars, fills |
| Accent glow | `rgba(255,51,153,0.04)` | Subtle background glow behind taste map |

Use accents only for:
- Taste map segments
- Progress bar fills
- Hover and active states
- Key visual anchors

Never use accents for general text, borders, backgrounds, or decorative elements.

---

## Typography

### Scale

| Role | Size | Weight | Letter spacing | Color |
|---|---|---|---|---|
| Eyebrow / section label | `10px` | `400` | `0.18em–0.2em` uppercase | `#555` |
| Display headline | `32px` | `300` | `-0.03em` | `#f0ede6` |
| Pattern line | `26px` | `300` | `-0.025em` | `#f0ede6` |
| Compare headline | `40px–48px` | `300` | `-0.03em` | `#f0ede6` |
| Body paragraph | `15px` | `400` | `0` | `#a8a49d` |
| Card name | `13px` | `400` | `0.01em` | `#d8d5ce` |
| Supporting text | `12px` | `400` | `0.01em` | `#666` |
| Small metadata | `11px` | `400` | `0.01em` | `#666` |
| Tag text | `11px` | `400` | `0.01em` | `#c8c5be` |

### Rules
- Never use font weights above `500` except for specific numeric emphasis
- Prefer `font-weight: 300` for large display text
- Line height for body text: `1.75`
- Line height for headlines: `1.1–1.15`
- Max line length for body paragraphs: `58ch`
- Max line length for headlines: `52ch`

---

## Spacing and layout

### Page shell
- Max width: `700px`
- Horizontal padding: `24px` (mobile), `24px` (desktop within max-width)
- Vertical padding: `48px` top, `96px` bottom
- Section gap: `32px`

### Panels and cards
- Padding: `22px`
- Border radius: `18px`
- Internal gap: `18px`
- Border: `0.5px solid #222`
- Background: `#111`

### Card image containers (standard)
- Size: `72px × 72px`
- Border radius: `10px`
- Border: `0.5px solid #1e1e1e`
- Background: `#0f0f0f`
- Object fit: `cover`

### Card image containers (small)
- Size: `64px × 64px`
- Border radius: `8px`

### Tags and pills
- Padding: `4px 11px`
- Border radius: `20px`
- Border: `0.5px solid #2e2e2e`
- Background: `#141414`

---

## Animation

### Timing

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Interaction | `150ms` | `ease` | Hover, focus, button states |
| Reveal | `600ms` | `ease` | Fade-in on load, stagger reveals |
| Ambient | `6s` | `ease-in-out infinite` | Breathing, subtle pulse |
| Maximum | `800ms` | — | Never exceed this |

### Stagger reveals
When multiple elements reveal on load, stagger them by `0.08s–0.1s` per item.
Always use opacity transitions for stagger, not transforms.
Transforms on SVG paths are unreliable across browsers.

### What should animate
- Taste map segments on load (stagger opacity fade-in)
- Hover states on interactive cards and buttons
- Focus states on inputs
- Segment isolation and glow on donut hover
- Hovered segment rendering on top of adjacent ones

### What should not animate
- Text content
- Page layout shifts
- Card positions
- Anything that would feel distracting on repeat visits
- Background colors

### Animation principle
Motion should feel like things finding their place, not things performing.
If an animation calls attention to itself, it is too much.

---

## Taste map

The taste map is the most personal element in the product.
It is a visual fingerprint, not a chart.
Every decision about it should reinforce that.

### Dimensions
- Container size: `188px × 188px`
- Donut radius: `64px`
- Base stroke width: `18px`
- Dominant segment stroke width: `19.2px` (base + 1.2)
- Hovered segment stroke width: `22px` (base + 4)
- Track / background ring color: `#1b1b1b`
- Inner circle fill: `#111`
- Start angle: `-100deg`
- Gap between segments: `1.2deg`

### Color by context
- Profile page: `#ff3399` (magenta)
- Compare page wallet A: `#ff3399` (magenta)
- Compare page wallet B: `#29b6f6` (cyan)

### Opacity system
Segments are ranked by percentage. Opacity decreases with rank.

| Rank | Opacity |
|---|---|
| 1st | `1.0` |
| 2nd | `0.74` |
| 3rd | `0.56` |
| 4th+ | `0.4` |
| Other category | `0.28` |
| Dimmed (non-hovered) | `baseOpacity × 0.45` minimum `0.14` |
| Hovered | `1.0` always |

### Hover behavior
- Hovered segment: full opacity, stroke width + 4
- All other segments: dimmed to `baseOpacity × 0.45`
- Hovered segment always renders on top (render last in arc array)
- Center of donut shows label and percentage of hovered segment
- Default center state (no hover): shows dominant category at low opacity

### Load animation
- All segments fade in with stagger on mount
- Use opacity transition, not stroke-dashoffset
- Stagger delay: `index × 0.1s`
- Duration: `0.6s ease`

### Panel background
The panel containing the taste map should have a very subtle radial glow:
```css
background: radial-gradient(ellipse at 50% 30%, rgba(255,51,153,0.04) 0%, transparent 70%), #111;
```

---

## Component conventions

### Panels
All cards and sections use `.profile-panel` or `.cc-card` class conventions.
Never create a one-off card style. Extend the existing panel system.

```css
.profile-panel {
  background: #111;
  border: 0.5px solid #222;
  border-radius: 18px;
  padding: 22px;
  display: grid;
  gap: 18px;
}
```

### Section labels
All section labels use the eyebrow style.
```css
.profile-section-label {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #555;
}
```

### Progress bars
Two-bar layout for minted/acquired breakdown.
Track height: `3px`
Fill uses accent gradient.
Acquired bar fill opacity: `0.55`

### Inputs
- Background: `#141414`
- Border: `0.5px solid #2e2e2e`
- Border radius: `10px`
- Padding: `12px 14px`
- Font size: `14px`
- Focus border: `#555`
- Placeholder color: `#3a3a3a`

### Primary buttons
- Background: `#f0ede6`
- Color: `#0e0e0e`
- Border radius: `999px`
- Padding: `10px 22px`
- Font size: `13px`
- Font weight: `500`
- Hover: `opacity 0.88`
- Disabled: `opacity 0.22`

---

## CSS file map

| File | Scope |
|---|---|
| `app/globals.css` | Root variables, body, reset |
| `app/profile/profile.css` | Profile page only |
| `app/compare/compare.css` | Compare page only |

Rules:
- Never add profile styles to compare.css or vice versa
- Never create a new CSS file without explicit instruction
- Never use inline styles for values that belong in a CSS file
- Always check for an existing class before creating a new one
- Never use `1px` borders on dark surfaces, always `0.5px`
- Never use Tailwind classes on profile or compare pages

---

## What this product is not

Never let the design drift toward:
- Heavy glassmorphism
- Full rainbow gradients
- Constant motion or looping animations
- Neon panels or aggressive glow
- Dashboard-style data density
- Competitive or gamified framing

If a design decision makes the product feel like a crypto analytics tool,
it is wrong regardless of how polished it looks.

---

## Category card grid

The category card grid is the primary exploration surface on the profile page.
It replaces the horizontal bar taste map and sits below the donut taste signature.

### Purpose
Each taste category gets its own card with the percentage as the hero number.
Tapping a card opens a drawer below it showing the NFTs inside that category.
This turns the taste map from a summary into something you can explore.

### Grid layout
- Two columns, equal width
- Gap: `8px`
- Show top 6 categories by percentage
- Remaining categories hidden behind a "show more" row at the bottom
- "Show more" row spans full width, centered text, same border style as cards

### Category cards (default state)
- Background: `#111`
- Border: `0.5px solid #222`
- Border radius: `14px`
- Padding: `14px`
- Cursor: pointer

Content inside each card:
- Category name: `12px`, color `#a8a49d`, letter spacing `0.01em`
- Percentage: `26px`, font weight `300`, color `#f0ede6`, letter spacing `-0.03em`
- Piece count: `10px`, color `#444`
- Chevron indicator: `10px`, color `#333`, positioned top-right, `›` character

### Category cards (active / open state)
- Background: `#130a0e`
- Border: `0.5px solid rgba(255,51,153,0.35)`
- Accent line: `2px solid #ff3399` at top of card (full width, no border radius)
- Category name color: `rgba(255,51,153,0.8)`
- Percentage color: `#ff3399`
- Chevron: rotated `90deg`, color `rgba(255,51,153,0.5)`

Transitions:
- Border color: `150ms ease`
- Background: `150ms ease`
- Chevron rotation: `200ms ease`

### Drawer
The drawer appears as a full-width element spanning both columns,
inserted in the grid immediately after the row containing the active card.

- Background: `#0f0f0f`
- Border: `0.5px solid rgba(255,51,153,0.12)`
- Border radius: `12px`
- Padding: `12px`
- Grid column: `1 / -1` (spans full width)

Drawer header:
- Left: category label, `9px`, uppercase, letter spacing `0.15em`, color `#ff3399`
- Right: piece count and collection count, `10px`, color `#555`

NFT thumbnail grid inside drawer:
- 4 columns, equal width
- Gap: `6px`
- Show up to 3 actual NFT thumbnails
- 4th cell: overflow count (`+N` more), `10px`, color `#555`
- Each thumbnail: `aspect-ratio: 1`, border radius `8px`, background `#1a1a1a`, border `0.5px solid #2a2a2a`
- NFT images use `object-fit: cover`

Collection list inside drawer (below thumbnails):
- Separated from thumbnails by `0.5px solid #1e1e1e` border top, padding top `8px`
- Each row: collection name left (`11px`, color `#888`), piece count right (`10px`, color `#444`)
- Show top 3 collections within that category
- If more exist: a final row with `+ N more collections` in color `#444`

### Interaction rules
- Only one drawer open at a time
- Tapping the active card closes its drawer
- Tapping a different card closes the current drawer and opens the new one
- Drawer appears immediately below the row containing the tapped card
- Smooth scroll to bring drawer into view after opening

### Show more row
- Spans full grid width
- Text: `Show remaining categories ›`
- Font size: `11px`, color `#555`, letter spacing `0.05em`
- Border: `0.5px solid #1e1e1e`
- Border radius: `10px`
- Padding: `10px`
- Hover: color `#888`, border color `#333`
- Clicking hides the row and reveals remaining category cards