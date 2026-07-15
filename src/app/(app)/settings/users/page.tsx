import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_ROLES } from "@/lib/constants";
import { dateShort } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Select } from "@/components/ui";
import { ConfirmAction } from "@/components/confirm-action";
import { createInvite, deleteInvite, reactivateMember, setMemberRole, suspendMember } from "../actions";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-gray-200 text-gray-600",
};

export default async function UsersSettingsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const [members, invites] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.inviteCode.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader title={`Members (${members.length})`} />
        <ul className="divide-y divide-gray-50">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {m.name}
                  {m.id === user.id ? " (you)" : ""}
                </p>
                <p className="truncate text-xs text-gray-400">{m.email}</p>
              </div>
              <Badge color={statusColor[m.status]}>{m.status}</Badge>
              {isAdmin && m.id !== user.id ? (
                <form action={setMemberRole} className="flex items-center gap-1.5">
                  <input type="hidden" name="userId" value={m.id} />
                  <Select name="role" defaultValue={m.role} className="w-auto py-1 text-xs">
                    {USER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="small">
                    Set
                  </Button>
                </form>
              ) : (
                <Badge color="bg-gray-100 text-gray-600">{m.role}</Badge>
              )}
              {isAdmin && m.id !== user.id && m.status === "ACTIVE" && !m.isSuperAdmin && (
                <ConfirmAction
                  action={suspendMember.bind(null, m.id)}
                  label="Suspend"
                  confirmText={`Suspend ${m.name}? They won't be able to sign in.`}
                  variant="small"
                  className="text-red-600"
                />
              )}
              {isAdmin && m.status === "SUSPENDED" && (
                <ConfirmAction action={reactivateMember.bind(null, m.id)} label="Reactivate" variant="small" />
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Invite codes"
          action={
            isAdmin ? (
              <div className="flex gap-2">
                <form action={createInvite}>
                  <input type="hidden" name="role" value="MEMBER" />
                  <Button type="submit" variant="small">
                    + Member invite
                  </Button>
                </form>
                <form action={createInvite}>
                  <input type="hidden" name="role" value="ADMIN" />
                  <Button type="submit" variant="small">
                    + Admin invite
                  </Button>
                </form>
              </div>
            ) : undefined
          }
        />
        <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
          Share a code with a family member or coworker — they enter it at signup and join this workspace instantly
          (no approval wait). Codes are single-use and expire after 14 days.
        </p>
        <ul className="divide-y divide-gray-50">
          {invites.map((inv) => {
            const expired = inv.expiresAt !== null && inv.expiresAt < new Date();
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm text-gray-800">{inv.code}</code>
                <Badge color="bg-gray-100 text-gray-600">{inv.role}</Badge>
                {inv.usedById ? (
                  <Badge color="bg-emerald-100 text-emerald-800">Used</Badge>
                ) : expired ? (
                  <Badge color="bg-red-100 text-red-700">Expired</Badge>
                ) : (
                  <Badge color="bg-blue-100 text-blue-800">Active</Badge>
                )}
                <span className="flex-1 text-xs text-gray-400">created {dateShort(inv.createdAt)}</span>
                {isAdmin && (
                  <ConfirmAction
                    action={deleteInvite.bind(null, inv.id)}
                    label="Delete"
                    variant="small"
                    className="text-red-600"
                  />
                )}
              </li>
            );
          })}
          {invites.length === 0 && <li className="px-4 py-5 text-sm text-gray-400">No invite codes yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
