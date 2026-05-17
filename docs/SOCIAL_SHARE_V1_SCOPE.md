# Social Share V1 Scope

## Product question

How can Constellate make its best result objects easy to share on Farcaster and X without becoming platform-native in V1?

## V1 stance

Constellate is a web product first.

For V1, Farcaster and X are sharing surfaces only. They should help Wallet Reads, Compare results, and Named Orbits travel better, but neither platform should become a login system, app surface, wallet connection layer, posting dependency, or data dependency.

The goal is not to integrate deeply with social platforms. The goal is to make Constellate results travel cleanly through them.

## In scope for V1

- Stable result URLs:
  - `/profile?wallet=`
  - `/compare?a=&b=`
  - `/orbit?seed=&name=&from=`

- Platform-compatible metadata on result pages:
  - Open Graph tags
  - X/Twitter card tags
  - Farcaster-compatible metadata where achievable without SDKs or platform infrastructure

- Dynamic OG images for:
  - Named Orbit
  - Compare
  - Wallet Read

- Share copy built for both Farcaster and X:
  - short generated caption
  - clean result URL
  - object-specific CTA language
  - no dependency on direct posting APIs

- Share/cast buttons that copy useful generated text

- Visitor entry CTAs on shared result pages:
  - Wallet Read → Read your own wallet
  - Compare → Compare your wallet
  - Named Orbit → Remix this orbit

- Object-specific CTA language:
  - Read yours
  - Compare yours
  - Remix orbit

## Out of scope for V1

- Sign in with Farcaster
- Sign in with X
- Farcaster Mini App
- X app/API integration
- Farcaster wallet connection
- Posting directly through any platform API
- Notifications
- Farcaster social graph analysis
- X social graph analysis
- Farcaster profile enrichment unless later proven trivial
- X profile enrichment unless later proven trivial
- Farcaster CLI usage
- Farcaster SDK installation
- Farcaster MCP setup
- X API setup

## Priority order

1. Stable result URLs

2. Named Orbit + Remix

3. Named Orbit share readiness:
   - share caption
   - OG image
   - Open Graph metadata
   - X/Twitter card metadata
   - Farcaster-compatible metadata
   - clear visitor CTA

4. Compare share readiness:
   - share caption
   - OG image
   - Open Graph metadata
   - X/Twitter card metadata
   - Farcaster-compatible metadata
   - clear visitor CTA

5. Wallet Read share readiness:
   - share caption
   - OG image
   - Open Graph metadata
   - X/Twitter card metadata
   - Farcaster-compatible metadata
   - clear visitor CTA

## Definition of done

A shared Constellate result link unfurls cleanly on Farcaster and X with:

- a readable preview image
- accurate title and description metadata
- object-specific CTA language
- a generated caption the user can copy or edit
- a clear next action for the viewer

The product still works exactly the same without Farcaster or X.

## Build rule

Do not install Farcaster, X, or platform-specific packages until the core web sharing flow exists.

For V1, platform support should be implemented through normal web sharing primitives first: stable URLs, metadata, OG images, and share copy.

No SDK, API, CLI, MCP, auth, or posting integration should be added unless the core web sharing loop is already working and there is a clear product reason to go deeper.