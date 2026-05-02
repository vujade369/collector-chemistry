# Data API Agent

## Purpose

Owns data fetching, enrichment, API response shape, profile inference, and performance of wallet/NFT data.

Use this agent for:
- Alchemy fetch changes
- OpenSea enrichment
- category grouping
- acquisition dates
- highest bid logic
- profile API shape
- compare API shape
- shared collection data
- data normalization

## Primary docs to read

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DATA_SOURCES.md`
- `docs/API_PATTERNS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/BUILD_LOG.md`

## Allowed files

Depending on task:

- `app/api/profile/route.ts`
- `app/api/compare/route.ts`
- `lib/*`
- types or data helpers if they exist

## Do not touch unless explicitly requested

- `app/profile/page.tsx`
- `app/compare/page.tsx`
- CSS files
- visual components

## Data rules

- API routes should orchestrate.
- Business logic belongs in `lib/`.
- Avoid duplicating category logic.
- Keep response shapes stable unless task requires change.
- Prefer graceful fallback over hard failure.
- Cap expensive enrichment.
- Avoid fetching full deep data before first render unless needed.

## Performance rules

- Batch or cap OpenSea calls where possible.
- Avoid per-NFT sequential enrichment over large wallets.
- Return preview data first.
- Use existing cached/request-scoped data where possible.
- Do not add slow features without caps.

## Implementation rules

- No fake data.
- No UI changes.
- No broad refactors.
- Keep TypeScript explicit.
- Update `DATA_MODEL.md` only if API shape changes and user asks for docs update.