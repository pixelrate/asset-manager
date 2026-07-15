import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CUSTOM_FIELD_TYPES, labelFor } from "@/lib/constants";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteCustomField, saveCustomField } from "../actions";

export const dynamic = "force-dynamic";

export default async function FieldsSettingsPage() {
  const user = await requireUser();
  const fields = await prisma.customFieldDef.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { values: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Custom fields</h2>
        <p className="mb-4 text-sm text-gray-500">
          Extra attributes for niche collections — “Scale” for models, “Voltage” for tools, “Vintage” yes/no…
          They appear on every item form.
        </p>
        <form action={saveCustomField} className="grid gap-3 sm:grid-cols-2">
          <Field label="Field name">
            <Input name="name" required placeholder="Voltage" />
          </Field>
          <Field label="Type">
            <Select name="type">
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Options (for Dropdown type)" hint="One option per line.">
              <Textarea name="options" rows={3} placeholder={"12V\n18V\n20V"} />
            </Field>
          </div>
          <div>
            <Button type="submit">Add field</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={`Defined fields (${fields.length})`} />
        <ul className="divide-y divide-gray-50">
          {fields.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
              <form action={saveCustomField} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={f.id} />
                <Input name="name" defaultValue={f.name} className="max-w-48" />
                <Select name="type" defaultValue={f.type} className="w-auto">
                  {CUSTOM_FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                {f.type === "SELECT" && (
                  <Input name="options" defaultValue={(f.options ?? "").split("\n").join(", ")} className="max-w-48" title="Comma or newline separated" />
                )}
                <Button type="submit" variant="small">
                  Save
                </Button>
              </form>
              <span className="text-xs text-gray-400">
                {labelFor(CUSTOM_FIELD_TYPES, f.type)} · used on {f._count.values} item(s)
              </span>
              <ConfirmAction
                action={deleteCustomField.bind(null, f.id)}
                label="Delete"
                confirmText={`Delete field “${f.name}”? Its values on ${f._count.values} item(s) will be removed.`}
                variant="small"
                className="text-red-600"
              />
            </li>
          ))}
          {fields.length === 0 && <li className="px-4 py-6 text-sm text-gray-400">No custom fields yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
