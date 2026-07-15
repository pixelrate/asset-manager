import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { itemNo } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { LabelSelector, PrintButton } from "@/components/labels-client";

export const metadata = { title: "Print Labels" };
export const dynamic = "force-dynamic";

type SP = { ids?: string; locations?: string };

export default async function LabelsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const itemIds = (sp.ids ?? "").split(",").filter(Boolean);
  const locationIds = (sp.locations ?? "").split(",").filter(Boolean);

  if (itemIds.length === 0 && locationIds.length === 0) {
    // Selection mode.
    const [items, locations] = await Promise.all([
      prisma.item.findMany({
        where: { tenantId: user.tenantId, deletedAt: null },
        orderBy: { itemNumber: "asc" },
        select: { id: true, name: true, itemNumber: true },
      }),
      prisma.location.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    return (
      <div>
        <PageHeader
          title="Print Labels"
          subtitle="Pick items and locations, then generate a printable sheet of QR labels."
        />
        <LabelSelector
          items={items.map((i) => ({ id: i.id, label: `${itemNo(i.itemNumber)} ${i.name}` }))}
          locations={locations.map((l) => ({ id: l.id, label: l.name }))}
        />
      </div>
    );
  }

  // Print mode.
  const [items, locations] = await Promise.all([
    itemIds.length
      ? prisma.item.findMany({ where: { tenantId: user.tenantId, id: { in: itemIds } }, orderBy: { itemNumber: "asc" } })
      : Promise.resolve([]),
    locationIds.length
      ? prisma.location.findMany({ where: { tenantId: user.tenantId, id: { in: locationIds } }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={`Labels (${items.length + locations.length})`}
          subtitle="Print this page on sticker sheets, cut, and stick. QR opens the item; barcode is scannable too."
          action={<PrintButton />}
        />
      </div>

      <div className="print-sheet grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
        {locations.map((l) => (
          <div key={l.id} className="label-card flex flex-col items-center rounded-lg border border-gray-300 p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${l.qrCode}`} alt="" className="h-28 w-28" />
            <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-gray-900">{l.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Location</p>
          </div>
        ))}
        {items.map((i) => (
          <div key={i.id} className="label-card flex flex-col items-center rounded-lg border border-gray-300 p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${i.qrCode}`} alt="" className="h-28 w-28" />
            <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-gray-900">{i.name}</p>
            <p className="text-[10px] text-gray-500">{itemNo(i.itemNumber)}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/barcode/${i.barcode}`} alt="" className="mt-1 h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
