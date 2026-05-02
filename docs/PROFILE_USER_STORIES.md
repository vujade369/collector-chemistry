# Collector Chemistry — Profile User Stories

## Purpose

This document captures what a curious collector wants from the wallet results page.

Use this when designing, refactoring, or extending the individual profile experience.

The wallet results page should not feel like a static report. It should feel like an interactive collector artifact: something that helps a person recognize their own taste, inspect the proof, and understand how the read was created.

---

## Core collector needs

A curious collector wants to:

1. Recognize themselves
2. Explore their taste
3. Understand their collecting history
4. See proof in actual NFTs
5. Trust the methodology
6. Add more wallets when one address is incomplete
7. Compare with another collector
8. Share something that feels accurate and not cringe

---

## Accuracy principle

Collectors care about accuracy.

Every computed or interpretive result should be able to answer:

- What data was used?
- What does this mean?
- What are the limits?
- What happens if data is missing?

Use info icons, concise tooltips, and methodology notes to make the experience transparent.

Never imply more certainty than the data supports.

---

## User Story 1 — Identity Recognition

### Story

As a collector, I want the page to translate my wallet into a recognizable collector identity, so I can immediately feel like the result is about me and not just my holdings.

### Wants to see

- OpenSea display name, ENS, or shortened wallet
- Profile image / avatar
- Collector archetype
- Short interpretive summary
- Wallet chips if multiple wallets are included

### Wants to click

- Info icon next to the archetype
- Wallet chip
- Profile/avatar source
- Share profile link

### Transparency note

Based on collection mix, repeat collecting behavior, top categories, and strongest collection anchors. This is an interpretive label, not a ranking.

---

## User Story 2 — Multi-Wallet Selfhood

### Story

As a collector with multiple wallets, I want to combine them into one profile, so the result reflects me as a collector rather than one isolated address.

### Wants to see

- Add wallet affordance
- Wallet chips
- Combined holdings count
- Number of wallets included
- Source-wallet context where useful

### Wants to click

- Add wallet
- Remove wallet
- Toggle wallet visibility later
- Set primary wallet later
- Copy combined profile URL

### Transparency note

Combined profiles dedupe NFTs by contract and token ID. Source-wallet context is preserved so you can see which wallet contributed each signal.

---

## User Story 3 — Wallet Source Clarity

### Story

As a multi-wallet collector, I want to know which wallet contributed to each signal, so I can trust the combined profile.

### Wants to see

- Source wallet badges
- “from primary wallet”
- “from vault wallet” if labels exist later
- wallet count indicator

### Wants to click

- Wallet chip
- Filter by wallet
- Show combined
- Show source breakdown

### Transparency note

Signals are calculated from all included wallets, but each NFT keeps its source address. Identical NFTs across included wallets are counted once.

---

## User Story 4 — First Signal / Origin Story

### Story

As a collector, I want to see my first known NFT, so I can understand where this wallet’s collecting story began.

### Wants to see

- First known NFT image
- Token title / number
- Collection name
- Month and year
- Source wallet if multi-wallet

### Wants to click

- View NFT
- View collection
- Info icon explaining how it was found

### Transparency note

Based on the earliest recorded inbound NFT transfer or mint we found for this wallet. Some older transfers may be missing if historical data is incomplete.

### Language rule

Use “First known NFT,” not “First NFT ever.”

---

## User Story 5 — Current Momentum

### Story

As a collector, I want to see my latest arrival, so the profile feels alive and current instead of archival.

### Wants to see

- Most recent NFT image
- Title
- Collection
- Date acquired
- Mint / purchase / transfer label if known

### Wants to click

- View NFT
- View collection
- See recent activity

### Transparency note

Based on the most recent inbound NFT transfer found across supported token standards. Self-transfers may be filtered when source wallets are known.

---

## User Story 6 — Market Attention

### Story

As a collector, I want to know whether anything in my wallet currently has notable bid attention, so I can see what others are noticing without turning the profile into portfolio analytics.

