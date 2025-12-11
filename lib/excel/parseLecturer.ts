import ExcelJS from "exceljs";
import { z } from "zod";
import { parseArabicTime, extractDateFromCellText } from "@/lib/utils/hijri-converter";

export interface ParseLecturerResult {
  validRows: Array<{
    lecturerName: string;
    role?: string;
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
  }>;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

const lecturerExamRowSchema = z.object({
  lecturer_name: z.string().min(1, "Lecturer name is required"),
  role: z.string().optional(),
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
});

export interface LecturerHeaderMapping {
  lecturer_name: string;
  role?: string;
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
  const autoDetectedMapping: LecturerHeaderMapping = {
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

      // Handle date formatting - keep Hijri dates as-is, don't convert
      if (fieldName === "exam_date") {
        // Check if this might be a Hijri date that Excel converted to Gregorian
        const numFmt = cell.numFmt || "";
        const isHijriFormat = numFmt.includes("[$-1970000]") || numFmt.includes("B2") || numFmt.toLowerCase().includes("hijri");
        
        // ALWAYS prefer cell.text first - this preserves the original display format from Excel
        // Excel may convert Hijri dates to Gregorian in cell.value, but cell.text might show the formatted value
        const cellText = cell.text?.trim() || "";
        const extractedDate = extractDateFromCellText(cellText);
        
        if (extractedDate) {
          // Successfully extracted date from cell text - preserves Hijri dates as-is
          isEmpty = false;
          value = extractedDate;
          console.log(`[parseLecturer] Row ${rowNum}: Using cell text value (preserves Hijri/Gregorian as-is): ${extractedDate}`);
        }
        // Fallback to cell.value only if cell.text couldn't be parsed
        else if (value instanceof Date) {
          isEmpty = false;
          const dateObj = value as Date;
          // Excel converted it to Gregorian Date object
          // IMPORTANT: Do NOT convert back to Hijri - this can cause wrong dates
          // If format suggests Hijri but we can't get the formatted text, use Gregorian as-is
          if (isHijriFormat) {
            // WARNING: Excel stored this as Gregorian Date, but format indicates Hijri
            // We cannot safely convert back, so we'll use the Gregorian date
            // The user should ensure dates are stored as text strings in Excel to preserve Hijri dates
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const day = String(dateObj.getDate()).padStart(2, "0");
            value = `${year}-${month}-${day}`;
            console.warn(`[parseLecturer] Row ${rowNum}: WARNING - Date has Hijri format but Excel stored as Gregorian Date object. Using Gregorian: ${value} (numFmt: "${numFmt}"). To preserve Hijri dates, store them as text strings in Excel.`);
          } else {
            // Keep as Gregorian
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const day = String(dateObj.getDate()).padStart(2, "0");
            value = `${year}-${month}-${day}`;
            console.log(`[parseLecturer] Row ${rowNum}: Date object formatted to: ${value} (Gregorian)`);
          }
        }
        // Handle Excel serial date number - only if cell text wasn't usable
        else if (typeof value === "number") {
          isEmpty = false;
          try {
            // Excel serial date: days since January 1, 1900
            const excelEpoch = new Date(1899, 11, 30); // Excel epoch is Dec 30, 1899
            const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
            
            // IMPORTANT: Do NOT convert back to Hijri - this can cause wrong dates
            // If format suggests Hijri but we can't get the formatted text, use Gregorian as-is
            if (isHijriFormat) {
              // WARNING: Excel stored this as serial number (Gregorian), but format indicates Hijri
              // We cannot safely convert back, so we'll use the Gregorian date
              const year = jsDate.getFullYear();
              const month = String(jsDate.getMonth() + 1).padStart(2, "0");
              const day = String(jsDate.getDate()).padStart(2, "0");
              value = `${year}-${month}-${day}`;
              console.warn(`[parseLecturer] Row ${rowNum}: WARNING - Date has Hijri format but Excel stored as serial number (Gregorian). Using Gregorian: ${value} (numFmt: "${numFmt}"). To preserve Hijri dates, store them as text strings in Excel.`);
            } else {
              const year = jsDate.getFullYear();
              const month = String(jsDate.getMonth() + 1).padStart(2, "0");
              const day = String(jsDate.getDate()).padStart(2, "0");
              value = `${year}-${month}-${day}`;
              console.log(`[parseLecturer] Row ${rowNum}: Excel serial date formatted to: ${value} (Gregorian)`);
            }
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
      validRows.push({
        lecturerName: validated.lecturer_name.trim(),
        role: validated.role?.trim(),
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

