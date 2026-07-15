import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flattenTree } from "@/lib/tree";
import { labelFor, LOCATION_TYPES } from "@/lib/constants";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { LocationForm } from "@/components/location-form";
import { createLocation } from "./actions";
import { IconChevronRight, IconPin } from "@/components/icons";

export const metadata = { title: "Locations" };
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const user = await requireUser();
  const locations = await prisma.location.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { items: { where: { deletedAt: null } } } } },
  });
  const tree = flattenTree(locations);

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Where things live: areas, shelves, cabinets, bins…"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title={`All locations (${locations.length})`} />
            {tree.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">No locations yet — add your first area on the right.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {tree.map(({ node, depth }) => (
                  <li key={node.id}>
                    <Link
                      href={`/locations/${node.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50"
                      style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
                    >
                      <span className="text-gray-300">
                        <IconPin size={15} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{node.name}</span>
                      <Badge color="bg-gray-100 text-gray-500">{labelFor(LOCATION_TYPES, node.type)}</Badge>
                      <span className="w-16 text-right text-xs text-gray-400">
                        {node._count.items} item{node._count.items === 1 ? "" : "s"}
                      </span>
                      {node.mapId ? <Badge color="bg-brand-50 text-brand-600">pinned</Badge> : null}
                      <span className="text-gray-300">
                        <IconChevronRight size={15} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Add location</h2>
            <LocationForm
              action={createLocation}
              parents={tree.map((t) => ({ id: t.id, label: t.label, depth: t.depth }))}
              submitLabel="Add location"
              resetOnSuccess
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
