import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.item.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const fd = await req.formData();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  for (const file of files.slice(0, 10)) {
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `${file.name} is over 20 MB` }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const key = await saveFile(user.tenantId, file.name || "attachment", buf, file.type);
    await prisma.attachment.create({
      data: { itemId: id, path: key, filename: file.name || "attachment", size: file.size, mimeType: file.type || null },
    });
  }
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "ADD_ATTACHMENT", entityType: "ITEM", entityId: id });
  return NextResponse.json({ ok: true });
}
