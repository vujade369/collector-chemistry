# Data Model

## NFT

* tokenId
* name
* imageUrl
* collectionName
* collectionSlug
* contractAddress
* traits[]
* openseaUrl

Potential future field:
- acquisitionDate (ISO timestamp) for time-based profile reads when available

## WalletProfile

Current profile object returned from `/api/profile`.

Fields:
- totalNFTs
- topCollections
- categoryDistribution
- categorySourceBreakdown
- previewNFTs

## previewNFTs

A small array of NFTs used by the profile page for visual preview.

Purpose:
- lets the profile page render NFT images without relying on debug data
- should be part of the normal `profile` response
- should stay lightweight

Required shape:
- tokenId
- name
- imageUrl
- collectionName
- collectionSlug
- contractAddress

## CollectionSummary

* collectionName
* collectionSlug
* ownedCount
* nfts[]

## ComparisonResult

* sharedExactNfts[]
* sharedCollections[]
* sharedArtists[]
* wallet1TopCollection
* wallet2TopCollection

## pairInterpretation

Generated interpretive output for a comparison.

Purpose:
- Provides a narrative explanation of the relationship between two collectors
- Reveals underlying taste patterns, not just shared holdings
- Supports the mirror principle by helping collectors understand something about themselves

Fields:
- headline
- summary

Notes:
- The headline should name the dynamic, not the data
- The summary should read as interpretation, not analysis
- This output should not include financial, rarity, or portfolio-value language

## Chemistry labels

The numeric chemistry score may be calculated internally, but the user-facing experience should favor qualitative labels.

Labels:
- Strong Signal: 80+
- Kindred: 60–79
- Interesting Tension: 40–59
- Distant But Related: below 40

Purpose:
- Makes chemistry feel like a cultural read, not a clinical score
- Reduces over-focus on numeric methodology
- Keeps the product aligned with resonance, not ranking

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
