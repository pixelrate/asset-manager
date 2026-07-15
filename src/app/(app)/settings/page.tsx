import { requireUser } from "@/lib/auth";
import { Button, Card, Field, Input } from "@/components/ui";
import { updateGeneral } from "./actions";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  return (
    <div className="max-w-xl space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Workspace</h2>
        <form action={updateGeneral} className="space-y-4">
          <Field label="Workspace name">
            <Input name="name" defaultValue={user.tenant.name} disabled={!isAdmin} />
          </Field>
          <Field
            label="QR label base URL"
            hint="Printed QR codes point here (e.g. https://assets.yourdomain.com). Leave blank to use this deployment's URL. Reprint labels after changing it."
          >
            <Input
              name="qrBaseUrl"
              type="text"
              placeholder="https://your-app.up.railway.app"
              defaultValue={user.tenant.qrBaseUrl ?? ""}
              disabled={!isAdmin}
            />
          </Field>
          {isAdmin ? (
            <Button type="submit">Save</Button>
          ) : (
            <p className="text-xs text-gray-400">Only workspace owners/admins can change these settings.</p>
          )}
        </form>
      </Card>
    </div>
  );
}
