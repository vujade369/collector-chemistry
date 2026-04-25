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