// Trait Vocabulary Test — adaptive, grouped, with summary prompt
// Alchemy primary + OpenSea fallback, reads .env.local automatically
//
// Run from project root:
//   node test-trait-vocabulary.mjs
//   node test-trait-vocabulary.mjs vuja-de.eth

import { readFileSync } from "fs";
import { resolve } from "path";

const WALLET = process.argv[2] || "vuja-de.eth";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const lines = readFileSync(resolve(process.cwd(), file), "utf8").split("\n");
      const env = {};
      for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
      return env;
    } catch {}
  }
  return {};
}

const env = loadEnv();
const ALCHEMY_KEY = env.ALCHEMY_API_KEY || env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
const OPENSEA_KEY = env.OPENSEA_API_KEY || env.NEXT_PUBLIC_OPENSEA_API_KEY || process.env.OPENSEA_API_KEY;
const GROQ_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
const ALCHEMY_BASE = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`;

async function getOpenSeaKey() {
  if (OPENSEA_KEY) return OPENSEA_KEY;
  const res = await fetch("https://api.opensea.io/api/v2/auth/keys", {
    method: "POST", headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!data?.api_key) throw new Error("Could not get free OpenSea key");
  return data.api_key;
}

async function resolveWallet(walletOrENS) {
  if (walletOrENS.startsWith("0x")) return walletOrENS;
  const res = await fetch(`https://api.ensideas.com/ens/resolve/${walletOrENS}`);
  const data = await res.json();
  if (!data?.address) throw new Error("Could not resolve: " + walletOrENS);
  console.log(`Resolved ${walletOrENS} → ${data.address}\n`);
  return data.address;
}

async function fetchNFTsAlchemy(address) {
  console.log("Fetching via Alchemy...\n");
  let nfts = [], pageKey = null, page = 1;
  do {
    const url = new URL(`${ALCHEMY_BASE}/getNFTsForOwner`);
    url.searchParams.set("owner", address);
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!data.ownedNfts) break;
    nfts = nfts.concat(data.ownedNfts);
    pageKey = data.pageKey || null;
    console.log(`Page ${page}: ${data.ownedNfts.length} NFTs (total: ${nfts.length})`);
    page++;
    if (pageKey) await new Promise((r) => setTimeout(r, 150));
  } while (pageKey && nfts.length < 600);
  return nfts;
}

async function fetchNFTsOpenSea(address, osKey) {
  console.log("Fetching via OpenSea...\n");
  let nfts = [], cursor = null, page = 1;
  do {
    const url = new URL(`https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts`);
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("next", cursor);
    const res = await fetch(url.toString(), { headers: { "x-api-key": osKey } });
    const data = await res.json();
    if (!data.nfts) break;
    nfts = nfts.concat(data.nfts);
    cursor = data.next || null;
    console.log(`Page ${page}: ${data.nfts.length} NFTs (total: ${nfts.length})`);
    page++;
    if (cursor) await new Promise((r) => setTimeout(r, 400));
  } while (cursor && nfts.length < 600);
  return nfts;
}

function extractTraits(nft) {
  const alchemyAttrs = nft?.raw?.metadata?.attributes || nft?.raw?.metadata?.traits;
  if (Array.isArray(alchemyAttrs) && alchemyAttrs.length > 0) return alchemyAttrs;
  if (Array.isArray(nft?.traits) && nft.traits.length > 0) return nft.traits;
  return [];
}

// Skip noise values
const SKIP_VALUES = new Set([
  "none", "n/a", "na", "", "null", "undefined",
  "no", "yes", "true", "false", "standard", "regular", "normal",
]);

