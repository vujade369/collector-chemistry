---
tags: [constellate, product, v1, flow, social-loop, canon]
status: active
note_type: canon
owner: Trevor
updated: 2026-05-15
visibility: internal
audience: builders
aliases: [V1 Plan, Product Flow, Social Loop Plan]
---

# Constellate V1 — Product Flow + Social Loop Plan

Purpose: the single source of truth for v1. Read this before every build session. Hand it to Codex at the start of every prompt alongside BUILD_PRINCIPLES.md.

---

## North star

Every result should create a next social question.

---

## The three lenses

**Read** — What does this wallet reveal?
The personal lens. Starts with identity, leads with interpretation, proves with evidence. The trust layer. Everything else depends on someone believing the read is interesting enough to keep going.

**Compare** — What is the relationship between two wallets?
The relationship lens. Emotionally specific. Surfaces shared artists, shared collections, and divergence. The most shareable object when two people are involved.

**Orbit** — Who gathers around this taste field?
The discovery lens. Starts from a set of collections, surfaces overlapping collectors. A named, remixable social object. The most playful and broadly accessible entry point for sharing.

And one module, not a fourth lens:

**Trade** — What could this wallet turn into?
Lives inside Wallet Read. Playful and viral. Not a primary pillar.

---

## The loops

### Personal loop

```
Enter wallet
→ Read your wallet
→ See signal points, taste map, collecting rhythm
→ Find collectors near this wallet
→ Compare with one
→ Build orbit from overlap
```

### Social loop

```
Share result
→ Visitor opens result page
→ Visitor reads their own wallet / remixes orbit
→ Visitor compares with the wallet they just viewed
→ Visitor shares a new result
→ New collector enters
```

The social loop is v1 architecture, not a polish layer. Every result page is also a landing page. Design for both.

---

## Page structure

### Wallet Read

Order:

1. Identity block — avatar, name, tagline badge, pieces and collections in smaller type
2. The Read — interpretive paragraph, directly below identity
3. Share CTA — visible but not dominant, near the top
4. Signal Points — First Mint, Current Attention, Latest Arrival
5. Collecting Rhythm + Entry Pattern — proof of behavior
6. Taste Map — category and collection breakdown
7. Where This Wallet Returns — top collections with depth
8. Find Collectors Near This Wallet — primary bridge into Orbit
9. Compare with a Collector — bridge into Compare, one per nearby wallet card
10. Trade the Constellation — playful module, bottom

The rule: interpretation first, evidence second, action third.

The tagline appears once as a badge on the identity block and once as the header of The Read. Not a third time.

The wallet input/edit UI belongs above the identity block or accessible via a small edit action. Not embedded inside the identity block.

Share CTA should reflect result quality. A thin result (few collections, low category diversity, generic read) gets a quieter share option. A rich result gets a more prominent one. Do not encourage weak shares.

---

### Compare

Order:

1. Recognition label — large, at the top, before anything else
2. Relationship Read — interpretive paragraph, visually strong
3. Collector archetypes — Artist Follower / Scene Player style labels, more visible than currently
4. Shared Artists — elevated above shared collections. Artist overlap is a more culturally meaningful signal than collection overlap.
5. Shared Collections — larger depth bars, numbers prominent
6. Same NFTs — rare, handled as a special signal, not a routine row
7. Divergence — a real module, not a footnote. Where they separate is often as interesting as where they overlap.
8. Find collectors near both of you — primary bridge into Orbit
9. Share caption + CTA

Compare is most viral when both parties share it. The share flow should make this easy: after a compare result, offer "Share this with [wallet B]" as a secondary action that generates a direct message or prefilled post tagging both collectors.

---

### Orbit

Order:

1. Orbit name — generated, user-editable, displayed as the primary identity of the result
2. Seed collections — visible as pills below the name, always
3. Narrative orbit summary — one or two sentences describing what kind of collectors surfaced
4. Matching collectors — ranked by overlap strength
5. Remix — present on every orbit result, primary visitor CTA on shared pages

Orbit has two entry modes. They should not feel like two products.

**Wallet-seeded (default):** When entering from Wallet Read, the product uses the wallet's top collections as the seed automatically. "We built this orbit from your strongest collection signals."

**Manual builder (playground):** When entering Orbit directly, show suggested starting sets — category tiles (PFP, Generative, Meme, Art) that expand into collections — not a blank search box. A blank search box is a cold start problem. Suggested tiles are a playable instrument.

On each collector card:
- Read wallet (renamed from "View orbit")
- Compare to mine (when user has a wallet in session)
- Compare (always)

