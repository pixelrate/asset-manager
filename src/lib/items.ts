import "server-only";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const qrSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 9);
const digits = customAlphabet("0123456789", 11);

export function newQrCode(prefix: "i" | "l"): string {
  return prefix + qrSlug();
}

export function newBarcode(): string {
  // 12-digit numeric Code-128 payload; leading 2 marks "internal use" like store SKUs.
  return "2" + digits();
}

/** Atomically claim the next per-tenant item number. */
export async function nextItemNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<number> {
  const t = await tx.tenant.update({
    where: { id: tenantId },
    data: { lastItemNumber: { increment: 1 } },
    select: { lastItemNumber: true },
  });
  return t.lastItemNumber;
}

export type ItemFilters = {
  q?: string;
  categoryId?: string;
  locationId?: string;
  decision?: string;
  sellingStatus?: string;
  condition?: string;
  marketplace?: string;
  tagId?: string;
  minValue?: number;
  maxValue?: number;
  dateFrom?: string; // ISO date, createdAt >=
  dateTo?: string; // ISO date, createdAt <=
  favorites?: boolean;
};

export function parseItemFilters(sp: Record<string, string | string[] | undefined>): ItemFilters {
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const n = (k: string) => {
    const v = parseFloat(s(k) ?? "");
    return Number.isFinite(v) ? v : undefined;
  };
  return {
    q: s("q"),
    categoryId: s("category"),
    locationId: s("location"),
    decision: s("decision"),
    sellingStatus: s("status"),
    condition: s("condition"),
    marketplace: s("marketplace"),
    tagId: s("tag"),
    minValue: n("minValue"),
    maxValue: n("maxValue"),
    dateFrom: s("dateFrom"),
    dateTo: s("dateTo"),
    favorites: s("favorites") === "1",
  };
}

/** Build a Prisma where clause for the item list / exports / reports. */
export function itemWhere(tenantId: string, f: ItemFilters, trashed = false): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {
    tenantId,
    deletedAt: trashed ? { not: null } : null,
  };
  if (f.q) {
    // SQLite LIKE is case-insensitive for ASCII, which covers fuzzy-ish search
    // across the free-text fields.
    where.OR = [
      { name: { contains: f.q } },
      { description: { contains: f.q } },
      { notes: { contains: f.q } },
      { brand: { contains: f.q } },
      { model: { contains: f.q } },
      { serialNumber: { contains: f.q } },
      { barcode: { contains: f.q } },
    ];
    const asNumber = parseInt(f.q.replace(/^#/, ""), 10);
    if (Number.isFinite(asNumber)) where.OR.push({ itemNumber: asNumber });
  }
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.locationId) where.locationId = f.locationId;
  if (f.decision) where.decision = f.decision;
  if (f.sellingStatus) where.sellingStatus = f.sellingStatus;
  if (f.condition) where.condition = f.condition;
  if (f.marketplace) where.marketplace = f.marketplace;
  if (f.tagId) where.tags = { some: { tagId: f.tagId } };
  if (f.favorites) where.favorite = true;
  if (f.minValue !== undefined || f.maxValue !== undefined) {
    where.estimatedValue = {
      ...(f.minValue !== undefined ? { gte: f.minValue } : {}),
      ...(f.maxValue !== undefined ? { lte: f.maxValue } : {}),
    };
  }
  if (f.dateFrom || f.dateTo) {
    where.createdAt = {
      ...(f.dateFrom ? { gte: new Date(f.dateFrom + "T00:00:00") } : {}),
      ...(f.dateTo ? { lte: new Date(f.dateTo + "T23:59:59") } : {}),
    };
  }
  return where;
}

/** Item-limit enforcement for the subscription plans. */
export async function assertUnderItemLimit(tenantId: string, adding = 1): Promise<string | null> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (tenant.plan === "PRO" || tenant.itemLimit <= 0) return null;
  const count = await prisma.item.count({ where: { tenantId, deletedAt: null } });
  if (count + adding > tenant.itemLimit) {
    return `Your ${tenant.plan} plan is limited to ${tenant.itemLimit} items. Upgrade in Settings → Billing.`;
  }
  return null;
}
