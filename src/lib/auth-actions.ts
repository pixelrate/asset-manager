"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { seedTenantDefaults } from "@/lib/tenant-setup";
import { logActivity } from "@/lib/activity";

export type AuthState = { error?: string };

async function setSessionCookie(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie(user.id);
  redirect(user.status === "ACTIVE" ? "/dashboard" : "/pending");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const tenantName = String(formData.get("tenantName") || "").trim();
  const inviteCode = String(formData.get("inviteCode") || "").trim();

  if (!name || !email || !password) return { error: "Name, email, and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);
  let userId: string;

  if (inviteCode) {
    // Join an existing workspace; possession of a valid invite = pre-approved.
    const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!invite || invite.usedById) return { error: "That invite code is invalid or already used." };
    if (invite.expiresAt && invite.expiresAt < new Date()) return { error: "That invite code has expired." };

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          tenantId: invite.tenantId,
          email,
          passwordHash,
          name,
          role: invite.role,
          status: "ACTIVE",
        },
      });
      await tx.inviteCode.update({ where: { id: invite.id }, data: { usedById: u.id } });
      return u;
    });
    userId = user.id;
    logActivity({ tenantId: invite.tenantId, userId, action: "JOIN", entityType: "USER", entityId: userId, detail: `${name} joined via invite` });
  } else {
    if (!tenantName) return { error: "Workspace name is required (e.g. “Jesse’s Garage”)." };
    // Very first account on the instance becomes the platform super admin and is
    // auto-approved; everyone else waits for approval.
    const isFirstUser = (await prisma.user.count()) === 0;

    const user = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: tenantName } });
      const u = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          name,
          role: "OWNER",
          isSuperAdmin: isFirstUser,
          status: isFirstUser ? "ACTIVE" : "PENDING",
        },
      });
      await seedTenantDefaults(tx, tenant.id);
      return u;
    });
    userId = user.id;
  }

  await setSessionCookie(userId);
  const created = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  redirect(created.status === "ACTIVE" ? "/dashboard" : "/pending");
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
