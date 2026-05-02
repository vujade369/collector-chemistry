# Collector Chemistry — Transparency and Methods

## Purpose

This document defines how Collector Chemistry explains computed results, data sources, confidence, and limitations.

Use this when adding:

- info icons
- tooltips
- methodology drawers
- computed labels
- profile signals
- compare signals
- category explanations
- market attention
- multi-wallet support

Transparency is part of the product.

Collectors should be able to understand why a result appears without reading a technical report.

---

## Core principle

Never imply more certainty than the data supports.

Collector Chemistry reads public wallet data and available NFT metadata. Some signals are incomplete because NFT APIs, marketplace data, collection metadata, and transfer history are not always consistent.

The product should feel confident, but not falsely precise.

---

## Language rules

Use cautious, accurate language.

Prefer:
- First known NFT
- Collector since
- Market Attention
- Current best offer
- Representative pieces
- Category signal
- Taste map
- Strongest collection anchor
- Repeat pocket
- Based on visible holdings
- Available metadata

Avoid:
- First NFT ever
- Most valuable
- Best piece
- True identity
- Portfolio value
- Net worth
- Investment strength
- Guaranteed
- Definitive
- Complete history

---

## Info icon system

Use info icons for computed or interpretive results.

Info icons should appear near:

- Collector archetype
- First known NFT
- Collector since
- Market Attention
- Taste Map
- Category labels
- Top Collections
- Minted / Acquired
- Representative Pieces
- Combined Wallets
- Compare score / chemistry later

Do not place info icons next to every label. Use them where users are likely to ask “how did you get this?”

---

## Tooltip behavior

### Desktop

- Hover or click opens a small tooltip.
- Tooltip should not block the main content.
- Tooltip closes on mouse leave, click outside, or Escape.

### Mobile

- Tap opens a small popover or bottom sheet.
- Tooltip must be readable on narrow screens.
- Avoid hover-only interactions.

---

## Tooltip writing rules

Tooltips should:

- be one to two sentences
- explain data source briefly
- mention limits honestly
- avoid defensive language
- avoid heavy technical language
- avoid long API explanations
- never overclaim

A tooltip should answer:

1. What does this mean?
2. How did we calculate or infer it?
3. What are the limits?

---

## Example tooltip copy

### Collector Archetype

Based on collection mix, repeat collecting behavior, top categories, and strongest collection anchors. This is an interpretive label, not a ranking.

---

### First Known NFT

Based on the earliest recorded inbound NFT transfer or mint we found for this wallet. Some older transfers may be missing if historical data is incomplete.

---

### Collector Since

Uses the month and year of the earliest known NFT event we found for this wallet. This may not capture activity outside supported NFT transfer data.

---

### Market Attention

We check a capped set of eligible NFTs for current OpenSea best offers. This is not a portfolio value and may return nothing if no active offers are found.

---

### Taste Map

Built from collection-level category metadata when available, with fallback classification for uncategorized collections.

---

### Category Drawer

Category previews show a capped sample of NFTs from this category. Counts reflect the full category; thumbnails are representative examples.

---

### Top Collections

Ranked by how many pieces you currently hold from each collection. This favors repeat collecting and does not imply market value.

---

### Minted / Acquired

Minted and acquired behavior is inferred from transfer history when available. Some marketplace purchases or older transfers may be classified imperfectly.

---

### Representative Pieces

Representative pieces are selected from collection anchors, category coverage, and available images. They are not selected by market value.

---

### Combined Wallets

Combined profiles dedupe NFTs by contract and token ID. Source-wallet context is preserved so you can see which wallet contributed each signal.

---

### Compare Chemistry

Comparisons look at exact NFT overlap, shared collections, shared artists, and taste proximity. Chemistry means resonance, not ranking.

---

## Page-level methodology footer

A short note should eventually appear near the bottom of the profile page:

Collector Chemistry reads public wallet data and available collection metadata. Some signals may be incomplete because NFT metadata, transfer history, hidden items, and marketplace offer data are not always consistent.

Link text:
- Methodology
- How this works
- About this read

The link can later open a drawer or route to a methodology page.

---

## Source labels

When possible, important fields should have source labels.

Examples:

- OpenSea profile image
- Alchemy holdings
- OpenSea category metadata
- OpenSea best offer
- Transfer history
- Fallback classification

Do not show all source labels by default. Use them in tooltips, drawers, methodology details, and debug views.

---

## Confidence and fallback language

Use light fallback language when data is incomplete.

Examples:

- “No active offer detected”
- “No recent arrival detected”
- “Category unavailable”
- “Image unavailable”
- “Artist data unavailable”
- “Transfer history incomplete”

Avoid:
- “None”
- “Failed”
- “Unknown error”
- “No data”
- “N/A”

The page should feel graceful when a signal is missing.

---

## Market Attention rules

Market Attention is a signal, not a valuation.

Allowed:
- Market Attention
- Current best offer
- Strongest detected offer
- Someone is watching this

Avoid:
- Most valuable
- Highest value
- Portfolio value
- Floor value
- Net worth
- Profit
- ROI

Rules:
- Hide Market Attention if unavailable.
- Do not show empty market cards.
- Do not estimate value.
- Do not sum offers.
- Do not imply the whole wallet has a value.

---

## First Known NFT rules

Use “First known NFT” because data may be incomplete.

Rules:
- Use the earliest reliable NFT event found.
- Prefer month + year.
- Show image, token, and collection if available.
- Do not claim it is the collector’s first NFT ever.
- If no timestamp is available, omit the date.

---

## Taste category rules

Categories can be imperfect.

Rules:
- Prefer OpenSea collection-level category metadata.
- Use fallback classification only when necessary.
- Keep “Other” when classification confidence is low.
- Do not over-explain categories in the main UI.
- Use info icons for classification method.

---

## Multi-wallet transparency

Multi-wallet profiles must be explicit.

Rules:
- Show number of wallets included.
- Preserve source-wallet metadata.
- Do not imply ownership verification.
- Do not infer related wallets.
- Do not auto-discover wallets.
- Use user-provided wallets only.

Tooltip:

This profile combines wallets you entered. We do not verify ownership or infer related wallets.

---

## Privacy and respect

Collector Chemistry reads public data, but should not feel invasive.

Do:
- frame results as interpretation
- respect uncertainty
- let users inspect methodology
- avoid exposing unnecessary details

Do not:
- infer private identity
- imply hidden wallet relationships
- shame collections
- rank collectors by value
- treat public data as permission to be invasive

---

## Future methodology page

A future methodology page may include:

- data sources
- profile signal definitions
- category classification
- first known NFT method
- market attention method
- multi-wallet merge method
- compare method
- limitations

Do not build this page until the product surfaces are more stable.

This doc is the source for that future page.