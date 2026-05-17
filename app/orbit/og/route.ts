import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createElement } from "react";

export const runtime = "edge";

const DEFAULT_ORBIT_NAME = "The Shared Rooms Orbit";
const IMAGE_SIZE = {
  width: 1200,
  height: 630,
};
const SEED_LABEL_OVERRIDES: Record<string, string> = {
  goblintownwtf: "goblintown.wtf",
  mfers: "mfers",
  milady: "Milady",
  supducks: "SupDucks",
};

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

function labelFromSlug(value?: string | null) {
  const slug = String(value || "").trim();
  if (!slug) return "Unknown collection";

  const override = SEED_LABEL_OVERRIDES[slug.toLowerCase()];
  if (override) return override;

  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function titleizeSlug(value?: string | null) {
  return labelFromSlug(value);
}

function truncateText(value: string, maxLength: number) {
  const text = cleanOrbitName(value);
  if (text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(maxLength - 1, 0)).trim()}...`;
}

function displayedSeeds(seedSlugs: string[]) {
  const labels = seedSlugs.map(labelFromSlug);

  if (labels.length <= 4) {
    return labels.map((label) => truncateText(label, 28));
  }

  return [
    ...labels.slice(0, 3).map((label) => truncateText(label, 28)),
    `+${labels.length - 3} more`,
  ];
}

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const orbitName = truncateText(
    cleanOrbitName(searchParams.get("name")) || DEFAULT_ORBIT_NAME,
    72
  );
  const seedSlugs = parseSeedSlugsParam(
    searchParams.get("seed") ?? searchParams.get("seedSlugs")
  );
  const seedLabels = displayedSeeds(seedSlugs);
  const remixSource = cleanOrbitName(searchParams.get("from"));
  const remixLabel = remixSource ? truncateText(titleizeSlug(remixSource), 48) : "";

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: "#08070c",
          color: "#f7eff7",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: 64,
        },
      },
      createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255, 72, 168, 0.22), transparent 34%), radial-gradient(circle at 78% 28%, rgba(98, 180, 255, 0.16), transparent 32%), radial-gradient(circle at 58% 88%, rgba(218, 198, 117, 0.12), transparent 36%)",
        },
      }),
      createElement("div", {
        style: {
          position: "absolute",
          inset: 28,
          display: "flex",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      }),
      createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 26, position: "relative" } },
        createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#cfc3d1",
              fontSize: 23,
              fontWeight: 760,
              letterSpacing: "0.18em",
            },
          },
          createElement("span", null, "NAMED ORBIT"),
          createElement("span", { style: { color: "#f7eff7", letterSpacing: 0 } }, "Constellate")
        ),
        createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 18,
              maxWidth: 960,
            },
          },
          createElement(
            "h1",
            {
              style: {
                margin: 0,
                color: "#fff8ff",
                fontSize: orbitName.length > 48 ? 66 : 78,
                lineHeight: 0.98,
                fontWeight: 780,
                letterSpacing: 0,
              },
            },
            orbitName
          ),
          remixLabel
            ? createElement(
                "p",
                {
                  style: {
                    margin: 0,
                    color: "#d6c9d9",
                    fontSize: 28,
                    lineHeight: 1.2,
                  },
                },
                `Remixed from ${remixLabel}`
              )
            : null
        ),
        createElement(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              maxWidth: 980,
            },
          },
          ...(seedLabels.length ? seedLabels : ["Seed collections"]).map((seed) =>
            createElement(
              "div",
              {
                key: seed,
                style: {
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#f2e9f3",
                  borderRadius: 999,
                  padding: "11px 18px",
                  fontSize: 25,
                  lineHeight: 1,
                },
              },
              seed
            )
          )
        )
      ),
      createElement(
        "div",
        {
          style: {
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#d8cdda",
            fontSize: 28,
          },
        },
        createElement("span", null, "Remix this orbit"),
        createElement(
          "span",
          { style: { color: "#9f94a4", fontSize: 22 } },
          "What you keep becomes a pattern."
        )
      )
    ),
    IMAGE_SIZE
  );
}
