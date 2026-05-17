---
name: context-discipline
description: Use when planning or executing Constellate build work with Codex, Claude Code, or another AI coding agent and you need to reduce token waste, choose the right context size, compact or restart a stale session, write a scoped agent prompt, or decide which docs/files/MCPs should be loaded.
compatibility: Repo-local guidance for GPT, Claude, Codex, Cursor, and human builders.
metadata:
  owner: Constellate
  status: active
---

# Context Discipline

## Purpose

Use the smallest useful context to make the next safe build decision.

Constellate work should not rely on giant prompts, long stale chats, or broad repo exploration unless the task truly needs it. Context is a build material. Treat it like code: scoped, intentional, reviewed, and cleared when stale.

The goal is simple:

> Give the agent enough context to be accurate, not enough context to get lost.

## When to use this skill

Use this skill when:

- starting a Codex or Claude Code session
- switching tasks
- continuing after a long debugging thread
- preparing a Codex implementation prompt
- preparing a Claude critique or planning prompt
- deciding whether to compact, clear, or start fresh
- choosing which docs, files, skills, or MCPs to load
- writing a handoff from one AI tool to another

Do not use this skill as a replacement for product docs, data-source docs, or page specs. Use it to decide what to load, not to replace the source of truth.

## Core rule

Do not give the agent the whole project when the next decision only needs one file.

Before prompting an AI coding agent, decide:

1. What decision or change is needed next?
2. What is the smallest file/doc bundle that can support that decision?
3. Is this an implementation task, inspection task, planning task, or handoff?
4. What should the agent avoid touching?
5. What proof will show the work is done?

## Context tiers

### Tier 1 — Exact edit

Use when the task is obvious, local, and low-risk.

Good for:

- copy changes
- label changes
- one CSS tweak
- one constant
- one obvious TypeScript fix
- a narrow docs correction

Prompt shape:

```txt
Make this exact change only.

Goal:
[one sentence]

File to edit:
- [path]

Change:
[exact change]

Do not:
- touch unrelated files
- refactor
- rename types, classes, routes, or API fields

Run:
- npx tsc --noEmit

Return:
- files changed
- summary
- test output
- risks or follow-ups
```

### Tier 2 — Scoped inspection

Use when you need the agent to locate the relevant code path before editing.

Good for:

- finding where behavior lives
- tracing a bug likely contained in 2–4 files
- comparing current behavior to expected behavior
- deciding whether a fix is UI-side or API-side

Prompt shape:

```txt
Inspect only. Do not edit.

Question:
[what we need to know]

Files to inspect first:
- [path]
- [path]

Return:
- current behavior
- likely cause
- files involved
- smallest safe fix
- risks
```

### Tier 3 — Plan mode

Use when the wrong implementation path would be expensive or risky.

Required for:

- API response changes
- wallet resolution
- OpenSea, Alchemy, or MCP behavior
- converter math
- Orbit ranking or seeding
- Compare recognition logic
- shareable URL state
- page hierarchy changes touching more than two files
- anything that might affect product meaning

Prompt shape:

```txt
/plan

Goal:
[desired behavior]

Problem:
[observed issue]

Product question:
[what the user-facing experience must answer]

Files to inspect first:
- [path]
- [path]
- [path]

Do not edit yet.

Return:
- current behavior
- likely cause
- smallest safe implementation plan
- files that may need changes
- risks
- verification commands
```

Only approve implementation after the plan is specific enough to know what should and should not change.

### Tier 4 — Fresh-session handoff

Use when the current conversation is no longer the best place to keep working.

Start fresh when:

- the task changes
- the chat is long or messy
- the agent starts contradicting prior decisions
- multiple abandoned approaches are in the thread
- output quality drops
- implementation is complete and a new feature begins
- planning is done and execution should happen cleanly

Handoff shape:

