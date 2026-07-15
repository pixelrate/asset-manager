import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MARKETPLACES, TEMPLATE_PLACEHOLDERS } from "@/lib/constants";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteTemplate, saveTemplate } from "../actions";

export const dynamic = "force-dynamic";

function TemplateForm({
  template,
}: {
  template?: { id: string; name: string; marketplace: string | null; body: string };
}) {
  return (
    <form action={saveTemplate} className="space-y-3">
      <input type="hidden" name="id" value={template?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Template name">
          <Input name="name" required defaultValue={template?.name ?? ""} placeholder="Facebook quick listing" />
        </Field>
        <Field label="Marketplace (optional)">
          <Select name="marketplace" defaultValue={template?.marketplace ?? ""}>
            <option value="">Any</option>
            {MARKETPLACES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Body">
        <Textarea name="body" required rows={6} defaultValue={template?.body ?? ""} placeholder={"{{name}} — {{condition}}\n\n{{description}}\n\nAsking ${{price}}."} />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit">{template ? "Save" : "Add template"}</Button>
      </div>
    </form>
  );
}

export default async function TemplatesSettingsPage() {
  const user = await requireUser();
  const templates = await prisma.listingTemplate.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4">
        <p className="text-sm text-gray-600">
          Templates generate ready-to-paste listing copy on each item page. Available placeholders:
        </p>
        <p className="mt-2 flex flex-wrap gap-1">
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <code key={p} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
              {p}
            </code>
          ))}
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">New template</h2>
        <TemplateForm />
      </Card>

      {templates.map((t) => (
        <Card key={t.id}>
          <CardHeader
            title={t.name}
            action={
              <ConfirmAction
                action={deleteTemplate.bind(null, t.id)}
                label="Delete"
                confirmText={`Delete template “${t.name}”?`}
                variant="small"
                className="text-red-600"
              />
            }
          />
          <div className="p-4">
            <TemplateForm template={t} />
          </div>
        </Card>
      ))}
    </div>
  );
}
