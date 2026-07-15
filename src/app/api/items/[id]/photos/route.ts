import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

const MAX_SIZE = 15 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.item.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const fd = await req.formData();
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const existing = await prisma.photo.count({ where: { itemId: id } });
  let order = existing;
  const created = [];
  for (const file of files.slice(0, 12)) {
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `${file.name} is over 15 MB` }, { status: 400 });
    if (file.type && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: `${file.name} is not an image` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const key = await saveFile(user.tenantId, file.name || "photo.jpg", buf, file.type);
    created.push(
      await prisma.photo.create({
        data: { itemId: id, path: key, isPrimary: existing === 0 && order === existing, sortOrder: order++ },
      })
    );
  }
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "ADD_PHOTO", entityType: "ITEM", entityId: id, detail: `${created.length} photo(s)` });
  return NextResponse.json({ ok: true, count: created.length });
}
