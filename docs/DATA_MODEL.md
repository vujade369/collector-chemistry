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

* address
* ensName
* displayName
* avatarUrl
* bannerUrl
* totalNfts

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