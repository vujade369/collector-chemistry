# Collector Chemistry — Interpretation Layer Handoff

## What this is
A complete brief for implementing the "why this match" interpretation layer in Collector Chemistry. Everything here has been designed and tested at the conceptual level and is ready for implementation.

---

## The governing principle

The comparison is a mirror, not a match.

The goal is not to summarize overlap. The goal is to help each collector understand something true about themselves through the lens of someone who made similar choices.

The comparison is the mechanism. Self-recognition is the outcome.

This principle should shape every decision in the implementation. If the output reads like a data summary, it has failed regardless of how accurate the data is.

---

## The five collector archetypes

**The Artist Follower**
Loyal, deep, driven by belief in people not projects. Collects around specific artists and follows their entire trajectory. The wallet is a record of conviction. Driven by the question: who is worth staying with?

**The Explorer**
Early, restless, ecosystem-agnostic. Always somewhere new, always present at the moment something becomes real. The wallet is a map of arrivals. Driven by the question: what is just becoming real right now?

**The Scene Player**
Multiplayer-native. The collection is a social act. Community and collection are inseparable. The wallet only makes sense in context. Driven by the question: where is the energy and am I inside it?

**The Curator**
Slow, deliberate, building something permanent. Every piece earns its place. Indifferent to social context or market movement. The wallet is a room someone has been building for years. Driven by the question: what is actually worth keeping?

**The World Citizen**
Wide range, deep curiosity, present across ecosystems, formats, and communities. Gaming, music, immersive environments. Collects things you step into rather than look at. Driven by the question: what worlds are worth inhabiting?

---

## The chemistry label system

The score is calculated behind the scenes but never shown as a number. What the user sees is a qualitative label.

| Label | Score Range | What it signals |
|---|---|---|
| Strong Signal | 80 and above | The overlap is real and close to the surface. These two collectors are operating in genuinely adjacent territory. |
| Kindred | 60 to 79 | Different paths, recognizable instincts. The chemistry is there but it takes a moment to see why. |
| Interesting Tension | 40 to 59 | Not obvious common ground. But something real underneath the difference. |
| Distant But Related | Below 40 | These two don't obviously belong together. That's what makes this worth reading. |

---

## The scoring logic

From the existing spec, unchanged.

- Shared collections: 50% weight
- Shared ecosystems: 20% weight
- Shared taste tags: 30% weight

The calculated score feeds the label system invisibly. The label is what renders in the UI.

---

## The interpretation generation system

### Inputs required before generating

**Archetype A**
How this collector moves, what drives them, what they're indifferent to.

**Archetype B**
Same for the second collector.

**Surface overlap**
Shared collections, ecosystems, taste tags from the data layer.

**Chemistry score**
The calculated number that determines the label and sets the emotional temperature.

**Relationship dynamic**
Before writing, identify the dominant dynamic between the two archetypes. This is an internal lens, not something shown to the user.

- Same instinct, different expression
- Different instincts, shared sensitivity
- Distant, but connected by a deeper thread
- Parallel, but rarely intersecting

---

### The five-part structure

Every interpretation follows these five moves in order.

**1. Headline**
One line. Names the dynamic, not the data. Creates tension or curiosity. Never describes overlap directly. Never uses category language.

Good: "One moves fast to find it. One moves slow to keep it."
Bad: "Two collectors with significant ecosystem overlap."

**2. Separation**
Describes how each collector moves through culture. Written in identity language, not category language. Each collector should feel individually recognizable before they see themselves together.

Test: could each collector read their half and think "yes, that's me" before reaching the turn?

**3. The gap**
Acknowledges the real difference honestly. Does not paper over it. The lower the chemistry score the more directly this needs to be stated. This is what earns the right to land the turn.

- High chemistry: brief, almost a footnote
- Low chemistry: direct, given full weight

**4. The turn**
The mirror moment. The shared instinct beneath the surface difference. Goes one level deeper than taste or collection overlap. Not "you both collect generative art" but what that choice reveals about both of them as people.

Test: does this make someone pause? Does it say something true about them that the data made visible but only interpretation can articulate?

**5. Closing line**
Short. Resonant. Leaves space. Not a summary. A weight.

---

### Voice rules

- Write in identity language, not category language
- Let the difference be real before resolving it
- Go one level deeper than the data
- Match emotional temperature to the chemistry score and label
- Say the insight once, clearly, then stop
- No financial language, no rarity language, ever

---

### Emotional temperature by label

**Strong Signal (80+)**
Warm, kinetic, high recognition. The connection feels close to inevitable. Don't oversell it. Let it land.

**Kindred (60-79)**
Grounded, considered, a quiet recognition between two people who don't always find each other. The turn should feel surprising but true.

**Interesting Tension (40-59)**
Cool, unresolved, almost melancholic. Two collectors who are more alike than they first appear but won't fully converge. The gap deserves real weight before the turn.

**Distant But Related (below 40)**
Honest. The distance is acknowledged directly. The thread is real but required going all the way down to find it. The value here is insight, not compatibility.

---

### The generation prompt

Use this exactly when calling the model to generate interpretations.

