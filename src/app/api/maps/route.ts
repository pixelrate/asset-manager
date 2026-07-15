import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const name = String(fd.get("name") || "").trim() || "Garage map";
  const image = fd.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "An image is required" }, { status: 400 });
  }
  if (image.type && !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (image.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is over 15 MB" }, { status: 400 });
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const key = await saveFile(user.tenantId, image.name || "map.jpg", buf, image.type);
  const map = await prisma.garageMap.create({ data: { tenantId: user.tenantId, name, imagePath: key } });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "CREATE", entityType: "MAP", entityId: map.id, detail: name });
  return NextResponse.json({ ok: true, id: map.id });
}
