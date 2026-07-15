import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { flattenTree } from "@/lib/tree";
import { labelFor, LOCATION_TYPES } from "@/lib/constants";
import { itemNo, money } from "@/lib/format";
import { Badge, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { LocationForm } from "@/components/location-form";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteLocation, updateLocation } from "../actions";
import { IconBox, IconPrint } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const location = await prisma.location.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      children: { include: { _count: { select: { items: { where: { deletedAt: null } } } } } },
      items: {
        where: { deletedAt: null },
        include: { photos: { orderBy: [{ isPrimary: "desc" }], take: 1 } },
        orderBy: { name: "asc" },
      },
      map: true,
    },
  });
  if (!location) notFound();

  const all = await prisma.location.findMany({ where: { tenantId: user.tenantId } });
  const byId = new Map(all.map((l) => [l.id, l]));
  const path: string[] = [];
  let cursor = location.parentId ? byId.get(location.parentId) : undefined;
  while (cursor) {
    path.unshift(cursor.name);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  // Valid parents = anything that isn't this node or inside it.
  const descendants = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of all) {
      if (l.parentId && descendants.has(l.parentId) && !descendants.has(l.id)) {
        descendants.add(l.id);
        grew = true;
      }
    }
  }
  const parentOptions = flattenTree(all.filter((l) => !descendants.has(l.id)));

  return (
    <div>
      <PageHeader
        title={location.name}
        subtitle={`${path.length ? path.join(" › ") + " › " : ""}${labelFor(LOCATION_TYPES, location.type)}${location.description ? ` · ${location.description}` : ""}`}
        action={
          <>
            <LinkButton variant="secondary" href={`/labels?locations=${location.id}`}>
              <IconPrint size={16} /> Label
            </LinkButton>
            <ConfirmAction
              action={deleteLocation.bind(null, location.id)}
              label="Delete"
              confirmText={`Delete “${location.name}”? Items inside will become unassigned; sub-locations move up a level.`}
              variant="danger"
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {location.children.length > 0 && (
            <Card>
              <CardHeader title="Inside this location" />
              <ul className="divide-y divide-gray-50">
                {location.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/locations/${c.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50">
                      <span className="font-medium text-gray-800">{c.name}</span>
                      <span className="text-xs text-gray-400">
                        {labelFor(LOCATION_TYPES, c.type)} · {c._count.items} item{c._count.items === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader
              title={`Items here (${location.items.length})`}
              action={
                <Link href={`/items?location=${location.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  Open in item list →
                </Link>
              }
            />
            {location.items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">Nothing stored here yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {location.items.map((i) => (
                  <li key={i.id}>
                    <Link href={`/items/${i.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                      {i.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileUrl(i.photos[0].path)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                          <IconBox size={16} />
                        </span>
                      )}
                      <span className="flex-1 text-sm font-medium text-gray-800">{i.name}</span>
                      <span className="text-xs text-gray-400">{itemNo(i.itemNumber)}</span>
                      <span className="w-20 text-right text-sm text-gray-600">{money(i.estimatedValue)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Edit location</h2>
            <LocationForm
              action={updateLocation.bind(null, location.id)}
              parents={parentOptions.map((p) => ({ id: p.id, label: p.label, depth: p.depth }))}
              initial={{
                name: location.name,
                type: location.type,
                parentId: location.parentId ?? "",
                description: location.description ?? "",
              }}
              submitLabel="Save changes"
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 text-center">
            <h2 className="mb-3 text-left text-sm font-semibold text-gray-900">Location QR</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${location.qrCode}`} alt={`QR code for ${location.name}`} className="mx-auto h-40 w-40" />
            <p className="mt-2 text-xs text-gray-400">Stick this on the shelf/bin — scanning it lists everything inside.</p>
          </Card>

          {location.map && (
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">On the map</h2>
              <p className="text-sm text-gray-600">
                Pinned to <Link href={`/map?id=${location.map.id}`} className="text-brand-600 hover:underline">{location.map.name}</Link>
              </p>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Type</h2>
            <Badge color="bg-gray-100 text-gray-600">{labelFor(LOCATION_TYPES, location.type)}</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}
