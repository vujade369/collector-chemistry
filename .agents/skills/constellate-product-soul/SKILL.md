name: constellate-product-soul
description: Preserve Constellate’s product meaning, language, ethical boundaries, and build discipline. Use before product, UI, interpretation, comparison, scoring, profile, converter, or docs/agent work.
compatibility: Repo-local guidance for GPT, Claude, Codex, Cursor, and human builders.
metadata:
  owner: Constellate
  status: active
---

# Constellate Product Soul

## Purpose

Use this skill to keep Constellate from drifting into a generic NFT dashboard, marketplace, valuation tool, leaderboard, or compatibility app.

Constellate reads cultural signal, taste, overlap, and collecting behavior from wallets. It helps people see the pattern in what they keep, then discover where that pattern overlaps with someone else.

Core thesis:

> What you keep becomes a pattern.  
> What overlaps becomes recognition.

## Product question first

Before changing anything, define the user-facing question.

Ask:

1. What question is this feature, fix, or copy answering?
2. What data source answers it most directly?
3. What is the smallest safe change?
4. How will we prove it with terminal output, API output, or visible UI?

If the product question is unclear, return a plan instead of editing.

## What Constellate is

Constellate is:

- interpretive
- behavior-led
- human
- editorial
- accurate
- proof-aware
- culturally observant without becoming judgmental

It should help a collector understand:

- what they return to
- what they keep
- what patterns show up across their wallet
- where those patterns overlap with another person
- what shared worlds or crossing points appear

## What Constellate is not

Do not turn Constellate into:

- a finance dashboard
- a marketplace
- a leaderboard
- a generic analytics app
- a compatibility score
- a trading product
- a portfolio valuation tool
- a social ranking system

Market, floor, and offer data may appear in utility modules, but financial value should not become the center of the product experience.

## Language rules

Prefer language like:

- constellation
- pattern
- recognition
- overlap
- shared worlds
- shared stars
- crossing points
- signal points
- what people keep
- where this wallet returns
- how this wallet formed
- collecting rhythm

Avoid user-facing language like:

- compatibility
- match score
- ranking
- portfolio score
- alpha
- financial performance
- generic dashboard
- wallet analytics

Use careful interpretive language:

- “suggests”
- “appears”
- “points to”
- “shows a pattern of”
- “based on visible wallet activity”

Avoid overclaiming:

- “proves”
- “means”
- “reveals who they are”
- “definitively shows”

## Wallet interpretation rules

A wallet is a partial record, not a complete identity.

Do not infer sensitive identity traits from wallet behavior.

Do not rank collectors by:

- worth
- taste
- status
- intelligence
- wealth
- seriousness
- cultural value

Separate facts from interpretation.

Hard facts include:

- wallet address
- token ID
- contract address
- collection slug
- OpenSea URL
- NFT count
- collection count
- source-supported event timestamps

Confidence-sensitive fields include:

- category classification
- artist attribution
- acquisition type
- collector archetype
- recommendations
- taste pattern
- behavior labels
- recognition language

When data is incomplete, make uncertainty visible.

## UI direction

Constellate UI should feel:

- editorial, not SaaS-generic
- interpretive, not transactional
- restrained, not cluttered
- quietly premium, not flashy
- legible, not overexplained
- human, not forensic

Prefer:

- proof near claims
- specific visible examples
- clear hierarchy
- meaningful empty states
- deep reliable links
- calm pacing
- restrained motion

Avoid:

- noisy metrics
- generic dashboard cards
- vague insight copy
- ranking tables
- finance-first modules
- unsupported personality claims

## Data source boundaries

Use the right source for the job.

Alchemy is for:

- bulk wallet ownership
- metadata attached to ownership records
- transfer facts
- acquisition timestamps

OpenSea is for:

- marketplace visibility
- hidden/spam filtering
- account identity
- collection slugs
- collection images
- NFT and collection links
- offers
- floors
- collection search

Constellate logic is for:

- taste categories
- archetypes
- interpretation
- overlap scoring
- behavior labels
- user-facing meaning

Do not make one source do another source’s job.

## Converter boundary

The converter answers one specific question:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

Do not turn this into floor-based wallet valuation.

Rules:

- Count actionable ETH/WETH offers.
- Count small collection-wide bids if they are actionable.
- Deduplicate unique NFTs before summing.
- Do not filter out small offers merely because they are small.
- Debug output should prove the math.

## Safe build behavior

Prefer small, safe, testable changes.

Do not casually change:

- API response contracts
- profile route shape
- compare route shape
- NFT fetching
- hidden/spam filtering
- OpenSea integration
- Alchemy integration
- converter math
- interpretation prompts
- large page files

If the right fix requires more scope, stop and explain why.

## Verification

Default checks after edits:

```bash
git diff --name-only
npx tsc --noEmit
git status

For docs/agent/governance changes:

npm run agents:check
npm run docs:check
npm run skills:check

For broader governance checks:

npm run governance:check

Do not claim verification unless the command was actually run.

Required output after work

After any edit, report:

files changed
behavior changed
behavior preserved
checks run
known issues or follow-ups
whether anything was outside scope

## Why I’d stop there

After adding that one file, run:

```bash id="oxvmgl"
npm run agents:check
npm run docs:check
npm run skills:check
git diff --name-only