---

## Recognition vocabulary

The complete set of Compare recognition states. All six must exist before Compare shares go live, because the label only means something when the alternatives are understood.

**Deeply Aligned**
Strong collection overlap, strong artist overlap, similar category distribution. The rarest state. Handle carefully — do not overuse.

**Same Rooms, Different Depths**
Many shared collections, but one wallet goes significantly deeper. The asymmetry is the story.

**Adjacent Scenes**
Some shared collections or artists, but different dominant categories. They move through neighboring territory without fully overlapping.

**Distant But Related**
Limited overlap, but the shared signals are culturally meaningful. More interesting than the numbers suggest.

**Mirror Signal**
Different collections, but similar artists, categories, or collecting rhythm. No direct intersection, but recognizable resonance. This is the most surprising and distinctive state. Give it real prominence — it surfaces a kind of overlap that raw collection comparison would miss entirely.

**Different Constellations**
Minimal overlap and distinct collecting patterns. Honest about distance without being dismissive.

---

## Orbit naming rules

Generated by AI, editable by the user before sharing. The edit happens inside the share flow, not in a separate settings step.

**Rules:**
- 2 to 5 words
- Name the scene or the behavior, not the aesthetic
- Culturally specific when the seed collections earn it
- Short enough to fit on a share card without truncation
- Avoid: "vibes," "tribe," "journey," "your custom," "mixed," "various"
- Seed collections must remain visible beneath the name so it does not feel arbitrary

**Good name types:**

Cultural — references the scene the collections belong to
*The Chaos Canon Orbit, The Meme Lab Afterparty*

Behavioral — describes how collectors in this orbit tend to move
*The Early Signal Circle, The Primary Market Loyalists*

Historical — references when this taste emerged
*The 2021 Survivors, The Bull Run Holdouts*

Hybrid — combines cultural and behavioral
*The Punk-to-Palette Corridor, The On-Chain Purists*

**Bad name types:**
Category dumps — *"PFP and Generative Art Orbit"*
Aesthetic labels trying too hard — *"The Glitch Formalists"*
Placeholders — *"Your Custom Orbit"*

**Remix provenance:**
When someone remixes an orbit, record what it came from. Display as: *"Remixed from The Chaos Canon Orbit."* The URL carries this: `?from=chaos-canon`. This creates a chain, not isolated posts.

---

## Share objects

Three primary share objects. Each has a card format, a generated caption, and a visitor CTA.

### Wallet Read card

Content: avatar, name, tagline, top two taste categories, one signal stat (First Mint date or collecting peak).

Generated caption (editable before sharing):
> [Name] reads as [Tagline] — [X] pieces across [Y] collections, with a strong [category] undercurrent.

Visitor CTA on shared page: **Read your own wallet**

After visitor enters their wallet: offer **Compare with [wallet they just viewed]**

---

### Compare card

Content: both avatars, recognition label large, shared collections count, shared artists count, one memorable shared artist name.

Generated caption (editable before sharing):
> [Wallet A] and [Wallet B] are [Recognition Label] — connected through [X] shared collections and work by [shared artist].

Visitor CTA on shared page: **Compare your wallet**

Secondary action after compare result: **Share this with [Wallet B]** — prefilled post or message for both parties to share the same result.

---

### Named Orbit card

Content: orbit name large, seed collections as small pills, collector count, one signal line.

Generated caption (editable before sharing):
> I built [Orbit Name] from [collection 1], [collection 2], and [collection 3]. It surfaced [X] collectors with unusually strong overlap.

Visitor CTA on shared page: **Remix this orbit** (primary) and **Read your wallet** (secondary)

The orbit card is probably the strongest share object for cold audiences. It does not require the viewer to already know a wallet. Anyone curious about collector taste can engage with it.

---

## Shareable URL structure

Every result must be loadable directly from a URL. No reliance on hidden session state for sharing.

```
/profile?wallet=vuja-de.eth
/compare?a=vuja-de.eth&b=mode80.eth
/orbit?seed=mfers,milady,goblintown&name=The%20Chaos%20Canon%20Orbit&from=meme-lab-orbit
```

The orbit URL carries: seed collections, orbit name, and remix provenance. All three matter for the social loop.

---

## Navigation

Top nav: **Read    Orbit    Compare**

Simple, always visible, consistent across all three pages. No icons without labels.

Compare is visually secondary in weight to Read and Orbit. It requires the most prior intent (two known wallets) and is better reached through the product than typed directly.

