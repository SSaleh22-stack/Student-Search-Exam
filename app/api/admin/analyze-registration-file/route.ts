import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { error: "Excel file must contain at least one worksheet" },
        { status: 400 }
      );
    }

    const analysis: any = {
      sheetName: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount,
      first10Rows: [],
      headers: [],
    };

    // Analyze first 10 rows
    for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const values: any[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        values.push({
          col: colNumber,
          value: cell.value,
          type: cell.type,
          formattedValue: cell.text || String(cell.value || ''),
        });
      });
      analysis.first10Rows.push({
        row: i,
        values: values,
      });
    }

    // Try to find headers in first 3 rows
    for (let rowNum = 1; rowNum <= Math.min(3, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const headers: any[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers.push({
          col: colNumber,
          value: cell.value,
          formattedValue: cell.text || String(cell.value || ''),
        });
      });
      analysis.headers.push({
        row: rowNum,
        headers: headers,
      });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error analyzing file:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

