# Collector Chemistry — Agent Entry Point

Before making changes, read:

1. `.agents/ORCHESTRATOR.md`
2. The relevant specialist agent doc
3. The relevant product/spec docs listed by the orchestrator

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