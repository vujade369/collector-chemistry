# Changelog

## 2026-05-02

- Added `docs/OPENSEA_INTEGRATION.md` with OpenSea `llms.txt`, OpenAPI, local skill/script workflow boundaries, runtime rules, performance constraints, and marketplace/display integration guidance.
- Updated the wallet converter to use detected active wallet offers divided by target collection floor.
- Limited converter offer math to wallet-owned NFTs and ETH/WETH-denominated offers.
- Updated converter search to prioritize usable canonical OpenSea collection results with floor data over null-floor lookalikes.
- Updated converter UI copy to show detected offer value, target floor, estimated reach, offer coverage, and clearer error states.
- Added converter debug output for checked candidates, found offers, and skip counts when using `debug=1`.

## 2026-05-01

- Added OpenSea-backed display enrichment for visible profile entities, including top collection metadata, wallet identity fields, and NFT/collection destination links.
- Enriched profile display data so top collections, signal pieces, anchor collections, and origin artifacts can render images and links when available.
- Fixed hero origin artifact rendering so the hero and Key Signals use the same normalized origin image source.
- Fixed stat-row fallback labeling so anchor/top collection fallbacks are not mislabeled as Market Attention.
- Refined the profile page into a stronger dark dossier composition with improved hero layout, image-forward Key Signals, richer Top Collections cards, and restored clickable category exploration.
- Styled the “If you sold it all...” module so it no longer appears as raw/default HTML.
- Updated primary Key Signals to show origin, highest current offer, and latest arrival while preserving signalPiece and anchorCollection as supporting profile data.

