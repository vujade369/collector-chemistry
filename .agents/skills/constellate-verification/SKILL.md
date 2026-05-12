---
name: constellate-verification
description: Verify Constellate changes with the smallest reliable proof command for the task type. Use after docs, agents, UI, API, converter, resolver, interpretation, or code-health work.
compatibility: Repo-local guidance for GPT, Claude, Codex, Cursor, and human builders.
metadata:
  owner: Constellate
  status: active
---

# Constellate Verification

## Purpose

Use this skill to prove that a change did what it was supposed to do and did not touch more than it should have.

Verification is not a formality. It is the proof layer that keeps Constellate stable while the product evolves.

Do not claim a change is verified unless the relevant command was actually run and the result is known.

## Default verification rule

Every change should answer three questions:

1. What changed?
2. What stayed the same?
3. What proof shows it?

Default checks:

```bash
git diff --name-only
npx tsc --noEmit
git status
```

For broader changes, also run:

```bash
npm run lint
```

## Docs and agent verification

Use when work touches:

- `AGENTS.md`
- `CLAUDE.md`
- `.agents/**`
- governance scripts
- docs indexes
- workflow docs
- build-session docs
- repo-local skills

Run:

```bash
npm run agents:check
npm run docs:check
npm run skills:check
git diff --name-only
```

For full governance:

```bash
npm run governance:check
```

Also check for merge conflict markers when editing governance files:

```bash
grep -R "<<<<<<<\|=======\|>>>>>>>" -n AGENTS.md CLAUDE.md .agents docs scripts 2>/dev/null
```

## UI verification

Use when work touches:

- profile page UI
- compare page UI
- homepage input flows
- visual hierarchy
- CSS
- components
- copy placement
- interaction states

Run:

```bash
npx tsc --noEmit
```

Then inspect visually in browser when layout risk exists.

Check at minimum:

- desktop layout
- mobile layout when responsive CSS changed
- empty/loading/error states when affected
- reduced-motion behavior when animation changed
- link behavior when cards or entities changed

Do not use a passing TypeScript check as proof that UI looks correct.

## Data/API verification

Use when work touches:

- API response shape
- wallet profile logic
- compare logic
- resolver behavior
- OpenSea enrichment
- Alchemy fetching
- category grouping
- acquisition events
- current attention
- latest arrival
- market context

Run:

```bash
npx tsc --noEmit
```

Then run a focused route check for the changed endpoint.

Profile check:

```bash
curl -s "http://localhost:3000/api/profile?wallet=vuja-de.eth" -o /tmp/profile.json
python3 - <<'PY'
import json
p=json.load(open('/tmp/profile.json'))
print('wallet:', p.get('wallet'))
print('nftCount:', p.get('nftCount'))
print('collectionCount:', p.get('collectionCount'))
print('error:', p.get('error'))
PY
```

Compare check:

```bash
curl -s "http://localhost:3000/api/compare?a=vuja-de.eth&b=0x16f3d833bb91aebb5066884501242d8b3c3b5e61" -o /tmp/compare.json
python3 - <<'PY'
import json
p=json.load(open('/tmp/compare.json'))
print('chemistryScore:', p.get('chemistryScore'))
print('sharedCollections:', len(p.get('sharedCollections') or []))
print('error:', p.get('error'))
PY
```

Resolver check:

```bash
curl -s "http://localhost:3000/api/wallet/resolve?input=vuja-de.eth" -o /tmp/resolve.json
python3 - <<'PY'
import json
p=json.load(open('/tmp/resolve.json'))
print('address:', p.get('address'))
print('source:', p.get('source'))
print('error:', p.get('error'))
PY
```

## Converter verification

Use when work touches:

- converter offer math
- wallet offer precompute
- target collection floor math
- MCP/OpenSea offer parsing
- unique NFT dedupe
- converter debug output
- converter presentation proof lines

The converter product question is:

> If I accepted the best currently available ETH/WETH offer on every unique NFT in these wallet(s), how much liquid offer value would that produce, and how many of the chosen target collection could that buy at the current floor?

Single-wallet check:

