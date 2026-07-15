import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { dateShort, itemNo } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmAction } from "@/components/confirm-action";
import { hardDeleteItem, restoreItem } from "../items/actions";
import { IconBox } from "@/components/icons";

export const metadata = { title: "Trash" };
export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const user = await requireUser();
  const items = await prisma.item.findMany({
    where: { tenantId: user.tenantId, deletedAt: { not: null } },
    include: { photos: { orderBy: [{ isPrimary: "desc" }], take: 1 } },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Trash" subtitle="Deleted items stay here until you restore or permanently delete them." />
      {items.length === 0 ? (
        <EmptyState title="Trash is empty" hint="Items you delete land here so nothing is lost by accident." />
      ) : (
        <Card>
          <ul className="divide-y divide-gray-100">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                {i.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(i.photos[0].path)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                    <IconBox size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/items/${i.id}`} className="block truncate text-sm font-medium text-gray-900 hover:text-brand-600">
                    {i.name}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {itemNo(i.itemNumber)} · trashed {dateShort(i.deletedAt)}
                  </p>
                </div>
                <ConfirmAction action={restoreItem.bind(null, i.id)} label="Restore" variant="small" />
                <ConfirmAction
                  action={hardDeleteItem.bind(null, i.id)}
                  label="Delete forever"
                  confirmText={`Permanently delete “${i.name}” and its photos? This cannot be undone.`}
                  variant="small"
                  className="text-red-600"
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
