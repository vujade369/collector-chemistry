# Farcaster V1 Scope

## Product question

How can Constellate make its best result objects easy to share on Farcaster without becoming Farcaster-native in V1?

## V1 stance

Constellate is a web product first.

For V1, Farcaster is a sharing surface only. It should help Wallet Reads, Compare results, and Named Orbits travel better, but it should not become a login system, app surface, wallet connection layer, or data dependency.

## In scope for V1

- Stable result URLs:
  - `/profile?wallet=`
  - `/compare?a=&b=`
  - `/orbit?seed=&name=&from=`
- Farcaster-compatible meta tags on result pages
- Dynamic OG images for:
  - Named Orbit
  - Compare
  - Wallet Read
- Share/cast buttons that copy useful generated text
- Object-specific CTA language:
  - Read yours
  - Compare yours
  - Remix orbit

## Out of scope for V1

- Sign in with Farcaster
- Farcaster Mini App
- Farcaster wallet connection
- Posting directly through an API
- Notifications
- Farcaster social graph analysis
- Farcaster profile enrichment unless later proven trivial
- Farcaster CLI usage
- Farcaster SDK installation
- Farcaster MCP setup

## Priority order

1. Stable result URLs
2. Named Orbit + Remix
3. Share captions
4. OG images
5. Farcaster-compatible metadata

## Definition of done

A shared Constellate result link looks good when posted on Farcaster and gives the viewer a clear next action.

The product still works exactly the same without Farcaster.

## Build rule

Do not install Farcaster packages or add Farcaster-specific infrastructure until the core web sharing flow exists.

For V1, Farcaster support should be implemented through normal web sharing primitives first: stable URLs, metadata, OG images, and share copy.