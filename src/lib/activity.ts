import "server-only";
import { prisma } from "@/lib/db";

/** Fire-and-forget activity logging; never blocks or fails the calling action. */
export function logActivity(input: {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
}): void {
  prisma.activityLog
    .create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        detail: input.detail ?? null,
      },
    })
    .catch(() => {});
}
