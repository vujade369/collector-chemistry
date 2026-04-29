import { NextResponse } from "next/server";

type InterpretRequest = {
  nameA?: unknown;
  nameB?: unknown;
  archetypeA?: unknown;
  archetypeB?: unknown;
  chemistryLabel?: unknown;
  chemistryScore?: unknown;
  profileLineA?: unknown;
  profileLineB?: unknown;
  primaryLeanA?: unknown;
  primaryLeanB?: unknown;
  contrastA?: unknown;
  contrastB?: unknown;
  topCollectionsA?: unknown;
  topCollectionsB?: unknown;
  sharedCollections?: unknown;
  sharedArtists?: unknown;
  exactCount?: unknown;
};

const OPENAI_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_INTERPRETATION_MODEL || "llama-3.3-70b-versatile";

const INTERPRETATION_SYSTEM_PROMPT = `You are writing a "why this match" interpretation for Collector Chemistry, a cultural compatibility tool that compares two public NFT collector profiles.

Your job is not to summarize overlap.
Your job is to help each collector understand something true about themselves through the lens of someone who made similar choices.

The comparison is the mechanism. Self-recognition is the outcome.

---

BEFORE YOU WRITE:

Identify the relationship dynamic between the two collectors. Choose one:
- Same instinct, different expression
- Different instincts, shared sensitivity
- Distant, but connected by a deeper thread
- Parallel, but rarely intersecting

This dynamic shapes everything. Do not write until you know which one you are working with.

---

STRUCTURE:

Follow these parts in order. No headers. No bullets. Plain prose only.

1. HEADLINE
One line. Names the dynamic, not the data. Creates tension or curiosity before the explanation arrives. Never describes overlap directly.

Good: "One moves fast to find it. One moves slow to keep it."
Bad: "Two collectors with significant ecosystem overlap."

2. SEPARATION
Two short paragraphs, one per collector. Describes how each one moves through culture. Identity language, not category language. The difference should feel real before you attempt to resolve it.

Do not describe what they collect. Describe how they decide.
Each paragraph should work if you removed every collection name from it.

Good: "You arrive before the name exists for it."
Bad: "You collect across generative art and meme culture."

3. THE GAP
One short paragraph. Acknowledge the real difference directly. Do not paper over it. The lower the chemistry score, the more weight this needs. This earns the right to land the turn.

4. THE TURN
The shared instinct one level beneath the surface difference.

Not: "you both collect generative art."
But: what that choice reveals about both of them as people.

This should name something the collector could not have told you themselves.

Test: does the turn still work if you remove every collection name from it?

5. CLOSING LINE
One sentence. Short. Resonant. Leaves space. Not a summary. A weight.

Test: could this line stand alone as a sentence worth remembering?

---

GROUNDING RULES:

- Do not describe what they collect. Describe how they decide.
- Avoid abstract personality language unless grounded in observable behavior from the provided inputs. "You have a refined sense of taste" is not grounded. "You return to the same artists even when the rest of your collection moves on" is grounded.
- Use at least one grounded detail in the summary — a collection name, a behavior pattern, a count — but never make it the main point. It is evidence. The insight is the story.
- If entry dates are provided, treat them as testimony not timestamps. Do not write "Collector A entered Sep 2025." Write instead: "One of them was here before most people noticed." or "They were paying attention before it had a name." or "The record shows someone who arrived early and stayed." Never repeat the same construction twice.

---

EMOTIONAL TEMPERATURE BY CHEMISTRY LABEL:

Strong Signal (80+): Warm, kinetic, high recognition. Don't oversell it. Let it land.

Kindred (60-79): Grounded, considered, quiet recognition. The turn should feel surprising but true.

Interesting Tension (40-59): Cool, unresolved, almost melancholic. The gap deserves real weight before the turn.

Distant But Related (below 40): Honest. The distance is acknowledged directly. The thread required going all the way down to find it.

---

VOICE RULES:

- Feel before explain.
- Identity language, not category language.
- Say the insight once, clearly, then stop.
- No financial language. No rarity language. No portfolio language. Ever.
- No bullets, no markdown, no headers in the output.
- Do not invent traits not supported by the provided inputs.
- Do not use "Wallet A" or "Wallet B" language.
- Collections are evidence, not the story.
- Use the collector's name or ENS handle when provided. Do not use "Collector A", "Collector B", "one collector", or "the other collector."
- Use names naturally. Do not repeat a name in every sentence. Use it where it improves clarity or recognition, not as a structural habit.
- SEPARATION A and SEPARATION B must not mirror each other. Do not use the same sentence structure for both collectors. Do not swap names into the same template.
- If both collectors show similar patterns, describe how those patterns differ in expression, timing, or depth. Similarity is not sameness.
- Vary sentence rhythm and construction across the full output. Avoid parallel phrasing between the two collector descriptions.

LENGTH:

Four to six short paragraphs. Every sentence earns its place. If a sentence could be removed without losing anything, remove it.

---

QUALITY TEST BEFORE RESPONDING:

1. Does the separation work if you remove every collection name from it?
2. Does the turn name something the collector could not have told you themselves?
3. Could the closing line stand alone as a sentence worth remembering?
4. Does the emotional temperature match the chemistry label?
5. Is every insight grounded in something observable from the inputs?

If any of these fail, rewrite before responding.

---

RESPONSE FORMAT:

Respond with valid JSON only. No markdown. No code fences.

{"headline": "...", "summary": "..."}

Where summary contains the full interpretation as flowing prose paragraphs.`;

