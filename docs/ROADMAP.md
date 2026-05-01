# Collector Chemistry — Roadmap

## Purpose

This is the current product build sequence.

Use this to avoid solving future phases too early.

This roadmap is not a promise of everything to build.

It is a sequencing tool for agents and humans.

---

## Current build principle

Profile first.
Compare second.
Social layer later.

Do not solve future phases inside current-phase tasks.

---

## Phase 1 — Individual Profile

Goal:
Make the individual wallet profile feel like a complete collector readout.

The profile should help a collector understand:
- where their taste lives
- what they return to
- how they collect
- what their strongest anchors are
- where their wallet has momentum
- what their collection seems to reveal

Includes:
- collector identity
- stats row
- archetype / interpretation
- taste map
- category drill-down
- core signals
- top collections
- representative holdings
- compare CTA

Status:
In progress.

Primary agent:
- Product UI Agent

Supporting agent when data is missing:
- Data API Agent

---

## Phase 2 — Profile Data Depth

Goal:
Improve the profile API/data layer to support richer profile UI.

Possible additions:
- category groups
- most recent acquisition
- first mint reliability
- highest bid / market attention
- stronger collection images
- better profile metadata
- better category normalization

Do not add all at once.

Preferred sequence:
1. categoryGroups
2. mostRecentAcquisition
3. highestBid / marketAttention
4. stronger collection/profile image enrichment
5. reliability cleanup

Primary agent:
- Data API Agent

Supporting agent after data exists:
- Product UI Agent

---

## Phase 2.5 — Delight Layer

Goal:
Add a set of lightweight, high-delight features that make the profile feel alive,
surprising, and fun to explore. These are not core analytics. They are moments
of discovery that make someone want to share what they see.

All three features load lazily on user interaction. None of them affect
initial profile load time.

---

### Feature A — Wallet Converter

The idea:
Show how many NFTs from any collection a collector could theoretically get
if they traded in their entire wallet at current floor prices.

This is not financial advice. It is a toy. It should feel playful.

Framing:
"If you traded it all in... you could get X Pudgy Penguins."

How it works:
- Estimate wallet value using floor prices of held collections
- User searches for any target collection by name
- System fetches that collection's current floor price from OpenSea
- Output: wallet value divided by floor price = count of that NFT
- Never display raw ETH or dollar amounts to the user
- The math stays behind the scenes
- The output is just the count and the collection name

Data required:
- Floor prices for held collections (OpenSea: GET /collections/{slug} stats.floor_price)
- Collection search as user types (OpenSea: GET /collections?collection_name=...)
- Floor price of the target collection

Performance rules:
- Load on interaction only, never on initial profile load
- Do not fetch floor prices until the user opens this section
- Cache collection search results per session

Status: Planned

---

### Feature B — Activity Timeline

The idea:
Show collecting activity broken down by month so a collector can see
when they were most active, what seasons they tend to move in, and how
their behavior has shifted year over year.

Rooted in real transfer event data. Interpretive, not financial.

What to show:
- Bar or spark chart: NFTs acquired per month
- Grouped by year for year-over-year comparison
- Busiest month callout ("Your biggest month was March 2022")
- Optional split by mint vs secondary acquisition

Framing:
This should feel like a Spotify Wrapped moment, not a spreadsheet.
Highlight the peaks. Name them. Let the pattern speak.

Data required:
- Transfer events for the wallet (OpenSea: GET /events/accounts/{address}?event_type=transfer)
- event_timestamp bucketed into month/year
- Null-address check to distinguish mints from secondary buys

Performance rules:
- Cap at most recent 500 events for V1
- Load lazily on section reveal
- Transfer event fetching runs independently from profile load

Status: Planned

---

### Feature C — Collection Recommendations

The idea:
Suggest 10 NFT collections a collector might like based on their existing
wallet signals, filtered by a price range they choose.

Cultural signal, not a marketplace upsell.

Framing:
"Based on what you collect, you might like these."

How it works:
- Infer taste signals from wallet: category lean, ecosystem, top collections
- Cross-reference with collections that have meaningful unique collector overlap
- Filter by: unique collector percentage above 40% (signals genuine community)
- User selects a price range: Under 0.1 ETH / 0.1-0.5 ETH / 0.5-2 ETH / 2 ETH+
- Return 10 collection suggestions

What makes a good recommendation:
- Category or ecosystem alignment with the collector's taste
- Strong unique collector base (not wash-traded or flip-driven)
- Floor price within the selected range
- Not already held by the collector

What this is not:
- A marketplace
- A financial recommendation
- A ranking by value or rarity

Data required:
- Collector's taste signals from profile API
- OpenSea collection stats: floor_price, num_owners, total_supply
- Unique collector ratio: num_owners / total_supply

Performance rules:
- Compute server-side, not in real time on the client
- Cache results per wallet per day
- Price range filter applies after the initial set is computed

Status: Planned

---

## Phase 3 — Category Drill-Down

Goal:
Make the taste section interactive and exploratory.

The category drill-down should feel like:

> tap into a part of your taste and see what lives there.

Includes:
- category cards
- one open drawer at a time
- NFT previews inside drawer
- collection breakdown inside drawer
- show top categories first
- hide or soften "Other"
- graceful fallback when category groups are missing

Primary agent:
- Product UI Agent

Supporting agent if categoryGroups are missing:
- Data API Agent

---

## Phase 4 — Component Cleanup

Goal:
Extract only the components that have proven useful.

Likely candidates:
- NFTTile
- TasteMap
- SectionCard
- CoreSignals
- CategoryDrilldown

Do not extract everything at once.

Do not create a broad component system before real reuse exists.

Primary agent:
- Code Health Agent

---

## Phase 5 — Compare Redesign

Goal:
Redesign compare around the Chemistry Bridge direction.

The compare page should feel like two collectors entering the same frame.

Includes:
- result hero
- bridge stats
- shared-world spotlight
- exact overlap
- shared artists
- taste comparison
- concise interpretation

Core idea:

Shared worlds, different expressions.

Primary agent:
- Product UI Agent

Supporting agent when response data is missing:
- Data API Agent

---

## Phase 6 — Shared-World System

Goal:
Make shared collections the defining compare experience.

Includes:
- center collection card
- wallet NFTs on each side
- collection image
- collection name
- entry dates
- owned counts
- depth indicator
- expandable NFT previews
- clickable NFTs and collections where available

Desktop direction:

Wallet 1 NFTs        Shared Collection        Wallet 2 NFTs

Mobile direction:

Shared Collection
Wallet 1 NFTs
Wallet 2 NFTs

---

## Future Phase — Multi-Wallet Collector Profiles

Goal:
Allow a collector profile to represent one person across multiple wallets.

Why:
Many collectors use more than one wallet. A single wallet may not fully
represent their collecting behavior.

Conceptual model:
- wallet = address
- collector = one or more wallets

The app should eventually support:
- adding multiple wallets to one profile
- merging holdings across wallets
- deduping NFTs by contract + tokenId
- preserving source wallet metadata
- showing which wallets contributed to each signal
- comparing collector profiles made from multiple wallets

Guardrails:
- do not build this before single-wallet profile and compare are stable
- do not lose source-wallet context when merging
- do not treat multiple wallets as verified identity unless the user supplies them
- keep privacy/respect framing clear