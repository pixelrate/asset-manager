import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flattenTree } from "@/lib/tree";
import { PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/item-form";
import { createItem } from "../actions";

export const metadata = { title: "Add item" };
export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const user = await requireUser();
  const [categories, locations, customFields] = await Promise.all([
    prisma.category.findMany({ where: { tenantId: user.tenantId } }),
    prisma.location.findMany({ where: { tenantId: user.tenantId } }),
    prisma.customFieldDef.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add item" subtitle="Snap a photo, say what it is, pick a shelf. Done." />
      <ItemForm
        action={createItem}
        categories={flattenTree(categories)}
        locations={flattenTree(locations)}
        customFields={customFields.map((cf) => ({
          id: cf.id,
          name: cf.name,
          type: cf.type,
          options: (cf.options ?? "").split("\n").map((o) => o.trim()).filter(Boolean),
          value: "",
        }))}
        submitLabel="Create item"
      />
    </div>
  );
}
