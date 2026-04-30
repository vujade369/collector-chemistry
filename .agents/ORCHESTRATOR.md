# Collector Chemistry — Orchestrator

## Purpose

This file routes agent work.

Before editing, identify the task type:
- Product UI
- Data / API
- Code Health
- Mixed

Default to the smallest possible task.

---

## Source-of-truth priority

For product intent:
`docs/PRODUCT_SOUL.md`

For visual direction:
`docs/VISUAL_REFERENCES.md`

For design rules:
`docs/DESIGN_SYSTEM.md`

For current build priority:
`docs/BUILD_LOG.md`

For file ownership and app structure:
`docs/ARCHITECTURE.md`

For API shape and data contracts:
`docs/DATA_MODEL.md`

For profile behavior:
`docs/PROFILE_SPEC.md`

For compare behavior:
`docs/COMPARE_SPEC.md`

For component placement:
`docs/COMPONENT_MAP.md`

---

## Task routing

### Product UI task

Use when the task changes:
- profile page UI
- compare page UI
- layout
- visual hierarchy
- copy placement
- user-facing interaction
- component composition

Read:
- `.agents/agents/product-ui-agent.md`
- `docs/PRODUCT_SOUL.md`
- `docs/VISUAL_REFERENCES.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/BUILD_LOG.md`
- relevant page spec

Do not touch API routes unless explicitly requested.

---

### Data / API task

Use when the task changes:
- API response shape
- Alchemy fetching
- OpenSea enrichment
- acquisition dates
- category grouping
- highest bid logic
- wallet profile logic

Read:
- `.agents/agents/data-api-agent.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DATA_SOURCES.md`
- `docs/API_PATTERNS.md`
- `docs/KNOWN_ISSUES.md`

Do not touch UI files unless explicitly requested.

---

### Code Health task

Use when the task changes:
- file size
- duplication
- helper extraction
- component extraction
- route cleanup
- logic relocation

Read:
- `.agents/agents/code-health-agent.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPONENT_MAP.md`
- `docs/BUILD_LOG.md`
- `docs/KNOWN_ISSUES.md`

Do not change behavior.

---

## Mixed tasks

If a task requires both API and UI:

1. Split it into phases.
2. Do the API/data pass first.
3. Verify the response.
4. Do the UI pass second.
5. Do not combine unless explicitly approved.

---

## Task sizes

### Small

- 1–2 files
- no API shape change
- no broad refactor

### Medium

- 2–4 files
- one clear feature
- may add one component
- no unrelated cleanup

### Large

- API + UI
- major redesign
- major refactor
- must be split into phases

Default to Small.

---

## Required pre-edit response

Before editing, the agent must state:

1. task type
2. task size
3. docs read
4. files to touch
5. files not to touch
6. risk areas

---

## Required post-edit response

After editing, the agent must state:

1. files changed
2. behavior changed
3. behavior preserved
4. checks run
5. known issues
6. whether any changes were outside scope

---

## Non-negotiables

- Do not add dependencies without approval.
- Do not modify API routes during visual passes.
- Do not modify UI during data passes.
- Do not rewrite working files casually.
- Do not invent fake wallet data.
- Do not remove existing functionality without approval.