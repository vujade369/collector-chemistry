# Collector Chemistry — Insight Engine

## What this is

The Insight Engine is the layer that translates raw wallet data into meaningful interpretation.

It sits between:

* the data layer (what exists)
* the interpretation layer (how it’s expressed)

Its role is to detect patterns in a collector’s behavior and convert them into signals that can be articulated as identity.

If the data layer is observation, and the interpretation layer is language,
the Insight Engine is pattern recognition.

---

## Governing principle

Do not describe what someone owns.

Surface patterns they haven’t consciously named yet.

The goal is not accuracy alone.
The goal is recognition.

A good output should make someone feel:

“This is true.”
or
“I didn’t realize that about myself… but yeah.”

---

## Signal framework (V1)

The system uses six signals only. No more.

Each signal represents a different dimension of collecting behavior.

### 1. Concentration

Where attention sits.

Measures:

* % of wallet in top 1 collection
* % of wallet in top 2 collections

This reveals:

* focus vs distribution
* conviction vs exploration

---

### 2. Breadth vs Depth

How the collector moves across collections.

Measures:

* total collections
* average NFTs per collection

This reveals:

* sampling vs commitment
* curiosity vs conviction

---

### 3. Time Shape

How collecting behavior unfolds over time.

Measures:

* first acquisition date
* last acquisition date
* clustering vs spread of activity

This reveals:

* burst behavior vs steady presence
* early vs late engagement

---

### 4. Category Lean

What kinds of things draw attention.

Measures:

* % breakdown across categories (PFP, art, meme, etc.)

This reveals:

* aesthetic preference
* cultural alignment

---

### 5. Entry Behavior

How the collector enters positions.

Measures:

* mint vs secondary acquisition ratio

This reveals:

* early participation vs reactive entry
* risk vs confirmation

---

### 6. External Attention

How the market or others respond.

Measures:

* favorites, offers, or activity (light use)

This reveals:

* alignment vs independence from broader attention

---

## Signal states

Each signal resolves into a small set of qualitative states.

These are internal labels used to generate meaning.

---

### Concentration

* high_concentration
* balanced
* low_concentration

---

### Breadth

* broad_sampler
* focused_collector
* balanced

---

### Time

* early_entrant
* recent_entrant
* burst_collector
* steady_collector

---

### Category

* pfp_heavy
* art_heavy
* mixed

---

### Entry

* mint_heavy
* secondary_heavy
* mixed

---

### External attention

* aligned_with_attention
* independent_taste

---

## Meaning layer

Each state implies something about the collector.

These meanings are never shown directly.
They are used to generate interpretation.

---

### Examples

broad_sampler
→ curious
→ exploratory
→ non-committal per collection

focused_collector
→ conviction-driven
→ selective
→ identity anchored in fewer projects

high_concentration
→ attention clusters
→ strong attachment

burst_collector
→ emotionally or moment-driven
→ reactive to periods of intensity

independent_taste
→ not driven by external validation
→ internally guided

---

## Pattern line

The Pattern line is the simplest expression of the Insight Engine.

It combines 2–3 signal states into a short identity phrase.

Examples:

* Broad explorer, selective picker
* Focused collector, high conviction
* Curious sampler, low repetition
* Early entrant, long-term holder

The Pattern line should feel:

* memorable
* slightly revealing
* not generic

---

## Identity paragraph system

The identity paragraph expands on the Pattern line.

It follows a consistent structure:

1. How they move
2. Where attention sits
3. What that suggests
4. How they behave over time

---

### Example structure

“You tend to [behavior].

Most of your attention sits in [collections or category].

Your collection is [concentration insight], suggesting [meaning].

Your activity [time behavior].”

---

### Example output

“You move across collections picking specific pieces rather than committing fully to one. Most of your attention sits in PFP-driven projects, with smaller movement into independent art. Your collection is spread broadly rather than concentrated, suggesting exploration over conviction. Your activity comes in bursts rather than steadily over time.”

---

## Contrast layer (optional, V1 light)

The system may surface one contrast insight:

External attention vs personal behavior.

Example:

“This piece draws the most attention in your wallet, but it’s not where most of your collection sits.”

This reveals tension between:

* what others notice
* what the collector actually returns to

---

## Voice rules

All outputs must follow the product voice:

* interpretive, not descriptive
* specific, not generic
* identity language, not category language
* no financial framing
* no scoring language
* no hype

Avoid:

“You have a diverse collection”
“You own a mix of NFTs”

Prefer:

“You tend to…”
“You return to…”
“Your attention sits…”

---

## Quality test

Before any output is used:

1. Does it describe behavior, not inventory?
2. Does it surface a pattern, not just a fact?
3. Could the user recognize themselves in it?
4. Does it avoid generic language?

If not, it fails.

---

## Relationship to other systems

* Data layer → provides inputs
* Insight Engine → detects patterns
* Interpretation layer → expresses meaning

The Insight Engine should never generate long-form text directly.
It provides structured signals that the interpretation layer turns into language.

---

## V1 constraint

Keep it lean.

* No more than 6 signals
* No more than 2–3 states combined per output
* No additional modules or visualizations

Depth comes from interpretation, not feature count.
