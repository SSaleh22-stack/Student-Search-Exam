import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export const dynamic = 'force-dynamic';

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
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

    // Auto-detect mapping (same logic as parseExam.ts)
    const normalizedHeaders = headers.map(normalizeHeader);
    
    // Track which headers are already used to prevent collisions
    const usedHeaders = new Set<string>();
    
    // Helper function to find Arabic headers
    // Handles both underscore and space separators
    const findArabicHeader = (patterns: string[], excludeUsed = true) => {
      for (const header of headers) {
        if (excludeUsed && usedHeaders.has(header)) {
          continue;
        }
        
        const headerLower = header.toLowerCase().trim();
        // Normalize header: replace spaces and underscores with nothing for comparison
        const headerNormalized = headerLower.replace(/[\s_]/g, '');
        
        for (const pattern of patterns) {
          const patternLower = pattern.toLowerCase();
          // Check direct match
          if (headerLower.includes(patternLower)) {
            usedHeaders.add(header);
            return header;
          }
          // Check normalized match (handles space vs underscore differences)
          const patternNormalized = patternLower.replace(/[\s_]/g, '');
          if (headerNormalized.includes(patternNormalized)) {
            usedHeaders.add(header);
            return header;
          }
        }
      }
      return null;
    };
    
    // Helper to get unused header by index
    const getUnusedHeader = (index: number) => {
      if (index < headers.length && !usedHeaders.has(headers[index])) {
        usedHeaders.add(headers[index]);
        return headers[index];
      }
      // Find first unused header
      for (const header of headers) {
        if (!usedHeaders.has(header)) {
          usedHeaders.add(header);
          return header;
        }
      }
      return headers[index] || '';
    };
    
    const mapping: Record<string, string | undefined> = {
      course_code:
        findArabicHeader(["رمز المقرر", "رمز_المقرر", "رمز", "course_code", "coursecode", "code"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["course_code", "coursecode", "code", "course"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(0);
        })(),
      course_name:
        findArabicHeader(["اسم المقرر", "اسم_المقرر", "اسم", "course_name", "coursename", "name"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["course_name", "coursename", "name", "title"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(1);
        })(),
      class_no:
        findArabicHeader(["الشعبة", "شعبة", "class_no", "classno", "class", "section"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["class_no", "classno", "class", "section"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(2);
        })(),
      exam_date:
        findArabicHeader(["التاريخ", "تاريخ", "exam_date", "examdate", "date"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["exam_date", "examdate", "date", "exam"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(3);
        })(),
      start_time:
        findArabicHeader(["بداية الفترة", "بداية_الفترة", "وقت_البداية", "وقت", "start_time", "starttime", "start", "begin"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["start_time", "starttime", "start", "begin"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(4);
        })(),
      end_time:
        findArabicHeader(["نهاية الفترة", "نهاية_الفترة", "وقت_النهاية", "نهاية", "end_time", "endtime", "end", "finish"], false) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["end_time", "endtime", "end", "finish"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : undefined; // end_time is optional
        })(),
      place:
        findArabicHeader(["القاعة", "قاعة", "المكان", "مكان", "place", "location", "venue", "room"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["place", "location", "venue", "room"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(6);
        })(),
      period:
        findArabicHeader(["فترة الاختبار", "فترة_الاختبار", "فترة", "period", "type", "exam_type"]) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["period", "type", "exam_type", "examtype"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : getUnusedHeader(7);
        })(),
      rows:
        // Prioritize "العمود" (the column) over "عمود1" (column number)
        (() => {
          const exactMatch = headers.find(h => !usedHeaders.has(h) && h.toLowerCase().trim() === "العمود");
          if (exactMatch) {
            usedHeaders.add(exactMatch);
            return exactMatch;
          }
          return findArabicHeader(["عمود", "rows", "row", "number_of_rows"], false);
        })() ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["rows", "row", "number_of_rows"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : undefined; // rows is optional
        })(),
      seats:
        findArabicHeader(["عدد الطلاب", "عدد_الطلاب", "عدد", "seats", "seat", "number_of_seats", "capacity"], false) ||
        (() => {
          const found = normalizedHeaders.findIndex((h, idx) => 
            !usedHeaders.has(headers[idx]) && ["seats", "seat", "number_of_seats", "capacity"].includes(h)
          );
          return found >= 0 ? getUnusedHeader(found) : undefined; // seats is optional
        })(),
    };

    // Create reverse mapping: Excel header -> field name
    const headerToField: Record<string, string> = {};
    headers.forEach((header) => {
      const normalized = normalizeHeader(header);
      Object.entries(mapping).forEach(([field, mappedHeader]) => {
        if (mappedHeader && normalizeHeader(mappedHeader) === normalized) {
          headerToField[header] = field;
        }
      });
    });

    // Check if all required fields (except end_time) are mapped
    const requiredFields = ["course_code", "course_name", "class_no", "exam_date", "start_time", "place", "period"];
    const mappedFields = Object.values(headerToField);
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
    console.error("Error checking auto-detect:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        canAutoDetect: false,
      },
      { status: 500 }
    );
  }
}