---

## Farcaster stance

Detailed scope guardrail: see `docs/FARCASTER_V1_SCOPE.md`.

V1 goal: Farcaster-shareable, not Farcaster-native.

**Do in v1:**
- Stable result URLs (foundational for all sharing)
- Farcaster-compatible meta tags on result pages so links render as rich cards
- Dynamic OG image endpoints for Wallet Read, Compare, and Named Orbit
- Button language matched to the object: "Read yours" / "Compare yours" / "Remix orbit"

**Do not do in v1:**
- Full Mini App build
- Sign In with Farcaster
- Wallet connection through Farcaster SDK
- Notifications
- Farcaster social graph analysis

**v2 Farcaster direction:**
Mini App manifest, Quick Auth, wallet auto-connect, notifications ("someone remixed your orbit"), feed-native orbit discovery.

The Named Orbit with Remix is the strongest first Farcaster object. A collector casts their orbit. Replies pour in asking to swap collections. Remix handles the response. That is the native Farcaster behavior.

---

## V1 scope

### In

- Wallet Read hierarchy restructure
- Compare recognition vocabulary + page restructure
- Orbit: named orbits, remix mechanic, URL state, narrative summary
- Stable shareable URLs for all three pages
- Visitor CTAs on shared result pages
- Editable share captions for all three objects
- Route bridges between pages (Read → Orbit, Read → Compare, Compare → Orbit, Orbit → Compare, Orbit → Read)
- Homepage (two primary entry points: Read, Orbit — Compare secondary)
- Share CTA quality layer (quieter on thin results)
- OG image cards for all three share objects
- Farcaster-compatible meta tags

### Out of v1

- Full Farcaster Mini App
- Push notifications
- Artist audience mode ("who collects my work")
- Recommendation engine ("collectors like you often move into...")
- Orbit directory or public feed
- Paid tiers or gating
- Multi-chain beyond Ethereum
- Non-collector browsing mode (beyond orbit guest view)
- Farcaster wallet connection or auth

---

## Build session sequence

Run the Codex inspection prompt before Session 1. Do not touch anything until you know where state lives, which bridges exist, and what the current URL structure looks like.

**Codex inspection prompt:**

```
Inspect the current app and tell me:

1. Current route/page structure for /profile, /compare, and /orbit (or equivalent)
2. Current URL parameter support for each page — what state is currently in the URL vs hidden in component state
3. Where wallet and collection selection state currently lives
4. Which bridges already exist between pages (CTAs that link Read → Orbit, etc.)
5. Which bridges are missing
6. Any shared navigation or layout components
7. Risks to API contracts or data fetching

Do not change anything. Return a plain summary only.
```

---

### Session 1 — Wallet Read hierarchy

**Goal:** Make the wallet results page feel like a reading, not a dashboard.

Do:
- Move The Read directly below the identity block
- Remove the repeated tagline line below the wallet name (keep the badge and the section header)
- Move the wallet input/edit UI out of the identity block
- Reduce the visual weight of raw metrics (pieces/collections counts) — make them proof, not the lead
- Confirm interpretation comes before evidence throughout

Files: wallet read page component only.
No API changes. No data changes.

Definition of done: a first-time visitor sees identity → interpretation → evidence. The page's best material is above the fold.

---

### Session 2 — Stable shareable URLs

**Goal:** Make every result loadable directly from a URL.

Do:
- Wallet Read loads cleanly from wallet param
- Compare loads from two wallet params
- Orbit loads from seed collection slugs param
- Orbit name loads from name param
- Shared pages load without prior app state
- Basic copy-link buttons on each result page

No OG images yet. No visitor CTAs yet. Just make the links work and preserve state.

Definition of done: refreshing any result page preserves the full result. Sharing a URL opens the same state for another person.

---

### Session 3 — Visitor CTAs

**Goal:** Turn shared result pages into entry points for new users.

Do:
- Wallet Read shared page: **Read your own wallet**
- Compare shared page: **Compare your wallet**
- Orbit shared page: **Remix this orbit** (primary) + **Read your wallet** (secondary)
- After visitor enters wallet from a shared Read: offer to Compare with the wallet they just viewed

Definition of done: no shared result page is a dead end. Every one gives the visitor an obvious next action that brings them into the product.

---

### Session 4 — Route bridges

**Goal:** Make the product feel like one connected system.

