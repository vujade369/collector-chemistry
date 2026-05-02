# Collector Chemistry — Profile Experience Spec

## Purpose

This document defines the wallet results page experience.

Use this when changing:

- `app/profile/page.tsx`
- `app/profile/profile.css`
- profile components
- profile section order
- profile interactions
- profile CTAs

The goal is to make the wallet results page feel like a collector profile, not a dashboard.

---

## Core idea

The wallet results page helps a collector recognize, explore, and trust the pattern inside their wallet.

It should answer:

1. Who is this collector?
2. What are their strongest signals?
3. Where did the story begin?
4. What is their taste made of?
5. Which collections and artists prove the read?
6. Who else might overlap?

---

## Experience arc

The page should move through this arc:

1. Recognition
2. Origin
3. Signals
4. Taste
5. Proof
6. Connection

This is the emotional order of the page.

Do not organize the page around data availability alone.

---

## Preferred page zones

### 1. Collector Hero

Purpose:
Create immediate recognition.

Answers:
- Who is this collector?
- What kind of collector are they?
- What wallets are included?

Shows:
- OpenSea avatar or fallback avatar
- OpenSea display name / ENS / shortened wallet
- collector archetype or class
- short wallet address
- one-sentence summary
- wallet count indicator if multi-wallet
- add-wallet affordance if supported

Rules:
- Identity should feel personal.
- Address should be shortened by default.
- Full address can appear in tooltip or copy action later.
- The hero should not feel like a plain page header.
- Do not use generic SaaS avatar treatment if OpenSea image exists.

---

### 2. Origin + Snapshot

Purpose:
Orient the collector quickly.

Answers:
- How large is this profile?
- How many collections?
- When did the collecting story begin?

Shows:
- total holdings indexed
- collection count
- collector since / first known mint label
- first known NFT card

Rules:
- Use month + year when available.
- Use “First known NFT,” not “First NFT ever.”
- If first known NFT has image, show it.
- If image is missing, use a tasteful placeholder.
- If no reliable first mint data exists, hide the origin card or use “Unknown.”

---

### 3. Key Signals

Purpose:
Show the few signals that define the wallet.

Possible signal cards:
- First known NFT
- Market Attention
- Latest Arrival
- Signal Piece / Anchor Collection
- Top Collection
- Collecting Style

Rules:
- Do not show empty cards.
- Hide missing signals gracefully.
- Do not show duplicate cards if two signals point to the same object.
- If Market Attention exists, it may become the primary signal.
- Do not call Market Attention “most valuable.”
- If Market Attention is null, hide it.
- Signal cards should feel object-based and image-forward.

Recommended labels:
- First Known NFT
- Market Attention
- Latest Arrival
- Signal Piece
- Anchor Collection
- Collecting Style

Avoid:
- Most Valuable
- Portfolio Value
- Best NFT
- Investment Signal

---

### 4. Interpretation Statement

Purpose:
Make the wallet feel understood.

Answers:
- What is the human read?
- What pattern does the wallet reveal?
- How should the collector interpret the data?

Shows:
- interpretive headline
- concise paragraph
- behavioral tags
- minted/acquired behavior if available

Rules:
- This section should feel like the emotional read of the page.
- It should not feel like another generic metric card.
- It can sit below the hero/signals so users see proof before interpretation.
- Keep the copy grounded and specific.
- Speak directly to the collector.

Recommended treatment:
- Larger headline
- More breathing room
- subtle accent line or background shift
- behavioral tags below the copy
- minted/acquired bars folded in if available

---

### 5. Taste System

Purpose:
Make taste visible and explorable.

Answers:
- What is this wallet’s taste made of?
- What lives inside each category?
- Which categories carry the most weight?

Shows:
- taste map
- top category legend
- category percentages
- category explorer
- preview NFTs
- top collections inside each category

Rules:
- Taste map is the overview.
- Category drawer is the exploration layer.
- These should live together in one section.
- On wider layouts, taste visual and legend can sit side by side.
- On mobile, stack taste visual above legend.
- Keep category drawer behavior intact.
- Do not over-emphasize “Other.”
- Explain category confidence through info icons.

Recommended desktop layout:
- donut or radial visual on the left
- category legend / top categories on the right
- category cards below

Recommended mobile layout:
- taste visual
- legend
- category cards
- drawer

---

### 6. Top Collections

