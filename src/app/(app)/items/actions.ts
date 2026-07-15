"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { assertUnderItemLimit, newBarcode, newQrCode, nextItemNumber } from "@/lib/items";
import { deleteFile, saveFile } from "@/lib/storage";

export type ItemFormState = { error?: string };

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v + (v.length === 10 ? "T12:00:00" : ""));
  return isNaN(d.getTime()) ? null : d;
}

function parseItemFields(fd: FormData) {
  return {
    name: str(fd, "name") ?? "",
    description: str(fd, "description"),
    categoryId: str(fd, "categoryId"),
    brand: str(fd, "brand"),
    model: str(fd, "model"),
    serialNumber: str(fd, "serialNumber"),
    quantity: Math.max(1, Math.round(num(fd, "quantity") ?? 1)),
    owner: str(fd, "owner"),
    condition: str(fd, "condition"),
    notes: str(fd, "notes"),
    favorite: fd.get("favorite") === "on",
    locationId: str(fd, "locationId"),
    decision: str(fd, "decision") ?? "UNDECIDED",
    sellingStatus: str(fd, "sellingStatus") ?? "NOT_LISTED",
    marketplace: str(fd, "marketplace"),
    listingUrl: str(fd, "listingUrl"),
    listedAt: date(fd, "listedAt"),
    soldAt: date(fd, "soldAt"),
    salePrice: num(fd, "salePrice"),
    buyer: str(fd, "buyer"),
    saleNotes: str(fd, "saleNotes"),
    purchasePrice: num(fd, "purchasePrice"),
    estimatedValue: num(fd, "estimatedValue"),
    minPrice: num(fd, "minPrice"),
  };
}

/** Auto-fill listing/sale dates when the pipeline reaches those stages. */
function applyStatusDates<T extends { sellingStatus: string; listedAt: Date | null; soldAt: Date | null }>(d: T): T {
  if (d.sellingStatus === "LISTED" && !d.listedAt) d.listedAt = new Date();
  if (d.sellingStatus === "SOLD" && !d.soldAt) d.soldAt = new Date();
  return d;
}

async function syncTags(itemId: string, tenantId: string, tagsRaw: string | null) {
  const names = (tagsRaw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 30);
  await prisma.itemTag.deleteMany({ where: { itemId } });
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: { tenantId, name },
      update: {},
    });
    await prisma.itemTag.create({ data: { itemId, tagId: tag.id } });
  }
}

async function syncCustomValues(itemId: string, tenantId: string, fd: FormData) {
  const defs = await prisma.customFieldDef.findMany({ where: { tenantId } });
  for (const def of defs) {
    const raw = fd.get(`cf_${def.id}`);
    const value = def.type === "BOOLEAN" ? (raw === "on" ? "true" : "false") : typeof raw === "string" ? raw.trim() : "";
    if (value === "" || (def.type === "BOOLEAN" && value === "false")) {
      await prisma.customFieldValue.deleteMany({ where: { itemId, fieldId: def.id } });
    } else {
      await prisma.customFieldValue.upsert({
        where: { itemId_fieldId: { itemId, fieldId: def.id } },
        create: { itemId, fieldId: def.id, value },
        update: { value },
      });
    }
  }
}

async function savePhotos(itemId: string, tenantId: string, fd: FormData) {
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;
  const existing = await prisma.photo.count({ where: { itemId } });
  let order = existing;
  for (const file of files.slice(0, 12)) {
    const buf = Buffer.from(await file.arrayBuffer());
    const key = await saveFile(tenantId, file.name || "photo.jpg", buf, file.type);
    await prisma.photo.create({
      data: { itemId, path: key, isPrimary: existing === 0 && order === existing, sortOrder: order++ },
    });
  }
}

export async function createItem(_prev: ItemFormState, fd: FormData): Promise<ItemFormState> {
  const user = await requireUser();
  const data = parseItemFields(fd);
  if (!data.name) return { error: "Name is required." };

  const limitError = await assertUnderItemLimit(user.tenantId);
  if (limitError) return { error: limitError };

  let itemId = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const item = await prisma.$transaction(async (tx) => {
        const itemNumber = await nextItemNumber(tx, user.tenantId);
        return tx.item.create({
          data: {
            ...applyStatusDates(data),
            tenantId: user.tenantId,
            itemNumber,
            barcode: newBarcode(),
            qrCode: newQrCode("i"),
            createdById: user.id,
          },
        });
      });
      itemId = item.id;
      break;
    } catch (e) {
      // Retry only on barcode/qr unique collisions.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") || attempt === 2) throw e;
    }
  }

  await syncTags(itemId, user.tenantId, str(fd, "tags"));
  await syncCustomValues(itemId, user.tenantId, fd);
  await savePhotos(itemId, user.tenantId, fd);
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "CREATE", entityType: "ITEM", entityId: itemId, detail: data.name });
  redirect(`/items/${itemId}`);
}

async function ownedItem(itemId: string) {
  const user = await requireUser();
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.tenantId !== user.tenantId) throw new Error("Item not found");
  return { user, item };
}

export async function updateItem(itemId: string, _prev: ItemFormState, fd: FormData): Promise<ItemFormState> {
  const { user } = await ownedItem(itemId);
  const data = parseItemFields(fd);
  if (!data.name) return { error: "Name is required." };

  await prisma.item.update({ where: { id: itemId }, data: applyStatusDates(data) });
  await syncTags(itemId, user.tenantId, str(fd, "tags"));
  await syncCustomValues(itemId, user.tenantId, fd);
  await savePhotos(itemId, user.tenantId, fd);
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "UPDATE", entityType: "ITEM", entityId: itemId, detail: data.name });
  redirect(`/items/${itemId}`);
}

