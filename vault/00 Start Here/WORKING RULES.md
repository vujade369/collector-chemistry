# Working Rules

## Build philosophy

Define the product question first.

Scope before implementation.

Prefer small, safe, testable changes.

Protect the product soul:
- interpretive
- behavior-led
- human
- editorial
- accurate

## Tool roles

GPT:
- product architecture
- prompt writing
- critique
- system review

Claude:
- outside critique
- conceptual pressure-testing
- strategic review

Codex:
- implementation
- code inspection
- scoped file changes

Terminal:
- proof layer

GitHub:
- source of truth

Obsidian:
- operating memory
- prompts
- decisions
- planning
- product system

## Rules for code changes

Do not ask Codex to make broad product decisions.

Do not allow broad refactors unless explicitly planned.

Do not rename routes, APIs, types, or helpers just because the brand name changed.

Do not change API response contracts casually.

Every implementation prompt should include:
- goal
- files to inspect
- files allowed to touch
- files not to touch
- definition of done
- verification commands

## Verification

Use:

```bash
git status
npx tsc --noEmit
npm run lint