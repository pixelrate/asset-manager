import "server-only";
import type { Prisma } from "@prisma/client";
import { newQrCode } from "@/lib/items";

/** Starter categories, locations, and a listing template for a fresh tenant. */
export async function seedTenantDefaults(tx: Prisma.TransactionClient, tenantId: string) {
  const cats: Array<{ name: string; children?: string[] }> = [
    { name: "Tools", children: ["Power Tools", "Hand Tools"] },
    { name: "Automotive" },
    { name: "Garden & Outdoor" },
    { name: "Sports & Recreation" },
    { name: "Electronics" },
    { name: "Household" },
    { name: "Seasonal" },
    { name: "Hardware & Supplies" },
  ];
  let order = 0;
  for (const c of cats) {
    const parent = await tx.category.create({
      data: { tenantId, name: c.name, sortOrder: order++ },
    });
    for (const child of c.children ?? []) {
      await tx.category.create({
        data: { tenantId, name: child, parentId: parent.id, sortOrder: order++ },
      });
    }
  }

  const garage = await tx.location.create({
    data: { tenantId, name: "Garage", type: "AREA", qrCode: newQrCode("l") },
  });
  await tx.location.create({
    data: { tenantId, name: "Workbench", type: "WORKBENCH", parentId: garage.id, qrCode: newQrCode("l") },
  });
  await tx.location.create({
    data: { tenantId, name: "Shelf A", type: "SHELF", parentId: garage.id, qrCode: newQrCode("l") },
  });

  await tx.listingTemplate.create({
    data: {
      tenantId,
      name: "Basic listing",
      marketplace: "FACEBOOK",
      body:
        "{{name}} — {{condition}}\n\n{{description}}\n\nBrand: {{brand}}\nModel: {{model}}\n\nAsking ${{price}}. Cash, local pickup. First come, first served.",
    },
  });
}
