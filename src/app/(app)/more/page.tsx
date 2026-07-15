import { requireUser } from "@/lib/auth";
import { MoreGrid } from "@/components/nav";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "More" };

export default async function MorePage() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader title="More" subtitle={`Signed in as ${user.name} · ${user.tenant.name}`} />
      <MoreGrid isSuperAdmin={user.isSuperAdmin} />
    </div>
  );
}
