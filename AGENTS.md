# Collector Chemistry — Agent Rules

## Read this first

This is a cultural compatibility tool, not a crypto dashboard.
Every decision should be filtered through that lens.

Before writing any code, read these docs in this order:

1. `docs/ARCHITECTURE.md` — how the system works, file map, data flow
2. `docs/PROFILE_SPEC.md` — what a profile is and how it should be built
3. `CLAUDE.md` — product identity, coding behavior, decision rules
4. `docs/PRODUCT_SOUL.md` — voice, tone, what this product is and is not
5. `docs/DATA_MODEL.md` — types, API shapes, response contracts

If your task involves the interpretation layer, also read:
- `docs/interpretation-handoff.md` — the complete AI interpretation spec
- `docs/INSIGHT_ENGINE.md` — signal framework and meaning layer

---

## Next.js version notice

This project uses Next.js 16 with the App Router.
APIs, conventions, and file structure may differ from your training data.
Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.
Heed deprecation notices.

---

## What you are building

Collector Chemistry helps people see the human pattern inside a wallet.

It is not a trading tool.
It is not a wallet analytics dashboard.
It is not a financial product.

It is a cultural compatibility tool.
It treats collecting behavior as taste signal, not financial data.

When making any product or UI decision, ask:
Does this feel like a cultural readout, or a dashboard?
Choose the one that feels like a cultural readout.

---

## File ownership rules

| File | Owner | Notes |
|---|---|---|
| lib/walletProfile.ts | Profile inference | Canonical source for profile logic |
| lib/fetchWalletNFTs.ts | Data fetching | Do not modify without clear reason |
| app/api/compare/route.ts | Compare orchestration | Orchestrator only — logic goes in lib/ |
| app/compare/page.tsx | Compare UI | Do not change visual system without explicit instruction |
| app/compare/compare.css | Compare styles | Do not touch without explicit instruction |
| docs/ | Product memory | Read these, do not rewrite without instruction |

---

## Rules that are not negotiable

**Never touch the visual system without explicit instruction.**
The CSS, color palette, spacing system, and component structure are intentional.
Do not "improve" them unless asked.

**Never broaden input validation.**
Valid inputs are: full Ethereum addresses (0x...) and ENS names (*.eth).
Do not add OpenSea URLs, Twitter handles, or other formats unless explicitly asked.

**Never add dependencies without asking.**
If you think a package would help, say so and wait for approval.
Do not install anything without confirmation.

**Never add financial framing.**
No floor prices, no portfolio values, no rarity scores, no trading language.
Ever. In any output, UI, or comment.

**Never make the product feel like a dashboard.**
No excessive stats, no leaderboards, no score breakdowns visible by default.
Keep it minimal, editorial, and restrained.

**Never rewrite existing docs.**
If a doc needs updating, add a section or note the change needed.
Do not restructure or rewrite docs without explicit instruction.

---

## How to make changes

1. Read the relevant docs first (see list above)
2. Make the smallest change that achieves the outcome
3. Explain what changed in plain English
4. Tell exactly which files were modified
5. Do not change unrelated files
6. Preserve the existing tone and restraint of the product

When unsure, choose the version that is:
- Simpler
- Clearer
- More human
- More aligned with cultural interpretation over technical spectacle

---

## Current build priority

**Profile first. Comparison second.**

The individual profile is the foundation.
The comparison is only as good as the two profiles that feed it.

Current focus:
1. Sharpen individual profile inference in lib/walletProfile.ts
2. Connect profile signals to the five archetypes in docs/PROFILE_SPEC.md
3. Replace static buildPairInterpretation() with AI-generated interpretation
4. Update chemistry labels to match the spec (Strong Signal, Kindred, Interesting Tension, Distant But Related)

Do not work on comparison features until the individual profile is solid.

---

## What a good profile looks like

See docs/PROFILE_SPEC.md for the full spec.

Quick reference:
- Archetype (one of five from the spec)
- Pattern line (short, behavior-based, memorable)
- Identity paragraph (2–4 sentences, interpretive not descriptive)
- Six signal states (internal, drives all written output)
- Category distribution
- Top collection

A good profile output makes someone feel:
"This is true."
or
"I didn't realize that about myself… but yeah."

If it reads like a data summary, it has failed.

---

## What a good interpretation looks like

See docs/interpretation-handoff.md for the full spec.

Quick reference:
- Headline (names the dynamic, not the data)
- Separation (each collector individually recognizable)
- The gap (honest about difference)
- The turn (shared instinct one level beneath the surface)
- Closing line (resonant, not explanatory)

The comparison is a mirror, not a match.
Self-recognition is the outcome.

If it reads like a generated summary, it has failed.

---

## Voice rules (apply everywhere)

Write as a thoughtful person who has looked carefully at this wallet
and has something specific to say about it.

Not an algorithm producing a report.
Not an analyst running numbers.

Use:
- "You tend to…"
- "Your attention sits…"
- "You return to…"
- Identity language, not category language
- Behavior patterns, not inventory descriptions

Never use:
- "You have a diverse collection"
- "Your wallet contains a mix of…"
- Financial or rarity language
- Hype language
- Generic superlatives