### Wants to see

- Market Attention signal card
- NFT image
- Current best offer
- Collection name
- Token ID

### Wants to click

- View NFT
- View on OpenSea
- Info icon

### Transparency note

We check a capped set of eligible NFTs for current OpenSea best offers. This is not a portfolio value and may return nothing if no active offers are found.

### Language rules

Use:
- Market Attention
- Current best offer
- Someone is watching this

Avoid:
- Most valuable
- Portfolio value
- Best piece
- Investment signal
- ROI

---

## User Story 7 — Taste Overview

### Story

As a collector, I want to see the broad shape of my taste, so I can understand what my wallet leans toward.

### Wants to see

- Taste map visual
- Top categories
- Percentages
- Primary taste signal
- “Other” handled honestly

### Wants to click

- Category slices
- Legend rows
- Info icon explaining classification

### Transparency note

Categories are inferred from collection metadata when available, with fallback classification when metadata is missing. “Other” means we could not confidently classify the collection.

---

## User Story 8 — Taste Drill-Down

### Story

As a collector, I want to click into a taste category and see the NFTs and collections inside it, so the taste map becomes explorable instead of abstract.

### Wants to see

- Category count
- NFT previews
- Top collections in that category
- Representative thumbnails
- Source wallet if multi-wallet

### Wants to click

- Category card
- NFT preview
- Collection name
- Show more

### Transparency note

Category drawers show a capped preview, not every NFT. Counts reflect the full category; thumbnails are representative examples.

---

## User Story 9 — Collection Anchors

### Story

As a collector, I want to see the collections I return to most, so I can understand my strongest anchors.

### Wants to see

- Ranked collections
- Collection image
- Count owned
- Percent of wallet
- Category tag if available
- Small progress indicator

### Wants to click

- Collection row/card
- Owned NFT previews
- View on OpenSea

### Transparency note

Ranked by how many pieces you currently hold from each collection. This favors repeat collecting and may not reflect personal importance or market value.

---

## User Story 10 — Collection Detail

### Story

As a collector, I want to click into a collection and see my pieces, so I can understand my relationship with that collection.

### Wants to see

- Owned NFT grid
- First piece from the collection
- Latest piece from the collection
- Total owned
- Source wallet if multi-wallet
- Entry date if available

### Wants to click

- NFT
- View on OpenSea
- Collection timeline
- Filter by wallet

### Transparency note

Collection depth is based on NFTs currently held. Sold or transferred pieces may not appear unless historical mode is added later.

---

## User Story 11 — Artist Signal

### Story

As a collector, I want to see which artists appear repeatedly in my wallet, so I can understand whose work I keep responding to.

### Wants to see

- Artist names
- Artist avatar if available
- Count of pieces
- Collections connected to the artist
- Representative works

### Wants to click

- Artist profile
- Artist’s works in wallet
- Shared artists in compare later

### Transparency note

Artist attribution depends on available creator and collection metadata. Some projects may not expose reliable artist-level data.

---

## User Story 12 — Collecting Behavior

### Story

As a collector, I want to understand whether I mostly mint, buy, hold, or rotate, so I can see my behavior style beyond category labels.

### Wants to see

- Minted vs acquired
- Repeat collecting
- Broad vs concentrated collecting
- Holdings count vs collection count

### Wants to click

- How calculated?
- Minted examples
- Acquired examples
- Behavior tags

### Transparency note

Minted/acquired is inferred from transfer history when available. Some marketplace purchases or older transfers may be classified imperfectly.

---

## User Story 13 — Breadth vs Depth

### Story

As a collector, I want to see whether I spread across many collections or go deep in a few, so I can understand my collecting style.

### Wants to see

- Total collections
- Repeat pockets
- Largest holding concentration
- Breadth/depth label

### Wants to click

- Repeat pockets
- Top anchors
- Distribution explanation

### Transparency note

Breadth/depth is based on total holdings, number of collections, and repeat pockets. It is descriptive, not a quality judgment.

