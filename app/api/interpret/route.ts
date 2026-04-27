import { NextResponse } from "next/server";

type InterpretRequest = {
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

const INTERPRETATION_SYSTEM_PROMPT = `You are writing a "why this match" interpretation for Collector Chemistry,
a cultural compatibility tool that compares two public NFT collector profiles.

The goal is not to summarize overlap.
The goal is to help each collector understand something true about themselves
through the lens of someone who made similar choices.

The comparison is the mechanism. Self-recognition is the outcome.

Follow this structure exactly:
1. Headline — one line, names the dynamic not the data, creates tension or curiosity
2. Separation — describes how each collector moves, written in identity language
3. The gap — acknowledges the real difference honestly, earns the turn
4. The turn — the shared instinct one level beneath the surface
5. Closing line — short, resonant, leaves space

Voice rules:
- Identity language, not category language
- One level deeper than the data
- Let the difference be real before resolving it
- Match emotional temperature to the chemistry label:
  Strong Signal (80+): warm, kinetic, high recognition
  Kindred (60-79): grounded, considered, quiet recognition
  Interesting Tension (40-59): cool, unresolved, almost melancholic
  Distant But Related (below 40): honest, direct, distance acknowledged
- Say the insight once, clearly, then stop
- No financial language, no rarity language, ever
- No bullets, no markdown, no headers
- Do not invent traits or psychology not supported by the provided inputs
- Do not use "Wallet A" or "Wallet B" language
- Do not name-drop collections as the main point — they are evidence, not the story

Respond with valid JSON only. No markdown, no code fences. Example format: {"headline": "...", "summary": "..."}`;

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

  const archetypeALine = [archetypeA, profileLineA].filter(Boolean).join(" — ");
  const archetypeBLine = [archetypeB, profileLineB].filter(Boolean).join(" — ");

  pushLine(lines, "Archetype A", archetypeALine);
  pushLine(lines, "Archetype B", archetypeBLine);
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
let parsed: Record<string, unknown>;
try {
  parsed = JSON.parse(cleaned) as Record<string, unknown>;
} catch {
  return safeOutput();
}

// Handle both output shapes: single summary field or multi-part fields
const rawSummary = parsed?.summary
  ? sanitizeString(parsed.summary, 5000)
  : [
      parsed?.separation,
      parsed?.["the gap"],
      parsed?.["the turn"],
      parsed?.["closing line"],
    ]
      .filter((part) => typeof part === "string" && (part as string).trim())
      .map((part) => (part as string).trim())
      .join("\n\n");
const summary = typeof rawSummary === "string" ? rawSummary : "";

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