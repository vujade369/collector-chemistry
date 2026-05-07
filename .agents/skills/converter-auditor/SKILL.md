---
name: converter-auditor
description: Use for Collector Chemistry / Constellate converter work involving offer math, best active ETH/WETH offers, unique NFT dedupe, wallet resolution, OpenSea lookup, debug proof, and active-offer divided by target-floor validation. Plan first; do not implement unless explicitly asked.
---

# Converter Auditor

Protects the WalletConverter's data path, math, resolver behavior, dedupe, and debug proof.

## Converter question

The converter answers:

If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

## Start here

- Read `.agents/agents/ORCHESTRATOR.md`.
- Route math, offer selection, resolver use, MCP/debug output, and API behavior as Data / API.
- Read the Data / API docs named by the orchestrator and any converter implementation docs that exist.

## Guardrails

- Plan first; do not implement unless explicitly asked.
- Do not convert the feature into floor-based wallet valuation.
- Deduplicate unique NFTs before summing offers.
- Count small actionable collection-wide bids when they are valid active ETH/WETH offers.
- Do not filter offers arbitrarily to make totals look cleaner.
- Prefer shared wallet resolver and search helpers over route-local parsing.
- Do not change API response contracts without explicit approval and consumer review.
- Keep UI changes separate from data/API changes unless the user approves a mixed phase.

## Verification

- Use debug curl for the converter path.
- Check the formula: summed best active ETH/WETH offers on unique NFTs divided by target collection floor.
- Verify single-wallet and multi-wallet inputs.
- Verify resolver paths: raw address, ENS, OpenSea profile URL, invalid input.
- Include terminal proof in the final report.
