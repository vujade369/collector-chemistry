---
name: constellate-production-architecture
description: Protect Constellate routing, API contracts, response shapes, route boundaries, runtime data flow, and architecture-sensitive changes.
compatibility: Preferred core skill for architecture-sensitive work. Existing specialist agents and legacy skills remain valid supplemental guidance.
metadata:
  owner: Constellate
  status: preferred-core
---

# Constellate Production Architecture

## Purpose

Use this skill when a change could affect how data, routes, pages, helpers, or API contracts fit together.

## Invoke for

- API response shape changes
- backend/API work
- route changes
- multi-file data flow changes
- mixed API/UI work
- large page-file changes
- new shared helpers or moved logic

## Guardrails

- Preserve routes, API fields, types, helper names, and CSS classes unless explicitly scoped.
- Identify current consumers before adding, removing, or renaming response fields.
- Keep API/data work separate from UI work unless the task is explicitly phased.
- Runtime code should use existing server-side helper patterns.
- Do not shell out to local scripts, MCP tools, or CLIs from production runtime.
- If architecture guidance conflicts with a legacy skill or doc, stop and report the conflict.

## Proof

Use the smallest proof that matches the risk:

- `npx tsc --noEmit` for code changes
- focused curl/debug output for changed API behavior
- browser proof for page behavior
- `npm run agents:check` and `npm run docs:check` for harness/docs changes