function buildAdaptiveVocabulary(nfts) {
  // Step 1: Build a map of trait_type → { value → count }
  const typeMap = {};

  for (const nft of nfts) {
    const traits = extractTraits(nft);
    for (const trait of traits) {
      const rawType  = (trait.trait_type || "unknown").trim();
      const rawValue = String(trait.value ?? "").trim();
      const val      = rawValue.toLowerCase();

      if (!val) continue;
      if (SKIP_VALUES.has(val)) continue;
      if (/^\d+(\.\d+)?%?$/.test(val)) continue;

      if (!typeMap[rawType]) typeMap[rawType] = {};
      typeMap[rawType][rawValue] = (typeMap[rawType][rawValue] || 0) + 1;
    }
  }

  // Step 2: For each trait type, sum total instances and sort values
  const traitTypes = Object.entries(typeMap).map(([type, valueCounts]) => {
    const values = Object.entries(valueCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    const total = values.reduce((s, v) => s + v.count, 0);
    return { type, total, values };
  });

  // Step 3: Sort trait types by total frequency — most common first
  traitTypes.sort((a, b) => b.total - a.total);

  // Step 4: Find cross-collection trait patterns
  // For each trait value, count how many distinct collections it appears in
  const valueCollectionMap = {};
  for (const nft of nfts) {
    const collection = nft?.contract?.name || nft?.collection || "unknown";
    const traits = extractTraits(nft);
    for (const trait of traits) {
      const rawValue = String(trait.value ?? "").trim();
      const val = rawValue.toLowerCase();
      if (!val || SKIP_VALUES.has(val) || /^\d+(\.\d+)?%?$/.test(val)) continue;
      if (!valueCollectionMap[rawValue]) valueCollectionMap[rawValue] = new Set();
      valueCollectionMap[rawValue].add(collection);
    }
  }

  // Cross-collection signals: values appearing in 3+ collections
  const crossCollection = Object.entries(valueCollectionMap)
    .map(([value, collections]) => ({ value, collections: collections.size }))
    .filter(({ collections }) => collections >= 3)
    .sort((a, b) => b.collections - a.collections)
    .slice(0, 10);

  return { traitTypes, crossCollection };
}

// Generate a strict, factual prompt for Claude
function buildSummaryPrompt(wallet, traitTypes, crossCollection, totalNFTs) {
  const top8 = traitTypes.slice(0, 8);

  const traitSummary = top8.map(({ type, total, values }) => {
    const topVals = values.slice(0, 4).map(v => `${v.value} (${v.count})`).join(", ");
    return `${type} [${total} instances]: ${topVals}`;
  }).join("\n");

  const crossSummary = crossCollection.length > 0
    ? crossCollection.map(({ value, collections }) =>
        `"${value}" appears across ${collections} different collections`
      ).join("\n")
    : "No strong cross-collection patterns detected.";

  return `
You are writing a metadata fingerprint for an NFT wallet.

A wallet is allowed to be chaotic. Do not force it into clean categories.
Most individual NFTs are noise. Identity appears through recurrence.

The goal is to understand the wallet as a whole.

You are given NFT metadata evidence: trait types, trait values, counts, and cross-collection echoes.

Your job is not to summarize the biggest trait bucket.
Your job is not to let one collection define the entire wallet.
Your job is to notice what keeps showing up across the whole archive.

Think in terms of:
- broad wallet threads
- deep collection pockets
- repeated creative signatures
- open-internet language
- meme culture
- visual fragments
- format bias
- cross-collection echoes
- signals that survive the noise

WALLET: ${wallet}
TOTAL NFTs: ${totalNFTs}

TRAIT EVIDENCE:
${traitSummary}

CROSS-COLLECTION ECHOES:
${crossSummary}

WHOLE-WALLET STANDARD:
Always interpret the wallet as a whole first.

Separate:
- broad wallet threads: signals that appear across multiple collections
- deep pockets: signals that repeat heavily inside one collection or related set
- proof: exact trait values and counts

Do not imply a whole-wallet pattern from one collection’s metadata structure.
Do not ignore collection-specific pockets either.

The best read should describe the relationship between breadth and depth.

VOICE:
Serious, clear, and lightly clever.
The wit should come from pattern recognition, not jokes.
Sound like a sharp cultural observer, not a dashboard and not a comedian.

Good voice:
- "broad signal, deep pockets"
- "a few rooms it clearly stayed in longer"
- "meme culture, with receipts"
- "less random pile, more recurring cast"
- "editions doing what editions do"

Bad voice:
- "this wallet is dominated by..."
- "this collector is passionate about..."
- "a beautiful journey through..."
- "NFT degen vibes"
- anything that sounds like a roast

RULES:
- Be clear, not cryptic.
- The user should understand the read immediately.
- Do not say "dominated by."
- Do not say "the wallet's trait types are."
- Do not say "this collector is" or diagnose the person.
- Do not lead with raw trait bucket names like Artist, Type, or Background unless they appear in the proof line.
- Do not over-explain.
- Do not use financial language.
- Do not mention rarity, value, floor, or price.
- Do not use the words unique, curated, journey, passionate, vibe, or aesthetic.
- Stay grounded in the supplied trait evidence.
- Be specific enough that the read could not apply to every wallet.
- Say more by saying less.

OUTPUT FORMAT EXACTLY:

Headline: [2-6 words. Clear, specific, lightly clever.]

Read: [1 sentence. Describe the whole-wallet pattern: broad signal first, then deeper pockets if present.]

Proof: [3-4 exact pieces of evidence, separated by ·]

EXAMPLE STYLE:

Headline: Meme Signal, Repeat Rooms

Read: The wallet has a broad 6529/CC0 thread, then a few rooms it clearly stayed in longer.

Proof: 6529er across 7 collections · CC0 across 5 · mendezmendez across 4 · CUBIQUE 9x
`.trim();
}

async function generateSummary(prompt) {
  if (!GROQ_KEY) return null;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
      
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || null;
}

function printTraitType({ type, total, values }, limit = 5) {
  const bar = "█".repeat(Math.min(total, 20));
  console.log(`\n  ${type} (${total} total) ${bar}`);
  values.slice(0, limit).forEach(({ value, count }) => {
    const b = "░".repeat(Math.min(count, 20));
    console.log(`    ${value.padEnd(28)} ${b} ${count}`);
  });
}

(async () => {
  try {
    console.log(`\nTrait Vocabulary Test — ${WALLET}`);
    console.log(`Alchemy: ${ALCHEMY_KEY ? "found" : "not found"} | OpenSea: ${OPENSEA_KEY ? "found" : "provisioning"} | Groq: ${GROQ_KEY ? "found" : "not found — will skip summary"}\n`);

    const osKey = await getOpenSeaKey();
    const address = await resolveWallet(WALLET);
    const nfts = ALCHEMY_KEY
      ? await fetchNFTsAlchemy(address)
      : await fetchNFTsOpenSea(address, osKey);

    console.log(`\nTotal NFTs: ${nfts.length}`);
    console.log(`NFTs with traits: ${nfts.filter(n => extractTraits(n).length > 0).length}\n`);

    const { traitTypes, crossCollection } = buildAdaptiveVocabulary(nfts);

    // Print top 8 trait types with their top values
    console.log("=== ADAPTIVE TRAIT FINGERPRINT (top 8 trait types) ===");
    traitTypes.slice(0, 8).forEach(t => printTraitType(t));

    // Print cross-collection signals
    console.log("\n\n=== CROSS-COLLECTION PATTERNS ===\n");
    if (crossCollection.length === 0) {
      console.log("  No strong cross-collection patterns detected.");
    } else {
      crossCollection.forEach(({ value, collections }) => {
        console.log(`  "${value}" — appears in ${collections} different collections`);
      });
    }

    // Build and optionally run the summary prompt
    const prompt = buildSummaryPrompt(WALLET, traitTypes, crossCollection, nfts.length);

    console.log("\n\n=== SUMMARY PROMPT (for Claude) ===\n");
    console.log(prompt);

    if (GROQ_KEY) {
      console.log("\n\n=== GENERATED SUMMARY ===\n");
      const summary = await generateSummary(prompt);
      if (summary) {
        console.log(summary);
      } else {
        console.log("(summary generation failed)");
      }
    } else {
      console.log("\n\n(Add GROQ_API_KEY to .env.local to auto-generate the summary)");
    }

  } catch (err) {
    console.error("\nError:", err.message);
  }
})();
