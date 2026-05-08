# Constellate — Orchestrator

## Purpose

Route work to the smallest useful context bundle.

Before editing, identify:

1. task type
2. task size
3. product question
4. source-of-truth docs
5. files allowed to touch
6. proof command

Default to the smallest possible task. If the task crosses API and UI, split it into phases.

---

## Task types

- Product UI
- Data / API
- Converter
- Resolver / Search
- Interpretation / AI Copy
- Code Health
- Docs / Agents
- Mixed

If unsure, return a plan first.

---

## Context loading rule

Do not read everything. Load only what the task needs.

### Minimum boot context

Always read:

1. `AGENTS.md`
2. `.agents/registry.yaml`
3. This orchestrator

Then read the specialist agent and only the relevant docs below.

### Context tiers

| Tier | Use when | Read |
|---|---|---|
| 0 | exact one-file edit | boot context + target file |
| 1 | normal scoped feature/fix | boot context + specialist agent + target files + relevant docs |
| 2 | API shape, data source, converter, interpretation, or page hierarchy | boot context + relevant docs + target files, then plan first |
| 3 | architecture or workflow redesign | broad docs, no edits until plan approved |

---

## Source-of-truth priority

| Need | Source |
|---|---|
| Product intent | `docs/PRODUCT_SOUL.md` |
| Public Constellate language | `docs/00_CONSTELLATE_CANON.md`, `docs/01_CONSTELLATE_TRANSITION_PLAN.md` |
| Visual direction | `docs/VISUAL_REFERENCES.md`, `docs/PROFILE_VISUAL_BRIEF.md` |
| Design rules | `docs/DESIGN_SYSTEM.md` |
| Display contracts/link behavior | `docs/DISPLAY_CONTRACT.md` |
| Current build priority | `docs/BUILD_LOG.md` |
| File ownership/app structure | `docs/ARCHITECTURE.md`, `docs/COMPONENT_MAP.md` |
| API shape/data contracts | `docs/DATA_MODEL.md`, `docs/API_PATTERNS.md` |
| Data source boundaries | `docs/DATA_SOURCES.md`, `docs/ALCHEMY_CAPABILITIES.md`, `docs/OPENSEA_INTEGRATION.md` |
| Profile behavior | `docs/PROFILE_SPEC.md`, `docs/PROFILE_EXPERIENCE_SPEC.md` |
| Compare behavior | `docs/COMPARE_SPEC.md` |
| Multi-wallet behavior | `docs/MULTI_WALLET_SPEC.md` |
| Ethical AI/interpreted claims | `docs/ETHICAL_AI_BUILDING.md` |
| Known bugs | `docs/KNOWN_ISSUES.md` |

---

## Capability routing

### Alchemy

Use for:
- bulk NFT ownership
- NFT metadata included with ownership records
- transfer history and acquisition timestamps

Read:
- `docs/ALCHEMY_CAPABILITIES.md`
- `docs/DATA_SOURCES.md`
- `docs/API_PATTERNS.md`

Guardrails:
- Do not use Alchemy as final authority for OpenSea profile visibility, marketplace offers, collection search, or interpretation.
- Do not cap, sample, or skip ownership pages for speed without explicit product approval.
- Preserve pagination observability: page count, break reason, fetched counts.

### OpenSea

Use for:
- account identity
- collection slugs and collection identity
- hidden/spam visibility filtering
- NFT and collection destination links
- offers, bids, listings, floors
- collection/account/search behavior

Read:
- `docs/OPENSEA_INTEGRATION.md`
- `docs/DATA_SOURCES.md`
- `.agents/skills/opensea/SKILL.md` when inspecting endpoints, CLI commands, MCP behavior, or marketplace schema

Guardrails:
- Runtime code must use server-side helper patterns.
- Do not shell out to CLI, scripts, or MCP from production runtime.
- OpenSea should degrade gracefully on missing keys, 404, 429, and 5xx.
- Avoid one-request-per-NFT across large wallets unless scoped and capped.
- Use OpenAPI/skill/CLI for development discovery, not as unreviewed runtime architecture.

