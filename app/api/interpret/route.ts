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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_INTERPRETATION_MODEL || "gpt-4o";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_INTERPRETATION_MODEL || "llama-3.3-70b-versatile";

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

This must name something specific to these two collectors that the data made visible but only interpretation can articulate.

Bad turn: "They both seek meaning through collecting."
Bad turn: "A shared desire to engage with digital culture."
Bad turn: "Both are drawn to work that speaks to something deeper."

5. CLOSING LINE
One short paragraph. Resonant. Not conclusive. Leaves space.

---

VOICE RULES:

- Identity language, not category language
- Interpretive, not analytical
- Specific, not generic
- Honest about difference
- No financial language
- No rarity language
- No investment language
- No market language
- No bullets
- No markdown
- No headers
- No labels like "Separation" or "The Turn"
- Do not say "Wallet A" or "Wallet B"
- Do not say "NFTs" unless unavoidable
- Do not overuse collection names
- Collection names are evidence, not the story
- Do not invent traits or psychology not supported by the provided inputs
- Do not flatten everyone into "curious," "intentional," or "community-driven"

---

EMOTIONAL TEMPERATURE:

Strong Signal (80+):
Warm, kinetic, high recognition. The writing should feel like two people recognizing each other quickly.

Kindred (60-79):
Grounded, considered, quiet recognition. The writing should feel like adjacent instincts.

Interesting Tension (40-59):
Cooler, more unresolved, slightly melancholic. The writing should honor the distance.

Distant But Related (below 40):
Direct, restrained, honest. Do not force closeness.

---

OUTPUT FORMAT:

Return JSON only.

{
  "headline": "one line, maximum 100 characters",
  "summary": "plain prose paragraphs separated by double newlines"
}

The summary should usually be 250-400 words.`;

function sanitizeString(value: unknown, maxLength = 400): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function sanitizeList(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeString(item, 120))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeOutput() {
  return NextResponse.json(
    {
      headline: "A shared signal, seen from different angles.",
      summary:
        "There is enough overlap here to suggest a real point of contact, but not enough reliable context to turn that signal into a full interpretation. What stands out is not a single shared category or collection, but the possibility that both collectors are responding to a similar cultural frequency from different positions.\n\nThat kind of match is often more interesting than simple sameness. It leaves room for difference, distance, and recognition without forcing the comparison to say more than the data can support.",
    },
    { status: 200 },
  );
}

function buildPrompt(payload: InterpretRequest): string {
  const nameA = sanitizeString(payload.nameA, 80) || "Collector A";
  const nameB = sanitizeString(payload.nameB, 80) || "Collector B";
  const archetypeA = sanitizeString(payload.archetypeA, 120);
  const archetypeB = sanitizeString(payload.archetypeB, 120);
  const chemistryLabel = sanitizeString(payload.chemistryLabel, 80);
  const chemistryScore = sanitizeNumber(payload.chemistryScore);
  const profileLineA = sanitizeString(payload.profileLineA, 300);
  const profileLineB = sanitizeString(payload.profileLineB, 300);
  const primaryLeanA = sanitizeString(payload.primaryLeanA, 160);
  const primaryLeanB = sanitizeString(payload.primaryLeanB, 160);
  const contrastA = sanitizeString(payload.contrastA, 160);
  const contrastB = sanitizeString(payload.contrastB, 160);
  const topCollectionsA = sanitizeList(payload.topCollectionsA);
  const topCollectionsB = sanitizeList(payload.topCollectionsB);
  const sharedCollections = sanitizeList(payload.sharedCollections);
  const sharedArtists = sanitizeList(payload.sharedArtists);
  const exactCount = sanitizeNumber(payload.exactCount);

  return `Write a Collector Chemistry interpretation using only the inputs below.

Collectors:
- ${nameA}
- ${nameB}

Chemistry:
- Label: ${chemistryLabel || "Unknown"}
- Score: ${chemistryScore ?? "Unknown"}
- Exact shared collection count: ${exactCount ?? "Unknown"}

${nameA}:
- Archetype: ${archetypeA || "Unknown"}
- Profile line: ${profileLineA || "Unknown"}
- Primary lean: ${primaryLeanA || "Unknown"}
- Contrast: ${contrastA || "Unknown"}
- Top collections: ${topCollectionsA.join(", ") || "Unknown"}

${nameB}:
- Archetype: ${archetypeB || "Unknown"}
- Profile line: ${profileLineB || "Unknown"}
- Primary lean: ${primaryLeanB || "Unknown"}
- Contrast: ${contrastB || "Unknown"}
- Top collections: ${topCollectionsB.join(", ") || "Unknown"}

Shared evidence:
- Shared collections: ${sharedCollections.join(", ") || "None provided"}
- Shared artists/creators: ${sharedArtists.join(", ") || "None provided"}

Do not overstate the evidence. If the match is thin, write with restraint.
Return JSON only.`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as InterpretRequest;
    const userPrompt = buildPrompt(payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18_000);

    try {
      const apiKey = GROQ_API_KEY || OPENAI_API_KEY;
      const model = GROQ_API_KEY ? GROQ_MODEL : OPENAI_MODEL;
      const endpoint = GROQ_API_KEY
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

      if (!apiKey) return safeOutput();

      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: INTERPRETATION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        console.log("INTERPRET_API_ERROR", response.status, await response.text());
        return safeOutput();
      }

      const json = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const content = json.choices?.[0]?.message?.content || "";
      const cleaned = content.trim();

      let headline = "";
      let summary = "";

      try {
        const parsed = JSON.parse(cleaned) as Record<string, unknown>;
        headline = sanitizeString(parsed?.headline, 100);

        const rawSummary = parsed?.summary
          ? sanitizeString(parsed.summary as string, 5000)
          : [parsed?.separation, parsed?.["the gap"], parsed?.["the turn"], parsed?.["closing line"]]
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