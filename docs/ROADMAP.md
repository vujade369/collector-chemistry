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
- hide or soften “Other”
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
- `NFTTile`
- `TasteMap`
- `SectionCard`
- `CoreSignals`
- `CategoryDrilldown`

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

**Shared worlds, different expressions.**

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

```txt
Wallet 1 NFTs        Shared Collection        Wallet 2 NFTs