### Repo-local skills

Use skills for targeted work, not as a reason to load the whole repo.

Known useful skills:
- `.agents/skills/opensea/SKILL.md` — OpenSea API, CLI, MCP, endpoint discovery, offer/listing/event checks
- `.agents/skills/frontend-designer/SKILL.md` — visual hierarchy, UI modules, page polish
- `.agents/skills/converter-auditor/SKILL.md` — converter math, unique NFT dedupe, offer semantics
- `.agents/skills/copy-editor/SKILL.md` — product copy and language cleanup
- `.agents/skills/product-architect/SKILL.md` — product framing and phase planning

Use the matching skill only when the task calls for it.

---

## Quick routing table

| Task | Route as | Read | Guardrail |
|---|---|---|---|
| Profile/compare layout, visual hierarchy, module ordering | Product UI | UI agent + product/design/display docs + page spec | No API edits during visual passes. |
| Profile API fields, category groups, acquisition data, traits, current attention | Data / API | Data API agent + architecture/data/source docs | No UI edits unless explicitly scoped. |
| OpenSea offer/listing/floor/search bug | Data / API | OpenSea integration + OpenSea skill + data model | Verify endpoint/schema; avoid broad fetch refactors. |
| Alchemy ownership/transfer bug | Data / API | Alchemy capabilities + data sources + API patterns | Preserve pagination safety and visibility filtering. |
| Converter math or debug output | Converter | converter auditor + converter spec + data sources | Preserve active ETH/WETH offer question; dedupe unique NFTs. |
| Wallet address/ENS/OpenSea URL resolution | Resolver / Search | data API agent + API patterns + component map if UI changes | Prefer shared resolver helpers; do not invent identities. |
| Copy/error language only | Product UI or Copy | product soul + canon + relevant spec | Do not change API error contracts unless scoped. |
| Interpretation prompt/archetype/AI-generated claims | Interpretation / AI Copy | product soul + insight engine + ethical AI | Evidence first; no unsupported claims. |
| Refactor/extraction/file size cleanup | Code Health | code-health agent + architecture + component map | No behavior, API, visual, or copy changes. |
| Agent/docs workflow | Docs / Agents | AGENTS + registry + docs README + changed files | Docs-only. No app behavior changes. |
| CI failure | Code Health | failure logs + relevant docs | Diagnose first; implement only approved fix. |

---

## Product UI task

Use when the task changes:
- profile page UI
- compare page UI
- layout or visual hierarchy
- copy placement
- user-facing interaction
- component composition

Read only what is needed:
- `.agents/agents/product-ui-agent.md`
- `docs/PRODUCT_SOUL.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/DISPLAY_CONTRACT.md`
- relevant page spec
- target component/page/CSS files

Do not touch API routes unless explicitly requested.

---

## Data / API task

Use when the task changes:
- API response shape
- Alchemy fetching
- OpenSea enrichment
- acquisition dates or methods
- category grouping/classification
- traits or profile signal data
- highest offer/current attention logic
- wallet profile logic

Read only what is needed:
- `.agents/agents/data-api-agent.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DATA_SOURCES.md`
- `docs/API_PATTERNS.md`
- `docs/ALCHEMY_CAPABILITIES.md` for Alchemy work
- `docs/OPENSEA_INTEGRATION.md` and `.agents/skills/opensea/SKILL.md` for OpenSea work
- `docs/KNOWN_ISSUES.md` when debugging

Do not touch UI files unless explicitly requested.

---

## Converter task

Use when the task changes:
- converter MCP/debug output
- unique NFT dedupe
- active ETH/WETH offer selection
- target collection floor math
- converter result presentation or error copy

Route math, fetching, resolver use, and API behavior as Data / API. Route presentation-only changes as Product UI.

