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
    const fileType = formData.get("fileType") as string; // "exam" or "enroll"

    if (!file || !fileType) {
      return NextResponse.json(
        { error: "Missing file or fileType" },
        { status: 400 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { error: "Excel file must contain at least one worksheet" },
        { status: 400 }
      );
    }

    // Read headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString() || "");
    });

    // Define required fields based on file type
    // Note: end_time is optional for exam files
    const requiredFields =
      fileType === "exam"
        ? [
            "course_code",
            "course_name",
            "class_no",
            "exam_date",
            "start_time",
            "place",
            "period",
          ]
        : fileType === "lecturer"
        ? [
            "lecturer_name",
            "section",
            "course_code",
            "course_name",
            "room",
            "exam_date",
            "exam_period",
            "period_start",
          ]
        : ["student_id", "course_code", "class_no"];

    return NextResponse.json({
      headers,
      requiredFields,
      fileType,
    });
  } catch (error) {
    console.error("Error reading headers:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

