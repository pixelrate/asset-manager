"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import { requireTenantAdmin, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const inviteCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

// ---------- General ----------

export async function updateGeneral(fd: FormData) {
  const user = await requireTenantAdmin();
  const name = String(fd.get("name") || "").trim();
  let qrBaseUrl = String(fd.get("qrBaseUrl") || "").trim();
  if (qrBaseUrl && !/^https?:\/\//.test(qrBaseUrl)) qrBaseUrl = "https://" + qrBaseUrl;
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { name: name || user.tenant.name, qrBaseUrl: qrBaseUrl || null },
  });
  revalidatePath("/settings");
}

// ---------- Categories ----------

export async function createCategory(fd: FormData) {
  const user = await requireTenantAdmin();
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  const parentId = String(fd.get("parentId") || "") || null;
  const max = await prisma.category.aggregate({ where: { tenantId: user.tenantId }, _max: { sortOrder: true } });
  await prisma.category.create({
    data: { tenantId: user.tenantId, name, parentId, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/settings/categories");
}

export async function renameCategory(fd: FormData) {
  const user = await requireTenantAdmin();
  const id = String(fd.get("id"));
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  await prisma.category.updateMany({ where: { id, tenantId: user.tenantId }, data: { name } });
  revalidatePath("/settings/categories");
}

export async function deleteCategory(id: string) {
  const user = await requireTenantAdmin();
  const cat = await prisma.category.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!cat) return;
  await prisma.$transaction([
    prisma.category.updateMany({ where: { parentId: id }, data: { parentId: cat.parentId } }),
    prisma.category.delete({ where: { id } }),
  ]);
  revalidatePath("/settings/categories");
}

// ---------- Tags ----------

export async function createTag(fd: FormData) {
  const user = await requireUser();
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: user.tenantId, name } },
    create: { tenantId: user.tenantId, name },
    update: {},
  });
  revalidatePath("/settings/tags");
}

export async function renameTag(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  await prisma.tag.updateMany({ where: { id, tenantId: user.tenantId }, data: { name } });
  revalidatePath("/settings/tags");
}

export async function deleteTag(id: string) {
  const user = await requireUser();
  await prisma.tag.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/settings/tags");
}

// ---------- Listing templates ----------

export async function saveTemplate(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") || "");
  const name = String(fd.get("name") || "").trim();
  const body = String(fd.get("body") || "");
  const marketplace = String(fd.get("marketplace") || "") || null;
  if (!name || !body.trim()) return;
  if (id) {
    await prisma.listingTemplate.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { name, body, marketplace },
    });
  } else {
    await prisma.listingTemplate.create({ data: { tenantId: user.tenantId, name, body, marketplace } });
  }
  revalidatePath("/settings/templates");
}

export async function deleteTemplate(id: string) {
  const user = await requireUser();
  await prisma.listingTemplate.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/settings/templates");
}

// ---------- Custom fields ----------

export async function saveCustomField(fd: FormData) {
  const user = await requireTenantAdmin();
  const id = String(fd.get("id") || "");
  const name = String(fd.get("name") || "").trim();
  const type = String(fd.get("type") || "TEXT");
  // Accept comma- or newline-separated options; store newline-separated.
  const options =
    String(fd.get("options") || "")
      .split(/[\n,]/)
      .map((o) => o.trim())
      .filter(Boolean)
      .join("\n") || null;
  if (!name) return;
  if (id) {
    await prisma.customFieldDef.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { name, type, options },
    });
  } else {
    await prisma.customFieldDef.create({ data: { tenantId: user.tenantId, name, type, options } });
  }
  revalidatePath("/settings/fields");
}

export async function deleteCustomField(id: string) {
  const user = await requireTenantAdmin();
  await prisma.customFieldDef.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/settings/fields");
}

// ---------- Users & invites ----------

export async function createInvite(fd: FormData) {
  const user = await requireTenantAdmin();
  const role = String(fd.get("role")) === "ADMIN" ? "ADMIN" : "MEMBER";
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
  await prisma.inviteCode.create({
    data: { tenantId: user.tenantId, code: inviteCode(), role, expiresAt },
  });
  logActivity({ tenantId: user.tenantId, userId: user.id, action: "CREATE", entityType: "INVITE" });
  revalidatePath("/settings/users");
}

export async function deleteInvite(id: string) {
  const user = await requireTenantAdmin();
  await prisma.inviteCode.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/settings/users");
}

export async function setMemberRole(fd: FormData) {
  const user = await requireTenantAdmin();
  const userId = String(fd.get("userId"));
  const role = String(fd.get("role"));
  if (!["OWNER", "ADMIN", "MEMBER"].includes(role) || userId === user.id) return;
  await prisma.user.updateMany({ where: { id: userId, tenantId: user.tenantId }, data: { role } });
  revalidatePath("/settings/users");
}

export async function suspendMember(userId: string) {
  const user = await requireTenantAdmin();
  if (userId === user.id) return;
  await prisma.user.updateMany({
    where: { id: userId, tenantId: user.tenantId, isSuperAdmin: false },
    data: { status: "SUSPENDED" },
  });
  revalidatePath("/settings/users");
}

export async function reactivateMember(userId: string) {
  const user = await requireTenantAdmin();
  await prisma.user.updateMany({
    where: { id: userId, tenantId: user.tenantId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/settings/users");
}
