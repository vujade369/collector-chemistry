import { NextResponse } from "next/server";
import { searchOpenSeaCollections } from "../shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ results: [] });

  const results = await searchOpenSeaCollections(query);
  return NextResponse.json({ results });
}