function sanitizeString(value: unknown, maxLength = 150) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

function sanitizeStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeString(item))
    .filter(Boolean)
    .slice(0, limit);
}

function pushLine(lines: string[], label: string, value: string | number) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return;
    lines.push(`- ${label}: ${value}`);
    return;
  }
  if (!value.trim()) return;
  lines.push(`- ${label}: ${value}`);
}

function buildUserMessage(input: InterpretRequest) {
  const nameA = sanitizeString(input.nameA);
  const nameB = sanitizeString(input.nameB);
  const archetypeA = sanitizeString(input.archetypeA);
  const archetypeB = sanitizeString(input.archetypeB);
  const profileLineA = sanitizeString(input.profileLineA);
  const profileLineB = sanitizeString(input.profileLineB);
  const primaryLeanA = sanitizeString(input.primaryLeanA);
  const primaryLeanB = sanitizeString(input.primaryLeanB);
  const contrastA = sanitizeString(input.contrastA);
  const contrastB = sanitizeString(input.contrastB);
  const chemistryLabel = sanitizeString(input.chemistryLabel);
  const chemistryScore = sanitizeNumber(input.chemistryScore);
  const exactCount = sanitizeNumber(input.exactCount);
  const sharedCollections = sanitizeStringArray(input.sharedCollections, 5);
  const sharedArtists = sanitizeStringArray(input.sharedArtists, 3);
  const topCollectionsA = sanitizeStringArray(input.topCollectionsA, 3);
  const topCollectionsB = sanitizeStringArray(input.topCollectionsB, 3);

  const lines: string[] = ["Inputs:"];
  lines.push(`- Collector A name: ${nameA}`);
  lines.push(`- Collector B name: ${nameB}`);

  const archetypeALine = [archetypeA, profileLineA].filter(Boolean).join(" — ");
  const archetypeBLine = [archetypeB, profileLineB].filter(Boolean).join(" — ");

  pushLine(lines, "Archetype A", archetypeALine);
  pushLine(lines, "Archetype B", archetypeBLine);
  pushLine(lines, "Collector A name", nameA);
  pushLine(lines, "Collector B name", nameB);
  pushLine(lines, "Primary taste A", primaryLeanA);
  pushLine(lines, "Primary taste B", primaryLeanB);
  pushLine(lines, "What distinguishes A", contrastA);
  pushLine(lines, "What distinguishes B", contrastB);
  pushLine(lines, "Top collections A", topCollectionsA.join(", "));
  pushLine(lines, "Top collections B", topCollectionsB.join(", "));
  pushLine(lines, "Shared collections", sharedCollections.join(", "));
  pushLine(lines, "Shared artists", sharedArtists.join(", "));
  pushLine(lines, "Exact overlapping NFTs", exactCount);
  pushLine(lines, "Chemistry score", chemistryScore);
  pushLine(lines, "Chemistry label", chemistryLabel);

  lines.push("");
  lines.push("Before writing, identify the relationship dynamic:");
  lines.push("- Same instinct, different expression");
  lines.push("- Different instincts, shared sensitivity");
  lines.push("- Distant, but connected by a deeper thread");
  lines.push("- Parallel, but rarely intersecting");
  lines.push("");
  lines.push("Then write the five-part interpretation.");

  return lines.join("\n");
}

function safeOutput() {
  return NextResponse.json({ headline: "", summary: "" }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InterpretRequest;
    const userMessage = buildUserMessage(body || {});

    console.log("PROMPT_CHECK", INTERPRETATION_SYSTEM_PROMPT.slice(0, 100));
    console.log("INTERPRET_INPUT", userMessage.slice(0, 300));
    console.log("INTERPRET_USER_MESSAGE", userMessage);

    if (!OPENAI_API_KEY) {
      console.log("INTERPRET_ERROR: missing GROQ_API_KEY");
      return safeOutput();
    }

    if (!userMessage.trim()) {
      console.log("INTERPRET_ERROR: empty user message");
      return safeOutput();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          max_tokens: 600,
          messages: [
            { role: "system", content: INTERPRETATION_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
        signal: controller.signal,
      });

      console.log("INTERPRET_OPENAI_STATUS", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("INTERPRET_OPENAI_ERROR", errorText);
        return safeOutput();
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const content = payload?.choices?.[0]?.message?.content || "";
      console.log("INTERPRET_RAW_CONTENT", content);

      if (!content) return safeOutput();

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return safeOutput();
      const cleaned = jsonMatch[0].trim();

      let headline = "";
      let summary = "";

      try {
        const parsed = JSON.parse(cleaned) as Record<string, unknown>;
        headline = sanitizeString(parsed?.headline, 100);

        const rawSummary = parsed?.summary
          ? sanitizeString(parsed.summary as string, 5000)
          : [
              parsed?.separation,
              parsed?.["the gap"],
              parsed?.["the turn"],
              parsed?.["closing line"],
            ]
              .filter((part) => typeof part === "string" && (part as string).trim())
              .map((part) => (part as string).trim())
              .join("\n\n");

        summary = typeof rawSummary === "string" ? rawSummary : "";
      } catch {
        return safeOutput();
      }

      console.log("INTERPRET_RESULT", { headline, summary: summary.slice(0, 100) });

      if (!headline && !summary) return safeOutput();
      return NextResponse.json({ headline, summary }, { status: 200 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.log("INTERPRET_CAUGHT_ERROR", err);
    return safeOutput();
  }
}
