import { NextResponse } from "next/server";
import { getWalletCollections } from "@/lib/getWalletCollections";

export async function GET() {
  try {
    const walletAddress = "0x8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

    const collections = await getWalletCollections(walletAddress);

    return NextResponse.json({
      success: true,
      count: collections.length,
      collections,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
