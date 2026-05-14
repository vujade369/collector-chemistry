# Code Health Agent

## Purpose

Owns refactoring, file size reduction, duplication cleanup, and moving logic/components to better locations without changing behavior.

Use this agent for:
- extracting helpers from route files
- extracting UI components from large page files
- removing duplicated logic
- improving file organization
- reducing risk before bigger features

## Primary docs to read

- `docs/ARCHITECTURE.md`
- `docs/COMPONENT_MAP.md`
- `docs/BUILD_LOG.md`
- `docs/KNOWN_ISSUES.md`

## Allowed files

Depending on task:

- `lib/*`
- `components/*`
- specific page or route files being refactored

## Do not do

- Do not change product behavior.
- Do not redesign UI.
- Do not change API response shape.
- Do not add features.
- Do not rename concepts casually.
- Do not bundle cleanup with feature work.

## Refactor rules

A refactor is allowed when:
- a file is too large to safely modify
- logic is duplicated
- a helper is used in more than one place
- a component is reused or isolates a complex section

Avoid abstraction for its own sake.

## Clean implementation rules

- Prefer guard clauses and early returns.
- Prefer pure functions for scoring, parsing, classification, dedupe, and formatting.
- Prefer explicit names over clever shorthand.
- Use named constants for thresholds.
- Prefer readable transformations over clever one-liners.
- Keep fallback behavior clear.
- Avoid deep nesting, magic numbers, premature optimization, broad refactors, new dependencies unless approved, and repeated business logic.
- Comments should explain why, not what.
- Good comments explain visible inventory source of truth, collection-wide bid semantics, ERC-1155 caveats, fallbacks, and thresholds.

## Required proof

After refactor, confirm:
- behavior is unchanged
- routes still return the same shape
- UI still renders the same sections
- TypeScript passes or failures are unrelated
