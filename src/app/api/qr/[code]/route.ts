import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** PNG QR code for an item/location code. Encodes {qrBaseUrl}/qr/{code}. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const [item, location] = await Promise.all([
    prisma.item.findUnique({ where: { qrCode: code }, select: { tenantId: true } }),
    prisma.location.findUnique({ where: { qrCode: code }, select: { tenantId: true } }),
  ]);
  const tenantId = item?.tenantId ?? location?.tenantId;
  if (!tenantId || tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = user.tenant.qrBaseUrl?.replace(/\/$/, "") || process.env.APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  const png = await QRCode.toBuffer(`${base}/qr/${code}`, {
    type: "png",
    width: 360,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
