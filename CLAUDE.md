# CLAUDE.md

## Project overview

Collector Chemistry is a read-only app that compares two collectors and reveals overlap in taste.

The goal is not analysis or ranking.

The goal is to make cultural patterns visible.

---

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
