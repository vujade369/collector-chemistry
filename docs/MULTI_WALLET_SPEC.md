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

## Governing principle

The collector defines their own identity.

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

## UI — Profile input flow

### Current flow (single wallet)
User enters one address or ENS → Compare button activates → Profile loads

### New flow (multi-wallet)
User enters first address or ENS → Profile loads for that wallet →
Optional: "Add another wallet" appears below the profile →
User enters second address → Holdings merge → Profile updates →
Repeat up to 5 wallets total

The multi-wallet input should feel like an optional extension,
not a required step. Most users will use one wallet.
Power users who want a complete profile can add more.

### Input area
- Primary input: unchanged from current design
- After first wallet loads: a small secondary input appears
  labeled "Add another wallet (optional)"
- Each additional wallet shows as a small pill/tag below the input
  with the truncated address and an × to remove it
- Removing a wallet re-merges the remaining wallets and updates the profile

### Wallet pills
Each added wallet shown as:
  [0x5ffd...f747 ×]   [vuja-de.eth ×]

Style: same as existing tag/pill spec in DESIGN_SYSTEM.md
Color: dim, not prominent — this is utility, not identity

---

## UI — Profile display

### Identity header
When multiple wallets are active, the identity header shows:
- Primary wallet name/ENS (first wallet entered)
- Small indicator: "2 wallets" or "3 wallets" in dim text below

Do not try to combine ENS names or create a merged display name.
The first wallet's identity is the display identity.

### Stats row
Total holdings reflects the merged deduplicated count.
No per-wallet breakdown in the stats row.

### Signal piece / anchor collection
Determined from the merged set. No change to logic.

### Category drill-down
Operates on merged set. No change to logic.

### Taste map
Operates on merged set. No change to logic.

---

## Compare flow with multi-wallet

When comparing two collectors, each side may have multiple wallets.

The compare input flow mirrors the profile flow:
- Enter wallet A (one or more addresses)
- Enter wallet B (one or more addresses)
- Compare runs on merged profile A vs merged profile B

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
  normalizedContractAddress === normalizedContractAddress
  AND normalizedTokenId === normalizedTokenId

Normalization:
- Contract address: lowercase
- Token ID: convert hex to decimal integer string

When a duplicate is found, keep the instance from the first wallet
in the input order. Discard the second.

Track total duplicates removed for transparency in the debug response.

---

## Performance rules

- Fetch all wallets in parallel, not sequentially
- Each wallet fetch has the same timeout/fallback behavior as current
- If one wallet fetch fails, continue with the others
- Never block the profile render waiting for a failed wallet
- Cap at 5 wallets maximum — do not allow unbounded input

---

## Edge cases

### All wallets fail to load
Show standard profile error state. Same as current single-wallet failure.

### Some wallets fail, some succeed
Render profile from successful wallets only.
Show a light warning: "One wallet could not be loaded."
Do not block the profile.

### Duplicate wallet entered
If the user enters the same address twice, silently deduplicate.
Do not show an error. Just ignore the second entry.

### ENS resolution
Each ENS name is resolved independently before fetching.
Resolved addresses are used for all subsequent calls.
If ENS resolution fails for one wallet, skip it and continue.

### Empty wallet
A wallet with 0 NFTs contributes nothing to the merged profile.
It is included in the wallet count display but not in any signals.

---

## What not to build

- Do not add wallet verification or proof of ownership
- Do not persist multi-wallet sets between sessions
- Do not create user accounts or saved profiles
- Do not try to auto-discover related wallets from on-chain data
- Do not show per-wallet breakdowns in the main profile view
- Do not add more than 5 wallet slots

---

## Build sequence

Do not build this until the single-wallet profile and Wallet Converter
are stable.

Suggested order:
1. API changes first — extend profile and compare routes to accept
   comma-separated wallet lists
2. Merging and deduplication logic in lib/
3. Profile input UI — add wallet pill system
4. Profile display updates — wallet count indicator
5. Compare input UI — mirror the profile changes
6. Test with real multi-wallet collectors

---

## Success criteria

A collector with 3 wallets should be able to:
1. Enter all 3 addresses into the profile input
2. See a complete merged taste map
3. See their full collection count
4. Compare their merged profile against another collector

The experience should feel like one profile, not three profiles stapled together.