import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { buildExportRows, EXPORT_COLUMNS } from "@/lib/export";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const rows = await buildExportRows(user.tenantId, sp);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory");
  ws.addRow([...EXPORT_COLUMNS]);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of rows) ws.addRow(r);
  ws.columns.forEach((col, idx) => {
    col.width = idx === 1 || idx === 2 ? 32 : 14;
  });

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
