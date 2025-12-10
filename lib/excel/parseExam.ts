import ExcelJS from "exceljs";
import { z } from "zod";
import { examScheduleRowSchema, type ValidationError } from "./schemas";
import { parseHijriDate, parseArabicTime } from "@/lib/utils/hijri-converter";

export interface ParseExamResult {
  validRows: Array<{
    courseCode: string;
    courseName: string;
    classNo: string;
    examDate: string;
    startTime: string;
    endTime: string;
    place: string;
    period: string;
    rows?: string; // Row range like "1-8", "1-9", "4-6"
    seats?: number;
  }>;
  errors: ValidationError[];
}

export interface HeaderMapping {
  course_code: string;
  course_name: string;
  class_no: string;
  exam_date: string;
  start_time: string;
  end_time?: string;
  place: string;
  period: string;
  rows?: string;
  seats?: string;
}

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
};

export async function parseExamSchedule(
  file: File | Buffer,
  headerMapping?: HeaderMapping
): Promise<ParseExamResult> {
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

  // Read headers with their column indices
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  const headerToColumnIndex: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    const header = cell.value?.toString() || "";
    headers.push(header);
    headerToColumnIndex[header] = typeof cell.col === 'number' ? cell.col : Number(cell.col); // Store the actual column index
  });

  // Use provided mapping or try to auto-detect
  let mapping: HeaderMapping;
  if (headerMapping) {
    mapping = headerMapping;
  } else {
    // Auto-detect: normalize headers and try to match
    const normalizedHeaders = headers.map(normalizeHeader);
    const usedHeaders = new Set<string>(); // Track which headers are already used
    
    // Helper function to find Arabic headers
    // Handles both underscore and space separators
    const findArabicHeader = (patterns: string[], excludeUsed = true) => {
      for (const header of headers) {
        // Skip if already used
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
    
    mapping = {
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
  }

  // Create reverse mapping: Excel header -> field name
  const headerToField: Record<string, string> = {};
  
  // When mapping is provided, use it directly
  if (headerMapping) {
    // The mapping contains Excel header names -> field names
    // We need to find which Excel headers match the mapped headers
    Object.entries(mapping).forEach(([field, mappedHeader]) => {
      if (!mappedHeader) return; // Skip optional fields
      
      // Try exact match first (including trimming)
      const exactMatch = headers.find(h => h.trim() === mappedHeader.trim());
      if (exactMatch) {
        headerToField[exactMatch] = field;
        console.log(`[parseExam] Matched "${exactMatch}" -> ${field} (exact)`);
        return;
      }
      
      // Try normalized match (for Arabic text, this handles spaces/underscores)
      const normalizedMapped = normalizeHeader(mappedHeader.trim());
      const matchedHeader = headers.find(h => normalizeHeader(h.trim()) === normalizedMapped);
      if (matchedHeader) {
        headerToField[matchedHeader] = field;
        console.log(`[parseExam] Matched "${matchedHeader}" -> ${field} (normalized)`);
        return;
      }
      
      // Try fuzzy match (contains) - useful for Arabic text variations
      const fuzzyMatch = headers.find(h => {
        const hTrimmed = h.trim();
        const mappedTrimmed = mappedHeader.trim();
        // Direct contains check
        if (hTrimmed.includes(mappedTrimmed) || mappedTrimmed.includes(hTrimmed)) {
          return true;
        }
        // Normalized contains check
        const hNormalized = normalizeHeader(hTrimmed);
        const mappedNormalized = normalizeHeader(mappedTrimmed);
        return hNormalized.includes(mappedNormalized) || mappedNormalized.includes(hNormalized);
      });
      if (fuzzyMatch && !headerToField[fuzzyMatch]) {
        headerToField[fuzzyMatch] = field;
        console.log(`[parseExam] Matched "${fuzzyMatch}" -> ${field} (fuzzy)`);
      } else if (!fuzzyMatch) {
        console.warn(`[parseExam] Could not match header "${mappedHeader}" for field "${field}"`);
      }
    });
    
    console.log(`[parseExam] Using provided mapping. Headers in file:`, headers);
    console.log(`[parseExam] Mapping provided:`, mapping);
    console.log(`[parseExam] Reverse mapping created:`, headerToField);
  } else {
    // Auto-detected mapping: match by normalized headers
    headers.forEach((header) => {
      const normalized = normalizeHeader(header);
      Object.entries(mapping).forEach(([field, mappedHeader]) => {
        if (mappedHeader && normalizeHeader(mappedHeader) === normalized) {
          headerToField[header] = field;
        }
      });
    });
  }

  // Validate that all required fields are mapped (end_time is optional)
  const requiredFields = ["course_code", "course_name", "class_no", "exam_date", "start_time", "place", "period"];
  const mappedFields = Object.values(headerToField);
  const missingFields = requiredFields.filter((f) => !mappedFields.includes(f));
  if (missingFields.length > 0) {
    console.error(`[parseExam] Missing required field mappings:`, missingFields);
    console.error(`[parseExam] Headers in file:`, headers);
    console.error(`[parseExam] Mapping provided:`, mapping);
    console.error(`[parseExam] Reverse mapping created:`, headerToField);
    console.error(`[parseExam] Mapped fields:`, mappedFields);
    throw new Error(
      `Missing required field mappings: ${missingFields.join(", ")}. Please check that all headers are correctly mapped.`
    );
  }
  
  console.log(`[parseExam] All required fields mapped successfully. Mapped fields:`, mappedFields);

  const validRows: ParseExamResult["validRows"] = [];
  const errors: ValidationError[] = [];

  // Process data rows (starting from row 2)
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: Record<string, any> = {};

    // Skip empty rows
    let isEmpty = true;
    headers.forEach((header) => {
      // Map Excel header to field name first
      const fieldName = headerToField[header];
      if (!fieldName) {
        // This header is not mapped to any field, skip it
        return;
      }
      
      // Get the actual column index for this header
      const columnIndex = headerToColumnIndex[header];
      if (!columnIndex) {
        console.warn(`[parseExam] Row ${rowNum}: Header "${header}" has no column index`);
        return; // Skip if header not found
      }
      
      const cell = row.getCell(columnIndex);
      let value = cell.value;
      
      // Log rows extraction for debugging
      if (fieldName === "rows") {
        console.log(`[parseExam] Row ${rowNum}: Extracting rows from header "${header}" at column ${columnIndex}, raw value:`, value, `(type: ${typeof value})`);
      }
      
      // Handle rich text (which ExcelJS uses for Arabic text)
      if (cell.type === ExcelJS.ValueType.RichText && cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        // Extract text from rich text object
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
      
      if (fieldName) {
        // Handle date formatting - keep Hijri dates as-is, don't convert
        if (fieldName === "exam_date") {
          // First, try to get the cell's text value (as displayed in Excel)
          // This preserves Hijri dates that Excel shows as strings
          const cellText = cell.text?.trim() || "";
          
          // If cell text is in YYYY-MM-DD format (could be Hijri like "1447-07-01"), use it
          if (cellText && /^\d{4}-\d{2}-\d{2}$/.test(cellText)) {
            isEmpty = false;
            value = cellText; // Keep Hijri dates as-is from Excel display
            console.log(`[parseExam] Row ${rowNum}: Using cell text value (preserves Hijri): ${cellText}`);
          }
          // Handle Date object (Excel Date type) - only if cell text wasn't usable
          else if (value instanceof Date) {
            isEmpty = false;
            // Excel converted it to Gregorian, but we'll format it
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, "0");
            const day = String(value.getDate()).padStart(2, "0");
            value = `${year}-${month}-${day}`;
            console.log(`[parseExam] Row ${rowNum}: Date object formatted to: ${value} (WARNING: May have been converted from Hijri)`);
          } 
          // Handle Excel serial date number
          else if (typeof value === "number") {
            isEmpty = false;
            try {
              // Excel serial date: days since January 1, 1900
              // Convert to JavaScript date
              const excelEpoch = new Date(1899, 11, 30); // Excel epoch is Dec 30, 1899
              const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
              const year = jsDate.getFullYear();
              const month = String(jsDate.getMonth() + 1).padStart(2, "0");
              const day = String(jsDate.getDate()).padStart(2, "0");
              value = `${year}-${month}-${day}`;
              console.log(`[parseExam] Row ${rowNum}: Excel serial date formatted to: ${value} (WARNING: May have been converted from Hijri)`);
            } catch (e) {
              console.warn(`[parseExam] Row ${rowNum}: Failed to convert Excel serial date:`, value, e);
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
              console.log(`[parseExam] Row ${rowNum}: Keeping date string as-is: ${strValue}`);
            } else {
              // Not in YYYY-MM-DD format, keep as string
              value = strValue;
            }
          }
          // Assign the formatted date value to rowData
          rowData[fieldName] = value;
        }
        // Handle time formatting
        else if (fieldName === "start_time" || fieldName === "end_time") {
          if (value) {
            isEmpty = false;
          }
          if (value instanceof Date) {
            // Excel Date/Time object
            const hours = String(value.getHours()).padStart(2, "0");
            const minutes = String(value.getMinutes()).padStart(2, "0");
            value = `${hours}:${minutes}`;
          } else if (typeof value === "number") {
            // Excel time as decimal (0.5 = noon, 0.25 = 6 AM)
            try {
              // For time values, if < 1, it's a fraction of a day
              if (value < 1 && value >= 0) {
                const totalSeconds = Math.round(value * 86400); // seconds in a day
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
              } else {
                // Excel serial date: days since January 1, 1900
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
                const hours = String(jsDate.getHours()).padStart(2, "0");
                const minutes = String(jsDate.getMinutes()).padStart(2, "0");
                value = `${hours}:${minutes}`;
              }
            } catch (e) {
              // If it's a small number (< 1), it's likely a time fraction
              const numValue = typeof value === "number" ? value : parseFloat(String(value));
              if (!isNaN(numValue) && numValue < 1 && numValue >= 0) {
                const totalMinutes = Math.round(numValue * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
              } else {
                value = String(value);
              }
            }
          } else {
            value = String(value || "").trim();
            // Check if it's Arabic time format (e.g., "٨:٠٠ ص")
            const arabicTime = parseArabicTime(value);
            if (arabicTime) {
              value = arabicTime;
            } else if (value) {
              // Try to normalize time formats (e.g., "9:00 AM" -> "09:00", "14:30" -> "14:30")
              // Remove AM/PM and normalize
              const timeMatch = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[3]?.toUpperCase();
                if (ampm === "PM" && hours !== 12) hours += 12;
                if (ampm === "AM" && hours === 12) hours = 0;
                value = `${String(hours).padStart(2, "0")}:${minutes}`;
              }
            }
          }
          // Assign the formatted time value to rowData
          rowData[fieldName] = value;
        }
        // Handle rows field - keep range format like "1-8" or "1 - 8" as-is
        else if (fieldName === "rows") {
          if (value) {
            const strValue = String(value).trim();
            // Keep the range format as-is (e.g., "1-8", "1 - 8", "4-6")
            // Just normalize spacing: "1 - 8" becomes "1-8"
            value = strValue.replace(/\s*-\s*/g, "-"); // Normalize "1 - 8" to "1-8"
            console.log(`[parseExam] Row ${rowNum}: Extracted rows value: "${value}" (original: "${strValue}")`);
          } else {
            console.log(`[parseExam] Row ${rowNum}: No rows value found`);
          }
          if (value !== null && value !== undefined && value !== "") {
            isEmpty = false;
          }
          rowData[fieldName] = value;
        }
        // Handle seats field - use number of students
        else if (fieldName === "seats") {
          if (value) {
            const numValue = typeof value === "number" ? value : parseInt(String(value), 10);
            value = isNaN(numValue) ? undefined : numValue;
          }
          if (value !== null && value !== undefined && value !== "") {
            isEmpty = false;
          }
          rowData[fieldName] = value;
        }
        // Handle course code - normalize spaces
        else if (fieldName === "course_code") {
          value = String(value || "").trim().replace(/\s+/g, " "); // Normalize multiple spaces
          if (value !== null && value !== undefined && value !== "") {
            isEmpty = false;
          }
          rowData[fieldName] = value;
        }
        // Handle course name - preserve Arabic text
        else if (fieldName === "course_name") {
          // Preserve Arabic text as-is, just trim whitespace
          value = String(value || "").trim();
          if (value !== null && value !== undefined && value !== "") {
            isEmpty = false;
          }
          rowData[fieldName] = value;
          // Debug: log Arabic course names
          if (rowNum <= 3 && value) {
            console.log(`[parseExam] Row ${rowNum} course_name extracted:`, value);
            console.log(`[parseExam] Row ${rowNum} course_name length:`, value.length);
            console.log(`[parseExam] Row ${rowNum} course_name type:`, typeof value);
          }
        }
        // Handle period field - ensure it's a string
        else if (fieldName === "period") {
          // Convert to string if it's a number
          value = String(value || "").trim();
          if (value !== null && value !== undefined && value !== "") {
            isEmpty = false;
          }
          rowData[fieldName] = value;
        }
        // Handle other fields
        else {
          if (value !== null && value !== undefined && value !== "") {
            isEmpty = false;
          }
          rowData[fieldName] = value;
        }
      }
    });

    if (isEmpty) {
      console.log(`[parseExam] Row ${rowNum} is empty, skipping`);
      continue;
    }

    // If end_time is missing, calculate it from start_time and period
    // Period 1: usually 2 hours (8:00 -> 10:00), Period 2: usually 2 hours (10:30 -> 12:30)
    if (!rowData.end_time && rowData.start_time) {
      try {
        const startTimeStr = String(rowData.start_time).trim();
        const timeMatch = startTimeStr.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          
          // Add 2 hours for exam duration (default)
          hours += 2;
          if (hours >= 24) hours -= 24;
          
          rowData.end_time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        }
      } catch (e) {
        // If calculation fails, use a default end time
        rowData.end_time = rowData.start_time; // Fallback to same as start time
      }
    }

    // Debug: log rowData before validation
    if (rowNum <= 5) {
      console.log(`[parseExam] Row ${rowNum} data before validation:`, JSON.stringify(rowData, null, 2));
    }

    // Validate row
    try {
      console.log(`[parseExam] Row ${rowNum}: Attempting validation...`);
      const validated = examScheduleRowSchema.parse(rowData);
      console.log(`[parseExam] Row ${rowNum}: Validation successful!`);
      
      // Ensure end_time is set (calculate if still missing after validation)
      let endTime = validated.end_time;
      if (!endTime && validated.start_time) {
        const startMatch = validated.start_time.match(/(\d{2}):(\d{2})/);
        if (startMatch) {
          let hours = parseInt(startMatch[1], 10);
          const minutes = parseInt(startMatch[2], 10);
          hours += 2; // Add 2 hours (default exam duration)
          if (hours >= 24) hours -= 24;
          endTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        } else {
          endTime = validated.start_time; // Fallback
        }
      }
      
      validRows.push({
        courseCode: validated.course_code.trim().replace(/\s+/g, " "), // Normalize spaces
        courseName: validated.course_name,
        classNo: validated.class_no,
        examDate: validated.exam_date,
        startTime: validated.start_time,
        endTime: endTime || validated.start_time, // Use calculated or fallback to start_time
        place: validated.place,
        period: validated.period,
        rows: validated.rows, // This should be a string like "1-8" or undefined
        seats: validated.seats,
      });
      
      // Log rows value for debugging
      if (validated.rows !== undefined) {
        console.log(`[parseExam] Row ${rowNum}: Validated rows value: "${validated.rows}" (type: ${typeof validated.rows})`);
      } else {
        console.log(`[parseExam] Row ${rowNum}: No rows value after validation`);
      }
      
      console.log(`[parseExam] Successfully validated row ${rowNum}. Total valid rows so far: ${validRows.length}`);
      if (validRows.length <= 3) {
        console.log(`[parseExam] Valid row ${rowNum} details:`, validRows[validRows.length - 1]);
        console.log(`[parseExam] Course name in valid row: "${validRows[validRows.length - 1].courseName}" (length: ${validRows[validRows.length - 1].courseName.length})`);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMsg = err.errors[0]?.message || "Validation failed";
        const errorField = err.errors[0]?.path.join(".") || "unknown";
        if (rowNum <= 5) {
          console.error(`[parseExam] Validation error on row ${rowNum}, field ${errorField}:`, errorMsg);
          console.error(`[parseExam] Row data:`, JSON.stringify(rowData, null, 2));
          // Special logging for course_name errors
          if (errorField === "course_name") {
            console.error(`[parseExam] Course name value:`, rowData.course_name);
            console.error(`[parseExam] Course name type:`, typeof rowData.course_name);
            console.error(`[parseExam] Course name length:`, rowData.course_name?.length);
            console.error(`[parseExam] All Zod errors:`, err.errors);
          }
        }
        errors.push({
          row: rowNum,
          field: errorField,
          message: errorMsg,
        });
      } else {
        console.error(`[parseExam] Unknown error on row ${rowNum}:`, err);
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  console.log(`[parseExam] Parsing complete: ${validRows.length} valid rows, ${errors.length} errors`);
  if (validRows.length === 0 && errors.length > 0) {
    console.error(`[parseExam] No valid rows found! First 5 errors:`, errors.slice(0, 5));
  }
  
  return { validRows, errors };
}
