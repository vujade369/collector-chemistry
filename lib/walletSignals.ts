import type { WalletProfileNFT } from "./walletProfile";

export type SecondarySignalName =
  | "access"
  | "community"
  | "identity"
  | "experimental"
  | "editorial"
  | "generative"
  | "meme"
  | "gaming";

export type SecondarySignal = {
  signal: SecondarySignalName;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type SecondarySignalSummary = {
  signal: SecondarySignalName;
  count: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  percentage: number;
  sampleReasons: string[];
};

type TraitLike = {
  trait_type?: unknown;
  traitType?: unknown;
  type?: unknown;
  name?: unknown;
  value?: unknown;
};

type SignalRule = {
  signal: SecondarySignalName;
  highThreshold: number;
  mediumThreshold: number;
  traitKeys?: string[];
  traitValues?: string[];
  textTerms?: string[];
  collectionTerms?: string[];
  tokenStandards?: string[];
};

type SignalMatch = {
  signal: SecondarySignalName;
  confidence: "high" | "medium" | "low";
  score: number;
  reason: string;
};

const SIGNAL_RULES: SignalRule[] = [
  {
    signal: "access",
    highThreshold: 4,
    mediumThreshold: 2,
    traitKeys: ["access", "pass", "ticket", "membership", "allowlist", "claim", "redeem"],
    textTerms: ["access", "pass", "ticket", "membership", "members only", "allowlist", "claim", "redeem", "gated"],
    collectionTerms: ["pass", "ticket", "membership", "members", "access"],
  },
  {
    signal: "community",
    highThreshold: 4,
    mediumThreshold: 2,
    traitKeys: ["role", "rank", "member", "faction", "tribe", "team"],
    textTerms: ["community", "club", "dao", "member", "members", "holders", "genesis", "founder", "social"],
    collectionTerms: ["club", "dao", "community", "members", "holders", "genesis"],
  },
  {
    signal: "identity",
    highThreshold: 5,
    mediumThreshold: 3,
    traitKeys: ["background", "eyes", "mouth", "fur", "skin", "body", "clothes", "clothing", "accessory", "head", "hair"],
    textTerms: ["avatar", "pfp", "profile picture", "identity", "character", "portrait"],
    collectionTerms: ["avatar", "pfp", "profile", "characters"],
  },
  {
    signal: "experimental",
    highThreshold: 4,
    mediumThreshold: 2,
    traitKeys: ["experiment", "prototype", "study", "process", "render", "dynamic", "interactive"],
    textTerms: ["experiment", "experimental", "prototype", "study", "sketch", "onchain", "on-chain", "dynamic", "interactive", "ai", "glitch", "code"],
    collectionTerms: ["experiment", "experimental", "study", "sketch", "onchain"],
  },
  {
    signal: "editorial",
    highThreshold: 5,
    mediumThreshold: 3,
    traitKeys: ["artist", "medium", "edition", "year", "series", "title", "publication", "archive"],
    textTerms: ["artist", "medium", "edition", "series", "publication", "archive", "essay", "photograph", "photography"],
    collectionTerms: ["archive", "edition", "series", "photography", "publication"],
  },
  {
    signal: "generative",
    highThreshold: 4,
    mediumThreshold: 2,
    traitKeys: ["seed", "algorithm", "hash", "palette", "output", "composition", "variation"],
    textTerms: ["generative", "algorithmic", "onchain", "on-chain", "art blocks", "fxhash", "long form", "procedural"],
    collectionTerms: ["art blocks", "fxhash", "generative", "algorithmic"],
  },
  {
    signal: "meme",
    highThreshold: 3,
    mediumThreshold: 2,
    traitKeys: ["meme", "pepe", "wojak", "remix"],
    textTerms: ["meme", "pepe", "wojak", "rare pepe", "furie", "shitpost", "viral", "remix"],
    collectionTerms: ["meme", "pepe", "wojak"],
  },
  {
    signal: "gaming",
    highThreshold: 4,
    mediumThreshold: 2,
    traitKeys: ["level", "class", "power", "attack", "defense", "element", "weapon", "armor"],
    textTerms: ["game", "gaming", "quest", "player", "level", "class", "attack", "defense", "weapon", "armor"],
    collectionTerms: ["game", "gaming", "quest"],
  },
];

const MAX_SIGNALS_PER_NFT = 3;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s/#-]/g, " ")
    .replace(/\s+/g, " ");
}

function toTraitArray(value: unknown): TraitLike[] {
  return Array.isArray(value) ? (value as TraitLike[]) : [];
}

function getTraits(nft: WalletProfileNFT): TraitLike[] {
  return [
    ...toTraitArray(nft.metadata?.attributes),
    ...toTraitArray(nft.metadata?.traits),
    ...toTraitArray(nft.raw?.metadata?.attributes),
    ...toTraitArray(nft.raw?.metadata?.traits),
    ...toTraitArray(nft.traits),
  ];
}

function getTraitKeys(nft: WalletProfileNFT) {
  return getTraits(nft)
    .flatMap((trait) => [trait.trait_type, trait.traitType, trait.type, trait.name])
    .map(normalizeText)
    .filter(Boolean);
}

function getTraitValues(nft: WalletProfileNFT) {
  return getTraits(nft)
    .map((trait) => normalizeText(trait.value))
    .filter(Boolean);
}

