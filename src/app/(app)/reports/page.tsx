import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateShort, itemNo, money } from "@/lib/format";
import { Card, CardHeader, PageHeader, cn } from "@/components/ui";
import type { Item } from "@prisma/client";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const REPORTS = [
  { type: "valuation", label: "Valuation summary", blurb: "What everything is worth, by category." },
  { type: "profit", label: "Realized profit", blurb: "Revenue vs. cost for every sale." },
  { type: "sold-month", label: "Sold this month", blurb: "What went out the door this month." },
  { type: "by-location", label: "Inventory by location", blurb: "Item counts and value per location." },
  { type: "over-100", label: "Items over $100", blurb: "The stuff worth insuring." },
  { type: "ready-to-sell", label: "Ready to sell", blurb: "Marked SELL but not listed yet." },
  { type: "missing-photos", label: "Missing photos", blurb: "Items with no photo — inventory health." },
  { type: "uncategorized", label: "Uncategorized", blurb: "Items without a category — inventory health." },
] as const;

type ReportType = (typeof REPORTS)[number]["type"];

function ItemLinkRow({ item, right }: { item: Item; right?: React.ReactNode }) {
  return (
    <li>
      <Link href={`/items/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-gray-50">
        <span className="min-w-0">
          <span className="font-medium text-gray-800">{item.name}</span>
          <span className="ml-2 text-xs text-gray-400">{itemNo(item.itemNumber)}</span>
        </span>
        <span className="shrink-0 text-right text-gray-600">{right}</span>
      </Link>
    </li>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser();
  const t = user.tenantId;
  const live = { tenantId: t, deletedAt: null };
  const { type: rawType } = await searchParams;
  const type = (REPORTS.some((r) => r.type === rawType) ? rawType : "valuation") as ReportType;

  let body: React.ReactNode = null;

  if (type === "valuation") {
    const [items, categories] = await Promise.all([
      prisma.item.findMany({ where: { ...live, sellingStatus: { not: "SOLD" } } }),
      prisma.category.findMany({ where: { tenantId: t } }),
    ]);
    const catName = new Map(categories.map((c) => [c.id, c.name]));
    const groups = new Map<string, { count: number; purchase: number; estimated: number }>();
    for (const i of items) {
      const key = i.categoryId ? catName.get(i.categoryId) ?? "Unknown" : "Uncategorized";
      const g = groups.get(key) ?? { count: 0, purchase: 0, estimated: 0 };
      g.count += 1;
      g.purchase += i.purchasePrice ?? 0;
      g.estimated += i.estimatedValue ?? 0;
      groups.set(key, g);
    }
    const rows = [...groups.entries()].sort((a, b) => b[1].estimated - a[1].estimated);
    const totals = rows.reduce(
      (acc, [, g]) => ({ count: acc.count + g.count, purchase: acc.purchase + g.purchase, estimated: acc.estimated + g.estimated }),
      { count: 0, purchase: 0, estimated: 0 }
    );
    body = (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2 text-right">Items</th>
            <th className="px-4 py-2 text-right">Purchase cost</th>
            <th className="px-4 py-2 text-right">Estimated value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(([name, g]) => (
            <tr key={name}>
              <td className="px-4 py-2 font-medium text-gray-800">{name}</td>
              <td className="px-4 py-2 text-right text-gray-600">{g.count}</td>
              <td className="px-4 py-2 text-right text-gray-600">{money(g.purchase)}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-800">{money(g.estimated)}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-semibold text-gray-900">
            <td className="px-4 py-2">Total</td>
            <td className="px-4 py-2 text-right">{totals.count}</td>
            <td className="px-4 py-2 text-right">{money(totals.purchase)}</td>
            <td className="px-4 py-2 text-right">{money(totals.estimated)}</td>
          </tr>
        </tbody>
      </table>
    );
  } else if (type === "profit") {
    const sold = await prisma.item.findMany({ where: { tenantId: t, sellingStatus: "SOLD" }, orderBy: { soldAt: "desc" } });
    const totals = sold.reduce(
      (acc, i) => ({ revenue: acc.revenue + (i.salePrice ?? 0), cost: acc.cost + (i.purchasePrice ?? 0) }),
      { revenue: 0, cost: 0 }
    );
    body = (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2">Sold</th>
            <th className="px-4 py-2 text-right">Revenue</th>
            <th className="px-4 py-2 text-right">Cost</th>
            <th className="px-4 py-2 text-right">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sold.map((i) => {
            const profit = (i.salePrice ?? 0) - (i.purchasePrice ?? 0);
            return (
              <tr key={i.id}>
                <td className="px-4 py-2">
                  <Link href={`/items/${i.id}`} className="font-medium text-gray-800 hover:text-brand-600">
                    {i.name}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">{itemNo(i.itemNumber)}</span>
                </td>
                <td className="px-4 py-2 text-gray-500">{dateShort(i.soldAt)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{money(i.salePrice)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{money(i.purchasePrice)}</td>
                <td className={cn("px-4 py-2 text-right font-medium", profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {money(profit)}
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-50 font-semibold text-gray-900">
            <td className="px-4 py-2" colSpan={2}>
              Total ({sold.length} sales)
            </td>
            <td className="px-4 py-2 text-right">{money(totals.revenue)}</td>
            <td className="px-4 py-2 text-right">{money(totals.cost)}</td>
            <td className={cn("px-4 py-2 text-right", totals.revenue - totals.cost >= 0 ? "text-emerald-600" : "text-red-600")}>
              {money(totals.revenue - totals.cost)}
            </td>
          </tr>
        </tbody>
      </table>
    );
  } else if (type === "sold-month") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const sold = await prisma.item.findMany({
      where: { tenantId: t, sellingStatus: "SOLD", soldAt: { gte: start } },
      orderBy: { soldAt: "desc" },
    });
    const total = sold.reduce((s, i) => s + (i.salePrice ?? 0), 0);
    body = (
      <>
        <p className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{sold.length}</span> item(s) sold this month for{" "}
          <span className="font-semibold text-emerald-600">{money(total)}</span>
        </p>
        <ul className="divide-y divide-gray-100">
          {sold.map((i) => (
            <ItemLinkRow key={i.id} item={i} right={`${money(i.salePrice)} · ${dateShort(i.soldAt)}`} />
          ))}
        </ul>
      </>
    );
  } else if (type === "by-location") {
    const [locations, groups] = await Promise.all([
      prisma.location.findMany({ where: { tenantId: t } }),
      prisma.item.groupBy({ by: ["locationId"], where: live, _count: true, _sum: { estimatedValue: true } }),
    ]);
    const locName = new Map(locations.map((l) => [l.id, l.name]));
    const rows = groups
      .map((g) => ({
        id: g.locationId,
        name: g.locationId ? locName.get(g.locationId) ?? "Unknown" : "No location",
        count: g._count,
        value: g._sum.estimatedValue ?? 0,
      }))
      .sort((a, b) => b.value - a.value);
    body = (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2 text-right">Items</th>
            <th className="px-4 py-2 text-right">Estimated value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id ?? "none"}>
              <td className="px-4 py-2">
                {r.id ? (
                  <Link href={`/locations/${r.id}`} className="font-medium text-gray-800 hover:text-brand-600">
                    {r.name}
                  </Link>
                ) : (
                  <span className="text-gray-500">{r.name}</span>
                )}
              </td>
              <td className="px-4 py-2 text-right text-gray-600">{r.count}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-800">{money(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    // Simple drill-down lists.
    const where =
      type === "over-100"
        ? { ...live, estimatedValue: { gte: 100 } }
        : type === "ready-to-sell"
          ? { ...live, decision: "SELL", sellingStatus: { in: ["NOT_LISTED", "READY_FOR_PHOTOS", "PHOTOGRAPHED"] } }
          : type === "missing-photos"
            ? { ...live, photos: { none: {} } }
            : { ...live, categoryId: null }; // uncategorized
    const items = await prisma.item.findMany({
      where,
      orderBy: type === "over-100" ? { estimatedValue: "desc" } : { createdAt: "desc" },
      take: 200,
    });
    body =
      items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">Nothing here — nice and tidy. ✨</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((i) => (
            <ItemLinkRow key={i.id} item={i} right={money(i.estimatedValue)} />
          ))}
        </ul>
      );
  }

  const current = REPORTS.find((r) => r.type === type)!;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Valuation, profit, and inventory health." />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {REPORTS.map((r) => (
          <Link
            key={r.type}
            href={`/reports?type=${r.type}`}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium",
              r.type === type ? "bg-brand-600 text-white" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader title={current.label} action={<span className="text-xs text-gray-400">{current.blurb}</span>} />
        <div className="overflow-x-auto">{body}</div>
      </Card>
    </div>
  );
}
