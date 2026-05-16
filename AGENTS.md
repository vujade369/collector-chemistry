# Constellate Agent Entry Point

Constellate was formerly called Collector Chemistry. The repo still contains legacy Collector Chemistry names in routes, helpers, types, CSS classes, docs, and API fields. Do not rename working internals just because public language changed.

Constellate reads cultural signal, taste, overlap, and collecting behavior from wallets. It helps people see the pattern in what they keep, then discover where that pattern overlaps with someone else.

Core thesis:

> What you keep becomes a pattern.  
> What overlaps becomes recognition.

---

## Prime directive

Define the product question first. Then make the smallest safe, testable change that answers that question and nothing else.

Before editing, answer:

1. What user-facing question are we answering?
2. Which data source or file answers it most directly?
3. What is the smallest safe code path?
4. How will we prove it with terminal output, API output, or visible UI?

If the product question, scope, or proof is unclear, return a plan instead of editing.

---

## Token-efficient operating model

Do not read the whole repo by default. Start with routing, then load only the smallest relevant bundle.

Always start with:

1. `.agents/agents/ORCHESTRATOR.md`
2. `.agents/registry.yaml`
3. The specialist agent selected by the orchestrator
4. Only the docs required for that task type
5. The specific files likely to change

### V1 product-flow work

For any v1 product-flow, social-loop, route-bridge, sharing, Wallet Read, Compare, or Orbit work, read:

- `docs/V1_PRODUCT_FLOW.md`
- `docs/BUILD_PRINCIPLES.md`
- `docs/PRODUCT_SOUL.md`

Treat `docs/V1_PRODUCT_FLOW.md` as the v1 source of truth. Do not relitigate decisions already marked as made there unless the user explicitly reopens them.

Read more only when the first pass proves it is needed.

### Context tiers

**Tier 0 — tiny direct edit**
- Read: orchestrator, registry, target file.
- Use for: typo fixes, exact copy edits, one-file CSS tweaks, obvious small changes.

**Tier 1 — normal scoped task**
- Read: orchestrator, registry, specialist agent, target files, 2-4 relevant docs.
- Use for: most UI, API, converter, resolver, and docs work.

**Tier 2 — plan first**
- Read: all relevant task docs plus target files.
- Use for: API response changes, OpenSea/Alchemy/MCP behavior, converter math, interpretation logic, multi-file page hierarchy changes.

**Tier 3 — architecture review only**
- Read broader docs, but do not edit.
- Use for: project-wide refactors, new systems, route shape changes, agent/workflow redesign.

---

## Capability map

Use the right source for the job. Do not make one source do another source's work.

| Need | Preferred source | Read first |
|---|---|---|
| Bulk wallet NFTs, metadata, transfer facts | Alchemy | `docs/ALCHEMY_CAPABILITIES.md`, `docs/DATA_SOURCES.md` |
| OpenSea visibility, hidden/spam filtering, slugs, profile identity, marketplace destinations | OpenSea REST | `docs/OPENSEA_INTEGRATION.md`, `docs/DATA_SOURCES.md` |
| Offers, listings, floors, collection search, marketplace context | OpenSea REST/MCP | `.agents/skills/constellate-data-sources/SKILL.md`, `docs/OPENSEA_INTEGRATION.md` |
| Runtime app logic | Existing server helpers | `docs/API_PATTERNS.md`, `docs/ARCHITECTURE.md` |
| Schema discovery during development | OpenSea docs/API references, only as needed | `.agents/skills/constellate-data-sources/SKILL.md`, `docs/OPENSEA_INTEGRATION.md` |
| Interpretation, archetypes, summaries, taste reads | Constellate logic and prompts | `docs/PRODUCT_SOUL.md`, `docs/INSIGHT_ENGINE.md`, `docs/ETHICAL_AI_BUILDING.md` |
| Visual hierarchy, UI, page modules | Product UI agent | `docs/DESIGN_SYSTEM.md`, `docs/PROFILE_VISUAL_BRIEF.md`, relevant page spec |

### Alchemy boundary

Alchemy is the bulk ownership and transfer-fact source. Use it for wallet NFTs, metadata included with ownership records, and transfer history. Do not use it as final authority for profile visibility, marketplace offers, collection search, or interpretation.

Never cap or sample ownership for speed without explicit product approval. Alchemy pagination must remain observable through page counts, break reasons, and fetched counts.

### OpenSea boundary

OpenSea is the marketplace and visibility source. Use it for account identity, collection slugs, collection images, NFT and collection destinations, hidden/spam filtering, offers, listings, floors, and collection search.

OpenSea data must degrade gracefully. Missing OpenSea data should never block the Constellate experience unless the specific feature depends on it.

Runtime code should use server-side helpers. Do not shell out to local scripts, the OpenSea CLI, or MCP tools from production runtime.

### Skill boundary

Repo-local skills are development guidance, not runtime dependencies. Use them to inspect, test, and reason, then implement through normal app code.

Use OpenSea CLI or TOON output for lean debugging when local development needs external marketplace checks, but keep runtime code on existing server-side helper patterns.

---

## Product boundaries

Do not treat Constellate as:

- a finance dashboard
- a marketplace
- a leaderboard
- a generic analytics app
- a compatibility score
- a trading product
- a portfolio valuation tool
- a social ranking system

Market, floor, and offer data may appear in utility modules, but financial value should not become the center of the product experience.

