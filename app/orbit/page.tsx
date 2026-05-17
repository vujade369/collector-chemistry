import type { Metadata } from "next";
import { headers } from "next/headers";
import OrbitTestPage, { type InitialOrbitUrlState } from "../orbit-test/page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DEFAULT_ORBIT_NAME = "The Shared Rooms Orbit";
const LOCAL_ORIGIN = "http://localhost:3000";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanOrbitName(value?: string | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function parseSeedSlugsParam(value?: string | null) {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

const KNOWN_COLLECTION_LABELS: Record<string, string> = {
  mfers: "mfers",
  milady: "Milady",
  goblintownwtf: "goblintown.wtf",
  supducks: "SupDucks",
};

function labelFromSlug(value?: string | null) {
  const slug = String(value || "").trim();
  if (!slug) return "Unknown collection";

  const normalized = slug.toLowerCase();
  const knownLabel = KNOWN_COLLECTION_LABELS[normalized];
  if (knownLabel) return knownLabel;

  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function titleizeSlug(value?: string | null) {
  return labelFromSlug(value);
}

function formatSeedList(seedNames: string[]) {
  const names = seedNames.map(cleanOrbitName).filter(Boolean);

  if (names.length === 0) return "these seed collections";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
  if (names.length === 4) return `${names[0]}, ${names[1]}, ${names[2]}, and ${names[3]}`;

  return `${names[0]}, ${names[1]}, ${names[2]}, and ${names.length - 3} more`;
}

function safeOrigin(value?: string | null) {
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    try {
      return new URL(`https://${value}`).origin;
    } catch {
      return "";
    }
  }
}

async function getRequestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");

  return safeOrigin(host ? `${proto}://${host}` : null) || LOCAL_ORIGIN;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const name = cleanOrbitName(firstParam(params.name)) || DEFAULT_ORBIT_NAME;
  const rawSeed = firstParam(params.seed);
  const rawLegacySeed = firstParam(params.seedSlugs);
  const rawFrom = firstParam(params.from);
  const seedSlugs = parseSeedSlugsParam(rawSeed || rawLegacySeed);
  const seedNames = seedSlugs.map(labelFromSlug);
  const seedList = formatSeedList(seedNames);
  const remixSource = cleanOrbitName(rawFrom);
  const remixLine = remixSource ? ` Remixed from ${titleizeSlug(remixSource)}.` : "";
  const title = `${name} | Constellate`;
  const description = `A named orbit built from ${seedList}. Remix it in Constellate.${remixLine}`;
  const origin = await getRequestOrigin();
  const imageUrl = new URL("/orbit/og", origin);

  if (rawSeed) imageUrl.searchParams.set("seed", rawSeed);
  if (!rawSeed && rawLegacySeed) imageUrl.searchParams.set("seedSlugs", rawLegacySeed);
  if (name) imageUrl.searchParams.set("name", name);
  if (remixSource) imageUrl.searchParams.set("from", remixSource);

  const image = {
    url: imageUrl.toString(),
    width: 1200,
    height: 630,
    alt: `${name} Named Orbit preview`,
  };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl.toString()],
    },
  };
}

function readInitialOrbitUrlState(params: Awaited<SearchParams>): InitialOrbitUrlState {
  const rawSeed = firstParam(params.seed);
  const rawLegacySeed = firstParam(params.seedSlugs);

  return {
    wallet: cleanOrbitName(firstParam(params.wallet)),
    seedSlugs: parseSeedSlugsParam(rawSeed || rawLegacySeed),
    name: cleanOrbitName(firstParam(params.name)),
    from: cleanOrbitName(firstParam(params.from)),
  };
}

export default async function OrbitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return <OrbitTestPage initialOrbitUrlState={readInitialOrbitUrlState(params)} />;
}
