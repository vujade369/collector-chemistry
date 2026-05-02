# Collector Chemistry Wallet Converter Spec

## Core behavior

The converter estimates theoretical reach for a selected OpenSea collection using wallet-owned NFT offers.

Formula:

- detectedOfferValueETH / selectedCollectionFloorETH = estimatedCount

## Wallet-side value

Wallet-side value is not collection floor math.

It is:

- active offers on wallet-owned NFTs only
- highest current offer per wallet-owned NFT checked
- ETH and WETH only, treated as ETH-equivalent

It does not:

- use USD value
- convert USD to ETH
- use floor price of wallet-held collections for wallet-side value
- count offers for NFTs outside the wallet

## Search and target collection

Collection search uses OpenSea canonical search pathways and should prioritize:

- exact normalized name matches
- verified or safelist signals when available
- results with usable positive floor values

## Floor source

Target floor should use OpenSea collection listing and stats pathways:

- best listing first
- collection stats floor fallback

## Reliability and safety

This is a rough estimate toy. It is not financial advice and not a guarantee.

It should gracefully handle:

- missing OpenSea API key
- no target floor
- no wallet offers
- OpenSea errors and rate limits
- ambiguous or low-confidence collection search

Use caps, short timeouts, and request-scoped caching to remain responsive.
