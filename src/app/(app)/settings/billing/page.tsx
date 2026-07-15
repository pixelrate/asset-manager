import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/constants";
import { Badge, Card, CardHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const user = await requireUser();
  const itemCount = await prisma.item.count({ where: { tenantId: user.tenantId, deletedAt: null } });
  const plan = user.tenant.plan as keyof typeof PLANS;
  const limit = user.tenant.itemLimit;
  const pct = plan === "FREE" && limit > 0 ? Math.min(100, Math.round((itemCount / limit) * 100)) : 0;

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader
          title="Current plan"
          action={<Badge color={plan === "PRO" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"}>{PLANS[plan]?.label ?? plan}</Badge>}
        />
        <div className="space-y-3 p-4 text-sm text-gray-600">
          {plan === "FREE" ? (
            <>
              <p>
                The Free plan includes up to <strong>{limit}</strong> items. You're using{" "}
                <strong>
                  {itemCount} / {limit}
                </strong>
                .
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? "bg-amber-500" : "bg-brand-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <p>
              Pro plan — unlimited items. Currently cataloging <strong>{itemCount}</strong> items.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Upgrading</h2>
        <p className="text-sm text-gray-600">
          Payment processing isn't wired up yet — the subscription model (plans, limits, status) is in place, ready
          for a Stripe integration. For now, a platform administrator can switch workspaces between Free and Pro from
          the Admin panel.
        </p>
      </Card>
    </div>
  );
}
