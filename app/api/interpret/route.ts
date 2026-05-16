import { NextResponse } from "next/server";

type InterpretRequest = {
  nameA?: unknown;
  nameB?: unknown;
  archetypeA?: unknown;
  archetypeB?: unknown;
  interpretationMode?: unknown;
  recognitionLabel?: unknown;
  recognitionSummary?: unknown;
  recognitionProof?: unknown;
  divergenceNotes?: unknown;
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
  sharedCollectionCount?: unknown;
  sharedArtistCount?: unknown;
  sameNftCount?: unknown;
  sharedTasteTags?: unknown;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_INTERPRETATION_MODEL || "gpt-4o";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_INTERPRETATION_MODEL || "llama-3.3-70b-versatile";

const INTERPRETATION_SYSTEM_PROMPT = `You are writing the Relationship Read for Constellate, a product that helps collectors see where two public wallet patterns overlap and separate.

The recognition state is already decided. Do not choose, rename, override, or score it.

Your job is to write from the fixed recognition frame and visible proof. The result should feel human, editorial, specific, and grounded in what is shown on the Compare page.

---

VOICE RULES:

- Relationship read, not analytics report
- Behavior-led, not personality diagnosis
- Interpretive, not analytical
- Specific, not generic
- Honest about difference
- Confident without overclaiming
- No financial language
- No rarity language
- No investment language
- No market language
- No compatibility, dating-app, ranking, status, alpha, or portfolio framing
- No bullets
- No markdown
- No headers
- Do not say "Wallet A" or "Wallet B"
- Avoid saying "NFTs" unless referring to exact same pieces
- Do not overuse collection names
- Collection names are evidence, not the story
- Do not invent traits or psychology not supported by the provided inputs
- Do not apologize for the data
- Avoid: "not enough reliable context", "cannot conclude", "perfect match", "compatible", "elite taste", "high-value collector", "alpha", "insane overlap", "vibes", "tribe", "journey"
- Prefer: "suggests", "appears", "surfaces", "meets in", "separates around", "shared rooms", "holding depth", "artist signal", "category weight", "collecting rhythm"

Recognition-state guidance:
- Deeply Aligned: strong shared rooms, artist signals, and category shape. Use rarely and keep it grounded.
- Same Rooms, Different Depths: the overlap is real, but the asymmetry is the story.
- Adjacent Scenes: there are crossing points, but the centers of gravity differ.
- Distant But Related: limited but real signal; do not force closeness.
- Mirror Signal: resonance without much direct collection intersection.
- Different Constellations: the distance itself is the read.

---

OUTPUT FORMAT:

Return JSON only.

{
  "headline": "one line, maximum 100 characters",
  "summary": "plain prose paragraphs separated by double newlines"
}

The headline should be one short line, maximum 90 characters.
The summary should be 1-2 concise paragraphs, 80-140 words total.`;

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

function hasBlockedLanguage(value: string) {
  const blockedPatterns = [
    /\bcompatible\b/i,
    /\bcompatibility\b/i,
    /\bperfect match\b/i,
    /\belite taste\b/i,
    /\bhigh-value\b/i,
    /\balpha\b/i,
    /\binsane overlap\b/i,
    /\bvibes\b/i,
    /\btribe\b/i,
    /\bjourney\b/i,
    /\bnot enough reliable context\b/i,
    /\bcannot conclude\b/i,
  ];

  return blockedPatterns.some((pattern) => pattern.test(value));
}

function safeOutput(payload?: InterpretRequest) {
  const recognitionLabel = sanitizeString(payload?.recognitionLabel, 80);
  const recognitionSummary = sanitizeString(payload?.recognitionSummary, 600);
  const divergenceNotes = sanitizeList(payload?.divergenceNotes, 2);
  const sharedCollections = sanitizeList(payload?.sharedCollections, 3);
  const sharedArtists = sanitizeList(payload?.sharedArtists, 2);
  const sharedTasteTags = sanitizeList(payload?.sharedTasteTags, 3);

  const headline = recognitionLabel
    ? `${recognitionLabel}, read through visible proof.`
    : "A shared signal, seen from different angles.";

  const proofParts = [
    sharedCollections.length ? `shared rooms like ${sharedCollections.join(", ")}` : "",
    sharedArtists.length ? `artist signals around ${sharedArtists.join(", ")}` : "",
    sharedTasteTags.length ? `category weight in ${sharedTasteTags.join(", ")}` : "",
  ].filter(Boolean);

  const proofLine = proofParts.length
    ? `The visible proof surfaces ${proofParts.join("; ")}.`
    : "The visible proof surfaces a real point of contact between the wallets.";

  const divergenceLine = divergenceNotes[0]
    ? ` ${divergenceNotes[0]}`
    : " The relationship stays grounded in what overlaps and where the patterns separate.";

  return NextResponse.json(
    {
      headline,
      summary:
        `${recognitionSummary || "The overlap suggests a real relationship between the two visible collecting patterns."} ${proofLine}${divergenceLine}`,
    },
    { status: 200 },
  );
}

function buildPrompt(payload: InterpretRequest): string {
  const nameA = sanitizeString(payload.nameA, 80) || "Collector A";
  const nameB = sanitizeString(payload.nameB, 80) || "Collector B";
  const archetypeA = sanitizeString(payload.archetypeA, 120);
  const archetypeB = sanitizeString(payload.archetypeB, 120);
  const interpretationMode = sanitizeString(payload.interpretationMode, 40);
  const recognitionLabel = sanitizeString(payload.recognitionLabel, 80);
  const recognitionSummary = sanitizeString(payload.recognitionSummary, 600);
  const recognitionProof = sanitizeList(payload.recognitionProof, 6);
  const divergenceNotes = sanitizeList(payload.divergenceNotes, 4);
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
  const sharedCollectionCount = sanitizeNumber(payload.sharedCollectionCount);
  const sharedArtistCount = sanitizeNumber(payload.sharedArtistCount);
  const sameNftCount = sanitizeNumber(payload.sameNftCount) ?? exactCount;
  const sharedTasteTags = sanitizeList(payload.sharedTasteTags, 6);

  return `Write a Constellate Compare Relationship Read using only the inputs below.

Mode:
- ${interpretationMode || "compare"}

Fixed recognition frame:
- Recognition label: ${recognitionLabel || "Unknown"}
- Recognition summary: ${recognitionSummary || "Unknown"}
- Recognition proof: ${recognitionProof.join("; ") || "None provided"}

Important:
- The recognition state is already decided.
- Do not choose, rename, override, or score the recognition label.
- Use the recognition label as the frame for the read.

Collectors:
- ${nameA}
- ${nameB}

Legacy scoring context:
- Chemistry label: ${chemistryLabel || "Unknown"}
- Chemistry score: ${chemistryScore ?? "Unknown"}

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

Visible proof:
- Shared collection count: ${sharedCollectionCount ?? sharedCollections.length}
- Shared collections: ${sharedCollections.join(", ") || "None provided"}
- Shared artist signal count: ${sharedArtistCount ?? sharedArtists.length}
- Shared artists/creators: ${sharedArtists.join(", ") || "None provided"}
- Same NFT count: ${sameNftCount ?? "Unknown"}
- Shared taste/category tags: ${sharedTasteTags.join(", ") || "None provided"}
- Divergence notes: ${divergenceNotes.join(" | ") || "None provided"}

Write:
- headline: one short line, maximum 90 characters
- summary: 1-2 concise paragraphs, 80-140 words total
- no bullets, no markdown
- proof-aware, but not mechanical
- confident without overclaiming

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

      if (!apiKey) return safeOutput(payload);

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
        return safeOutput(payload);
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
        return safeOutput(payload);
      }

      console.log("INTERPRET_RESULT", { headline, summary: summary.slice(0, 100) });

      if (!headline && !summary) return safeOutput(payload);
      if (hasBlockedLanguage(`${headline}\n${summary}`)) return safeOutput(payload);
      return NextResponse.json({ headline, summary }, { status: 200 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.log("INTERPRET_CAUGHT_ERROR", err);
    return safeOutput();
  }
}
