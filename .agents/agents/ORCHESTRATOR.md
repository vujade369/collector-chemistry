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

### Quick routing table

| Task | Route as | Read | Guardrail |
|---|---|---|---|
| Product UI | Product UI | Product UI docs + relevant page spec | No API route or data-contract edits during visual passes. |
| Converter math / offer logic | Data / API | Data API docs + converter implementation docs when present | Preserve the converter question: best active ETH/WETH offers on unique NFTs, then target-floor buying power. |
| Wallet resolver / ENS / OpenSea URL lookup | Data / API | Data API docs + resolver/search docs when present | Keep address, ENS, and OpenSea URL handling shared when possible. Do not invent resolved identities. |
| Collection search quality | Data / API, then Product UI only if dropdown display changes | Data API docs + component map if UI changes | Prefer search-result cleanup at the source. Keep empty and uncertain states truthful. |
| Copy / error language | Product UI unless API error contract changes | Product soul + design system + relevant spec | Keep copy clear and accurate. Do not force Constellate language into converter utility flows. |
| Code health / refactor | Code Health | Code Health docs | No behavior, API shape, copy, or visual hierarchy changes. |
| Visual QA | Product UI verification | Design system + relevant page spec | Use a real browser when possible; inspect desktop and mobile when layout risk exists. |
| CI failure | Code Health until a fix is approved | `gh-fix-ci` skill | Inspect GitHub Actions failures first; implement only after explicit approval. |

---

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

### Converter task

Use when the task changes:
- converter MCP/debug output
- unique NFT dedupe
- active ETH/WETH offer selection
- target collection floor math
- converter result presentation or error copy

Route math, fetching, resolver use, and API behavior as Data / API.
Route presentation-only changes as Product UI.

Do not turn the converter into floor-based wallet valuation.

---

### Wallet resolver / search task

Use when the task changes:
- raw wallet address parsing
- ENS resolution
- OpenSea profile or collection URL parsing
- shared wallet resolver behavior
- collection search result filtering or labels

Prefer shared resolver and search helpers over route-local parsing.
Do not change API response shapes unless the task explicitly calls for it.

---

### Skill routing

- Use `$playwright` for browser UI verification, dropdown checks, responsive checks, and interaction debugging.
- Use `$screenshot` when an OS-level screenshot is explicitly requested or browser-native screenshots are not enough.
- Use `$gh-fix-ci` for GitHub Actions PR failures; summarize failures and propose a plan before edits.
- Future repo-local skills may route specialized work when available: `frontend-designer`, `converter-auditor`, `copy-editor`, `product-architect`.

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

## Direct edit vs plan required

Direct edits are allowed when all are true:
- the task is scoped to 1-2 files
- the product question is clear
- no API response shape changes
- no data fetching, converter math, OpenSea, Alchemy, or MCP behavior changes
- no broad visual hierarchy change
- the allowed files are explicit

Return a plan before editing when the task:
- touches more than two files
- changes API response shape or introduces fields
- changes data fetching, wallet resolution, converter math, OpenSea, Alchemy, or MCP logic
- affects profile or compare interpretation logic
- changes visual hierarchy across a page
- is ambiguous, product-sensitive, or crosses API and UI

Plans should name likely files, smallest safe path, risks, definition of done, and verification commands.

---

## Verification recipes

Default after edits:
- `git diff --name-only`
- `npx tsc --noEmit` when code changed
- `git status`

UI:
- `npx tsc --noEmit`
- Playwright browser check when possible
- include mobile and desktop screenshots or observations when layout risk exists

Converter:
- debug curl for the converter path
- formula check: summed best active ETH/WETH offers on unique NFTs divided by target floor
- verify single-wallet and multi-wallet inputs

Resolver:
- raw address
- ENS
- OpenSea profile URL
- invalid input

Search:
- API curl for query quality
- dropdown visual check with Playwright when UI is affected

Docs:
- `git diff --name-only`
- merge marker check on changed docs

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
