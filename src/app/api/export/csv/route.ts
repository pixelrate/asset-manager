import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildExportRows, EXPORT_COLUMNS } from "@/lib/export";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const rows = await buildExportRows(user.tenantId, sp);

  const lines = [EXPORT_COLUMNS.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  const csv = "﻿" + lines.join("\r\n"); // BOM so Excel opens UTF-8 correctly

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
