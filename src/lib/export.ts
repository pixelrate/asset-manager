import "server-only";
import { prisma } from "@/lib/db";
import { itemWhere, parseItemFilters } from "@/lib/items";
import { labelFor, CONDITIONS, DECISIONS, MARKETPLACES, SELLING_STATUSES } from "@/lib/constants";

export const EXPORT_COLUMNS = [
  "Item #",
  "Name",
  "Description",
  "Category",
  "Location",
  "Brand",
  "Model",
  "Serial Number",
  "Quantity",
  "Owner",
  "Condition",
  "Tags",
  "Decision",
  "Selling Status",
  "Marketplace",
  "Listing URL",
  "Listed At",
  "Sold At",
  "Sale Price",
  "Buyer",
  "Purchase Price",
  "Estimated Value",
  "Min Price",
  "Barcode",
  "QR Code",
  "Favorite",
  "Notes",
  "Created At",
] as const;

export async function buildExportRows(tenantId: string, sp: Record<string, string | string[] | undefined>) {
  const where = itemWhere(tenantId, parseItemFilters(sp));
  const [items, locations] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { category: { include: { parent: true } }, location: true, tags: { include: { tag: true } } },
      orderBy: { itemNumber: "asc" },
    }),
    prisma.location.findMany({ where: { tenantId } }),
  ]);

  const locById = new Map(locations.map((l) => [l.id, l]));
  const locPath = (id: string | null): string => {
    const parts: string[] = [];
    let cursor = id ? locById.get(id) : undefined;
    while (cursor) {
      parts.unshift(cursor.name);
      cursor = cursor.parentId ? locById.get(cursor.parentId) : undefined;
    }
    return parts.join(" › ");
  };

  const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  return items.map((i) => [
    i.itemNumber,
    i.name,
    i.description ?? "",
    i.category ? (i.category.parent ? `${i.category.parent.name} › ` : "") + i.category.name : "",
    locPath(i.locationId),
    i.brand ?? "",
    i.model ?? "",
    i.serialNumber ?? "",
    i.quantity,
    i.owner ?? "",
    i.condition ? labelFor(CONDITIONS, i.condition) : "",
    i.tags.map((t) => t.tag.name).join(", "),
    labelFor(DECISIONS, i.decision),
    labelFor(SELLING_STATUSES, i.sellingStatus),
    i.marketplace ? labelFor(MARKETPLACES, i.marketplace) : "",
    i.listingUrl ?? "",
    ymd(i.listedAt),
    ymd(i.soldAt),
    i.salePrice ?? "",
    i.buyer ?? "",
    i.purchasePrice ?? "",
    i.estimatedValue ?? "",
    i.minPrice ?? "",
    i.barcode,
    i.qrCode,
    i.favorite ? "Yes" : "",
    i.notes ?? "",
    ymd(i.createdAt),
  ]);
}