export async function toggleFavorite(itemId: string) {
  const { item } = await ownedItem(itemId);
  await prisma.item.update({ where: { id: itemId }, data: { favorite: !item.favorite } });
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/items");
}

export async function softDeleteItem(itemId: string) {
  const { user, item } = await ownedItem(itemId);
  await prisma.item.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "DELETE", entityType: "ITEM", entityId: itemId, detail: item.name });
  revalidatePath("/items");
  redirect("/items");
}

export async function restoreItem(itemId: string) {
  const { user, item } = await ownedItem(itemId);
  await prisma.item.update({ where: { id: itemId }, data: { deletedAt: null } });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "RESTORE", entityType: "ITEM", entityId: itemId, detail: item.name });
  revalidatePath("/trash");
  revalidatePath("/items");
}

export async function hardDeleteItem(itemId: string) {
  const { user, item } = await ownedItem(itemId);
  const [photos, attachments] = await Promise.all([
    prisma.photo.findMany({ where: { itemId } }),
    prisma.attachment.findMany({ where: { itemId } }),
  ]);
  await prisma.item.delete({ where: { id: itemId } });
  for (const f of [...photos.map((p) => p.path), ...attachments.map((a) => a.path)]) {
    await deleteFile(f);
  }
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "PURGE", entityType: "ITEM", entityId: itemId, detail: item.name });
  revalidatePath("/trash");
}

// ---------- Bulk actions (from the items list) ----------

export type BulkPatch = {
  categoryId?: string;
  locationId?: string;
  decision?: string;
  sellingStatus?: string;
};

export async function bulkUpdateItems(ids: string[], patch: BulkPatch) {
  const user = await requireUser();
  const data: Record<string, unknown> = {};
  if (patch.categoryId) data.categoryId = patch.categoryId === "__clear__" ? null : patch.categoryId;
  if (patch.locationId) data.locationId = patch.locationId === "__clear__" ? null : patch.locationId;
  if (patch.decision) data.decision = patch.decision;
  if (patch.sellingStatus) data.sellingStatus = patch.sellingStatus;
  if (Object.keys(data).length === 0) return;
  await prisma.item.updateMany({ where: { id: { in: ids }, tenantId: user.tenantId }, data });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "BULK_UPDATE", entityType: "ITEM", detail: `${ids.length} items` });
  revalidatePath("/items");
}

export async function bulkSoftDelete(ids: string[]) {
  const user = await requireUser();
  await prisma.item.updateMany({
    where: { id: { in: ids }, tenantId: user.tenantId },
    data: { deletedAt: new Date() },
  });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "BULK_DELETE", entityType: "ITEM", detail: `${ids.length} items` });
  revalidatePath("/items");
}

// ---------- Photos ----------

async function ownedPhoto(photoId: string) {
  const user = await requireUser();
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { item: true } });
  if (!photo || photo.item.tenantId !== user.tenantId) throw new Error("Photo not found");
  return { user, photo };
}

export async function setPrimaryPhoto(photoId: string) {
  const { photo } = await ownedPhoto(photoId);
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { itemId: photo.itemId }, data: { isPrimary: false } }),
    prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);
  revalidatePath(`/items/${photo.itemId}`);
}

export async function deletePhoto(photoId: string) {
  const { photo } = await ownedPhoto(photoId);
  await prisma.photo.delete({ where: { id: photoId } });
  await deleteFile(photo.path);
  if (photo.isPrimary) {
    const next = await prisma.photo.findFirst({ where: { itemId: photo.itemId }, orderBy: { sortOrder: "asc" } });
    if (next) await prisma.photo.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  revalidatePath(`/items/${photo.itemId}`);
}

export async function movePhoto(photoId: string, direction: "up" | "down") {
  const { photo } = await ownedPhoto(photoId);
  const siblings = await prisma.photo.findMany({ where: { itemId: photo.itemId }, orderBy: { sortOrder: "asc" } });
  const idx = siblings.findIndex((p) => p.id === photoId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= siblings.length) return;
  await prisma.$transaction([
    prisma.photo.update({ where: { id: siblings[idx].id }, data: { sortOrder: swapWith } }),
    prisma.photo.update({ where: { id: siblings[swapWith].id }, data: { sortOrder: idx } }),
  ]);
  revalidatePath(`/items/${photo.itemId}`);
}

// ---------- Attachments ----------

export async function deleteAttachment(attachmentId: string) {
  const user = await requireUser();
  const att = await prisma.attachment.findUnique({ where: { id: attachmentId }, include: { item: true } });
  if (!att || att.item.tenantId !== user.tenantId) throw new Error("Attachment not found");
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteFile(att.path);
  revalidatePath(`/items/${att.itemId}`);
}

// ---------- Maintenance logs ----------

export async function addMaintenanceLog(itemId: string, fd: FormData) {
  await ownedItem(itemId);
  const when = date(fd, "date") ?? new Date();
  const type = str(fd, "type");
  if (!type) return;
  await prisma.maintenanceLog.create({
    data: { itemId, date: when, type, cost: num(fd, "cost"), notes: str(fd, "notes") },
  });
  revalidatePath(`/items/${itemId}`);
}

export async function deleteMaintenanceLog(logId: string) {
  const user = await requireUser();
  const log = await prisma.maintenanceLog.findUnique({ where: { id: logId }, include: { item: true } });
  if (!log || log.item.tenantId !== user.tenantId) throw new Error("Log not found");
  await prisma.maintenanceLog.delete({ where: { id: logId } });
  revalidatePath(`/items/${log.itemId}`);
}
