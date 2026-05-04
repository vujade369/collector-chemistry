# Collector Chemistry — Agent Entry Point

Before making changes, read:

1. `.agents/agents/ORCHESTRATOR.md`
2. The relevant specialist agent doc
3. The relevant product/spec docs listed by the orchestrator

Before making edits, agents must consult `.agents/registry.yaml` when it exists.

Collector Chemistry is a product for reading cultural signal, taste, overlap, and collecting behavior from wallets.

Do not treat this as:
- a finance dashboard
- a marketplace
- a leaderboard
- a generic analytics app

General rules:
- One task = one concern
- Do not mix UI, API, and refactor work unless explicitly requested
- Keep API routes thin
- Prefer existing data before adding new data
- Preserve existing behavior unless the task says otherwise
- Run checks after editing

## Display contract

For any work that touches profile pages, compare pages, wallet identity, NFT cards, collection cards, artist/creator displays, images, marketplace links, OpenSea links, empty states, or entity click behavior, read:

- `docs/DISPLAY_CONTRACT.md`

Follow its rules for:

- no hardcoded wallet-specific values
- no naked entities
- image fallbacks
- OpenSea / marketplace link behavior
- truthful labels and confidence
- enrichment budgets
- empty states
- accessibility basics
- profile and compare acceptance criteria

Do not scatter raw OpenSea links across components. Prefer consistent link/helper patterns when available.

OpenSea is the preferred marketplace destination when reliable data exists, but missing OpenSea data must never block the Collector Chemistry experience.