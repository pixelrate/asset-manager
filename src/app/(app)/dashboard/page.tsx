import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { SELLING_STATUSES } from "@/lib/constants";
import { itemNo, money } from "@/lib/format";
import { Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { HBarChart, HistogramChart, MonthlyBarChart, PipelineBar } from "@/components/charts";
import { IconBox, IconPlus } from "@/components/icons";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Stat({ label, value, href, accent }: { label: string; value: string; href?: string; accent?: string }) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-200">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-gray-900"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function MiniItem({ item }: { item: { id: string; name: string; itemNumber: number; photoUrl: string | null } }) {
  return (
    <Link href={`/items/${item.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
      {item.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
          <IconBox size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{item.name}</span>
      <span className="text-xs text-gray-400">{itemNo(item.itemNumber)}</span>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const live = { tenantId: t, deletedAt: null };

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalItems,
    decisionGroups,
    statusGroups,
    valueAgg,
    sellValueAgg,
    salesAgg,
    categoryGroups,
    locationGroups,
    soldItems,
    recentItems,
    recentViews,
    missingPhotos,
    uncategorized,
    valueItems,
    categories,
    locations,
  ] = await Promise.all([
    prisma.item.count({ where: live }),
    prisma.item.groupBy({ by: ["decision"], where: live, _count: true }),
    prisma.item.groupBy({ by: ["sellingStatus"], where: live, _count: true }),
    prisma.item.aggregate({ where: { ...live, sellingStatus: { not: "SOLD" } }, _sum: { estimatedValue: true } }),
    prisma.item.aggregate({
      where: { ...live, decision: "SELL", sellingStatus: { not: "SOLD" } },
      _sum: { estimatedValue: true },
    }),
    prisma.item.aggregate({ where: { tenantId: t, sellingStatus: "SOLD" }, _sum: { salePrice: true }, _count: true }),
    prisma.item.groupBy({ by: ["categoryId"], where: live, _count: true }),
    prisma.item.groupBy({ by: ["locationId"], where: live, _sum: { estimatedValue: true } }),
    prisma.item.findMany({
      where: { tenantId: t, sellingStatus: "SOLD", soldAt: { gte: twelveMonthsAgo } },
      select: { soldAt: true, salePrice: true },
    }),
    prisma.item.findMany({
      where: live,
      include: { photos: { orderBy: [{ isPrimary: "desc" }], take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.recentView.findMany({
      where: { userId: user.id, item: { deletedAt: null } },
      include: { item: { include: { photos: { orderBy: [{ isPrimary: "desc" }], take: 1 } } } },
      orderBy: { viewedAt: "desc" },
      take: 6,
    }),
    prisma.item.count({ where: { ...live, photos: { none: {} } } }),
    prisma.item.count({ where: { ...live, categoryId: null } }),
    prisma.item.findMany({ where: { ...live, estimatedValue: { not: null } }, select: { estimatedValue: true } }),
    prisma.category.findMany({ where: { tenantId: t } }),
    prisma.location.findMany({ where: { tenantId: t } }),
  ]);

  const decisionCount = (d: string) => decisionGroups.find((g) => g.decision === d)?._count ?? 0;
  const statusCount = (s: string) => statusGroups.find((g) => g.sellingStatus === s)?._count ?? 0;
  const pendingListings = statusCount("LISTED") + statusCount("OFFER_RECEIVED") + statusCount("PENDING_PICKUP");

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = categoryGroups
    .map((g) => ({ name: g.categoryId ? catName.get(g.categoryId) ?? "Unknown" : "Uncategorized", value: g._count }))
    .sort((a, b) => b.value - a.value);
  const topCats = byCategory.slice(0, 8);
  const restCats = byCategory.slice(8).reduce((s, c) => s + c.value, 0);
  if (restCats > 0) topCats.push({ name: "Other", value: restCats });

  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const byLocation = locationGroups
    .map((g) => ({
      name: g.locationId ? locName.get(g.locationId) ?? "Unknown" : "No location",
      value: Math.round(g._sum.estimatedValue ?? 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Monthly sales, last 12 months.
  const months: { key: string; name: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: d.toLocaleString("en-US", { month: "short" }),
      value: 0,
    });
  }
  for (const s of soldItems) {
    if (!s.soldAt) continue;
    const key = `${s.soldAt.getFullYear()}-${s.soldAt.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.value += s.salePrice ?? 0;
  }

  // Value distribution buckets.
  const buckets = [
    { name: "<$25", min: 0, max: 25 },
    { name: "$25–50", min: 25, max: 50 },
    { name: "$50–100", min: 50, max: 100 },
    { name: "$100–250", min: 100, max: 250 },
    { name: "$250–500", min: 250, max: 500 },
    { name: "$500–1k", min: 500, max: 1000 },
    { name: "$1k+", min: 1000, max: Infinity },
  ].map((b) => ({
    name: b.name,
    value: valueItems.filter((v) => (v.estimatedValue ?? 0) >= b.min && (v.estimatedValue ?? 0) < b.max).length,
  }));

  const pipeline = SELLING_STATUSES.map((s) => ({ label: s.label, count: statusCount(s.value) }));

  const healthIssues = missingPhotos + uncategorized;

  return (
    <div>
      <PageHeader
        title={`Hey ${user.name.split(" ")[0]} 👋`}
        subtitle={`Here's what's happening in ${user.tenant.name}.`}
        action={
          <LinkButton href="/items/new">
            <IconPlus size={16} /> Add item
          </LinkButton>
        }
      />

      {/* Stat tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total items" value={String(totalItems)} href="/items" />
        <Stat label="Inventory value" value={money(valueAgg._sum.estimatedValue ?? 0)} href="/reports?type=valuation" />
        <Stat label="To sell (est.)" value={money(sellValueAgg._sum.estimatedValue ?? 0)} href="/items?decision=SELL" />
        <Stat label="Total sales" value={money(salesAgg._sum.salePrice ?? 0)} href="/reports?type=profit" accent="text-emerald-600" />
        <Stat label="Pending listings" value={String(pendingListings)} href="/items?status=LISTED" />
        <Stat
          label="Health issues"
          value={String(healthIssues)}
          href="/reports?type=missing-photos"
          accent={healthIssues > 0 ? "text-amber-600" : "text-emerald-600"}
        />
      </div>

      {/* Keep / Sell / Donate / Trash strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Keep" value={String(decisionCount("KEEP"))} href="/items?decision=KEEP" />
        <Stat label="Sell" value={String(decisionCount("SELL"))} href="/items?decision=SELL" />
        <Stat label="Donate" value={String(decisionCount("DONATE"))} href="/items?decision=DONATE" />
        <Stat label="Trash" value={String(decisionCount("TRASH"))} href="/items?decision=TRASH" />
        <Stat label="Sold" value={String(salesAgg._count)} href="/items?status=SOLD" accent="text-emerald-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Selling pipeline" />
          <div className="p-4">
            <PipelineBar stages={pipeline} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Monthly sales (last 12 months)" />
          <div className="p-2">
            <MonthlyBarChart data={months.map(({ name, value }) => ({ name, value: Math.round(value) }))} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Items by category" />
          <div className="p-2">
            {topCats.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No items yet.</p>
            ) : (
              <HBarChart data={topCats} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Value by location" />
          <div className="p-2">
            {byLocation.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Assign estimated values and locations to see this.</p>
            ) : (
              <HBarChart data={byLocation} color="#1baf7a" money />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Value distribution" />
          <div className="p-2">
            <HistogramChart data={buckets} />
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Card>
            <CardHeader title="Recently added" />
            <div className="p-2">
              {recentItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Nothing yet.</p>
              ) : (
                recentItems.map((i) => (
                  <MiniItem
                    key={i.id}
                    item={{ id: i.id, name: i.name, itemNumber: i.itemNumber, photoUrl: i.photos[0] ? fileUrl(i.photos[0].path) : null }}
                  />
                ))
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Recently viewed" />
            <div className="p-2">
              {recentViews.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Items you open show up here.</p>
              ) : (
                recentViews.map((v) => (
                  <MiniItem
                    key={v.id}
                    item={{
                      id: v.item.id,
                      name: v.item.name,
                      itemNumber: v.item.itemNumber,
                      photoUrl: v.item.photos[0] ? fileUrl(v.item.photos[0].path) : null,
                    }}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
