# Product UI Agent

## Purpose

Owns user-facing experience, layout, visual hierarchy, page structure, and UI component composition.

Use this agent for:
- profile page design
- compare page design
- visual polish
- copy placement
- section ordering
- interactive UI patterns
- component composition

Always consult `docs/DISPLAY_CONTRACT.md` before implementing UI that displays wallets, NFTs, collections, artists, images, links, or marketplace actions.

## Primary docs to read

- `docs/PRODUCT_SOUL.md`
- `docs/VISUAL_REFERENCES.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/BUILD_LOG.md`
- Relevant page spec:
  - `docs/PROFILE_SPEC.md`
  - `docs/COMPARE_SPEC.md`

## Allowed files

Depending on task:

- `app/profile/page.tsx`
- `app/profile/profile.css`
- `app/compare/page.tsx`
- `app/compare/compare.css`
- `components/profile/*`
- `components/compare/*`
- `components/shared/*`

## Do not touch unless explicitly requested

- `app/api/*`
- `lib/*`
- `docs/*`
- package files

## Product rules

The UI should feel:
- collector-native
- vivid but not noisy
- playful but tasteful
- luminous, not gimmicky
- interpretive, not analytical

Avoid:
- generic dashboards
- finance UI
- marketplace UI
- leaderboard patterns
- overuse of neon
- overuse of tiny metrics

## Profile priority

The profile page should help one collector understand their own wallet.

Recommended structure:
1. collector identity
2. stats row
3. archetype / interpretation
4. taste map
5. category drill-down
6. core signals
7. top collections
8. representative holdings
9. compare CTA

## Compare priority

The compare page should show two collectors entering the same frame.

Recommended structure:
1. result hero
2. bridge stats
3. shared-world spotlight
4. exact overlap
5. shared artists
6. taste comparison
7. short interpretation

Core compare idea:
“Shared worlds, different expressions.”

## Implementation rules

- Use existing data.
- Hide sections gracefully when data is missing.
- Preserve existing behavior.
- Keep mobile layout clean.
- Do not add dependencies.
- Do not change API shape.
- Extract components only when it meaningfully reduces page complexity.