import ExcelJS from "exceljs";
import { z } from "zod";
import { parseArabicTime, extractDateFromCellText, hijriToGregorian } from "@/lib/utils/hijri-converter";

export interface ParseLecturerResult {
  validRows: Array<{
    lecturerName: string;
    doctorRole?: string;
    grade?: string;
    examCode?: string;
    section: string;
    courseCode: string;
    courseName: string;
    numberOfStudents?: number;
    room: string;
    column?: string; // Column range like "1-8"
    day?: string;
    examDate: string;
    examPeriod: string;
    periodStart: string;
    invigilator?: string;
    commenter1Name?: string;
    commenter1Role?: string;
    commenter2Name?: string;
    commenter2Role?: string;
    commenter3Name?: string;
    commenter3Role?: string;
    commenter4Name?: string;
    commenter4Role?: string;
    commenter5Name?: string;
    commenter5Role?: string;
  }>;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

const lecturerExamRowSchema = z.object({
  lecturer_name: z.string().min(1, "Lecturer name is required"),
  doctor_role: z.string().optional(),
  grade: z.string().optional(),
  exam_code: z.string().optional(),
  section: z.union([z.string(), z.number()]).transform((val) => String(val)),
  course_code: z.string().min(1, "Course code is required"),
  course_name: z.string().min(1, "Course name is required"),
  number_of_students: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    const num = typeof val === "string" ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
  room: z.string().min(1, "Room is required"),
  column: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    // Keep as string to preserve range format like "1-8", "1-9", "4-6"
    const str = String(val).trim();
    return str.replace(/\s*-\s*/g, "-"); // Normalize spacing
  }),
  day: z.string().optional(),
  exam_date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.string(),
    z.date(),
    z.number(),
  ]).transform((val) => {
    // Handle string dates FIRST - keep Hijri dates as-is, don't convert
    // This is critical because Excel may convert Hijri to Gregorian, but cell.text preserves the original
    const str = String(val).trim();
    
    // If already in YYYY-MM-DD format, return as is (whether Hijri or Gregorian)
    // This preserves Hijri dates like "1447-07-01" without conversion
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      // Check if it's Hijri (year between 1200-1600) - keep as-is
      const year = parseInt(str.substring(0, 4), 10);
      if (year >= 1200 && year < 1600) {
        return str; // Keep Hijri dates in Hijri format, don't convert
      }
      // If Gregorian, also keep as-is (already in correct format)
      return str;
    }
    
    // Handle Date object (from Excel) - ONLY if string parsing failed
    // WARNING: Excel may have converted Hijri to Gregorian, so this might be wrong
    if (val instanceof Date) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, "0");
      const day = String(val.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    
    // Handle Excel serial date number - ONLY if string parsing failed
    // WARNING: Excel may have converted Hijri to Gregorian, so this might be wrong
    if (typeof val === "number") {
      try {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      } catch (e) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Try to parse other date formats as last resort
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year > 1000 && year < 3000) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
    return str;
  }).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")),
  exam_period: z.string().min(1, "Exam period is required"),
  period_start: z.union([
    z.string().regex(/^\d{2}:\d{2}$/),
    z.string(),
    z.date(),
    z.number(),
  ]).transform((val) => {
    // Handle Date object
    if (val instanceof Date) {
      const hours = String(val.getHours()).padStart(2, "0");
      const minutes = String(val.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    // Handle Excel time as decimal
    if (typeof val === "number") {
      if (val < 1 && val >= 0) {
        const totalMinutes = Math.round(val * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }
    }
    // Handle string times
    const str = String(val).trim();
    // Check if it's Arabic time format
    const arabicTime = parseArabicTime(str);
    if (arabicTime) {
      return arabicTime;
    }
    // Remove AM/PM and normalize
    const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const ampm = timeMatch[3]?.toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
    // If already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(str)) {
      return str;
    }
    return str;
  }).pipe(z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")),
  invigilator: z.string().optional(),
  commenter1_name: z.string().optional(),
  commenter1_role: z.string().optional(),
  commenter2_name: z.string().optional(),
  commenter2_role: z.string().optional(),
  commenter3_name: z.string().optional(),
  commenter3_role: z.string().optional(),
  commenter4_name: z.string().optional(),
  commenter4_role: z.string().optional(),
  commenter5_name: z.string().optional(),
  commenter5_role: z.string().optional(),
});

export interface LecturerHeaderMapping {
  lecturer_name: string;
  doctor_role?: string;
  grade?: string;
  exam_code?: string;
  section: string;
  course_code: string;
  course_name: string;
  number_of_students?: string;
  room: string;
  column?: string;
  day?: string;
  exam_date: string;
  exam_period: string;
  period_start: string;
  invigilator?: string;
  commenter1_name?: string;
  commenter1_role?: string;
  commenter2_name?: string;
  commenter2_role?: string;
  commenter3_name?: string;
  commenter3_role?: string;
  commenter4_name?: string;
  commenter4_role?: string;
  commenter5_name?: string;
  commenter5_role?: string;
}

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

export async function parseLecturerSchedule(
  file: File | Buffer,
  headerMapping?: LecturerHeaderMapping
): Promise<ParseLecturerResult> {
  const workbook = new ExcelJS.Workbook();
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  // Read headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  const headerToColumnIndex: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    const header = cell.value?.toString() || "";
    headers.push(header);
    headerToColumnIndex[header] = typeof cell.col === 'number' ? cell.col : Number(cell.col);
  });

  // Use provided mapping or auto-detect
  let mapping: LecturerHeaderMapping;
  const usedHeaders = new Set<string>();

  // Auto-detect headers (always run to have fallback)
  // Note: Headers like "doctor", "doctor role", "commenter 1" contain the NAMES, not roles
  // The header name itself indicates the role (doctor, commenter 1, etc.)
  console.log(`[parseLecturer] Available headers: ${headers.join(", ")}`);
  const autoDetectedMapping: LecturerHeaderMapping = {
    lecturer_name: findArabicHeader(
      ["doctor role", "doctor_role", "doctor", "محاضر رئيسي", "المحاضر", "دور المحاضر", "lecturer's name", "lecturer name", "lecturer", "اسم المحاضر", "المحاضر"],
      headers,
      usedHeaders,
      true
    ) || headers[0],
    doctor_role: findArabicHeader(
      ["role", "الدور", "المنصب"],
      headers,
      usedHeaders,
      false
    ),
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
    // Commenter fields
    // Headers: "الملاحظ الأساسي" (commenter1), "ملاحظ إضافي 1" (commenter2), "ملاحظ إضافي 2" (commenter3), etc.
    // Priority: First try "الملاحظ الأساسي" for commenter1, then "ملاحظ إضافي 1" for commenter2, etc.
    commenter1_name: findArabicHeader(
      ["الملاحظ الأساسي", "commenter 1", "commenter1", "commenter_1", "معلق 1", "المعلق الأول"],
      headers,
      usedHeaders,
      false
    ),
    commenter1_role: undefined, // Will be auto-set to the header name during parsing
    commenter2_name: findArabicHeader(
      ["ملاحظ إضافي 1", "ملاحظ اضافي 1", "commenter 2", "commenter2", "commenter_2", "معلق 2", "المعلق الثاني"],
      headers,
      usedHeaders,
      false
    ),
    commenter2_role: undefined, // Will be auto-set to the header name during parsing
    commenter3_name: findArabicHeader(
      ["ملاحظ إضافي 2", "ملاحظ اضافي 2", "commenter 3", "commenter3", "commenter_3", "معلق 3", "المعلق الثالث"],
      headers,
      usedHeaders,
      false
    ),
    commenter3_role: undefined, // Will be auto-set to the header name during parsing
    commenter4_name: findArabicHeader(
      ["ملاحظ إضافي 3", "ملاحظ اضافي 3", "commenter 4", "commenter4", "commenter_4", "معلق 4", "المعلق الرابع"],
      headers,
      usedHeaders,
      false
    ),
    commenter4_role: undefined, // Will be auto-set to the header name during parsing
    commenter5_name: findArabicHeader(
      ["ملاحظ إضافي 4", "ملاحظ اضافي 4", "commenter 5", "commenter5", "commenter_5", "معلق 5", "المعلق الخامس"],
      headers,
      usedHeaders,
      false
    ),
    commenter5_role: undefined, // Will be auto-set to the header name during parsing
  };
  
  // Log detected commenter headers
  console.log(`[parseLecturer] Detected commenter headers:`);
  console.log(`  commenter1_name: ${autoDetectedMapping.commenter1_name || "NOT FOUND"}`);
  console.log(`  commenter2_name: ${autoDetectedMapping.commenter2_name || "NOT FOUND"}`);
  console.log(`  commenter3_name: ${autoDetectedMapping.commenter3_name || "NOT FOUND"}`);
  console.log(`  commenter4_name: ${autoDetectedMapping.commenter4_name || "NOT FOUND"}`);
  console.log(`  commenter5_name: ${autoDetectedMapping.commenter5_name || "NOT FOUND"}`);

  if (headerMapping) {
    // Merge provided mapping with auto-detected (provided takes precedence, but fill missing required fields)
    mapping = {
      ...autoDetectedMapping,
      ...headerMapping,
    };
    // Ensure required fields are filled - use auto-detected if provided is empty
    const requiredFields: (keyof LecturerHeaderMapping)[] = [
      "lecturer_name", "section", "course_code", "course_name", "room", "exam_date", "exam_period", "period_start"
    ];
    requiredFields.forEach(field => {
      if (!mapping[field] || mapping[field] === "") {
        mapping[field] = autoDetectedMapping[field] || "";
      }
    });
  } else {
    mapping = autoDetectedMapping;
  }

  // Create reverse mapping: Excel header -> field name
  // Always use the merged mapping (which includes auto-detected values for missing fields)
  const headerToField: Record<string, string> = {};
  Object.entries(mapping).forEach(([field, mappedHeader]) => {
    if (!mappedHeader || mappedHeader.trim() === "") return;
    
    // Try exact match first
    const exactMatch = headers.find(h => h.trim() === mappedHeader.trim());
    if (exactMatch) {
      headerToField[exactMatch] = field;
      return;
    }
    
    // Try normalized exact match
    const normalizedMapped = normalizeHeader(mappedHeader.trim());
    const normalizedMatch = headers.find(h => normalizeHeader(h.trim()) === normalizedMapped);
    if (normalizedMatch) {
      headerToField[normalizedMatch] = field;
      return;
    }
    
    // Try fuzzy match (includes check)
    const fuzzyMatch = headers.find(h => {
      const normalized = normalizeHeader(h.trim());
      return normalized === normalizedMapped || 
             normalized.includes(normalizedMapped) || 
             normalizedMapped.includes(normalized);
    });
    if (fuzzyMatch) {
      headerToField[fuzzyMatch] = field;
      return;
    }
    
    // If still no match, log a warning
    console.warn(`[parseLecturer] Could not find header match for field "${field}" with mapped header "${mappedHeader}"`);
  });
  
  console.log(`[parseLecturer] Headers found: ${headers.join(", ")}`);
  console.log(`[parseLecturer] Header mapping:`, mapping);
  console.log(`[parseLecturer] Header to field mapping:`, headerToField);
  
  // Check required fields
  const requiredFields = ["lecturer_name", "section", "course_code", "course_name", "room", "exam_date", "exam_period", "period_start"];
  const mappedFields = Object.values(headerToField);
  const missingFields = requiredFields.filter((f) => !mappedFields.includes(f));
  
  // If there are missing fields, try to fill them from the mapping (which should have auto-detected values)
  if (missingFields.length > 0) {
    console.warn(`[parseLecturer] Missing required field mappings: ${missingFields.join(", ")}`);
    console.log(`[parseLecturer] Attempting to fill missing fields from mapping...`);
    
    // Try to add missing fields from the mapping
    missingFields.forEach(field => {
      const mappedHeader = mapping[field as keyof LecturerHeaderMapping];
      if (mappedHeader && mappedHeader.trim() !== "") {
        // Try to find this header in the actual headers
        const exactMatch = headers.find(h => h.trim() === mappedHeader.trim());
        if (exactMatch && !headerToField[exactMatch]) {
          headerToField[exactMatch] = field;
          console.log(`[parseLecturer] Found missing field "${field}" via exact match: "${exactMatch}"`);
          return;
        }
        
        const normalizedMapped = normalizeHeader(mappedHeader.trim());
        const normalizedMatch = headers.find(h => {
          const normalized = normalizeHeader(h.trim());
          return normalized === normalizedMapped || 
                 normalized.includes(normalizedMapped) || 
                 normalizedMapped.includes(normalized);
        });
        if (normalizedMatch && !headerToField[normalizedMatch]) {
          headerToField[normalizedMatch] = field;
          console.log(`[parseLecturer] Found missing field "${field}" via normalized match: "${normalizedMatch}"`);
          return;
        }
      }
    });
    
    // Check again after trying to fill
    const stillMissing = requiredFields.filter((f) => !Object.values(headerToField).includes(f));
    if (stillMissing.length > 0) {
      console.error(`[parseLecturer] Still missing required field mappings after fill attempt: ${stillMissing.join(", ")}`);
      console.error(`[parseLecturer] Available headers: ${headers.join(", ")}`);
      console.error(`[parseLecturer] Current mapping:`, mapping);
      console.error(`[parseLecturer] Current headerToField:`, headerToField);
      throw new Error(
        `Missing required field mappings for lecturer file: ${stillMissing.join(", ")}. Please check that all headers are correctly mapped. Available headers: ${headers.join(", ")}`
      );
    }
  }

  const validRows: ParseLecturerResult["validRows"] = [];
  const errors: ParseLecturerResult["errors"] = [];

  // Process data rows
  console.log(`[parseLecturer] Processing ${worksheet.rowCount - 1} data rows`);
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: Record<string, any> = {};
    let isEmpty = true;

    headers.forEach((header) => {
      const fieldName = headerToField[header];
      if (!fieldName) return;

      const columnIndex = headerToColumnIndex[header];
      if (!columnIndex) return;

      const cell = row.getCell(columnIndex);
      let value = cell.value;

      // Handle rich text (for Arabic text)
      if (cell.type === ExcelJS.ValueType.RichText && cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        const richText = cell.value as any;
        if (richText.richText && Array.isArray(richText.richText)) {
          value = richText.richText.map((rt: any) => rt.text || '').join('');
        } else if (richText.text) {
          value = richText.text;
        }
      }

      // Handle formula results
      if (cell.type === ExcelJS.ValueType.Formula) {
        value = cell.result || value;
      }

      // Handle date formatting - use dates as-is from Excel, store as Gregorian
      if (fieldName === "exam_date") {
        // ALWAYS prefer cell.text first - this preserves the original display format from Excel
        const cellText = cell.text?.trim() || "";
        const extractedDate = extractDateFromCellText(cellText);
        
        if (extractedDate) {
          // Successfully extracted date from cell text
          // Check if it's Hijri (year 1200-1600) and convert to Gregorian for storage
          const year = parseInt(extractedDate.substring(0, 4), 10);
          if (year >= 1200 && year < 1600) {
            // It's a Hijri date - convert to Gregorian before storing
            const month = parseInt(extractedDate.substring(5, 7), 10);
            const day = parseInt(extractedDate.substring(8, 10), 10);
            const gregorianDate = hijriToGregorian(year, month, day);
            const gregorianYear = gregorianDate.getFullYear();
            const gregorianMonth = String(gregorianDate.getMonth() + 1).padStart(2, "0");
            const gregorianDay = String(gregorianDate.getDate()).padStart(2, "0");
            value = `${gregorianYear}-${gregorianMonth}-${gregorianDay}`;
            console.log(`[parseLecturer] Row ${rowNum}: Converted Hijri date ${extractedDate} to Gregorian: ${value}`);
          } else {
            // It's already Gregorian - use as-is
            value = extractedDate;
            console.log(`[parseLecturer] Row ${rowNum}: Using cell text value (Gregorian): ${extractedDate}`);
          }
          isEmpty = false;
        }
        // Fallback to cell.value only if cell.text couldn't be parsed
        else if (value instanceof Date) {
          isEmpty = false;
          const dateObj = value as Date;
          // Use Date object as-is (ExcelJS reads it as Gregorian)
          // Format as YYYY-MM-DD and store in database as Gregorian
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          value = `${year}-${month}-${day}`;
          console.log(`[parseLecturer] Row ${rowNum}: Date object formatted to Gregorian: ${value}`);
        }
        // Handle Excel serial date number - only if cell text wasn't usable
        else if (typeof value === "number") {
          isEmpty = false;
          try {
            // Excel serial date: days since January 1, 1900
            // Convert to JavaScript date
            const excelEpoch = new Date(1899, 11, 30); // Excel epoch is Dec 30, 1899
            const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
            // Format as Gregorian date
            const year = jsDate.getFullYear();
            const month = String(jsDate.getMonth() + 1).padStart(2, "0");
            const day = String(jsDate.getDate()).padStart(2, "0");
            value = `${year}-${month}-${day}`;
            console.log(`[parseLecturer] Row ${rowNum}: Excel serial date formatted to Gregorian: ${value}`);
          } catch (e) {
            console.warn(`[parseLecturer] Row ${rowNum}: Failed to convert Excel serial date:`, value, e);
            value = String(value);
          }
        }
        // Handle string dates - keep Hijri dates as-is, don't convert
        else {
          const strValue = String(value || "").trim();
          if (strValue) {
            isEmpty = false;
          }
          
          // If it's already in YYYY-MM-DD format, keep it as-is (whether Hijri or Gregorian)
          if (strValue && /^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
            value = strValue; // Keep Hijri dates in Hijri format, don't convert
            console.log(`[parseLecturer] Row ${rowNum}: Keeping date string as-is: ${strValue}`);
          } else {
            // Not in YYYY-MM-DD format, keep as string
            value = strValue;
          }
        }
        // Assign the formatted date value to rowData
        rowData[fieldName] = value;
        return;
      }

      // Handle time formatting
      if (fieldName === "period_start") {
        if (value instanceof Date) {
          const hours = String(value.getHours()).padStart(2, "0");
          const minutes = String(value.getMinutes()).padStart(2, "0");
          value = `${hours}:${minutes}`;
        } else if (typeof value === "number") {
          if (value < 1 && value >= 0) {
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
          }
        } else {
          const strValue = String(value || "").trim();
          const arabicTime = parseArabicTime(strValue);
          if (arabicTime) {
            value = arabicTime;
          } else {
            value = strValue;
          }
        }
        rowData[fieldName] = value;
        if (value) isEmpty = false;
        return;
      }

      // Handle column field - keep range format
      if (fieldName === "column") {
        if (value) {
          const strValue = String(value).trim();
          value = strValue.replace(/\s*-\s*/g, "-");
        }
        rowData[fieldName] = value;
        if (value) isEmpty = false;
        return;
      }

      // Handle exam_period - convert to string if it's a number
      if (fieldName === "exam_period") {
        if (value !== null && value !== undefined && value !== "") {
          value = String(value).trim();
          isEmpty = false;
        } else {
          value = undefined;
        }
        rowData[fieldName] = value;
        return;
      }

      if (value !== null && value !== undefined && value !== "") {
        isEmpty = false;
        // Convert to string for all other fields
        rowData[fieldName] = String(value).trim();
      } else {
        rowData[fieldName] = undefined;
      }
    });

    if (isEmpty) continue;

    // Validate row
    try {
      // Log first few rows for debugging
      if (rowNum <= 4) {
        console.log(`[parseLecturer] Row ${rowNum} data before validation:`, JSON.stringify(rowData, null, 2));
      }
      
      const validated = lecturerExamRowSchema.parse(rowData);
      
      // Auto-set doctor role based on the header name (the header name IS the role)
      // Return just the base role - combining with commenter roles will happen in upload route
      const getDoctorRole = (): string => {
        const mappedHeader = mapping.lecturer_name;
        if (!mappedHeader) return "محاضر رئيسي"; // Default role
        // The header name itself is the role (e.g., "doctor role" = role)
        // But we'll combine with commenter roles in the upload route
        return mappedHeader;
      };
      
      // Auto-set commenter roles - use Arabic header names
      const getCommenterRole = (commenterNum: number, name: string | undefined): string | undefined => {
        if (!name) return undefined;
        // Use Arabic role names matching the headers
        const roleNames: Record<number, string> = {
          1: "الملاحظ الأساسي",
          2: "ملاحظ إضافي 1",
          3: "ملاحظ إضافي 2",
          4: "ملاحظ إضافي 3",
          5: "ملاحظ إضافي 4",
        };
        return roleNames[commenterNum] || `معلق ${commenterNum}`;
      };
      
      // Set base role - combining with commenter roles will be done in upload route
      const lecturerName = validated.lecturer_name.trim();
      const doctorRole = getDoctorRole();
      
      // Create main lecturer record - roles will be combined in upload route
      validRows.push({
        lecturerName: lecturerName,
        doctorRole: doctorRole, // Base role only - will be combined in upload route
        grade: validated.grade?.trim(),
        examCode: validated.exam_code?.trim(),
        section: validated.section.trim(),
        courseCode: validated.course_code.trim(),
        courseName: validated.course_name.trim(),
        numberOfStudents: validated.number_of_students,
        room: validated.room.trim(),
        column: validated.column,
        day: validated.day?.trim(),
        examDate: validated.exam_date,
        examPeriod: validated.exam_period.trim(),
        periodStart: validated.period_start.trim(),
        invigilator: validated.invigilator?.trim(),
        commenter1Name: validated.commenter1_name?.trim(),
        commenter1Role: getCommenterRole(1, validated.commenter1_name),
        commenter2Name: validated.commenter2_name?.trim(),
        commenter2Role: getCommenterRole(2, validated.commenter2_name),
        commenter3Name: validated.commenter3_name?.trim(),
        commenter3Role: getCommenterRole(3, validated.commenter3_name),
        commenter4Name: validated.commenter4_name?.trim(),
        commenter4Role: getCommenterRole(4, validated.commenter4_name),
        commenter5Name: validated.commenter5_name?.trim(),
        commenter5Role: getCommenterRole(5, validated.commenter5_name),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const firstError = err.errors[0];
        errors.push({
          row: rowNum,
          field: firstError?.path.join("."),
          message: firstError?.message || "Validation failed",
        });
        // Log first few errors for debugging
        if (errors.length <= 5) {
          console.error(`[parseLecturer] Row ${rowNum} validation error:`, firstError?.path.join("."), firstError?.message);
          console.error(`[parseLecturer] Row ${rowNum} data:`, JSON.stringify(rowData, null, 2));
        }
      } else {
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return { validRows, errors };
}

