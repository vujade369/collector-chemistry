---
tags: [constellate, build, session]
status: active
note_type: build-session
owner: Trevor
date: 2026-05-07
visibility: internal
---

# Build Session — 2026-05-07
## Loading Screen: Wallet Preview Images

## What I am trying to do

Add a non-blocking preview layer to the loading screen that displays 12 NFT thumbnails from the wallet while the full profile builds, so the wait feels like the collection surfacing rather than a spinner.

---

## Before touching anything

Run this inspection prompt in Codex first. Do not skip it.

Inspect the current loading screen and profile fetch flow and tell me:
1. Where the loading screen is rendered (file path and component name)
2. What triggers the loading state and what dismisses it
3. What the current fastest NFT data source is and where that call lives
4. Whether there is already a preview or partial fetch endpoint, or if all wallet data comes from a single /api/profile call
5. What NFT fields are returned earliest in the pipeline

Do not change anything. Return a plain summary only.

Review the output before proceeding. If all wallet data comes from a single blocking call, that changes step 1 of the plan.

---

## Files allowed to touch

- The loading screen component (confirm path from inspection above)
- A new file: lib/preview/walletPreview.ts (to be created)
- API route for preview endpoint (likely app/api/profile/preview/route.ts)

## Files not to touch

- /api/profile and anything inside it
- Any category, scoring, or chemistry logic
- buildWalletAcquiredMap() or acquisition date logic
- Any OpenSea or Alchemy fetch functions shared with the main profile pipeline
- Results page components

## Definition of done

- Loading screen shows up to 12 NFT thumbnails while the full profile is building
- Thumbnails are fetched in parallel with the main profile call, not before or instead of it
- If the preview fetch fails or times out, loading screen degrades gracefully (spinner only, no error)
- Images are lazy-loaded and capped at 12
- Main profile load time is not measurably slower
- npx tsc --noEmit passes with no new errors
- No new fields or shapes added to the main /api/profile response

---

## Plan

1. Run the inspection prompt above. Confirm the loading component path, what triggers/dismisses the loading state, and where the fastest NFT data currently enters the pipeline.

2. Create lib/preview/walletPreview.ts. Export a single async function: getWalletPreviewImages(wallet: string): Promise<PreviewNFT[]>. Shape: { imageUrl: string; name: string; collectionName: string }. Use the existing fastest NFT source. Hard cap at 12 results. Return image URL, name, and collection name only. Set a 2 second timeout. If exceeded, return an empty array. Catch and suppress all errors. This function should never throw.

3. Create a preview API route at app/api/profile/preview/route.ts. Accepts ?wallet= param. Calls getWalletPreviewImages(wallet). Returns { images: PreviewNFT[] }. No auth, no enrichment, no interpretation.

4. In the loading screen component: fire the preview fetch in parallel with the main profile call on mount. Do not await the preview before starting the main call. Store preview images in local component state. Render thumbnails as they arrive, small, partially visible, drifting or fading in. If images is empty, render nothing extra.

5. Animation guidance: thumbnails should feel ambient, not structured. Absolute-positioned, varying opacity 0.4 to 0.8, slight blur on outer ones, slow drift or gentle fade-in stagger. No labels, no hover states, no interactivity. Images should not snap or shift when results load.

6. Run verification commands. Load 3 to 5 different wallets and confirm the loading screen shows images, the profile still loads at the same speed, and a dead wallet shows a clean fallback.

---

## What happened

What changed:

What worked:

What did not work:

What to do next:

---

## Commit message

git commit -m "add non-blocking wallet preview thumbnails to loading screen"

---

## Verification

- [ ] npx tsc --noEmit passed
- [ ] git diff --name-only only shows expected files
- [ ] App runs locally
- [ ] No unintended files changed
- [ ] Loading screen shows NFT thumbnails on a real wallet load
- [ ] Preview fetch failure returns empty array without error
- [ ] Main profile load time is not measurably slower
- [ ] Loading screen degrades to spinner-only if preview returns nothing
- [ ] No changes to /api/profile response shape
