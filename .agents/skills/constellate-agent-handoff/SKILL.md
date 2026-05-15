---
name: constellate-agent-handoff
description: Turn Constellate product intent into Codex-ready prompts with scope, files, constraints, definition of done, and verification.
compatibility: Preferred core skill for repo-local Constellate harness work. Existing specialist agents and legacy skills remain valid supplemental guidance.
metadata:
  owner: Constellate
  status: preferred-core
---

# Constellate Agent Handoff

## Purpose

Use this skill when turning an idea, bug, product request, review note, or ChatGPT-supplied direction into a clean Codex-ready task.

The handoff should make the next agent's work obvious, scoped, and testable.

## Handoff fields

Include:

- product question
- goal
- task type and size
- files to inspect
- files allowed to touch
- files not to touch
- source-of-truth docs or skills
- constraints and forbidden changes
- definition of done
- verification commands
- final report expectations

## Guardrails

- Define the user-facing question before implementation.
- Keep one concern per handoff.
- Split mixed API/UI work into phases.
- Do not authorize broad refactors, dependency additions, response shape changes, route changes, or data-source changes unless they are explicit in scope.
- If files, product question, or proof are unclear, ask for a plan instead of edits.

## Final report expectations

Ask the implementing agent to report:

- files changed
- behavior changed
- behavior preserved
- checks run and results
- known risks or follow-ups
- whether anything changed outside scope
