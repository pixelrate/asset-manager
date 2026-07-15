import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { flattenTree } from "@/lib/tree";
import { Card, PageHeader, cn } from "@/components/ui";
import { MapEditor, MapUploadForm } from "@/components/map-editor";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteMap } from "../locations/actions";

export const metadata = { title: "Garage Map" };
export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser();
  const { id } = await searchParams;

  const [maps, locations] = await Promise.all([
    prisma.garageMap.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.location.findMany({
      where: { tenantId: user.tenantId },
      include: { _count: { select: { items: { where: { deletedAt: null } } } } },
    }),
  ]);

  const active = maps.find((m) => m.id === id) ?? maps[0];
  const pins = active
    ? locations
        .filter((l) => l.mapId === active.id && l.mapX !== null && l.mapY !== null)
        .map((l) => ({ locationId: l.id, name: l.name, x: l.mapX!, y: l.mapY!, itemCount: l._count.items }))
    : [];

  return (
    <div>
      <PageHeader
        title="Garage Map"
        subtitle="Upload a photo or diagram of your space and pin locations onto it."
        action={
          active ? (
            <ConfirmAction
              action={deleteMap.bind(null, active.id)}
              label="Delete this map"
              confirmText={`Delete map “${active.name}”? Pins on it will be cleared.`}
              variant="secondary"
            />
          ) : undefined
        }
      />

      {maps.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {maps.map((m) => (
            <Link
              key={m.id}
              href={`/map?id=${m.id}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                active?.id === m.id ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              )}
            >
              {m.name}
            </Link>
          ))}
        </div>
      )}

      {active ? (
        <div className="space-y-6">
          <MapEditor
            mapId={active.id}
            imageUrl={fileUrl(active.imagePath)}
            pins={pins}
            locations={flattenTree(locations).map((l) => ({ id: l.id, label: l.label, depth: l.depth }))}
          />
          <Card className="max-w-md p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Add another map</h2>
            <MapUploadForm />
          </Card>
        </div>
      ) : (
        <Card className="mx-auto max-w-md p-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Upload your first map</h2>
          <p className="mb-4 text-sm text-gray-500">
            A phone photo of the garage, a floor plan sketch, anything — then tap to pin shelves and cabinets onto it.
          </p>
          <MapUploadForm />
        </Card>
      )}
    </div>
  );
}
