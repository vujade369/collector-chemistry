# Build Log

## Current State

* Comparison page working
* NFTs are fetched and displayed
* Shared collections logic exists
* UI showing overlap visually

## Recent Decisions

* "Signature piece" → replaced with "Top Collection"
* Shared display priority:

  1. Exact same NFTs
  2. Shared collections
  3. Shared artists
* Max 4 NFTs per wallet per shared collection

## Known Issues

* route.ts too large
* page.tsx too large
* repeated logic across files
* slow iteration due to lack of structure
* Collection slug/display-name normalization is still fragile
* Date or time-based NFT pipeline behavior may be unreliable
* Profile page is not yet fully built
* route.ts and page.tsx are too large and should not be expanded casually
* npm run lint currently fails due to pre-existing issues, including app/api/test/route.ts using any

## Next Focus

* Clean data flow
* Strengthen collector profile layer
* Avoid UI redesign until structure is stable