Do:
- Wallet Read → Build Orbit from this wallet (pre-seeded with top collections)
- Wallet Read nearby collector cards → Compare (pre-fills both wallets)
- Compare → Find collectors near both of you (seeds Orbit from shared collections)
- Orbit collector cards → Read wallet
- Orbit collector cards → Compare to mine (when user wallet is in session)
- Compare → Read either wallet

Definition of done: a user can move through Read → Compare → Orbit → Read without manually copying addresses. The product loop runs without friction.

---

### Session 5 — Compare vocabulary + restructure

**Goal:** Make Compare emotionally specific and shareable.

Do:
- Implement the six recognition states (see Recognition Vocabulary above)
- Move relationship read directly below the recognition label
- Elevate shared artists above shared collections
- Expand collection depth bars — larger, numbers more prominent
- Add divergence module as a named section, not a footnote
- Add "Find collectors near both of you" CTA
- Add "Share this with [Wallet B]" secondary CTA
- Generate editable compare caption

Definition of done: Compare has a clear emotional headline, explains both overlap and difference, and produces a shareable caption.

---

### Session 6 — Named Orbit + Remix

**Goal:** Turn Orbit into a named, remixable social object.

Do:
- Generate orbit name from seed collections using the naming rules above
- Surface name as primary identity of the result
- Let user edit name inside the share flow
- Add Remix mechanic — visitor can swap/add/remove a collection and re-run
- Carry remix provenance in the URL (`?from=`)
- Add narrative orbit summary above results (one or two generated sentences)
- Add/remove collection controls on existing orbit results

Definition of done: a user can build an orbit, get a name, share it, and another user can remix it with one action. The orbit feels like something they created, not a search result.

---

### Session 7 — Share captions

**Goal:** Make sharing feel authored, not automated.

Do:
- Generate editable caption for Wallet Read
- Generate editable caption for Compare
- Generate editable caption for Named Orbit
- Share flow: show generated caption + edit field + copy link + copy caption
- Caption quality tied to result quality (thin results get a more modest generated caption)

Definition of done: sharing is not just a link. The product gives users specific, editable language they would actually post.

---

### Session 8 — Homepage

**Goal:** Make the product entry feel like an invitation, not a utility menu.

Do:
- One dominant entry: Read a wallet (hero input, center stage)
- One secondary entry: Build an Orbit (visible, clearly explained, not competing)
- One tertiary link: Compare two wallets
- No equal-weight three-card layout — that creates decision fatigue
- Nav visible and consistent: Read / Orbit / Compare
- The homepage should ask one question that makes someone want to act

Definition of done: a first-time visitor has one obvious thing to do. A returning user recognizes the product immediately.

---

### Session 9 — OG images + Farcaster meta tags

**Goal:** Make shared links look good everywhere they land.

Priority order:
1. Named Orbit card (most broadly accessible share object)
2. Compare card (most emotionally specific)
3. Wallet Read card (most personal)

Do:
- Dynamic image endpoints for each card type
- Farcaster-compatible meta tags on all result pages
- Button language specific to the object: "Read yours" / "Compare yours" / "Remix orbit"
- No generic "Open app" buttons

Definition of done: shared links unfurl with a designed preview on Twitter, Farcaster, and Discord. The preview contains the result name, signal, proof, and brand.

---

## Decisions already made

These are not open questions. Do not relitigate them in build sessions.

| Decision | Answer |
|---|---|
| Primary v1 share object | Named Orbit |
| Secondary share object | Compare |
| Trust layer | Wallet Read |
| Compare in top nav | Yes, visually secondary to Read and Orbit |
| Default Orbit entry from Wallet Read | Wallet-seeded automatically from top collections |
| Default Orbit entry from homepage | Manual builder with suggested seed tiles, not a blank search box |
| Farcaster in v1 | Shareable web app only. Mini App is v2. |
| Share CTA visibility | Reflects result quality. Thin results get quieter share options. |
| Converter placement | Inside Wallet Read as a bottom module. Not elevated to primary nav. |
| Mirror Signal prominence | Elevated. It is the most surprising and distinctive recognition state. |
| Remix provenance | Carried in URL. Displayed beneath orbit name on remixed results. |

---

## Open questions to answer before Session 5

These need a decision before Compare is touched.

1. **What does the divergence module look like visually?** Is it a section with a generated sentence or a side-by-side breakdown? Decide before Session 5.

2. **How does "Find collectors near both of you" work under the hood?** Is it an Orbit seeded from shared collections only, or does it run a different query? Confirm with Codex during inspection.

3. **Does the recognition state get stored in the Compare URL?** Useful for share cards but requires the state to be computed server-side or on load. Decide before Session 2.
