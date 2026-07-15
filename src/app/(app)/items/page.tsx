import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { itemWhere, parseItemFilters } from "@/lib/items";
import { fileUrl } from "@/lib/storage";
import { flattenTree } from "@/lib/tree";
import type { ItemRow } from "@/lib/types";
import { EmptyState, LinkButton, PageHeader, cn } from "@/components/ui";
import { ItemFilters } from "@/components/item-filters";
import { ItemsTable } from "@/components/items-table";
import { IconDownload, IconPlus } from "@/components/icons";

export const metadata = { title: "Items" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

type SP = Record<string, string | string[] | undefined>;

function queryString(sp: SP, overrides: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) params.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = parseItemFilters(sp);
  const where = itemWhere(user.tenantId, filters);
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const [items, total, categories, locations, tags] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        category: true,
        location: true,
        photos: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.item.count({ where }),
    prisma.category.findMany({ where: { tenantId: user.tenantId } }),
    prisma.location.findMany({ where: { tenantId: user.tenantId } }),
    prisma.tag.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
  ]);

  const rows: ItemRow[] = items.map((i) => ({
    id: i.id,
    itemNumber: i.itemNumber,
    name: i.name,
    brand: i.brand,
    quantity: i.quantity,
    categoryName: i.category?.name ?? null,
    locationName: i.location?.name ?? null,
    decision: i.decision,
    sellingStatus: i.sellingStatus,
    condition: i.condition,
    estimatedValue: i.estimatedValue,
    salePrice: i.salePrice,
    favorite: i.favorite,
    photoUrl: i.photos[0] ? fileUrl(i.photos[0].path) : null,
    createdAt: i.createdAt.toISOString(),
    deletedAt: null,
  }));

  const catOptions = flattenTree(categories).map((c) => ({ id: c.id, label: c.label, depth: c.depth }));
  const locOptions = flattenTree(locations).map((l) => ({ id: l.id, label: l.label, depth: l.depth }));
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const exportQs = queryString(sp, { page: "" });

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={`${total} item${total === 1 ? "" : "s"} in inventory`}
        action={
          <>
            <a
              href={`/api/export/csv${exportQs}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <IconDownload size={16} /> CSV
            </a>
            <a
              href={`/api/export/xlsx${exportQs}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <IconDownload size={16} /> Excel
            </a>
            <LinkButton href="/items/new">
              <IconPlus size={16} /> Add item
            </LinkButton>
          </>
        }
      />

      <ItemFilters
        categories={catOptions}
        locations={locOptions}
        tags={tags.map((t) => ({ id: t.id, label: t.name }))}
        values={Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title={total === 0 && !exportQs ? "No items yet" : "Nothing matches these filters"}
          hint="Add your first item — a photo and a location are all it takes to never lose track of it again."
          action={<LinkButton href="/items/new">Add an item</LinkButton>}
        />
      ) : (
        <>
          <ItemsTable rows={rows} categories={catOptions} locations={locOptions} />
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 ? <span className="px-1 text-gray-400">…</span> : null}
                    <Link
                      href={`/items${queryString(sp, { page: String(p) })}`}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm",
                        p === page ? "bg-brand-600 font-semibold text-white" : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
