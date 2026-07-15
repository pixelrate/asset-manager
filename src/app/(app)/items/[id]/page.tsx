import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import {
  CONDITIONS,
  CONDITION_COLORS,
  DECISIONS,
  DECISION_COLORS,
  MARKETPLACES,
  SELLING_STATUSES,
  SELLING_STATUS_COLORS,
  labelFor,
} from "@/lib/constants";
import { dateShort, dateTime, itemNo, money } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { AttachmentUploader, PhotoManager } from "@/components/photo-manager";
import { ListingCopy } from "@/components/listing-copy";
import { ConfirmAction } from "@/components/confirm-action";
import { addMaintenanceLog, deleteAttachment, deleteMaintenanceLog, restoreItem, softDeleteItem } from "../actions";
import { IconEdit, IconPrint } from "@/components/icons";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{children}</dd>
    </div>
  );
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      category: { include: { parent: true } },
      location: true,
      photos: { orderBy: [{ sortOrder: "asc" }] },
      attachments: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
      maintenanceLogs: { orderBy: { date: "desc" } },
      customValues: { include: { field: true } },
    },
  });
  if (!item) notFound();

  // Track "recently viewed" (per user).
  await prisma.recentView.upsert({
    where: { userId_itemId: { userId: user.id, itemId: item.id } },
    create: { userId: user.id, itemId: item.id },
    update: { viewedAt: new Date() },
  });

  const [templates, activity, allLocations] = await Promise.all([
    prisma.listingTemplate.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({
      where: { tenantId: user.tenantId, entityType: "ITEM", entityId: item.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.location.findMany({ where: { tenantId: user.tenantId } }),
  ]);

  // Full location path, e.g. Garage › Shelf A.
  const locById = new Map(allLocations.map((l) => [l.id, l]));
  const locationPath: string[] = [];
  let cursor = item.location ? locById.get(item.location.id) : undefined;
  while (cursor) {
    locationPath.unshift(cursor.name);
    cursor = cursor.parentId ? locById.get(cursor.parentId) : undefined;
  }

  const isTrashed = item.deletedAt !== null;
  const templateVars = {
    name: item.name,
    brand: item.brand,
    model: item.model,
    condition: labelFor(CONDITIONS, item.condition),
    price: item.estimatedValue !== null ? String(item.estimatedValue) : "",
    minPrice: item.minPrice !== null ? String(item.minPrice) : "",
    description: item.description,
    category: item.category?.name ?? "",
    itemNumber: itemNo(item.itemNumber),
  };

  return (
    <div>
      {isTrashed && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>This item is in the trash.</span>
          <ConfirmAction action={restoreItem.bind(null, item.id)} label="Restore" variant="small" />
        </div>
      )}

      <PageHeader
        title={item.name}
        subtitle={`${itemNo(item.itemNumber)} · added ${dateShort(item.createdAt)}${item.favorite ? " · ★ favorite" : ""}`}
        action={
          <>
            <LinkButton variant="secondary" href={`/labels?ids=${item.id}`}>
              <IconPrint size={16} /> Label
            </LinkButton>
            <LinkButton variant="secondary" href={`/items/${item.id}/edit`}>
              <IconEdit size={16} /> Edit
            </LinkButton>
            {!isTrashed && (
              <ConfirmAction
                action={softDeleteItem.bind(null, item.id)}
                label="Trash"
                confirmText="Move this item to the trash? You can restore it later."
                variant="danger"
              />
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge color={DECISION_COLORS[item.decision]}>{labelFor(DECISIONS, item.decision)}</Badge>
        <Badge color={SELLING_STATUS_COLORS[item.sellingStatus]}>{labelFor(SELLING_STATUSES, item.sellingStatus)}</Badge>
        {item.condition && <Badge color={CONDITION_COLORS[item.condition]}>{labelFor(CONDITIONS, item.condition)}</Badge>}
        {item.tags.map((t) => (
          <Link key={t.tagId} href={`/items?tag=${t.tagId}`}>
            <Badge color="bg-gray-100 text-gray-600 hover:bg-gray-200">#{t.tag.name}</Badge>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: photos + description + details */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Photos ({item.photos.length})</h2>
            <PhotoManager
              itemId={item.id}
              photos={item.photos.map((p) => ({
                id: p.id,
                url: fileUrl(p.path),
                isPrimary: p.isPrimary,
                createdAt: p.createdAt.toISOString(),
              }))}
            />
          </Card>

          {(item.description || item.notes) && (
            <Card className="p-4">
              {item.description && (
                <>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900">Description</h2>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{item.description}</p>
                </>
              )}
              {item.notes && (
                <>
                  <h2 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Notes</h2>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{item.notes}</p>
                </>
              )}
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Details</h2>
            <dl className="divide-y divide-gray-50">
              <Row label="Category">
                {item.category ? (
                  <Link href={`/items?category=${item.category.id}`} className="text-brand-600 hover:underline">
                    {item.category.parent ? `${item.category.parent.name} › ` : ""}
                    {item.category.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Location">
                {item.location ? (
                  <Link href={`/locations/${item.location.id}`} className="text-brand-600 hover:underline">
                    {locationPath.join(" › ")}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Brand">{item.brand ?? "—"}</Row>
              <Row label="Model">{item.model ?? "—"}</Row>
              <Row label="Serial number">{item.serialNumber ?? "—"}</Row>
              <Row label="Quantity">{item.quantity}</Row>
              <Row label="Owner">{item.owner ?? "—"}</Row>
              {item.customValues.map((cv) => (
                <Row key={cv.id} label={cv.field.name}>
                  {cv.field.type === "BOOLEAN" ? (cv.value === "true" ? "Yes" : "No") : cv.value}
                </Row>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title={`Attachments (${item.attachments.length})`} action={<AttachmentUploader itemId={item.id} />} />
            {item.attachments.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400">Manuals, receipts, warranties…</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {item.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <a href={fileUrl(a.path)} target="_blank" className="truncate text-brand-600 hover:underline">
                      {a.filename}
                    </a>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                      {(a.size / 1024).toFixed(0)} KB · {dateShort(a.createdAt)}
                      <ConfirmAction
                        action={deleteAttachmentBound(a.id)}
                        label="✕"
                        confirmText={`Delete ${a.filename}?`}
                        variant="ghost"
                        className="px-1.5 py-0.5 text-red-500"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={`Maintenance log (${item.maintenanceLogs.length})`} />
            <div className="px-4 py-3">
              <form action={addMaintenanceLog.bind(null, item.id)} className="mb-3 grid gap-2 sm:grid-cols-[10rem_1fr_7rem_auto]">
                <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                <Input name="type" placeholder="Oil change, calibration, new blade…" required />
                <Input name="cost" type="number" step="any" min={0} placeholder="Cost $" />
                <Button type="submit" variant="secondary">
                  Log
                </Button>
                <div className="sm:col-span-4">
                  <Input name="notes" placeholder="Notes (optional)" />
                </div>
              </form>
              {item.maintenanceLogs.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {item.maintenanceLogs.map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">
                          {m.type} {m.cost !== null ? <span className="font-normal text-gray-400">· {money(m.cost)}</span> : null}
                        </p>
                        <p className="text-xs text-gray-400">
                          {dateShort(m.date)}
                          {m.notes ? ` — ${m.notes}` : ""}
                        </p>
                      </div>
                      <ConfirmAction
                        action={deleteMaintenanceLog.bind(null, m.id)}
                        label="✕"
                        confirmText="Delete this log entry?"
                        variant="ghost"
                        className="px-1.5 py-0.5 text-red-500"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Right: value, selling, codes, activity */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Value</h2>
            <dl className="divide-y divide-gray-50">
              <Row label="Purchase price">{money(item.purchasePrice)}</Row>
              <Row label="Estimated value">{money(item.estimatedValue)}</Row>
              <Row label="Minimum price">{money(item.minPrice)}</Row>
              {item.sellingStatus === "SOLD" && (
                <Row label="Sold for">
                  <span className="text-emerald-600">{money(item.salePrice)}</span>
                </Row>
              )}
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Selling</h2>
            <dl className="divide-y divide-gray-50">
              <Row label="Status">{labelFor(SELLING_STATUSES, item.sellingStatus)}</Row>
              <Row label="Marketplace">{labelFor(MARKETPLACES, item.marketplace)}</Row>
              {item.listingUrl && (
                <Row label="Listing">
                  <a href={item.listingUrl} target="_blank" className="text-brand-600 hover:underline">
                    Open ↗
                  </a>
                </Row>
              )}
              <Row label="Listed on">{dateShort(item.listedAt)}</Row>
              <Row label="Sold on">{dateShort(item.soldAt)}</Row>
              <Row label="Buyer">{item.buyer ?? "—"}</Row>
            </dl>
            {item.saleNotes && <p className="mt-2 text-xs text-gray-500">{item.saleNotes}</p>}
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Listing copy</h2>
            <ListingCopy
              templates={templates.map((t) => ({ id: t.id, name: t.name, marketplace: t.marketplace, body: t.body }))}
              vars={templateVars}
            />
          </Card>

          <Card className="p-4 text-center">
            <h2 className="mb-3 text-left text-sm font-semibold text-gray-900">Codes</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${item.qrCode}`} alt={`QR code for ${item.name}`} className="mx-auto h-36 w-36" />
            <p className="mt-1 text-xs text-gray-400">Scan to open this item</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/barcode/${item.barcode}`} alt={`Barcode ${item.barcode}`} className="mx-auto mt-4 h-16" />
          </Card>

          {activity.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Activity</h2>
              <ul className="space-y-1.5">
                {activity.map((a) => (
                  <li key={a.id} className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{a.action.toLowerCase()}</span>
                    {a.user ? ` by ${a.user.name}` : ""} · {dateTime(a.createdAt)}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function deleteAttachmentBound(id: string) {
  return deleteAttachment.bind(null, id);
}
