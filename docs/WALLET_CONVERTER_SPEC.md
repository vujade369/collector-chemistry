# Collector Chemistry — Wallet Converter UI Spec

## What this is

A surprise interactive toy at the bottom of the collector profile page.

It answers one question in the most fun way possible:

"If you sold everything in your wallet, how many of X could you get?"

This is not a financial tool. It is a moment of delight.
It should feel like the product winking at you.

---

## Placement

- Lives at the very bottom of the profile page
- After all core content: identity, taste map, signals, collections
- Separated from the section above by generous whitespace
- No section header that gives it away
- The intro line is the only setup

---

## The intro line

Large, quiet, slightly dramatic. This is the only framing the section gets.

  "If you sold it all..."

Typeset like a headline. Not a label. Not a button. Just a line that creates
a small pull of curiosity before the input appears.

Font: same display weight as the pattern line (font-weight 300)
Size: around 26px
Color: #f0ede6
Letter spacing: -0.025em

Below it, one short supporting line in muted text:

  "See what your wallet could become."

Size: 14px
Color: #a8a49d

---

## The search input

A single text input below the intro copy.

Placeholder:
  "Search any collection..."

Styling follows the existing input spec from DESIGN_SYSTEM.md:
- Background: #141414
- Border: 0.5px solid #2e2e2e
- Border radius: 10px
- Padding: 12px 14px
- Font size: 14px
- Focus border: #555
- Placeholder color: #3a3a3a

The input should feel like part of the page, not a form element.
No submit button. Results appear as the user types.

---

## The search dropdown

Appears below the input as the user types (after 2+ characters).

Shows up to 6 collection results.

Each result row:
- Collection image thumbnail (32x32, border radius 6px)
- Collection name
- Floor price shown dimly as orientation only: "0.34 ETH floor"
  (this is the only place ETH appears, and it is secondary)

Styling:
- Background: #111
- Border: 0.5px solid #222
- Border radius: 10px
- Each row padding: 10px 14px
- Hover state: background #141414
- Collection name: 13px, color #d8d5ce
- Floor price: 11px, color #444

Dismiss: clicking outside or pressing Escape closes the dropdown.

---

## The result moment

This is the payoff. It replaces the search input on selection.

The result should feel like a reveal, not a readout.

Layout:
- The number is the hero
- Collection name sits below it
- Nothing else except a small caveat and a reset link

The number:
- Font size: 64px (mobile: 48px)
- Font weight: 300
- Letter spacing: -0.04em
- Color: #f0ede6
- Animate in: fade up from 8px below, 400ms ease

Collection name:
- "Pudgy Penguins" (just the name, no other label)
- Font size: 16px
- Color: #a8a49d
- Appears 200ms after the number

Example full display:

  47
  Pudgy Penguins

Caveat (below, after another 200ms):
- "Rough estimate based on current floor prices"
- Font size: 11px
- Color: #444
- Letter spacing: 0.02em

Reset link:
- "Try another collection →"
- Font size: 12px
- Color: #555
- Hover: #888
- Clicking resets to the search input state
- Appears 400ms after the caveat

---

## Edge cases

### No floor price for target collection
Show:
  "No active floor listing found for this collection."
In color #555, 13px. Reset link still appears.

### Wallet estimate is very low quality
If most held collections had no floor data, show the result but add:
  "Your wallet has limited floor data — this estimate is very rough."
Same caveat style, slightly warmer tone.

### Zero result
If the math produces 0 (target collection floor is very high):
Show something human, not a zero:
  "Not quite enough. Try a different collection."

### Collection not found
If search returns no results:
  "No collections found. Try a different name."
In placeholder style, inside the dropdown area.

---

## Animation sequence

1. User selects a collection from dropdown
2. Dropdown fades out (150ms)
3. Input fades out (150ms)
4. Number fades up into place (400ms ease)
5. Collection name fades in (200ms delay)
6. Caveat appears (200ms delay after name)
7. Reset link appears (400ms delay after caveat)

Total reveal: approximately 1.2 seconds from selection to fully visible.
Should feel deliberate and satisfying, not instant.

---

## Copy rules

Use:
- "If you sold it all..."
- "See what your wallet could become."
- "Rough estimate based on current floor prices"
- "Try another collection →"
- "Not quite enough. Try a different collection."

Never use:
- "portfolio value"
- "total holdings"
- "estimated worth"
- "market cap"
- any dollar amounts
- any precise ETH totals shown to the user

The math happens behind the scenes.
The user only ever sees a count and a collection name.

---

## What this is not

Not a portfolio tracker.
Not financial advice.
Not meant to be precise.

It is a toy. It should feel like one.
The kind of thing you screenshot and send to a friend.

---

## Files to create or touch

New:
- components/profile/WalletConverter.tsx
- app/api/converter/route.ts (wallet value estimate)
- app/api/converter/search/route.ts (collection search)
- app/api/converter/calculate/route.ts (final count)

Touch:
- app/profile/page.tsx (add WalletConverter at the bottom)
- app/profile/profile.css (converter-specific styles if needed)

Do not touch:
- compare page
- compare API route
- any lib files unless absolutely necessary
- DESIGN_SYSTEM.md (follow existing patterns, do not extend)

---

## Build sequence

1. Build the API routes first, confirm data returns correctly
2. Build the static UI shell (intro line, input, result layout)
3. Wire up collection search to the dropdown
4. Wire up the calculate route to the result reveal
5. Add animation sequence last, after data is confirmed working