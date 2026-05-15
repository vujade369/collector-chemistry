---
name: constellate-data-reliability
description: Protect Constellate OpenSea, Alchemy, MCP, converter math, owner discovery, pagination, dedupe, visible inventory, fallbacks, and debug proof.
compatibility: Preferred core skill for data reliability. Existing data-source, OpenSea, converter, and verification skills remain valid supplemental guidance.
metadata:
  owner: Constellate
  status: preferred-core
---

# Constellate Data Reliability

## Purpose

Use this skill when work touches wallet data, OpenSea, Alchemy, MCP/debug discovery, owner completeness, visible inventory, converter math, offers, floors, pagination, dedupe, or fallback behavior.

## Source boundaries

- Alchemy is for bulk ownership, metadata attached to ownership records, transfer facts, acquisition timestamps, and pagination observability.
- OpenSea is for marketplace visibility, hidden/spam filtering, account identity, collection slugs/images, NFT and collection links, offers, listings, floors, and search.
- Constellate logic owns interpretation, recognition language, archetypes, and behavior labels.

## Non-negotiables

- Preserve OpenSea read-only policy in `.agents/policies/opensea-readonly.yaml`.
- Runtime code must not shell out to OpenSea CLI, MCP tools, or local scripts.
- Do not cap, sample, or skip ownership pages for speed without explicit product approval.
- Preserve visible inventory and hidden/spam filtering rules.
- Prefer no link over a wrong OpenSea link.
- Missing OpenSea data should degrade gracefully unless the feature specifically depends on it.

## Converter rule

The converter answers:

> If I accepted the best active ETH/WETH offer on every unique NFT in these wallet(s), how many of the target collection could that buy?

Preserve:

- active ETH/WETH offers only
- small actionable ETH/WETH offers count
- unique NFT dedupe before summing offers
- target floor math from the existing route behavior
- debug output that proves checked NFT count, offer count, total offer value, floor, and fallback reasons

## Proof

Use focused terminal proof:

- `npx tsc --noEmit` for code changes
- route-specific curl/debug checks for API/data changes
- `npm run skills:check` for OpenSea policy risk
- pagination, count, dedupe, fallback, and break-reason output when those paths are touched
