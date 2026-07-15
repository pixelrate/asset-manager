import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { contentTypeFor, readLocalFile } from "@/lib/storage";

// Serves locally stored uploads. Files are keyed "tenantId/filename", so we can
// authorize by requiring the caller's tenant to match the first path segment.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path: segments } = await params;
  if (!segments || segments.length < 2 || segments[0] !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const key = segments.join("/");
  if (key.includes("..")) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await readLocalFile(key);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(key),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
