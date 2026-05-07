# Constellate Agent Entry Point

Constellate was formerly called Collector Chemistry.

This repo may still contain legacy Collector Chemistry language in code, docs, routes, types, CSS classes, and API contracts. Do not rename internal systems just because the product language has changed.

Constellate reads cultural signal, taste, overlap, and collecting behavior from wallets. The product is not about ranking collectors. It helps people see the pattern in what they keep, then discover where that pattern overlaps with someone else.

Core thesis:

> What you keep becomes a pattern.  
> What overlaps becomes recognition.

## Before making changes

Read these first when they exist:

1. `.agents/agents/ORCHESTRATOR.md`
2. The relevant specialist agent doc listed by the orchestrator
3. The relevant product or spec docs listed by the orchestrator
4. `docs/00_CONSTELLATE_CANON.md`
5. `docs/01_CONSTELLATE_TRANSITION_PLAN.md`

Before editing, also consult `.agents/registry.yaml` when it exists.

If an optional `.agents` file is missing, continue with the canonical docs in `docs/` and keep the change scoped.

If the task touches design, profile hierarchy, copy, or product language, also read:

- `docs/DESIGN_SYSTEM.md`
- `docs/PROFILE_VISUAL_BRIEF.md`
- `docs/PRODUCT_SOUL.md`

If the task touches profile data, compare data, wallet fetching, OpenSea, Alchemy, converter logic, or API response shape, read the relevant implementation docs before editing.

## Product question first

Before editing, identify the user-facing product question the change answers.

Examples:

- What pattern does this wallet reveal?
- How did this wallet form?
- Where do these two wallets overlap?
- Which collections does this wallet return to?
- What active offer value could this wallet convert into?

If the product question is unclear, return a plan instead of editing.

Start by asking:

- What exact user-facing question are we answering?
- What data source answers that question most directly?
- What is the smallest safe code path to make the answer accurate?
- How do we verify it with terminal output or visible UI?

Do not start by refactoring.

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

## Language rules

Use `docs/00_CONSTELLATE_CANON.md` and `docs/01_CONSTELLATE_TRANSITION_PLAN.md` as the source of truth for public language.

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

Keep old internal names when they are part of working routes, helpers, CSS classes, types, or API fields. Do not rename `chemistryScore`, `chemistryLabel`, routes, helpers, CSS classes, or API fields unless explicitly requested and scoped.

## General rules

- One task equals one concern
- Define the product question first
- Scope before implementation
- Keep API routes thin
- Prefer existing data before adding new data
- Preserve existing behavior unless the task says otherwise
- Do not change API response contracts casually
- Do not rename routes, APIs, types, helpers, or CSS classes just because the brand language changed
- Do not mix UI, API, and refactor work unless explicitly requested
- Avoid broad refactors unless explicitly requested
- Prefer small, safe, testable changes
- Run checks after editing

## Scope guard

Every implementation task should identify:

- files to inspect
- files allowed to touch
- files not to touch
- definition of done
- verification commands

Do not edit outside the allowed files unless the user explicitly approves it.

If the correct fix requires touching files outside the allowed scope, stop and explain the need before editing.

## VS Code + Codex workflow

Use Codex in VS Code as the default build partner for scoped implementation sessions.

At the start of a session:

- Paste or reference the task goal, allowed files, files not to touch, definition of done, and verification commands.
- Identify the product question before editing.
- Inspect files fresh from the workspace, even when the IDE has tabs open.
- Check whether the requested docs or agent files exist before relying on them.
- Treat unresolved merge markers as blockers to clear in the touched docs before continuing.

During a session:

- Make the smallest useful change that answers the task.
- Keep docs-only work docs-only.
- Do not modify application routes, components, API code, or shared libraries when the task scope is workflow documentation.
- Preserve user edits in the working tree.
- Ask before adding dependencies or expanding scope.

At the end of a session:

- Report files changed.
- Report behavior changed, or explicitly say no application behavior changed.
- Run the requested verification commands when possible.
- Include terminal proof for verification.

## Display contract

For any work that touches profile pages, compare pages, wallet identity, NFT cards, collection cards, artist or creator displays, images, marketplace links, OpenSea links, empty states, or entity click behavior, read the relevant product and implementation docs first.

Required display behavior:

- no hardcoded wallet-specific values
- no naked entities
- image fallbacks
- OpenSea and marketplace link behavior
- truthful labels and confidence
- enrichment budgets
- empty states
- accessibility basics
- profile and compare acceptance criteria

