# Changelog

## 2026-05-02

- Added `docs/OPENSEA_INTEGRATION.md` with OpenSea `llms.txt`, OpenAPI, local skill/script workflow boundaries, runtime rules, performance constraints, and marketplace/display integration guidance.
- Updated the wallet converter to use detected active wallet offers divided by target collection floor.
- Limited converter offer math to wallet-owned NFTs and ETH/WETH-denominated offers.
- Updated converter search to prioritize usable canonical OpenSea collection results with floor data over null-floor lookalikes.
- Updated converter UI copy to show detected offer value, target floor, estimated reach, offer coverage, and clearer error states.
## 2026-05-01
- Redesigned `app/profile/page.tsx` and `app/profile/profile.css` into a dark collector dossier layout with section order: Hero, Stats, Pattern, Key Signals, Collected Works, Top Collections, and Compare CTA.
- Updated profile visuals to use API-backed category distribution for Taste Map and Taste DNA bars with graceful fallbacks for missing fields.
- Added first minted NFT featured placement using existing `profile.firstMint` response data with fallback state when unavailable.
- Profile polish pass 2: applied multi-accent hierarchy across stats, Taste DNA, key signals, and collection progress bars; tightened hero visual weight and first-mint empty state; moved Add Another Wallet input block near compare action.
