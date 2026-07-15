import "server-only";
import fs from "fs/promises";
import path from "path";
import { customAlphabet } from "nanoid";

// Storage abstraction: "local" (disk, served via /api/files/...) or "supabase".

const fileId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export function uploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR || "./data/uploads");
}

function driver(): "local" | "supabase" {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "file";
}

async function supabase() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(url, key);
}

function bucket(): string {
  return process.env.SUPABASE_BUCKET || "asset-manager";
}

/**
 * Persist a file and return its storage key (e.g. "tenantId/abc123-photo.jpg").
 * Keys are namespaced by tenant so the file-serving route can authorize access.
 */
export async function saveFile(
  tenantId: string,
  originalName: string,
  data: Buffer,
  contentType?: string
): Promise<string> {
  const key = `${tenantId}/${fileId()}-${safeName(originalName)}`;
  if (driver() === "supabase") {
    const sb = await supabase();
    const { error } = await sb.storage.from(bucket()).upload(key, data, {
      contentType: contentType || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  } else {
    const full = path.join(uploadsRoot(), key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }
  return key;
}

export async function deleteFile(key: string): Promise<void> {
  try {
    if (driver() === "supabase") {
      const sb = await supabase();
      await sb.storage.from(bucket()).remove([key]);
    } else {
      await fs.unlink(path.join(uploadsRoot(), key));
    }
  } catch {
    // Missing files are not fatal.
  }
}

/** Browser-facing URL for a stored file. */
export function fileUrl(key: string): string {
  if (driver() === "supabase") {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket()}/${key}`;
  }
  return `/api/files/${key}`;
}

/** Read a local file for the serving route. Returns null when out of root or missing. */
export async function readLocalFile(key: string): Promise<Buffer | null> {
  const root = uploadsRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) return null;
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

export function contentTypeFor(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    mp4: "video/mp4",
    heic: "image/heic",
  };
  return map[ext] || "application/octet-stream";
}
