"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

async function setUserStatus(userId: string, status: "ACTIVE" | "REJECTED" | "SUSPENDED") {
  const admin = await requireSuperAdmin();
  const user = await prisma.user.update({ where: { id: userId }, data: { status } });
  logActivity({
    tenantId: user.tenantId,
    userId: admin.id,
    action: status === "ACTIVE" ? "APPROVE" : status,
    entityType: "USER",
    entityId: user.id,
    detail: `${user.email} → ${status}`,
  });
  revalidatePath("/admin");
}

export async function approveUser(formData: FormData) {
  await setUserStatus(String(formData.get("userId")), "ACTIVE");
}

export async function rejectUser(formData: FormData) {
  await setUserStatus(String(formData.get("userId")), "REJECTED");
}

export async function suspendUser(formData: FormData) {
  const admin = await requireSuperAdmin();
  const userId = String(formData.get("userId"));
  if (userId === admin.id) return; // don't lock yourself out
  await setUserStatus(userId, "SUSPENDED");
}

export async function reactivateUser(formData: FormData) {
  await setUserStatus(String(formData.get("userId")), "ACTIVE");
}

export async function setTenantPlan(formData: FormData) {
  await requireSuperAdmin();
  const tenantId = String(formData.get("tenantId"));
  const plan = String(formData.get("plan")) === "PRO" ? "PRO" : "FREE";
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan, itemLimit: plan === "PRO" ? 0 : 200 },
  });
  revalidatePath("/admin");
}