function getCollectionText(nft: WalletProfileNFT) {
  return normalizeText(
    [
      nft.displayCollectionName,
      nft.displayCollectionSlug,
      nft.contractMetadata?.name,
      nft.contract?.name,
      typeof nft.collection === "object" ? nft.collection?.name : nft.collection,
      nft.metadata?.collection,
      nft.metadata?.collection_name,
      nft.raw?.metadata?.collection,
      nft.raw?.metadata?.collection_name,
    ].join(" ")
  );
}

function getMetadataText(nft: WalletProfileNFT) {
  return normalizeText(
    [
      nft.name,
      nft.title,
      nft.description,
      nft.metadata?.name,
      nft.metadata?.description,
      nft.raw?.metadata?.name,
      nft.raw?.metadata?.description,
      getTraitKeys(nft).join(" "),
      getTraitValues(nft).join(" "),
    ].join(" ")
  );
}

function getTokenStandard(nft: WalletProfileNFT) {
  const extended = nft as WalletProfileNFT & {
    tokenStandard?: unknown;
    token_standard?: unknown;
    tokenType?: unknown;
    standard?: unknown;
    contract?: WalletProfileNFT["contract"] & {
      tokenStandard?: unknown;
      token_standard?: unknown;
      token_type?: unknown;
      standard?: unknown;
    };
  };

  return normalizeText(
    extended.tokenStandard ||
      extended.token_standard ||
      extended.tokenType ||
      extended.standard ||
      extended.contract?.tokenStandard ||
      extended.contract?.token_standard ||
      extended.contract?.token_type ||
      extended.contract?.standard
  );
}

function countMatches(values: string[], terms: string[]) {
  const matches = new Set<string>();
  for (const value of values) {
    for (const term of terms) {
      if (value === term || value.includes(term)) matches.add(term);
    }
  }
  return matches;
}

function matchTerms(text: string, terms: string[]) {
  const matches = new Set<string>();
  for (const term of terms) {
    if (text.includes(term)) matches.add(term);
  }
  return matches;
}

function confidenceForScore(score: number, rule: SignalRule): "high" | "medium" | "low" | null {
  if (score >= rule.highThreshold) return "high";
  if (score >= rule.mediumThreshold) return "medium";
  return null;
}

function evaluateSignalRule(nft: WalletProfileNFT, rule: SignalRule): SignalMatch | null {
  const traitKeyMatches = countMatches(getTraitKeys(nft), rule.traitKeys || []);
  const traitValueMatches = countMatches(getTraitValues(nft), rule.traitValues || []);
  const textMatches = matchTerms(getMetadataText(nft), rule.textTerms || []);
  const collectionMatches = matchTerms(getCollectionText(nft), rule.collectionTerms || []);
  const tokenStandardMatches = countMatches([getTokenStandard(nft)], rule.tokenStandards || []);

  const score =
    traitKeyMatches.size * 2 +
    traitValueMatches.size +
    textMatches.size +
    collectionMatches.size +
    tokenStandardMatches.size;
  const confidence = confidenceForScore(score, rule);
  if (!confidence) return null;

  const evidence = [
    traitKeyMatches.size ? `${traitKeyMatches.size} trait key clue${traitKeyMatches.size === 1 ? "" : "s"}` : "",
    traitValueMatches.size ? `${traitValueMatches.size} trait value clue${traitValueMatches.size === 1 ? "" : "s"}` : "",
    textMatches.size ? `${textMatches.size} metadata text clue${textMatches.size === 1 ? "" : "s"}` : "",
    collectionMatches.size ? `${collectionMatches.size} collection clue${collectionMatches.size === 1 ? "" : "s"}` : "",
    tokenStandardMatches.size ? "token standard clue" : "",
  ].filter(Boolean);

  return {
    signal: rule.signal,
    confidence,
    score,
    reason: evidence.join(", "),
  };
}

export function deriveSecondarySignalsForNFT(nft: WalletProfileNFT): SecondarySignal[] {
  return SIGNAL_RULES
    .map((rule) => evaluateSignalRule(nft, rule))
    .filter((match): match is SignalMatch => Boolean(match))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return SIGNAL_RULES.findIndex((rule) => rule.signal === a.signal) -
        SIGNAL_RULES.findIndex((rule) => rule.signal === b.signal);
    })
    .slice(0, MAX_SIGNALS_PER_NFT)
    .map(({ signal, confidence, reason }) => ({ signal, confidence, reason }));
}

export function summarizeSecondarySignals(nfts: WalletProfileNFT[]): SecondarySignalSummary[] {
  const total = nfts.length;
  const summaries = new Map<SecondarySignalName, SecondarySignalSummary>();

  for (const nft of nfts) {
    const signals = deriveSecondarySignalsForNFT(nft);
    for (const signal of signals) {
      const current =
        summaries.get(signal.signal) ||
        {
          signal: signal.signal,
          count: 0,
          highConfidenceCount: 0,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          percentage: 0,
          sampleReasons: [],
        };

      current.count += 1;
      if (signal.confidence === "high") current.highConfidenceCount += 1;
      if (signal.confidence === "medium") current.mediumConfidenceCount += 1;
      if (signal.confidence === "low") current.lowConfidenceCount += 1;
      if (current.sampleReasons.length < 3 && signal.reason) {
        current.sampleReasons.push(signal.reason);
      }

      summaries.set(signal.signal, current);
    }
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      percentage: total ? Math.round((summary.count / total) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.signal.localeCompare(b.signal);
    });
}
