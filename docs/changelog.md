# Changelog

## 2026-05-01
- Reworked `app/profile/page.tsx` and `app/profile/profile.css` into a stronger dossier layout with a composed hero, origin artifact module, upgraded stats hierarchy, richer pattern section, and improved collection card visuals.
- Added a branded profile loading module with rotating status text and lightweight CSS-only neon scan animation.
- Redesigned `app/page.tsx` to match the profile visual system with a restrained dark entry panel, shared input and button styling, and a clearer collector framing.

## 2026-05-02
- Enriched profile entity display fields in `lib/walletProfile.ts` so top collections, first mint, signal piece, and anchor collection can carry image, slug, contract, category, and OpenSea link metadata from existing wallet NFTs.
- Updated `app/profile/page.tsx` to consume enriched collection and signal fields, prefer API-provided image/link fields, and apply local image error fallback behavior.

## 2026-05-02
- Added a focused OpenSea-backed profile display enrichment layer in `app/api/profile/route.ts` with request-scoped caching, per-lookup timeout fallbacks, and capped top-collection enrichment.
- Enriched profile response display fields for wallet identity and visible entities so top collections and key signals can carry OpenSea-ready image and destination URL fields when reliable.
- Updated profile key signal cards in `app/profile/page.tsx` and `app/profile/profile.css` to render thumbnails and OpenSea links when available, with designed fallbacks when data is missing.

## 2026-05-02
- Fixed profile hero origin artifact rendering to use the same enriched origin image source used in Key Signals, including nested first-mint image fallback paths.
- Fixed stat-row source labeling so collection fallbacks are labeled as Anchor Collection or Top Collection instead of Market Attention.

## 2026-05-02
- Refined profile dossier visuals across hero, key signals, top collections, compare CTA, and overall spacing without changing API or data logic.
- Restored clickable taste category exploration using existing `categoryGroups` preview data, with an in-page Category Explorer that reveals preview entities and collection links.
- Restyled the wallet converter module as an intentional experimental card so it no longer appears as raw default HTML.
