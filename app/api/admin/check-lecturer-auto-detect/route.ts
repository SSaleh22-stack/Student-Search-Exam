import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export const dynamic = 'force-dynamic';

const normalizeHeader = (header: string): string => {
  // Remove Arabic definite article "ال" (al-) for better matching
  let normalized = header.trim().toLowerCase().replace(/\s+/g, "_");
  // Remove Arabic definite article at the start
  if (normalized.startsWith("ال")) {
    normalized = normalized.substring(2);
  }
  // Also handle English "the " prefix
  if (normalized.startsWith("the_")) {
    normalized = normalized.substring(4);
  }
  return normalized;
};

const findArabicHeader = (
  patterns: string[],
  headers: string[],
  usedHeaders: Set<string>,
  required: boolean = true
): string | undefined => {
  for (const pattern of patterns) {
    const patternNormalized = normalizeHeader(pattern);
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const headerNormalized = normalizeHeader(header);
      // Check if normalized strings match (with or without definite article)
      if (headerNormalized === patternNormalized || 
          headerNormalized.includes(patternNormalized) || 
          patternNormalized.includes(headerNormalized)) {
        usedHeaders.add(header);
        return header;
      }
    }
  }
  return undefined;
};

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
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { error: "Excel file must contain at least one worksheet" },
        { status: 400 }
      );
    }

    // Read headers
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString() || "");
    });

    // Auto-detect mapping (same logic as parseLecturer.ts)
    const usedHeaders = new Set<string>();

    const mapping: Record<string, string | undefined> = {
      lecturer_name: findArabicHeader(
        ["lecturer's name", "lecturer name", "lecturer", "اسم المحاضر", "المحاضر"],
        headers,
        usedHeaders,
        true
      ) || headers[0],
      role: findArabicHeader(["role", "الدور", "المنصب"], headers, usedHeaders, false),
      grade: findArabicHeader(["grade", "الدرجة", "الرتبة"], headers, usedHeaders, false),
      exam_code: findArabicHeader(["exam code", "exam_code", "رمز الاختبار"], headers, usedHeaders, false),
      section: findArabicHeader(
        ["section", "الشعبة", "class", "class_no"],
        headers,
        usedHeaders,
        true
      ) || headers[4],
      course_code: findArabicHeader(
        ["course code", "course_code", "رمز المقرر"],
        headers,
        usedHeaders,
        true
      ) || headers[5],
      course_name: findArabicHeader(
        ["course name", "course_name", "اسم المقرر"],
        headers,
        usedHeaders,
        true
      ) || headers[6],
      number_of_students: findArabicHeader(
        ["number of students", "number_of_students", "عدد الطلاب"],
        headers,
        usedHeaders,
        false
      ),
      room: findArabicHeader(
        ["room", "القاعة", "place"],
        headers,
        usedHeaders,
        true
      ) || headers[8],
      column: findArabicHeader(
        ["column", "العمود", "rows"],
        headers,
        usedHeaders,
        false
      ),
      day: findArabicHeader(["day", "اليوم"], headers, usedHeaders, false),
      exam_date: findArabicHeader(
        ["date", "exam_date", "exam date", "تاريخ الاختبار", "تاريخ", "التاريخ"],
        headers,
        usedHeaders,
        true
      ) || headers[11],
      exam_period: findArabicHeader(
        ["exam period", "exam_period", "فترة الاختبار"],
        headers,
        usedHeaders,
        true
      ) || headers[12],
      period_start: findArabicHeader(
        ["period start", "period_start", "بداية الفترة", "start time"],
        headers,
        usedHeaders,
        true
      ) || headers[13],
      invigilator: findArabicHeader(
        ["invigilator", "المراقب"],
        headers,
        usedHeaders,
        false
      ),
    };

    // Check if all required fields are mapped
    const requiredFields = ["lecturer_name", "section", "course_code", "course_name", "room", "exam_date", "exam_period", "period_start"];
    const mappedFields = Object.entries(mapping)
      .filter(([field, header]) => requiredFields.includes(field) && header !== undefined)
      .map(([field]) => field);
    const missingFields = requiredFields.filter((f) => !mappedFields.includes(f));
    
    // Check if mapped headers actually exist in the file
    const allMappedHeadersExist = requiredFields.every((field) => {
      const mappedHeader = mapping[field];
      return mappedHeader && headers.includes(mappedHeader);
    });

    const canAutoDetect = missingFields.length === 0 && allMappedHeadersExist;

    return NextResponse.json({
      canAutoDetect,
      mapping,
      missingFields,
      headers,
      allMappedHeadersExist,
    });
  } catch (error) {
    console.error("Error checking lecturer auto-detect:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        canAutoDetect: false,
      },
      { status: 500 }
    );
  }
}

