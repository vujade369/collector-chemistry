# Collector Chemistry Display Contract

## 1. Purpose

This file defines the global display contract for profile, compare, and future UI surfaces.

The goal is to keep the product visually rich, dynamic, clickable, and scalable without hardcoded wallet-specific data.

This contract standardizes how entity data is prepared and rendered so that future UI passes can move quickly while preserving product quality.

Core rule: Collector Chemistry should never show naked entities.

Every wallet, NFT, collection, artist or creator, and marketplace-linked object should have:
- a clear name
- an image when available
- a visual fallback when image data is missing
- a destination link when available
- explicit click behavior
- graceful empty-state behavior

## 2. Core principles

1. No hardcoded wallet-specific values.
2. No blank image boxes.
3. No dead entity cards.
4. Show images when already available from current response data.
5. Enrich selectively, not endlessly.
6. Label uncertain data truthfully.
7. Hide optional modules when data is missing.
8. Use designed placeholders, not broken states.
9. OpenSea is the preferred marketplace destination when reliable URLs or slugs exist.
10. Collector Chemistry remains the interpretive layer.

## 3. Entity identity keys

Identity keys are for stable matching and dedupe. Names are for display, not identity.

### Wallet identity key
- lowercase wallet address

### NFT identity key
- contractAddress + tokenId

### Collection identity key
1. collectionSlug when available
2. contractAddress when slug is unavailable
3. normalized collectionName only as a final fallback

### Artist or creator identity key
1. trusted creator or account ID when available
2. otherwise display as name-only signal with softer labeling

## 4. Wallet display contract

### Recommended display fields
- address
- shortAddress
- ensName when available
- openseaUsername when available
- displayName
- avatarUrl
- openseaUrl when available
- etherscanUrl fallback

### Display name priority
1. ENS name if searched or resolved
2. OpenSea username when available and meaningful
3. shortened address

### Avatar priority
1. OpenSea profile image
2. ENS avatar
3. representative or anchor NFT image
4. generated identicon or designed fallback

### Wallet link behavior
- Wallet name and avatar should link to internal Collector Chemistry profile by default.
- External OpenSea wallet link can appear as a secondary action.
- Etherscan fallback is acceptable when OpenSea is unavailable.

## 5. NFT display contract

### Recommended display fields
- name
- imageUrl
- collectionName
- collectionSlug
- contractAddress
- tokenId
- openseaUrl
- acquiredAt when available
- mintedAt when available
- source and confidence when available

### NFT image fallback hierarchy
1. nft.imageUrl
2. normalized or cached preview image
3. collection image
4. designed artifact placeholder using a neutral glyph such as ✦

### NFT click behavior
- NFT image and title should link to exact NFT destination when openseaUrl exists.
- OpenSea is preferred for external marketplace destination.
- External links open in a new tab with rel noopener noreferrer.
- External exits should be visually indicated.

## 6. Collection display contract

### Recommended display fields
- name
- slug
- contractAddress when available
- imageUrl
- bannerImageUrl
- openseaUrl
- category
- count
- percentOfWallet

### Collection image fallback hierarchy
1. OpenSea collection image or profile image
2. first preview NFT image from that collection
3. designed initial tile

### Collection click behavior
- Collection image and name should link to OpenSea collection page when slug or openseaUrl exists.
- If internal collection exploration exists later, card click can be internal while external action points to OpenSea.

Important: do not key collection identity only by name when better identity fields exist.

## 7. Artist and creator display contract

### Recommended display fields
- name
- avatarUrl
- openseaUrl
- source
- collectionCount
- nftCount

### Confidence and labeling rule
Artist identity can be messy in NFT datasets.

Only show shared artists or creators when identity comes from trusted project logic or reliable source fields.

If inferred or uncertain, use softer labels such as:
- Shared Creator Signal
- Shared Source
- Artist Signal

Avoid overclaiming.

## 8. Image normalization standards

Image URLs should be normalized through a shared helper whenever possible.

Normalization should handle:
- empty strings
- ipfs:// URLs
- OpenSea image URLs
- Alchemy cached URLs
- invalid URLs
- load failures

No broken image icons should appear in UI surfaces.

## 9. Link standards

### Preferred destinations
- wallet: internal Collector Chemistry profile first, OpenSea or Etherscan secondary
- NFT: exact OpenSea NFT page
- collection: OpenSea collection page
- artist or creator: OpenSea creator or account page when available

### External link behavior
- open in new tab
- rel noopener noreferrer
- visual external indicator
- no dead or misleading click targets

### Future marketplace action pattern
Marketplace links should route through a consistent helper or component so analytics, attribution, affiliate tracking, or marketplace-provider changes can be added later without rewriting every card.

Preferred generic naming:
- MarketplaceLink
- marketplaceProvider
- marketplaceUrl

Do not hardwire every internal type to OpenSea, even though OpenSea is preferred today.

## 10. Marketplace and OpenSea integration standards

OpenSea is the preferred marketplace destination for external NFT, collection, and wallet links when reliable OpenSea URLs are available.

Use OpenSea display data when it improves quality:
- wallet usernames
- wallet profile images
- collection names
- collection profile images
- collection slugs
- NFT images
- NFT marketplace URLs

