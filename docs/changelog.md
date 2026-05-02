# Changelog

## 2026-05-01
- Reworked `app/profile/page.tsx` and `app/profile/profile.css` into a stronger dossier layout with a composed hero, origin artifact module, upgraded stats hierarchy, richer pattern section, and improved collection card visuals.
- Added a branded profile loading module with rotating status text and lightweight CSS-only neon scan animation.
- Redesigned `app/page.tsx` to match the profile visual system with a restrained dark entry panel, shared input and button styling, and a clearer collector framing.

- Fixed profile origin artifact rendering to read the current nested `profile.firstMint.nft` payload so real NFT imagery and title now display instead of falling back to placeholder states.
- Improved top collection image resolution by using normalized preview imagery keyed by slug, contract, and collection name before falling back to glyph placeholders.
- Polished the homepage shell with a more atmospheric dark-neon dossier entry treatment while preserving the existing input flow and behavior.