Purpose:
Show where the collector goes deepest.

Answers:
- Which collections anchor the wallet?
- How concentrated is the collector’s attention?
- What collections prove the archetype?

Shows:
- ranked list or cards
- collection image
- collection name
- count owned
- percent of wallet
- category tag if known
- subtle progress indicator if useful

Rules:
- Rank by count owned unless otherwise specified.
- Use thumbnails when available.
- If image is missing, use a placeholder with the collection initial or abstract mark.
- Do not make this look like a financial table.
- Rows should be clickable later.

---

### 7. Top Artists

Purpose:
Show recurring creator signal when data is reliable.

Answers:
- Which artists does this collector return to?
- Are there creator-level patterns beneath collections?

Shows:
- artist name
- avatar if available
- count owned
- representative works
- related collections

Rules:
- Only show if artist attribution is reliable.
- If data is weak, omit this section.
- Do not guess artist names from collection names unless confidence is high.

---

### 8. Representative Holdings

Purpose:
Give the wallet a visual personality.

Answers:
- What does this wallet look like?
- Which pieces help represent the profile?

Shows:
- capped NFT preview grid
- collection names
- optional “why selected” explanation later

Rules:
- Keep the grid capped.
- Do not render the whole wallet.
- Do not select pieces by market value.
- Prefer a mix of top collections and category coverage.

---

### 9. Compare CTA

Purpose:
Turn self-recognition into connection.

Answers:
- Who else overlaps with this collector?
- What happens next?

Shows:
- second wallet input
- compare button
- share profile link
- copy that frames compare as resonance

Preferred copy:
- “See who stopped in the same places.”
- “Drop in another wallet. See where your worlds overlap.”
- “Find your collector counterpart.”

Rules:
- Compare CTA should feel like a door, not a footer form.
- Preserve routing behavior.
- Disabled state should be clearly disabled.
- Enabled state should feel active.

---

## Missing data behavior

Do not show empty modules.

Use these rules:

- If `marketAttention` is null, hide Market Attention card.
- If latest arrival is unavailable, hide Latest Arrival.
- If first known NFT is unavailable, hide the origin card or show a very light unavailable state.
- If artist data is unreliable, omit Top Artists.
- If avatar is missing, use fallback avatar.
- If collection image is missing, use placeholder.
- If category confidence is low, explain it through info icon.
- If OpenSea enrichment fails, preserve the profile and show available data.

---

## Info icons

Computed or interpretive results should have info icons when users may ask “how did you get this?”

Info icons should appear near:
- archetype/class
- first known NFT
- market attention
- taste map
- category labels
- top collections
- minted/acquired behavior
- representative pieces
- combined wallets
- compare chemistry later

Do not overload the page with icons next to every label.

Use them for trust-critical results.

---

## Multi-wallet readiness

The profile layout should be ready for multi-wallet support.

Future additions:
- add wallet affordance
- wallet chips
- wallet count indicator
- source-wallet badges
- combined profile note

Rules:
- The first wallet is the primary identity.
- Combined profiles should feel like one collector, not several profiles stapled together.
- Source-wallet context should be available without dominating the page.

---

## Visual principles

The profile page should feel:

- collector-native
- vivid but not noisy
- playful but tasteful
- interpretive, not analytical
- grounded in actual NFTs
- exciting to scan
- trustworthy when inspected

Avoid:

- generic dashboards
- finance portfolio UI
- marketplace pages
- leaderboard patterns
- overuse of neon
- too many metrics at the same weight
- empty cards
- fake confidence

---

## Build priorities

Current priority order:

1. Strong identity header
2. Key signals near the top
3. First known NFT / collector since
4. Taste map + category explorer
5. Top collections with proof
6. Transparency/info icons
7. Compare CTA
8. Multi-wallet support
9. Top artists when reliable
10. Representative holdings

---

## Codex implementation guardrails

For Product UI tasks:

- Use existing data first.
- Do not change API routes during UI passes.
- Do not add fake data.
- Hide unavailable fields.
- Preserve current routing.
- Preserve category drawer behavior.
- Do not add dependencies.
- Do not create a broad component system unless the task is explicitly about refactoring.

For Data/API tasks:

- Keep response shape backward compatible.
- Add fields in a null-safe way.
- Do not block the page on enrichment.
- Cap expensive calls.
- Explain fallback behavior.