But do not make the app brittle.

If OpenSea data is missing, stale, rate-limited, or incomplete:
- do not block the Collector Chemistry experience
- fall back to ENS, Alchemy, existing metadata, or designed placeholders
- avoid scattering raw OpenSea links through random components
- keep path open for analytics and attribution later, without implementing that logic now

Future actions this contract should support conceptually:
- View NFT
- View Collection
- View Wallet
- Buy or Make Offer, future
- Affiliate attribution, future

No affiliate implementation is required in this phase.

Strategic principle:
Use OpenSea for display richness and marketplace pathways.
Use Collector Chemistry for interpretation, identity, and context.

## 11. Profile page display contract

### Core dynamic data, required when available
- wallet identity
- profile image
- collector class or archetype
- interpretive headline
- total holdings
- collection count
- top category or strongest signal
- category distribution
- top collections

### Optional enriched modules
- first minted NFT or earliest origin signal
- signal piece
- anchor collection
- minted vs acquired behavior
- market attention or best offer signal
- OpenSea wallet link
- collection and NFT marketplace links

### Profile rendering priority
1. identity
2. origin signal
3. pattern and category mix
4. behavior, minted vs acquired
5. anchors and top collections
6. representative pieces
7. compare call to action
8. market attention, when available

## 12. Compare page display contract

### Core dynamic data, required when available
- both wallet identities
- both wallet images
- chemistry label
- shared collections count
- shared artists count
- exact NFT overlap count
- taste signals

### Overlap proof requirements
- exact shared NFTs with images and clickable NFT links
- shared collections with collection images and clickable collection links
- shared artists or creators with avatars and links when available

### Timing expectations
- each wallet entry date into shared collections when available
- first collected or minted date per shared collection when available

### Depth expectations
- holdings count per shared collection for each wallet
- visual bars based on real counts

### Taste expectations
- side-by-side category distribution
- strongest shared category
- meaningful divergence signal

### Compare rendering priority
1. two identities
2. relationship label
3. exact overlap
4. shared collections
5. entry timing
6. holding depth
7. shared artists
8. taste divergence
9. profile call to actions

## 13. Truthful labels and confidence

Use labels that match evidence quality.

### Origin examples
- If mint is confirmed from zero address: First Minted NFT
- If earliest transfer or acquisition is known but mint is unproven: Earliest Known NFT or Origin Signal
- If unavailable: Origin signal not found

### Market attention examples
- Complete and reliable offer data: Market Attention or Active Offer
- Limited sample data: Current Attention Signal
- Missing data: No active attention detected

### Category and artist truth rules
- Avoid overclaiming when category is inferred or fallback-based.
- Avoid calling an entity an artist when data only supports contract owner or collection name.

## 14. Empty states

Use product-native empty states such as:
- Origin signal not found
- Artifact image unavailable
- No active attention detected
- Creator signal unavailable
- Collection behavior unavailable
- No exact overlap found
- No shared collection signal found

Avoid:
- giant blank cards
- broken image icons
- loud error language
- undefined or null text
- raw technical messages

Optional sections should hide gracefully when empty.

## 15. Enrichment budget and performance rules

### Tier 1, always worth enriching
- wallet identity and avatar
- top collections
- first mint or origin signal
- signal piece
- exact shared NFTs
- shared collections above the fold

### Tier 2, enrich when cheap or already available
- shared artists
- lower-ranked collections
- category previews

### Tier 3, do not enrich by default
- every NFT in a wallet
- every hidden or long-tail shared item
- every artist across all holdings

### Performance rules
- never perform one network request per NFT in render path
- never enrich large arrays sequentially
- never block whole page on optional imagery
- cache duplicate lookups within request
- prefer already-returned data
- cap enrichment list sizes
- use graceful fallbacks when enrichment fails

## 16. Caching recommendations

Recommended cache candidates:
- collection slug to collection image, category, and OpenSea URL
- contract address to collection metadata
- wallet address to OpenSea profile identity
- NFT contract and token to image and OpenSea URL

Implementation posture:
- request-level caching now
- persistent cache or KV later if needed

## 17. Component primitive recommendations

Do not over-abstract early, but standardize critical display primitives.

Should standardize first:
- EntityImage, image fallback behavior
- ExternalEntityLink or MarketplaceLink behavior
- MetricCard
- SignalBar
- EmptyArtifact

Can standardize later:
- WalletIdentity
- NFTCard
- CollectionCard
- ArtistCard
- TasteRing

Goal: consistency first, abstraction second.

## 18. Acceptance criteria for future UI passes

### Profile pass is not complete unless
- top collections show thumbnails when any image exists in response
- no visible blank image boxes
- all NFT cards with openseaUrl are clickable
- all collection cards with slug or openseaUrl are clickable
- first mint or origin label is truthful to source evidence
- page works when first mint is missing
- page works when OpenSea profile image is missing
- no hardcoded test-wallet values

### Compare pass is not complete unless
- both wallet identities have image and name fallbacks
- exact overlap cards show NFT images when available
- shared collection cards show collection image or preview image
- entry-date pills hide gracefully when missing
- depth bars derive from real counts
- no section renders empty cards
- no hardcoded wallet-specific values
