---
tags: [constellate, product, build, principles]
status: active
note_type: canon
owner: Trevor
updated: 2026-05-06
visibility: internal
audience: builders
aliases: [Build Principles, How We Build]
---

# Build Principles

Purpose: how we build Constellate. Read this before starting any build session. Hand this to Codex at the start of every prompt.

---

## The one rule

Make the product feel compelling before adding complexity.

If the current version does not make you think "this is interesting," adding more features will not fix it.

---

## How we work

**Claude thinks. Codex builds.**

Use Claude (this tool) for:
- product decisions
- feature specs
- prompt writing
- reviewing Codex output
- anything involving judgment

Use Codex for:
- implementing what Claude planned
- scoped, specific file changes
- running verification commands

Never ask Codex to make product decisions. Never ask Claude to write production code directly.

---

## Before every build session

Define these four things before touching a file:

1. **Goal** — what specific thing should work after this session that does not work now
2. **Files to touch** — exact file paths, no more than needed
3. **Files not to touch** — be explicit
4. **Definition of done** — how will you know it worked

If you cannot answer all four, you are not ready to build yet.

---

## Build small

One feature at a time. One file change at a time where possible.

The moment you give Codex a list of five things to do, you lose the ability to know what broke what.

Start with the smallest version that proves the idea works. Then add to it.

---

## Plan before implementing

For any feature that touches more than two files, write the plan first. Have Codex produce a numbered plan. Review it before saying go.

The adversarial loop: plan with Codex, review the plan, then implement. Spend more time planning than you think you need to. Implementation is the easy part.

---

## Version control is not optional

Commit after every meaningful change. Not after a session. After each thing that works.

If it breaks three steps later, you want to roll back three steps, not three days.

```bash
git add -A
git commit -m "short description of what changed"
