import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { ConfirmAction } from "@/components/confirm-action";
import { createTag, deleteTag, renameTag } from "../actions";

export const dynamic = "force-dynamic";

export default async function TagsSettingsPage() {
  const user = await requireUser();
  const tags = await prisma.tag.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Add tag</h2>
        <form action={createTag} className="flex gap-2">
          <Input name="name" placeholder="Tag name" required className="max-w-56" />
          <Button type="submit">Add</Button>
        </form>
        <p className="mt-2 text-xs text-gray-400">Tags are also created on the fly when you type them on an item.</p>
      </Card>

      <Card>
        <CardHeader title={`Tags (${tags.length})`} />
        <ul className="divide-y divide-gray-50">
          {tags.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-4 py-2">
              <form action={renameTag} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={t.id} />
                <Input name="name" defaultValue={t.name} className="max-w-64" />
                <Button type="submit" variant="small">
                  Rename
                </Button>
              </form>
              <span className="text-xs text-gray-400">{t._count.items} items</span>
              <ConfirmAction
                action={deleteTag.bind(null, t.id)}
                label="Delete"
                confirmText={`Delete tag “${t.name}”? It will be removed from ${t._count.items} item(s).`}
                variant="small"
                className="text-red-600"
              />
            </li>
          ))}
          {tags.length === 0 && <li className="px-4 py-6 text-sm text-gray-400">No tags yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