Constellate should illuminate, not expose. Treat wallets as partial records, not complete identities.

---

## Language rules

Use `docs/00_CONSTELLATE_CANON.md` and `docs/01_CONSTELLATE_TRANSITION_PLAN.md` as public-language sources of truth.

Prefer language like:

- constellation
- pattern
- recognition
- overlap
- shared worlds
- shared stars
- crossing points
- signal points
- what people keep
- where this wallet returns
- how this wallet formed
- collecting rhythm

Avoid user-facing language like:

- compatibility
- match score
- ranking
- portfolio score
- alpha
- financial performance
- generic dashboard
- wallet analytics
- chemistry, unless preserving legacy internals

Keep legacy internal names when they are working routes, helpers, CSS classes, types, or API fields. Do not rename `chemistryScore`, `chemistryLabel`, routes, helpers, CSS classes, or API fields unless explicitly requested and scoped.

---

## Scope guard

Every implementation task should identify:

- task type
- task size
- files to inspect
- files allowed to touch
- files not to touch
- definition of done
- verification commands

Do not edit outside allowed files unless the user explicitly approves it. If the correct fix requires expanding scope, stop and explain why before editing.

One concern per change. Do not mix UI, API, and refactor work unless explicitly requested and phased.

---

## API and data rules

Protect these from casual edits:

- API response contracts
- profile and compare route shapes
- NFT fetching and spam/hidden filtering
- OpenSea and Alchemy integration logic
- converter offer math
- interpretation copy contracts
- large page files

Before changing a response shape, identify:

- current consumer
- new field
- fallback behavior
- whether UI needs to change
- whether docs need updating
- how to verify with terminal output or UI

---

## Display and linkability rules

For any work touching profile pages, compare pages, wallet identity, NFT cards, collection cards, artist displays, images, marketplace links, empty states, or entity click behavior, read `docs/DISPLAY_CONTRACT.md` and the relevant page spec.

Required display behavior:

- no hardcoded wallet-specific values
- no naked entities
- image fallbacks
- truthful labels and confidence
- enrichment budgets
- empty states
- accessibility basics
- consistent OpenSea link behavior

Every displayed NFT, collection, or artist should link to the deepest reliable destination available.

NFT links:
1. Specific OpenSea NFT URL when contract address and token ID are reliable
2. Collection URL fallback when NFT URL cannot be built safely
3. No link if the destination is unsafe or uncertain

Collection links:
1. OpenSea collection URL from reliable slug
2. Reliable contract-derived collection fallback
3. No link if unsafe or uncertain

Rules:
- Do not invent URLs
- Do not link to misleading destinations
- Prefer no link over a wrong link

---

## Data honesty and confidence

Separate facts from interpretation.

Hard facts include wallet address, token ID, contract address, collection slug, OpenSea URL, NFT count, collection count, and source-supported event timestamps.

Confidence-sensitive fields include category classification, artist attribution, acquisition type, collector archetype, recommendations, taste pattern, behavior labels, and recognition language.

Do not present inferred categories, artists, acquisition types, recommendations, or behavioral reads as certain unless the source supports them. Use careful language when data is incomplete.

---

## Converter rule

The wallet converter answers one specific question:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

This is not OpenSea floor-based wallet value.

Small collection-wide bids count if they are actionable ETH/WETH offers. Do not filter out small actionable offers merely because they are small. The correct fix for inflated totals is unique NFT deduplication before summing offers, not arbitrary offer filtering.

---

## Ethical AI guardrails

Read `docs/ETHICAL_AI_BUILDING.md` before changing AI-assisted features, interpretation prompts, scoring logic, ranking logic, comparison logic, AI-generated language, or user-facing claims derived from wallet data.

Before implementing, answer:

- What human judgment or interpretation does this affect?
- What evidence supports the claim?
- Who could be misread, excluded, flattened, or harmed?
- What uncertainty needs to be visible?
- Is AI necessary here, or would deterministic logic be safer?
- What proof should appear near the claim?

Do not infer sensitive identity traits from wallet behavior. Do not rank collectors by worth, taste, status, intelligence, wealth, seriousness, or cultural value.

---

## Verification

After implementation, run the checks requested in the prompt.

Default checks:

```bash
git diff --name-only
npx tsc --noEmit
git status
```

For broader code changes, also run:

```bash
npm run lint
```

For governance or docs changes, run:

```bash
npm run agents:check
npm run docs:check
```

For API/data changes, include a curl or debug validation when possible.

Terminal output is proof. Do not claim a change is verified unless the verification command was actually run.

---

## When to return a plan instead of editing

Return a plan first when the task:

- touches more than two files
- changes API response shape
- changes data fetching
- touches OpenSea, Alchemy, MCP, or converter math
- affects profile or compare interpretation logic
- introduces new fields
- changes visual hierarchy across a page
- is ambiguous, product-sensitive, or mixed API/UI

A good plan names likely files, smallest safe path, risks, definition of done, and verification commands.

---

## Required agent behavior

Codex should:

- inspect before editing
- keep changes scoped
- return files changed
- summarize exactly what changed
- report verification output
- flag risks and follow-ups
- preserve existing behavior unless asked otherwise

Codex should not:

- make broad product decisions
- invent product language without context
- rename internal contracts casually
- add dependencies without asking
- refactor unrelated code
- hide uncertainty
- over-apply the constellation metaphor
