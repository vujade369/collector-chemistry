# Collector Chemistry — Multi-Wallet Spec

## Why this exists

Many collectors use more than one wallet.

A single wallet address does not always represent a complete collector.
Holdings may be split across a primary wallet, a vault, a trading wallet,
or wallets accumulated over time.

When a profile only shows one wallet, the taste map is incomplete,
the archetype read may be wrong, and the chemistry comparison is weaker
than it should be.

Multi-wallet support fixes this.

---

## Governing principles

The collector controls their own identity.
The product illuminates, it does not expose.
The experience should feel like a natural extension of the profile,
not a feature announcement.

We cannot discover which wallets belong to someone automatically.
OpenSea knows this relationship internally but does not expose it via
public API. We do not try to infer or guess wallet ownership.

The collector tells us which wallets are theirs.
We merge them and treat the combined holdings as one profile.

This is honest, respects privacy, and does not require any special
API access or wallet connection.

---

## What this is not

- Not a wallet connection feature
- Not a MetaMask integration
- Not a signature or verification flow
- Not identity stitching from on-chain data
- Not an attempt to deanonymize collectors

The collector voluntarily provides their own wallet addresses.
Nothing is verified or claimed. It is purely additive input.

---

## How it works

### Input

The profile input field currently accepts one wallet address or ENS name.

Multi-wallet extends this to accept up to 5 wallet addresses or ENS names,
entered one at a time. Each is validated before being added to the set.

Valid inputs per wallet (unchanged from current spec):
- Full Ethereum wallet address (0x...)
- ENS name ending in .eth

### Merging

When a profile is loaded with multiple wallets:

1. Fetch NFTs for each wallet independently via Alchemy
2. Deduplicate by contract address + token ID
   (same NFT held in two wallets counts as one holding)
3. Merge into a single NFT array
4. Run the full profile inference on the merged array
5. Track which wallet each NFT came from (for display purposes)

The merged profile is treated as one collector.
All signals, archetypes, taste maps, and interpretations
operate on the full merged set.

### Source wallet metadata

Each NFT in the merged set retains its source wallet address.
This is used for:
- Display context ("from your vault")
- Debugging and transparency
- Future features that may want to show wallet-level breakdown

Source wallet is never used for scoring, ranking, or judgment.

---

## UI — The banner

A subtle banner sits immediately below the identity header, above the
stats row. It is always visible but never dominant.

It should not compete with the identity header.
It should feel like a quiet affordance, not a product callout.

### Banner — default state (one wallet loaded)

Visual:
- Full width, below identity header
- Background: #111 (matches panel color)
- Border: 0.5px solid #222
- Border radius: 12px
- Padding: 12px 16px
- Single row on desktop, two rows on mobile

Content:
- Left: "Collecting across multiple wallets? Add them for a complete picture."
- Right: "+ Add wallet" as a small action link

Copy rules:
- Never say "portfolio"
- Never say "holdings"
- Keep it under 10 words on the left side
- The action link should feel like an invitation, not a button

Typography:
- Copy: 12px, color #666
- Action link: 12px, color #a8a49d, hover color #f0ede6

### Banner — expanded state (add wallet input open)

When "+ Add wallet" is clicked:
- The banner expands inline — no modal, no new page
- An input field appears below the copy row
- Placeholder: "Wallet address or ENS"
- A small "Add" confirm button sits inline with the input
- Pressing Enter also confirms
- Pressing Escape closes the input and returns to default state

Input styling follows DESIGN_SYSTEM.md:
- Background: #141414
- Border: 0.5px solid #2e2e2e
- Border radius: 10px
- Padding: 10px 14px
- Font size: 14px
- Focus border: #555

Validation:
- Accept: full 0x Ethereum address, ENS ending in .eth
- On invalid input: inline error below the field in color #666
  "Enter a valid Ethereum address or ENS name."
- On duplicate wallet: silently ignore, close input
- On empty wallet (0 visible NFTs): light note below pills
  "No visible NFTs found in this wallet." — do not block the profile

