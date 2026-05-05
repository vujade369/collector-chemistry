# Constellate Transition Plan

## Purpose

This document defines how the current Collector Chemistry product transitions into Constellate without breaking working behavior, losing product history, or triggering unnecessary refactors.

Constellate is the new brand and long-term product frame.

Collector Chemistry is the existing repo, codebase, and previous working language.

The transition should happen in layers.

---

## Core decision

The product is now called:

**Constellate**

Working positioning:

**See the pattern in what you keep — and where it lights up with someone else’s.**

Core thesis:

**What you keep becomes a pattern. What overlaps becomes recognition.**

---

## Why the name changed

Collector Chemistry captured the early idea of resonance between collectors.

But the product has grown beyond chemistry.

The larger vision is about:
- identity through what people keep
- collecting as a record of attention
- overlap as recognition
- wallets as constellations of choices
- future cultural artifacts beyond NFTs
- rooms, dinners, games, and real-world experiences shaped by shared signals

Constellate better supports this larger system.

---

## Transition principles

### Preserve working behavior

Do not rename routes, APIs, files, or data contracts just because the brand name changed.

The first phase is language and documentation.

### Avoid broad refactors

No architecture changes should happen during the naming transition unless they directly support a scoped copy or documentation update.

### Keep the product legible

Constellate can be poetic, but users still need to understand what the app does.

Every abstract phrase should be grounded by plain-language support.

### Keep old terms visible during transition

Collector Chemistry language may remain in code, comments, docs, or internal types temporarily.

Do not force a full rename in one pass.

### Prioritize user-facing clarity

Change public-facing copy before internal naming.

Internal naming can follow only after the product language stabilizes.

---

## Language map

| Legacy language | New / preferred language | Notes |
|---|---|---|
| Collector Chemistry | Constellate | Product / brand name |
| Chemistry | Recognition / overlap / resonance | Use chemistry sparingly, if at all |
| Wallet profile | Your Constellation | User-facing solo profile |
| Compare wallets | Find overlap / compare constellations | Keep “compare” where clarity matters |
| Exact matches | Shared Stars | Exact shared NFTs / artifacts |
| Shared collections | Shared Worlds | Broader contexts both collectors entered |
| Interesting similarities | Recognition Points | Surprising or meaningful overlap |
| Taste DNA | Taste pattern / signal clusters | Avoid overly science-y language |
| Compatibility | Overlap / recognition | Avoid dating-app framing |
| Score | Signal / readout / orientation cue | Avoid ranking language |

---

## Product surfaces

### Home page

Current job:
- Explain the product quickly
- Invite wallet input
- Make the experience feel human and low-friction

Possible direction:
- Constellate
- See the pattern in what you keep.
- Paste a wallet or ENS to read your constellation.

Do not over-explain the future vision on the home page.

---

### Profile page

Current job:
- Show one wallet as a meaningful pattern
- Help the user recognize themselves through what they collected

Future language:
- Your Constellation
- Signal Pieces
- Return Patterns
- Shared Worlds, when connected to comparison
- Recognition Points, when insight is specific

---

### Compare page

Current job:
- Show where two wallets overlap
- Make the overlap feel meaningful, not mechanical

Future language:
- Shared Constellation
- Shared Stars
- Shared Worlds
- Crossing Points
- Recognition Points

Avoid:
- compatibility score
- match score
- better / worse
- ranking

---

### Converter

Current job:
Answer the specific utility question:

“If I accepted the best active ETH/WETH offer on every unique NFT in these wallet(s), how many of the target collection could that buy?”

This feature may remain more utility-oriented.

Do not force the Constellate metaphor into the converter.

Keep it accurate, scoped, and clear.

---

## What not to rename yet

Do not rename:
- repo name
- routes
- API endpoints
- database fields
- TypeScript types
- helper functions
- CSS files
- component file names

Until the product language has stabilized.

---

## First safe implementation pass

The first UI pass should only update visible copy.

Allowed files:
- app/page.tsx
- app/profile/page.tsx
- app/compare/page.tsx

Avoid:
- API logic
- data contracts
- helper refactors
- route renames
- broad CSS rewrites

Definition of done:
- app still runs
- TypeScript passes
- no API shapes changed
- public language reflects Constellate
- old Collector Chemistry language is not visible in primary UI

Verification:
```bash
npx tsc --noEmit
npm run lint
git diff --name-only