Do not scatter raw OpenSea links across components. Prefer consistent link and helper patterns when available.

OpenSea is the preferred marketplace destination when reliable data exists, but missing OpenSea data must never block the Constellate experience.

## Linkability rule

Every displayed NFT, collection, or artist should link to the deepest reliable destination available.

NFT links:

1. Specific OpenSea NFT URL when contract address and token ID are reliable
2. Collection URL fallback when the NFT URL cannot be built safely
3. No link if the destination is unsafe or uncertain

Collection links:

1. OpenSea collection URL from reliable slug
2. Reliable contract-derived OpenSea collection URL fallback
3. No link if the destination is unsafe or uncertain

Artist or creator links:

1. OpenSea account or creator URL when available
2. Trusted external artist URL from metadata when available
3. No link if attribution is uncertain

Rules:

- Do not invent URLs
- Do not link to misleading destinations
- Do not link artist names to generic search pages unless explicitly designed as a fallback
- Prefer no link over a wrong link
- Any NFT, collection, or artist shown in the UI should support digging deeper when reliable data exists

## Data honesty and confidence

Separate facts from interpretation.

Hard facts include wallet address, token ID, contract address, collection slug, OpenSea URL, NFT count, collection count, and source-supported event timestamps.

Interpretive or confidence-sensitive fields include category classification, artist attribution, acquisition type, collector archetype, recommendations, taste pattern, behavior labels, and recognition language.

Do not present inferred categories, artists, acquisition types, recommendations, or behavioral reads as certain unless the source supports them.

Use fallbacks and careful language when data is incomplete. Prefer language such as:

- appears to
- based on visible wallet activity
- where metadata is available
- unresolved
- unknown

Avoid overclaiming.

## API and data rules

Protect these areas from casual edits:

- API response contracts
- profile and compare route shapes
- NFT fetching and spam or hidden filtering
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

## Converter rule

The wallet converter answers one specific question:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

This is not the same as OpenSea floor-based wallet value.

Do not change the converter into floor-based wallet valuation unless the product question explicitly changes.

Small collection-wide bids should count if they are actionable offers.

Do not filter out small actionable offers merely because they are small.

The correct fix for inflated converter totals is unique NFT deduplication before summing offers, not arbitrary offer filtering.

## Verification

After implementation, run the checks requested in the prompt.

Default checks:

```bash
git diff --name-only
npx tsc --noEmit
git status
```

For broader changes, also run:

```bash
npm run lint
```

For docs-only workflow changes, also check changed docs for merge markers:

```bash
grep -n "<<<<<<\\|=======\\|>>>>>>" AGENTS.md docs/BUILD_LOG.md
```

For API or data changes, include a curl or debug validation when possible.

Terminal output is proof. Do not claim a change is verified unless the verification command was actually run.

## When to return a plan instead of editing

Return a plan first when the task:

- touches more than two files
- changes API response shape
- changes data fetching
- touches OpenSea, Alchemy, or MCP logic
- affects converter math
- affects profile or compare interpretation logic
- introduces new fields
- changes visual hierarchy across a page
- is ambiguous or product-sensitive

A good plan should include:

- likely files involved
- smallest safe implementation path
- risks
- definition of done
- verification commands

## Good implementation behavior

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

---

## Ethical AI guardrails

Read `docs/ETHICAL_AI_BUILDING.md` before changing any AI-assisted feature, interpretation prompt, scoring logic, ranking logic, comparison logic, AI-generated language, or user-facing claim derived from wallet data.

Before implementing, answer:

- What human judgment or interpretation does this affect?
- What evidence supports the claim?
- Who could be misread, excluded, flattened, or harmed?
- What uncertainty needs to be visible?
- Is AI necessary here, or would deterministic logic be safer?
- What proof should appear near the claim?

Do not:

- Present model interpretation as objective fact.
- Infer sensitive identity traits from wallet behavior.
- Rank collectors by worth, taste, status, intelligence, wealth, seriousness, or cultural value.
- Hide uncertainty when data is incomplete.
- Add opaque scores without explaining what they are based on.
- Optimize for engagement at the cost of dignity, accuracy, or user agency.

Prefer:

- Evidence-backed interpretation.
- Human-readable uncertainty.
- User correction or retry where reasonable.
- Debuggable data paths.
- Descriptive language over judgmental language.
- Small, safe, testable changes.