### Banner — multi-wallet state (2+ wallets loaded)

When wallets are added the banner becomes a wallet management row.

Visual:
- Same container
- Left: wallet pills
- Right: "+ Add" pill (hidden when 5 wallets already added)

Wallet pills:
- Show truncated address or ENS: "vuja-de.eth" or "0x5ffd...f747"
- × appears on hover (desktop) or always (mobile)
- First pill has a subtle primary indicator: small #ff3399 dot, 4px circle
- Pills are draggable to reorder — primary = first in list

Pill styling:
- Background: #141414
- Border: 0.5px solid #2e2e2e
- Border radius: 20px
- Padding: 4px 10px
- Font size: 11px
- Color: #c8c5be
- × color: #444, hover #888

Add pill:
- Same shape as wallet pills
- Content: "+ Add"
- Border: 0.5px dashed #2e2e2e
- Color: #555, hover #888

---

## UI — Loading state during wallet merge

When a wallet is added or removed, the profile re-fetches and re-merges.
This can take 5-10 seconds. The experience must not feel broken.

Rules:
- Keep the existing profile visible during loading
- Show a subtle loading indicator in the banner area only
- Do not blank the page or show a full-screen spinner
- Banner shows: "Merging wallets..." with a small pulse animation
- When complete, update numbers in place with a brief fade transition

The delight moment:
When a new wallet merges, the profile expands visibly. Numbers climb.
The taste map re-draws. The archetype may shift. Make this feel like
a reveal, not just a data refresh.

Count animation:
- NFT count in the stats row ticks up to the new number over 600ms
- Taste map segments re-draw with stagger fade (same as initial load)
- Archetype label fades out and fades in if it changed

---

## UI — Removing a wallet

Clicking × on a pill:
- Removes immediately, no confirmation dialog
- Profile re-merges with remaining wallets
- If only one wallet remains, banner returns to default state
- If the primary wallet is removed, next wallet becomes primary

The × must have a clear hover state so intent is obvious before clicking.
On mobile, × is always visible.

---

## UI — Primary wallet

The first wallet in the list is the display identity.
It controls: display name, ENS, avatar, OpenSea profile data.

To change primary: drag a pill to the first position.
On mobile: long-press a pill to get "Set as primary" and "Remove" options.

When primary changes, the identity header updates immediately.

---

## UI — Profile display

### Identity header
When multiple wallets are active:
- Primary wallet name/ENS shown as usual
- Small dim indicator below: "2 wallets" or "3 wallets"

Do not combine ENS names or create a merged display name.
The first wallet's identity is the display identity.

### Stats row
Total holdings reflects the merged deduplicated count.
No per-wallet breakdown in the stats row.

### Taste map, signals, collections
All operate on the merged set. No logic changes needed.

---

## URL structure

Wallets are encoded in the URL as a comma-separated list:

  /profile?wallet=vuja-de.eth,0xVaultAddress,0xThirdAddress

Rules:
- URL is the source of truth when present
- Session storage is the fallback when URL has only one wallet
- Shared URLs always load correctly regardless of session state
- When wallets are added or removed, URL updates via replaceState
  (no full page reload)
- First wallet in the URL is the primary wallet

---

## Session persistence

When wallets are added or removed, write the current list to sessionStorage:
  Key: "cc_wallets"
  Value: comma-separated wallet addresses

On profile page load:
1. Check URL params — if multiple wallets in URL, use those
2. If URL has one wallet, check sessionStorage for a saved list
   that starts with the same primary wallet
3. If found, silently restore the full list
4. If not found, use the single wallet from URL

Session storage clears when the tab closes. This is intentional.
We do not persist wallet sets across sessions without user accounts.

---

## Compare flow with multi-wallet

When a multi-wallet user hits Compare:
- The compare input pre-fills with the primary wallet
- URL carries all wallets: /compare?walletA=addr1,addr2&walletB=addr3
- Compare treats the merged profile as one collector on each side
- Shows "2 wallets" or "3 wallets" as a subtle indicator below each
  collector's name on the compare page

