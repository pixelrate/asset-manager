import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flattenTree } from "@/lib/tree";
import { itemNo } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/item-form";
import { updateItem } from "../../actions";

export const metadata = { title: "Edit item" };
export const dynamic = "force-dynamic";

function ymd(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { tags: { include: { tag: true } }, customValues: true },
  });
  if (!item) notFound();

  const [categories, locations, customFields] = await Promise.all([
    prisma.category.findMany({ where: { tenantId: user.tenantId } }),
    prisma.location.findMany({ where: { tenantId: user.tenantId } }),
    prisma.customFieldDef.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
  ]);

  const valueByField = new Map(item.customValues.map((v) => [v.fieldId, v.value]));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${itemNo(item.itemNumber)}`} subtitle={item.name} />
      <ItemForm
        action={updateItem.bind(null, item.id)}
        categories={flattenTree(categories)}
        locations={flattenTree(locations)}
        customFields={customFields.map((cf) => ({
          id: cf.id,
          name: cf.name,
          type: cf.type,
          options: (cf.options ?? "").split("\n").map((o) => o.trim()).filter(Boolean),
          value: valueByField.get(cf.id) ?? "",
        }))}
        initial={{
          name: item.name,
          description: item.description ?? "",
          categoryId: item.categoryId ?? "",
          brand: item.brand ?? "",
          model: item.model ?? "",
          serialNumber: item.serialNumber ?? "",
          quantity: item.quantity,
          owner: item.owner ?? "",
          condition: item.condition ?? "",
          notes: item.notes ?? "",
          favorite: item.favorite,
          locationId: item.locationId ?? "",
          decision: item.decision,
          sellingStatus: item.sellingStatus,
          marketplace: item.marketplace ?? "",
          listingUrl: item.listingUrl ?? "",
          listedAt: ymd(item.listedAt),
          soldAt: ymd(item.soldAt),
          salePrice: item.salePrice,
          buyer: item.buyer ?? "",
          saleNotes: item.saleNotes ?? "",
          purchasePrice: item.purchasePrice,
          estimatedValue: item.estimatedValue,
          minPrice: item.minPrice,
          tags: item.tags.map((t) => t.tag.name).join(", "),
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