```
You are writing a "why this match" interpretation for Collector Chemistry.

The goal is not to summarize overlap.
The goal is to help each collector understand something true about themselves
through the lens of someone who made similar choices.

The comparison is the mechanism.
Self-recognition is the outcome.

Inputs:
- Archetype A: [how they move, what drives them]
- Archetype B: [how they move, what drives them]
- Surface overlap: [shared collections, ecosystems, tags]
- Chemistry score: [0-100]
- Chemistry label: [Strong Signal / Kindred / Interesting Tension / Distant But Related]

Before writing, identify the relationship dynamic between the two collectors:
- Same instinct, different expression
- Different instincts, shared sensitivity
- Distant, but connected by a deeper thread
- Parallel, but rarely intersecting

Structure:
1. Headline — names the dynamic, not the data
2. Separation — each collector individually recognizable
3. The gap — acknowledge the real difference, earn the turn
4. The turn — shared instinct one level beneath the surface
5. Closing line — resonant, not explanatory

Voice rules:
- Identity language, not category language
- One level deeper than the data
- Let the difference be real before resolving it
- Match tone to the chemistry label
- Say the insight once, clearly, then stop
- No financial or rarity language

The output should feel like a genuine read, not a generated summary.
It should make someone pause.
```

---

### The quality test

Before any interpretation ships, check four things.

1. Does each collector recognize themselves in their half before the turn?
2. Does the turn go one level beneath the surface overlap?
3. Could someone read the closing line out loud and feel it land?
4. Does the emotional temperature match the chemistry label?

If any of these fail, the interpretation is not finished.

---

## Reference interpretations

Four tested examples across the full emotional range. Use these as the quality benchmark.

---

### Strong Signal — Scene Player and World Citizen (87)

**Headline**
You're not just in the same world. You're building it.

**Interpretation**
Some pairings reveal hidden common ground. This one reveals something you probably already sensed.

One wallet is a record of deep community embeddedness. The collections here don't make sense outside their context. They came from scenes, from moments of collective presence, from the particular energy of being inside something while it was forming. This collector doesn't just observe culture. They participate in it as an act of identity.

The other wallet extends that instinct further. Not just one scene but many. Gaming worlds, music ecosystems, immersive environments. Places you step into and spend real time inside. The common thread isn't format or category. It's a fundamental orientation toward collection as inhabitation rather than acquisition.

What this reveals is not just shared taste.

It's a shared belief that the most meaningful things you can hold are the ones that were alive when you found them. Not objects observed from a distance but worlds you were actually inside of.

You both collect like participants, not spectators.

That's not common.

---

### Kindred — Artist Follower and Scene Player (74)

**Headline**
Different reasons. Same room.

**Interpretation**
One of you follows people. The other follows energy.

You've ended up in a lot of the same places, but you got there through completely different doors. One wallet reads like a record of belief, specific artists, specific moments, a collection that says I was paying attention to this person before most people were. The other reads like a record of presence, communities joined, scenes inhabited, the kind of collecting that only makes sense if you were actually there.

What that reveals is something more interesting than shared taste.

You both have a finely tuned instinct for what's alive. One of you finds it in people. The other finds it in rooms. But the thing you're both tracking, that quality of something being genuinely real and worth showing up for, is identical.

That's rarer than it looks.

---

### Interesting Tension — Explorer and Artist Follower (58)

**Headline**
You've been in the same places. Just never at the same time.

**Interpretation**
There's something almost cinematic about this pairing.

One wallet is a record of arrivals. New ecosystems, emerging artists, formats that didn't have names yet when this collector found them. The pattern isn't loyalty. It's instinct. A finely tuned sensitivity to the moment something is becoming real, followed by the quiet compulsion to move on once it is.

The other wallet is a record of commitment. Fewer artists, deeper presence, the kind of collection that only forms when someone decides a person's entire trajectory is worth following. Not just a piece. A practice. A belief that some artists are worth staying with through everything.

Here is the irony this pairing reveals.

The Explorer likely discovered several of the artists this collector is now devoted to. They were there at the origin. They recognized the signal early. And then they moved on to the next thing, which the Artist Follower will probably never do.

Neither of these is the wrong way to collect. But they are a genuinely different relationship to what it means to believe in something.

One of you believes in the moment. The other believes in the person.

What you share is the quality of attention that made you both stop and look in the first place.

---

### Distant But Related — Curator and Scene Player (38)

**Headline**
You probably wouldn't find each other. That's what makes this interesting.

**Interpretation**
These two wallets don't obviously belong in the same conversation.

One is a record of deep solitude. Pieces chosen slowly, held with conviction, indifferent to what anyone else is doing. There's no social logic to this collection. It doesn't perform. It doesn't participate. It simply accumulates the evidence of one person's very specific sense of what is worth keeping.

The other is almost entirely relational. The collection doesn't fully make sense outside the communities it came from. It's a record of presence, of showing up, of being part of something while it was alive. Every piece carries the energy of the room it came from.

On paper these two have almost nothing in common.

But here is what's true about both of you.

You both take it seriously. Not as an investment. Not as a status signal. As a practice. One of you has built a private world and tended it carefully. The other has shown up, repeatedly, to worlds built by others and recognized what mattered inside them.

That's not the same thing. But it comes from the same place. A refusal to collect casually.

---

## What does not belong here

The interpretation layer should never include:

- Floor prices or financial framing
- Rarity signals
- Portfolio size or value comparisons
- Recommendations to buy or sell
- Judgment about which collector is more sophisticated
- Manufactured warmth that isn't supported by the data

If any of these appear in output, the generation prompt needs to be tightened.

---

## Implementation notes

The archetype for each wallet is inferred from the collection data, not selected by the user. The inference logic maps taste tags, ecosystem signals, and collection patterns to the five archetypes defined above.

A wallet may show signals of more than one archetype. In that case use the dominant signal, the one with the most collection weight behind it.

The generation prompt goes in the compare API route. It receives archetype assignments and surface overlap data as inputs and returns the five-part interpretation as output.

The chemistry label renders in the UI in place of the numeric score. The number is used internally only.