Shared collections, shared artists, and exact overlap all operate
on the merged sets. A shared collection means either wallet from
collector A overlaps with either wallet from collector B.

---

## API changes

### GET /api/profile

Current: accepts single wallet param

New: accepts wallet as comma-separated list of up to 5 addresses
  /api/profile?wallet=0xabc,vuja-de.eth,0xdef

Backward compatible: single wallet still works as before.

Internal changes:
- Fetch NFTs for each address in parallel
- Deduplicate merged array by contract+tokenId
- Attach sourceWallet field to each NFT
- Run buildWalletProfile on merged array

### GET /api/compare

Current: accepts walletA and walletB params

New: accepts comma-separated lists for each
  /api/compare?walletA=0xabc,0xdef&walletB=0x123,0x456

Backward compatible: single wallets still work as before.

---

## Data model additions

### WalletProfileNFT (extension)
Add optional field:
  sourceWallet?: string  // the address this NFT was fetched from

### ProfileRequest
  wallets: string[]  // 1 to 5 addresses or ENS names

### MergedWalletProfile
Extends WalletProfile with:
  walletCount: number
  wallets: string[]  // all addresses used
  deduplicatedCount: number  // NFTs removed as duplicates

---

## Deduplication rules

Two NFTs are considered the same if:
  normalizedContractAddress matches
  AND normalizedTokenId matches

Normalization:
- Contract address: lowercase
- Token ID: convert hex to decimal integer string

When a duplicate is found, keep the instance from the first wallet
in the input order. Discard the second.

Track total duplicates removed in the debug response.

---

## Mobile behavior

Banner:
- Stacks vertically: copy on top, action below
- Pills wrap to multiple lines if needed
- Add input is full width

Pills:
- × always visible
- Min 36px touch target height

Drag to reorder:
- Not available on mobile
- Replace with: tap pill to get sheet with "Set as primary" and "Remove"

---

## Performance rules

- Fetch all wallets in parallel, not sequentially
- Each wallet fetch has the same timeout/fallback behavior as current
- If one wallet fetch fails, continue with the others
- Never block the profile render waiting for a failed wallet
- Cap at 5 wallets maximum

---

## Edge cases

### All wallets fail to load
Show standard profile error state.

### Some wallets fail, some succeed
Render profile from successful wallets only.
Show light note in banner: "One wallet could not be loaded."
Do not block the profile.

### Duplicate wallet entered
Silently deduplicate. No error. Just ignore.

### ENS resolution
Each ENS resolved independently before fetching.
If ENS resolution fails for one wallet, skip it and continue.

### Empty wallet
Contributes nothing to signals.
Included in wallet count display.
Show note: "No visible NFTs found in this wallet."

---

## What not to build

- Do not add wallet verification or proof of ownership
- Do not persist multi-wallet sets across sessions (only within session)
- Do not create user accounts or saved profiles
- Do not auto-discover related wallets from on-chain data
- Do not show per-wallet breakdowns in the main profile view
- Do not add more than 5 wallet slots

---

## Build sequence

Suggested order:
1. API changes — extend profile and compare routes to accept
   comma-separated wallet lists
2. Merging and deduplication logic in lib/
3. Banner UI component with add/remove/pills
4. Session persistence and URL sync
5. Profile display updates — wallet count indicator, merge animation
6. Compare input UI — mirror the profile changes
7. Test with real multi-wallet collectors (vuja-de.eth + vault + third)

---

## Success criteria

A collector with 3 wallets should be able to:
1. Load their profile with one wallet
2. See the banner and tap "+ Add wallet"
3. Add their remaining wallets one at a time
4. Watch the profile expand and update with merged data
5. See their full collection count and complete taste map
6. Share the URL and have it load with all wallets intact
7. Compare their merged profile against another collector

The experience should feel like one profile becoming more complete,
not three profiles stapled together.
