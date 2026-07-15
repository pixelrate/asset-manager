import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flattenTree, indentLabel } from "@/lib/tree";
import { Button, Card, CardHeader, Input, Select } from "@/components/ui";
import { ConfirmAction } from "@/components/confirm-action";
import { createCategory, deleteCategory, renameCategory } from "../actions";

export const dynamic = "force-dynamic";

export default async function CategoriesSettingsPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { items: true } } },
  });
  const tree = flattenTree(categories);

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Add category</h2>
        <form action={createCategory} className="flex flex-wrap gap-2">
          <Input name="name" placeholder="Category name" required className="max-w-56" />
          <Select name="parentId" className="w-auto">
            <option value="">Top level</option>
            {tree.map((c) => (
              <option key={c.id} value={c.id}>
                {indentLabel(c.label, c.depth)}
              </option>
            ))}
          </Select>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={`Categories (${categories.length})`} />
        <ul className="divide-y divide-gray-50">
          {tree.map(({ node, depth }) => (
            <li key={node.id} className="flex items-center gap-2 px-4 py-2" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
              <form action={renameCategory} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={node.id} />
                <Input name="name" defaultValue={node.name} className="max-w-64" />
                <Button type="submit" variant="small">
                  Rename
                </Button>
              </form>
              <span className="text-xs text-gray-400">{node._count.items} items</span>
              <ConfirmAction
                action={deleteCategory.bind(null, node.id)}
                label="Delete"
                confirmText={`Delete “${node.name}”? Items keep existing but lose this category; subcategories move up a level.`}
                variant="small"
                className="text-red-600"
              />
            </li>
          ))}
          {tree.length === 0 && <li className="px-4 py-6 text-sm text-gray-400">No categories yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
