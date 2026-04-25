# Collector Chemistry — Agent Instructions

## What this is

A read-only app that compares two NFT collectors and reveals overlap in taste.

## Before writing code

Read:

* CLAUDE.md
* docs/BUILD_LOG.md
* docs/DATA_MODEL.md

## Strict file limits

* If a task does not name files, ask which files to modify before making changes.
* Only modify files explicitly listed in the task
* Do NOT create new files unless you explain why first
* Do NOT refactor large files unless asked
* Do NOT touch these unless explicitly instructed:

  * lib/walletProfile.ts
  * app/page.tsx
  * app/layout.tsx

If a task requires touching more files than expected → STOP and explain.

## Coding rules

* Preserve working logic
* Prefer small edits over rewrites
* No new dependencies without approval
* Keep types consistent with DATA_MODEL.md
* Do not invent new data shapes

## Output rules

* Return FULL updated files (no diffs)
* Only include files that changed
* List what changed clearly
