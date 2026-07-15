import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import type { Tenant, User } from "@prisma/client";

export type SessionUser = User & { tenant: Tenant };

/** The user for the current session cookie, regardless of approval status. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    include: { tenant: true },
  });
}

/** The current ACTIVE user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user && user.status === "ACTIVE" ? user : null;
}

/** Require an active user for a page; redirects to /login or /pending. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/pending");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  return user;
}

/** Owner or Admin within the tenant (for settings mutations). */
export async function requireTenantAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER" && user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
