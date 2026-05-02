# Collector Chemistry Wallet Converter Spec

## Product intent

The converter answers:

If this wallet sold into current bids and offers, roughly how many NFTs from a selected OpenSea collection could it reach.

This is an estimate toy. It is not financial advice, and not a portfolio valuation.

## Estimation model

Converter math:

- detected wallet offer value / selected collection floor price = estimated count

Where:

- detected wallet offer value = sum of active OpenSea offers detected on checked wallet-owned NFTs
- selected collection floor price = current OpenSea best listing, with collection stats fallback when needed

Use careful language:

- Detected offer value
- Based on active offers detected across this wallet
- Rough estimate
- Floors, offers, fees, royalties, and liquidity change

Avoid language:

- total value
- portfolio value
- guaranteed
- worth exactly

## OpenSea integration behavior

OpenSea is the preferred source for:

- canonical collection search
- collection slug identity
- floor and listing signals
- active offer signals

Search should prioritize canonical and safelisted collections when OpenSea exposes that signal.

## Safety and fallback behavior

Converter should gracefully handle:

- missing OpenSea API key
- ambiguous search results
- no reliable floor for target collection
- no active offers detected for checked wallet NFTs
- partial coverage from capped candidate checks

The converter should never crash the profile page when marketplace data is unavailable.
