---
name: constellate-clean-implementation
description: Keep Constellate implementation small, safe, scoped, dependency-light, and verifiable.
compatibility: Preferred core skill for implementation discipline. Existing verification and code-health skills remain valid supplemental guidance.
metadata:
  owner: Constellate
  status: preferred-core
---

# Constellate Clean Implementation

## Purpose

Use this skill before and after implementation to keep changes small, reversible, and proven.

## Implementation rules

- Make the smallest safe change that answers the product question.
- Keep one concern per change.
- Do not bundle cleanup with feature work.
- Do not make broad refactors unless explicitly scoped.
- Do not add dependencies without approval.
- Do not casually change API contracts, routes, types, CSS classes, data-source behavior, converter math, or interpretation prompts.
- Preserve existing behavior unless the task explicitly changes it.
- Work with user changes in the tree; do not revert unrelated edits.

## Verification

- For code changes, run `npx tsc --noEmit`.
- For broader code changes, also run `npm run lint`.
- For harness, docs, or agent changes, run:
  - `npm run agents:check`
  - `npm run docs:check`
  - `npm run skills:check`
- For API/data changes, include focused curl or debug output when possible.
- For UI layout risk, include browser proof when possible.
- Do not claim verification unless the command actually ran.

## Final report

Report:

- files changed
- behavior changed
- behavior preserved
- checks run and results
- known risks or follow-ups
- whether anything changed outside scope

## Commit discipline

- Do not commit unless explicitly asked.
- Before any requested commit, review `git diff --name-only` and avoid including unrelated user changes.
