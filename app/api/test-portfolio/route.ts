import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.g.alchemy.com/data/v1/assets/nfts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ALCHEMY_API_KEY}`,
    },
    body: JSON.stringify({
      addresses: [
        {
          address: "0x16f3d833bb91aebb5066884501242d8b3c3b5e61",
          networks: ["eth-mainnet"],
        },
      ],
    }),
  });

  const json = await res.json();
  return NextResponse.json({ status: res.status, body: json });
}
