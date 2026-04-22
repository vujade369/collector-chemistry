import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    alchemy: {
      hasKey: !!process.env.ALCHEMY_API_KEY,
      preview: process.env.ALCHEMY_API_KEY
        ? `${process.env.ALCHEMY_API_KEY.slice(0, 6)}...`
        : null,
    },
    opensea: {
      hasKey: !!process.env.OPENSEA_API_KEY,
      preview: process.env.OPENSEA_API_KEY
        ? `${process.env.OPENSEA_API_KEY.slice(0, 6)}...`
        : null,
    },
  });
}