```bash
curl -s "http://localhost:3000/api/converter/calculate?wallet=vuja-de.eth&slug=pudgypenguins&debug=1" -o /tmp/converter-single.json
python3 - <<'PY'
import json
p=json.load(open('/tmp/converter-single.json'))
print('detectedOfferValueETH:', p.get('detectedOfferValueETH'))
print('floorPriceETH:', (p.get('targetCollection') or {}).get('floorPriceETH'))
print('count:', p.get('count'))
print('offerCount:', p.get('offerCount'))
print('checkedNftCount:', p.get('checkedNftCount'))
print('candidateCount:', p.get('candidateCount'))
print('error:', p.get('error'))
PY
```

Multi-wallet check:

```bash
curl -s "http://localhost:3000/api/converter/calculate?wallet=vuja-de.eth,0x16f3d833bb91aebb5066884501242d8b3c3b5e61&slug=pudgypenguins&debug=1" -o /tmp/converter-multi.json
python3 - <<'PY'
import json
p=json.load(open('/tmp/converter-multi.json'))
print('detectedOfferValueETH:', p.get('detectedOfferValueETH'))
print('floorPriceETH:', (p.get('targetCollection') or {}).get('floorPriceETH'))
print('count:', p.get('count'))
print('offerCount:', p.get('offerCount'))
print('checkedNftCount:', p.get('checkedNftCount'))
print('candidateCount:', p.get('candidateCount'))
print('error:', p.get('error'))
PY
```

Expected proof:

- `checkedNftCount` represents unique NFTs, not repeated paged rows.
- `offerCount` should not equal an artificial pagination cap.
- `detectedOfferValueETH` should be plausible relative to visible actionable offers.
- `count` should equal offer value divided by target floor, using existing route rounding.
- Small actionable ETH/WETH collection-wide bids should still count.

## OpenSea verification

Use when work touches:

- OpenSea account identity
- collection slugs
- collection images
- NFT or collection links
- visible inventory filtering
- hidden/spam behavior
- offers
- floors
- listings
- collection search

Proof expectations:

- Verify the exact endpoint/schema before parser changes.
- Test one known entity before batch behavior.
- Do not run broad parallel OpenSea checks without need.
- Confirm graceful fallback for missing key, 404, 429, or incomplete data when relevant.
- Confirm no runtime code shells out to CLI, MCP, or local scripts.

OpenSea read-only/security policy check:

```bash
npm run skills:check
```

## Alchemy verification

Use when work touches:

- wallet NFT ownership fetching
- Alchemy pagination
- transfer history
- acquisition timestamps
- metadata normalization
- Alchemy fallback behavior

Proof expectations:

- page count is visible
- fetched count is visible
- returned count is visible
- break reason is visible
- fallback reason is visible when fallback happens
- no ownership pages are capped or sampled without explicit product approval

## Interpretation verification

Use when work touches:

- AI-generated profile reads
- AI-generated compare summaries
- archetype labels
- taste interpretation
- behavior language
- prompts
- Groq/model route behavior

Check:

- facts are separated from interpretation
- claims have visible evidence nearby when possible
- uncertainty is not hidden
- no sensitive identity traits are inferred
- no collector is ranked by worth, taste, status, wealth, seriousness, or cultural value
- language feels like recognition, not judgment

Run:

```bash
npx tsc --noEmit
```

Then inspect representative output for at least one known wallet or comparison.

## Code health verification

Use when work touches:

- helper extraction
- file size cleanup
- duplication removal
- component extraction
- route organization
- non-behavioral refactors

Run:

```bash
git diff --name-only
git diff --stat
npx tsc --noEmit
git status
```

Proof expectations:

- no API shape changes unless explicitly scoped
- no visual hierarchy changes unless explicitly scoped
- no copy rewrites unless explicitly scoped
- no product meaning changes
- no dependency additions

## Report format after edits

After work, report:

1. files changed
2. behavior changed
3. behavior preserved
4. checks run
5. check results
6. known issues or follow-ups
7. whether anything changed outside scope

If a check was not run, say that directly.

## What not to do

Do not:

- claim “should pass” as verification
- treat TypeScript as visual QA
- treat a browser screenshot as API proof
- run broad refactors under cleanup language
- hide failing checks
- commit or merge known-broken runtime code
- add dependencies just to satisfy a cleanup pass
