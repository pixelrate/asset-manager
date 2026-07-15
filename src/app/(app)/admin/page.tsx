import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { approveUser, reactivateUser, rejectUser, setTenantPlan, suspendUser } from "./actions";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-gray-200 text-gray-600",
};

export default async function AdminPage() {
  const admin = await requireSuperAdmin();

  const [pending, tenants] = await Promise.all([
    prisma.user.findMany({
      where: { status: "PENDING" },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tenant.findMany({
      include: {
        users: { orderBy: { createdAt: "asc" } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Platform Admin" subtitle="Approve signups and manage workspaces." />

      <Card className="mb-6">
        <CardHeader title={`Pending approvals (${pending.length})`} />
        {pending.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">No accounts waiting for approval.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {u.name} <span className="text-gray-400">·</span>{" "}
                    <span className="font-normal text-gray-500">{u.email}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Workspace “{u.tenant.name}” · requested {dateShort(u.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <Button type="submit" variant="primary">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <Button type="submit" variant="secondary">
                      Reject
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={`Workspaces (${tenants.length})`} />
        <ul className="divide-y divide-gray-100">
          {tenants.map((t) => (
            <li key={t.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">
                    {t._count.items} items · created {dateShort(t.createdAt)}
                  </p>
                </div>
                <form action={setTenantPlan} className="flex items-center gap-2">
                  <input type="hidden" name="tenantId" value={t.id} />
                  <input type="hidden" name="plan" value={t.plan === "PRO" ? "FREE" : "PRO"} />
                  <Badge color={t.plan === "PRO" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"}>
                    {t.plan}
                  </Badge>
                  <Button type="submit" variant="small">
                    {t.plan === "PRO" ? "Downgrade to Free" : "Upgrade to Pro"}
                  </Button>
                </form>
              </div>
              <ul className="mt-2 space-y-1">
                {t.users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                    <span className="text-xs text-gray-600">
                      {u.name} · {u.email} · {u.role}
                      {u.isSuperAdmin ? " · super admin" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge color={statusColor[u.status]}>{u.status}</Badge>
                      {u.id !== admin.id && u.status === "ACTIVE" ? (
                        <form action={suspendUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <Button type="submit" variant="small">
                            Suspend
                          </Button>
                        </form>
                      ) : null}
                      {u.status === "SUSPENDED" || u.status === "REJECTED" ? (
                        <form action={reactivateUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <Button type="submit" variant="small">
                            Reactivate
                          </Button>
                        </form>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