Non-negotiable product question:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

Do not turn the converter into floor-based wallet valuation.

---

## Resolver / Search task

Use when the task changes:
- raw wallet address parsing
- ENS resolution
- OpenSea profile URL parsing
- OpenSea collection URL parsing
- shared wallet resolver behavior
- collection search result filtering or labels

Prefer shared resolver/search helpers over route-local parsing. Do not change API response shapes unless explicitly scoped.

---

## Interpretation / AI Copy task

Use when the task changes:
- Groq or model prompts
- archetype language
- pattern lines
- AI-generated profile or compare summaries
- labels that sound like judgments

Read:
- `docs/PRODUCT_SOUL.md`
- `docs/INSIGHT_ENGINE.md`
- `docs/ETHICAL_AI_BUILDING.md`
- relevant route/prompt file

Guardrails:
- Separate fact from interpretation.
- Use visible evidence near claims.
- Do not infer sensitive identity traits.
- Do not rank people by worth, taste, status, wealth, seriousness, or cultural value.

---

## Code Health task

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

Do not change behavior, API shape, copy, or visual hierarchy.

---

## Docs / Agents task

Use when the task changes:
- AGENTS.md
- `.agents/**`
- docs indexes
- workflow docs
- governance scripts

Read:
- `AGENTS.md`
- `.agents/registry.yaml`
- changed agent/doc files
- `docs/README.md` when doc structure changes

Keep docs-only work docs-only.

---

## Mixed tasks

If a task requires both API and UI:

1. Return a phase plan.
2. Do the API/data pass first.
3. Verify the response with curl/debug output.
4. Do the UI pass second.
5. Verify browser behavior.

Do not combine phases unless explicitly approved.

---

## Task sizes

### Small

- 1-2 files
- no API shape change
- no broad refactor
- direct verification exists

### Medium

- 2-4 files
- one clear feature
- may add one helper/component
- no unrelated cleanup

### Large

- API + UI
- major redesign
- new data fields across layers
- major refactor
- must be split into phases

Default to Small.

---

## Direct edit vs plan required

Direct edits are allowed when all are true:
- scoped to 1-2 files
- product question is clear
- no API response shape changes
- no data fetching, converter math, OpenSea, Alchemy, or MCP behavior changes
- no broad visual hierarchy change
- allowed files are explicit

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

```bash
git diff --name-only
npx tsc --noEmit
git status
```

Docs/agents:

```bash
npm run agents:check
npm run docs:check
grep -n "<<<<<<\\|=======\\|>>>>>>" AGENTS.md .agents/agents/ORCHESTRATOR.md .agents/registry.yaml
```

UI:

```bash
npx tsc --noEmit
```

Then do a browser check when possible, including desktop/mobile if layout risk exists.

Data/API:

```bash
npx tsc --noEmit
```

Then include a focused curl/debug validation for the changed route.

OpenSea:
- Verify the exact endpoint/schema before parser changes.
- Test with one known entity before batch behavior.
- Do not run broad parallel OpenSea checks.

Alchemy:
- Verify page counts, break reasons, and fetched totals when pagination is touched.

Converter:
- Verify single-wallet and multi-wallet inputs.
- Check unique NFT count, offer count, total ETH/WETH, and target floor math.

---

## Required pre-edit response

Before editing, state:

1. task type
2. task size
3. product question
4. docs read
5. files to touch
6. files not to touch
7. risk areas
8. verification plan

---

## Required post-edit response

After editing, state:

1. files changed
2. behavior changed
3. behavior preserved
4. checks run
5. known issues or follow-ups
6. whether any changes were outside scope

---

## Non-negotiables

- Do not add dependencies without approval.
- Do not modify API routes during visual passes.
- Do not modify UI during data passes.
- Do not rewrite working files casually.
- Do not invent fake wallet data.
- Do not remove existing functionality without approval.
- Do not claim verification without terminal proof.