```txt
You are working in the Constellate repo.

Current branch:
[last known branch]

Last good commit:
[hash/message if known]

Goal:
[one sentence]

Decisions already made:
- ...

Current state:
- ...

Files changed so far:
- ...

Files likely relevant next:
- ...

Files not to touch:
- ...

Verification already run:
- ...

Next exact task:
[one precise instruction]
```

## Compact, clear, and restart rules

### Compact

Use compact when:

- the current thread is still useful
- the task is not finished
- context is getting heavy
- there are key decisions worth preserving

Before compacting, ask the agent to produce a build summary:

```txt
Save a compact build summary:
- goal
- decisions made
- files touched
- current blocker
- next exact step
- commands already run
- risks
```

Compacting is not a substitute for a clean handoff. After several compacts, start a fresh session with the summary.

### Clear or start new

Use clear or start a new chat when:

- switching tasks
- output quality drops
- the agent starts repeating itself
- the agent contradicts earlier decisions
- the thread contains too many abandoned paths
- the implementation task is done

A fresh chat with a disciplined handoff is usually better than a long chat with unclear memory.

## MCP rules

Only enable MCPs that are needed for the current task.

MCP tool definitions can consume context before the actual work begins. Keep the loaded tool surface small.

Use OpenSea MCP only for:

- wallet/account lookup
- collection lookup
- offers, listings, floors, and marketplace context
- development-time inspection of OpenSea behavior

Use GitHub MCP only for:

- issues
- pull requests
- branch or commit inspection
- remote repo state
- code review against committed work

Do not keep broad or unrelated MCPs loaded during normal code-editing sessions unless the current task explicitly needs them.

Runtime code must not depend on MCP tools. MCPs are for development and inspection only.

## Skill rules

Keep skills narrow and discoverable.

Good skill names:

- `context-discipline`
- `constellate-data-sources`
- `profile-ui-polish`
- `converter-offer-logic`
- `opensea-data-debugging`

Weak skill names:

- `everything-about-constellate`
- `all-project-docs`
- `general-ai-helper`
- `build-better`

The skill description matters. It should clearly tell the agent when to activate the skill. The full skill should not need to load unless the task calls for it.

## AGENTS.md rule

`AGENTS.md` should be an index, not a knowledge dump.

Include:

- project stack
- core commands
- safety rules
- where to find deeper docs
- verification expectations
- repeated mistakes the agent must stop making

Do not paste full product docs, long specs, or transcript-derived advice into always-loaded instructions.

Prefer pointers:

```txt
For V1 product-flow work, read docs/V1_PRODUCT_FLOW.md.
For product soul, read docs/PRODUCT_SOUL.md.
For data-source work, read .agents/skills/constellate-data-sources/SKILL.md.
For token/context usage, read .agents/skills/context-discipline/SKILL.md.
```

## Model/tool usage guidance

Use stronger reasoning for:

- product architecture
- unclear bugs
- risky data-flow changes
- plan review
- deciding scope

Use lighter/faster execution for:

- exact edits
- applying an approved plan
- formatting
- small CSS or copy changes
- mechanical follow-ups

Do not ask an implementation agent to make broad product decisions. Use it to inspect, plan, implement, and verify within clear boundaries.

## Constellate-specific defaults

For Constellate, assume:

- product meaning matters as much as code correctness
- wallet data work is high-risk until proven otherwise
- converter math must preserve actionable ETH/WETH offer semantics
- Orbit/Compare/Profile changes should protect the social loop
- UI polish should not casually alter API contracts
- broad refactors are suspicious unless explicitly requested

When in doubt, plan first.

## End-of-session question

At the end of meaningful work, ask:

```txt
Did we make any durable decision that should be added to AGENTS.md, a skill, BUILD_LOG.md, or a project doc?
If yes, recommend the smallest place to record it.
Do not edit yet.
```

## Verification expectations

For docs-only changes, run when available:

```bash
npm run docs:check
npm run agents:check
```

For code changes, run the relevant project checks, usually:

```bash
npx tsc --noEmit
git diff --name-only
git status
```

If a check cannot be run in the current environment, say so directly and explain what still needs to be verified locally.
