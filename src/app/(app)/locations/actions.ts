"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { newQrCode } from "@/lib/items";
import { deleteFile } from "@/lib/storage";

export type LocationFormState = { error?: string };

async function ownedLocation(id: string) {
  const user = await requireUser();
  const location = await prisma.location.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!location) throw new Error("Location not found");
  return { user, location };
}

export async function createLocation(_prev: LocationFormState, fd: FormData): Promise<LocationFormState> {
  const user = await requireUser();
  const name = String(fd.get("name") || "").trim();
  if (!name) return { error: "Name is required." };
  const parentId = String(fd.get("parentId") || "") || null;
  const type = String(fd.get("type") || "AREA");
  const description = String(fd.get("description") || "").trim() || null;

  if (parentId) {
    const parent = await prisma.location.findFirst({ where: { id: parentId, tenantId: user.tenantId } });
    if (!parent) return { error: "Parent location not found." };
  }

  const loc = await prisma.location.create({
    data: { tenantId: user.tenantId, name, parentId, type, description, qrCode: newQrCode("l") },
  });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "CREATE", entityType: "LOCATION", entityId: loc.id, detail: name });
  revalidatePath("/locations");
  return {};
}

export async function updateLocation(id: string, _prev: LocationFormState, fd: FormData): Promise<LocationFormState> {
  const { user } = await ownedLocation(id);
  const name = String(fd.get("name") || "").trim();
  if (!name) return { error: "Name is required." };
  const parentId = String(fd.get("parentId") || "") || null;
  if (parentId === id) return { error: "A location cannot be its own parent." };

  // Prevent cycles: walk up from the proposed parent.
  if (parentId) {
    const all = await prisma.location.findMany({ where: { tenantId: user.tenantId }, select: { id: true, parentId: true } });
    const parentOf = new Map(all.map((l) => [l.id, l.parentId]));
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === id) return { error: "That parent would create a loop." };
      cursor = parentOf.get(cursor) ?? null;
    }
  }

  await prisma.location.update({
    where: { id },
    data: {
      name,
      parentId,
      type: String(fd.get("type") || "AREA"),
      description: String(fd.get("description") || "").trim() || null,
    },
  });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "UPDATE", entityType: "LOCATION", entityId: id, detail: name });
  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  return {};
}

export async function deleteLocation(id: string) {
  const { user, location } = await ownedLocation(id);
  // Children are re-parented to the grandparent; items fall back to "no location".
  await prisma.$transaction([
    prisma.location.updateMany({ where: { parentId: id }, data: { parentId: location.parentId } }),
    prisma.item.updateMany({ where: { locationId: id }, data: { locationId: null } }),
    prisma.location.delete({ where: { id } }),
  ]);
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "DELETE", entityType: "LOCATION", entityId: id, detail: location.name });
  revalidatePath("/locations");
  redirect("/locations");
}

// ---------- Garage map pins ----------

export async function setLocationPin(locationId: string, mapId: string, x: number, y: number) {
  const { user } = await ownedLocation(locationId);
  const map = await prisma.garageMap.findFirst({ where: { id: mapId, tenantId: user.tenantId } });
  if (!map) throw new Error("Map not found");
  await prisma.location.update({
    where: { id: locationId },
    data: { mapId, mapX: Math.min(100, Math.max(0, x)), mapY: Math.min(100, Math.max(0, y)) },
  });
  revalidatePath("/map");
}

export async function clearLocationPin(locationId: string) {
  await ownedLocation(locationId);
  await prisma.location.update({ where: { id: locationId }, data: { mapId: null, mapX: null, mapY: null } });
  revalidatePath("/map");
}

export async function deleteMap(mapId: string) {
  const user = await requireUser();
  const map = await prisma.garageMap.findFirst({ where: { id: mapId, tenantId: user.tenantId } });
  if (!map) throw new Error("Map not found");
  await prisma.garageMap.delete({ where: { id: mapId } });
  await deleteFile(map.imagePath);
  revalidatePath("/map");
  redirect("/map");
}
