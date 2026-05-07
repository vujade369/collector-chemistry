# Collector Chemistry — Known Issues

A running log of bugs, edge cases, and gotchas discovered during development. Check here before debugging.

---

## Data issues

### Alchemy contract addresses differ from OpenSea
**Status:** Partially fixed (fetchNftAcquiredDate now resolves via slug)
**Symptom:** OpenSea events endpoint returns "Unrecognized address" errors, acquisition dates return null
**Cause:** Alchemy sometimes returns different contract addresses than OpenSea for the same collection, particularly for collections with proxy contracts or wrappers
**Fix:** Resolve correct contract from OpenSea using collection slug before calling events endpoints
**Pattern:** `GET /collection/{slug}/nfts?limit=1` → extract contract field

### ERC-1155 acquisition dates sometimes null
**Status:** Known limitation
**Symptom:** Some NFTs show no acquisition date
**Cause:** ERC-1155 batch transfers (`TransferBatch`) are not always captured by the per-NFT events endpoint
**Workaround:** Display "Date unknown" gracefully rather than showing nothing

### Unix timestamp not converted to ISO string
**Status:** Fixed
**Symptom:** Acquisition dates return null even when events exist
**Cause:** OpenSea returns `event_timestamp` as a Unix integer, not an ISO string. Code was treating it as a string.
**Fix:** Always convert: `new Date(raw * 1000).toISOString()`

### Alchemy acquiredAt field leaking into response
**Status:** Fixed
**Symptom:** `acquiredAt` in API response has shape `{ blockTimestamp: null, blockNumber: null }` instead of string or null
**Cause:** Alchemy NFT objects have a native `acquiredAt` field with block data shape. When NFT objects are spread into the response, this field rides along.
**Fix:** Strip Alchemy `acquiredAt` in `mergeDisplayMetadata`, `buildSharedBuckets`, and `enrichSharedBuckets` using destructuring: `const { acquiredAt: _, ...nft } = rawNft`

---

## UI issues

### CSS import path error
**Status:** Fixed, watch for recurrence
**Symptom:** Build error: `Module not found: Can't resolve './compare/compare.css'`
**Cause:** Codex sometimes writes the wrong import path in `app/compare/page.tsx`
**Fix:** Change `import "./compare/compare.css"` to `import "./compare.css"`

### "Where your paths split" section was showing template sentences
**Status:** Fixed (section removed)
**Symptom:** Section showed repetitive template-style sentences like "Wallet one leans meme, while Wallet two gives less weight there"
**Fix:** Section removed entirely. A missing section is better than a weak one.

### Level numbers on collector profile cards
**Status:** Fixed (removed)
**Symptom:** Profile cards showed "Level 85" which felt gamified and off-brand
**Fix:** Level number removed. Archetype name retained.

---

## Infrastructure issues

### Codex commits not reaching local repo
**Status:** Ongoing pattern to watch
**Symptom:** Codex reports changes committed but `git pull` shows "Already up to date" and changes aren't in files
**Cause:** Codex sometimes commits to its sandbox without pushing, or pushes to a branch that isn't being pulled
**Fix:** After any Codex task, verify with `grep` before trusting the summary. Use `git log --oneline origin/main -5` to check remote commits. When in doubt, apply fixes manually via sed or VS Code.

### Dev server port conflicts
**Status:** Known, easy to fix
**Symptom:** Next.js starts on port 3001 instead of 3000, or "Port already in use" error
**Cause:** A previous dev server process is still running
**Fix:** `kill $(lsof -ti:3000)` then `npm run dev`

### Git patch apply failures
**Status:** Known limitation
**Symptom:** `git apply` fails with "does not match index"
**Cause:** Local file has diverged from what Codex expects
**Fix:** Use `git fetch origin && git reset --hard origin/main` to sync, or replace files manually

---

## Performance issues

### Compare request takes 5-15 seconds
**Status:** Known, acceptable for now
**Cause:** Multiple sequential OpenSea API calls for acquisition dates, collection entry dates, and profile data
**Mitigation:** Parallel fetching with `Promise.allSettled`, 5000ms timeout per call, scope limited to first 3 shared collections
**Future fix:** Consider streaming response or background enrichment

### OpenSea account inventory capped at 60 NFTs
**Status:** Intentional limitation
**Cause:** Fetching more than 60 requires multiple paginated calls which slows the response significantly
**Impact:** Wallets with 60+ NFTs have incomplete data for best offer lookup and collection candidate resolution
**Future fix:** Increase limit or fetch inventory separately in background

---

## Product notes

### "Collector since" date
The date a collector started is the earliest Transfer event in their wallet across all NFTs. This is not yet implemented. When built, use the wallet-level events endpoint with ascending sort.

### First NFT hero moment
Not yet built. Should surface the earliest acquisition in the wallet with the NFT image and date as a visual anchor.

### Acquisition dates in shared collections
Currently null because OpenSea contract address resolution is still being debugged. Once `fetchNftAcquiredDate` correctly resolves slugs to contracts, these should populate.