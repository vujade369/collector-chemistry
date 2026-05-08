import { NextResponse } from "next/server";
import { getWalletPreviewImages } from "@/lib/preview/walletPreview";

function isValidWallet(value: string) {
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) || trimmed.endsWith(".eth");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim() || "";

  if (!wallet || !isValidWallet(wallet)) {
    return NextResponse.json({ images: [] });
  }

  const images = await getWalletPreviewImages(wallet);
  return NextResponse.json({ images });
}
