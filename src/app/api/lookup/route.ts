import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Scan-to-lookup: resolve a scanned barcode / QR slug / item number to a URL. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let code = (req.nextUrl.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  // Scanned QR contents may be a full URL like https://host/qr/i8kq2…
  const urlMatch = code.match(/\/qr\/([A-Za-z0-9]+)/);
  if (urlMatch) code = urlMatch[1];

  const item = await prisma.item.findFirst({
    where: {
      tenantId: user.tenantId,
      OR: [
        { barcode: code },
        { qrCode: code },
        ...(Number.isFinite(parseInt(code.replace(/^#/, ""), 10))
          ? [{ itemNumber: parseInt(code.replace(/^#/, ""), 10) }]
          : []),
      ],
    },
    select: { id: true, name: true, itemNumber: true },
  });
  if (item) return NextResponse.json({ type: "item", url: `/items/${item.id}`, name: item.name });

  const location = await prisma.location.findFirst({
    where: { tenantId: user.tenantId, qrCode: code },
    select: { id: true, name: true },
  });
  if (location) return NextResponse.json({ type: "location", url: `/locations/${location.id}`, name: location.name });

  return NextResponse.json({ error: "No match" }, { status: 404 });
}
