# Collector Chemistry — Data Model

## NFT

- tokenId
- name
- imageUrl
- collectionName
- collectionSlug
- contractAddress
- traits[]
- openseaUrl

Potential future field:
- acquisitionDate (ISO timestamp) for time-based profile reads when available

---

## WalletProfile

Current profile object returned from /api/profile.

Fields:
- totalNFTs
- topCollections
- categoryDistribution
- categorySourceBreakdown
- previewNFTs

---

## previewNFTs

A small array of NFTs used by the profile page for visual preview.

Purpose:
- lets the profile page render NFT images without relying on debug data
- should be part of the normal profile response
- should stay lightweight

Required shape:
- tokenId
- name
- imageUrl
- collectionName
- collectionSlug
- contractAddress

---

## CollectionSummary

- collectionName
- collectionSlug
- ownedCount
- nfts[]

---

## CollectionStats

Used by the Wallet Converter and Collection Recommendations features.
Fetched from OpenSea GET /collections/{slug}.

Fields:
- slug
- name
- imageUrl
- floorPrice (in ETH, float)
- numOwners
- totalSupply
- uniqueCollectorRatio (calculated: numOwners / totalSupply)

Note: floorPrice may be null for collections with no active floor listing.
Always handle null gracefully. Do not surface raw ETH values to the user.

---

## CollectionSearchResult

Used by the Wallet Converter collection search input.
Returned from OpenSea GET /collections?collection_name={query}.

Fields:
- slug
- name
- imageUrl
- floorPrice (in ETH, float, may be null)

---

## WalletValueEstimate

An approximate total value of a wallet, used internally by the Wallet Converter.
Never displayed directly to the user as a number.

How it is calculated:
- For each of the collector's top collections, fetch floorPrice
- Multiply floorPrice by ownedCount for that collection
- Sum across all collections

This is a directional estimate, not a precise portfolio valuation.
Many NFTs will have no active floor listing and will contribute 0.
The product should treat this number as a rough input for fun math,
not as financial data.

Fields (internal only):
- estimatedValueETH (float)
- collectionsIncluded (number of collections used in the estimate)
- collectionsWithNoFloor (number skipped due to null floor price)

---

## WalletConverterResult

The output of the Wallet Converter calculation.

Fields:
- targetCollectionName
- targetCollectionSlug
- targetCollectionImage
- targetFloorPrice (internal only, not displayed)
- count (integer: Math.floor(estimatedValueETH / targetFloorPrice))
- estimateQuality: "high" | "medium" | "low"
  - high: most held collections had floor prices
  - medium: roughly half had floor prices
  - low: few had floor prices, estimate is rough

Display rule:
Show only count and targetCollectionName. Never show ETH amounts.
If estimateQuality is "low", show a light caveat in the UI.

---

## ActivityMonth

A single month bucket in the activity timeline.

Fields:
- year (number)
- month (number, 1-12)
- mintCount (number)
- buyCount (number)
- totalCount (mintCount + buyCount)

---

## ActivityTimeline

The full activity timeline for a wallet.

Fields:
- months: ActivityMonth[]
- busiestMonth: { year, month, totalCount }
- firstActivityMonth: { year, month }
- totalMonthsActive (number of months with at least 1 acquisition)
- mintRatio (float: total mints / total acquisitions)
- dataQuality: "full" | "capped"
  - full: all events fetched
  - capped: hit the 500-event V1 limit, earlier history may be missing

---

## CollectionRecommendation

A single collection recommendation result.

Fields:
- slug
- name
- imageUrl
- floorPrice (in ETH)
- categoryLabel
- reasonLine (one sentence explaining the recommendation)
- uniqueCollectorRatio (float)

---

## CollectionRecommendationSet

The full recommendation response for a wallet + price range.

Fields:
- priceRange: "under_0.1" | "0.1_to_0.5" | "0.5_to_2" | "above_2"
- recommendations: CollectionRecommendation[] (10 items)
- basedOn: string[] (the taste signals used to generate this set)
- cachedAt: ISO timestamp

---

## ComparisonResult

- sharedExactNfts[]
- sharedCollections[]
- sharedArtists[]
- wallet1TopCollection
- wallet2TopCollection

---

## pairInterpretation

Generated interpretive output for a comparison.

Purpose:
- Provides a narrative explanation of the relationship between two collectors
- Reveals underlying taste patterns, not just shared holdings
- Supports the mirror principle: helping collectors understand something
  about themselves through the lens of someone who made similar choices

Fields:
- headline
- summary

Notes:
- The headline should name the dynamic, not the data
- The summary should read as interpretation, not analysis
- This output must not include financial, rarity, or portfolio-value language

---

## Chemistry labels

The numeric chemistry score is calculated internally but never shown.
The user-facing experience uses qualitative labels only.

Labels:
- Strong Signal: 80 and above
- Kindred: 60 to 79
- Interesting Tension: 40 to 59
- Distant But Related: below 40

Purpose:
- Makes chemistry feel like a cultural read, not a clinical score
- Reduces over-focus on numeric methodology
- Keeps the product aligned with resonance, not ranking

---

## Profile API Response

Default:
{
  wallet: string;
  profile: WalletProfile;
}

Debug (optional via ?debug=1):
{
  wallet: string;
  profile: WalletProfile;
  debug: object;
}

---

## Delight Layer API Responses

These endpoints are called lazily, never on initial profile load.

GET /api/converter?wallet={address}
{
  estimatedValueETH: number; (internal, not surfaced in UI)
  collectionsUsed: number;
  estimateQuality: "high" | "medium" | "low";
}

GET /api/converter/search?q={query}
{
  results: CollectionSearchResult[];
}

GET /api/converter/calculate?wallet={address}&slug={slug}
{
  result: WalletConverterResult;
}

GET /api/timeline?wallet={address}
{
  timeline: ActivityTimeline;
}

GET /api/recommendations?wallet={address}&priceRange={range}
{
  recommendations: CollectionRecommendationSet;
}