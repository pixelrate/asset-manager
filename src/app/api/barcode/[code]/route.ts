import { NextRequest, NextResponse } from "next/server";
import bwipjs from "bwip-js/node";
import { getCurrentUser } from "@/lib/auth";

/** PNG Code-128 barcode (bwip-js) for an item's barcode number. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  if (!/^[0-9A-Za-z-]{1,32}$/.test(code)) {
    return NextResponse.json({ error: "Bad code" }, { status: 400 });
  }

  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: code,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=86400" },
  });
}