---

## User Story 14 — Representative Pieces

### Story

As a collector, I want to see a curated set of representative NFTs, so I can quickly understand the visual personality of the wallet.

### Wants to see

- 6–12 representative NFTs
- Collection names
- Category coverage
- Why each piece was selected

### Wants to click

- NFT detail
- Why this piece?
- View source

### Transparency note

Representative pieces are selected from top collections, category coverage, and available images. They are not selected by market value.

---

## User Story 15 — Surprises and Easter Eggs

### Story

As a collector, I want small discoveries or easter eggs, so the page feels fun and worth exploring.

### Wants to see

- Unexpected category mix
- Meme-number callouts
- Rare pattern callouts
- Collection oddities
- Cultural references when appropriate

### Wants to click

- Show me why
- Related NFTs
- Surprise callout

### Transparency note

Surprise callouts are generated from visible wallet patterns like counts, category combinations, repeated collections, and timing. They are playful, not definitive.

---

## User Story 16 — Result Confidence

### Story

As a collector, I want to know how reliable each result is, so I can trust the page without overreading it.

### Wants to see

- Info icons
- Data source notes
- “based on X holdings”
- unavailable metadata labels

### Wants to click

- Methodology
- Data sources
- Category explanations
- Confidence notes

### Transparency note

Reads are based on public wallet data and available collection metadata. Some fields may be incomplete due to API limits, missing metadata, hidden items, or marketplace offer data.

---

## User Story 17 — Adding a Wallet Changes the Read

### Story

As a collector, I want to add another wallet and see what changes, so I understand how my full profile differs from one wallet alone.

### Wants to see

- Added holdings
- Changed top categories
- Changed archetype
- New signals
- Updated top collections

### Wants to click

- Add wallet
- Remove wallet
- Compare single vs combined later

### Transparency note

Adding a wallet recalculates the profile using all included holdings. Identical NFTs are deduped, and source-wallet attribution is preserved.

---

## User Story 18 — Temporary Wallet Exclusion

### Story

As a collector, I want to temporarily exclude a wallet, so I can test different versions of my collector profile.

### Wants to see

- Wallet chips with active states
- Remove control
- Recalculated profile

### Wants to click

- Toggle wallet
- Remove wallet
- Reset

### Transparency note

Toggling or removing a wallet changes the current calculation only. It does not verify ownership or persist anything beyond the session unless encoded in the URL.

---

## User Story 19 — Compare With Another Collector

### Story

As a collector, I want to enter another collector’s wallet, so I can see where our worlds overlap.

### Wants to see

- Compare CTA
- Second wallet input
- Copy that frames comparison as resonance, not ranking

### Wants to click

- Compare wallet
- Share current profile first
- Copy profile link

### Transparency note

Comparisons look for exact NFT overlap, shared collections, shared artists, and category proximity. They are about resonance, not ranking.

---

## User Story 20 — Shareable Result

### Story

As a collector, I want a result that feels good to share, so I can send it to friends or post it without it feeling like a spreadsheet.

### Wants to see

- Strong hero
- Share profile link
- Copyable summary
- Screenshot-friendly layout
- No embarrassing overclaiming

### Wants to click

- Copy profile link
- Copy summary
- Share image later

### Transparency note

Shared links show the public wallet read. Do not include private assumptions or anything not derived from public wallet data.

---

## Highest-value clickable areas

The wallet results page should prioritize clickability around:

- Wallet chips
- Add wallet
- First known NFT
- Market Attention
- Latest Arrival
- Taste categories
- Category drawer NFTs
- Top collections
- Top artists
- Methodology / info icons
- Compare CTA
- Share profile link

---

## Product implication

The profile page should support two modes:

### Surface mode

Fast, visual, rewarding:
- identity
- key signals
- taste map
- top collections
- compare CTA

### Explanation mode

Optional depth:
- info icons
- drawers
- source notes
- methodology
- source-wallet attribution

The page should feel exciting first, then trustworthy when inspected.