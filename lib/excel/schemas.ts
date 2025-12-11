import { z } from "zod";
import { parseHijriDate, parseArabicTime } from "@/lib/utils/hijri-converter";

// Exam Schedule schema
export const examScheduleRowSchema = z.object({
  course_code: z.string().min(1, "Course code is required"),
  course_name: z.string().min(1, "Course name is required").transform((val) => {
    // Preserve Arabic text - just ensure it's a non-empty string
    const str = String(val || "").trim();
    if (str.length === 0) {
      throw new Error("Course name cannot be empty");
    }
    return str;
  }),
  class_no: z.union([z.string(), z.number()]).transform((val) => String(val)),
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
      // If year is in Hijri range, this is suspicious - Excel shouldn't create such dates
      // But we'll format it anyway since we can't recover the original Hijri date
      const month = String(val.getMonth() + 1).padStart(2, "0");
      const day = String(val.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    
    // Handle Excel serial date number - ONLY if string parsing failed
    // WARNING: Excel may have converted Hijri to Gregorian, so this might be wrong
    if (typeof val === "number") {
      try {
        // Excel serial date: days since 1900-01-01
        const excelEpoch = new Date(1899, 11, 30); // Excel epoch is Dec 30, 1899
        const date = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      } catch (e) {
        // If conversion fails, try parsing as string
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
      // If parsed date is in reasonable range, format it
      if (year > 1000 && year < 3000) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
    
    return str; // Return original if can't parse
  }).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format (Hijri or Gregorian)")),
  start_time: z.union([
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
    // Handle Excel time as decimal (0.5 = noon, 0.25 = 6 AM)
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
    return str; // Return original if can't parse
  }).pipe(z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")),
  end_time: z.union([
    z.string().regex(/^\d{2}:\d{2}$/),
    z.string(),
    z.date(),
    z.number(),
    z.undefined(),
  ]).optional().transform((val) => {
    // If undefined or empty, return undefined (will be calculated later)
    if (val === undefined || val === null || val === "") {
      return undefined;
    }
    
    // Handle Date object
    if (val instanceof Date) {
      const hours = String(val.getHours()).padStart(2, "0");
      const minutes = String(val.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    // Handle Excel time as decimal (0.5 = noon, 0.25 = 6 AM)
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
    
    // Check if it's Arabic time format (e.g., "٨:٠٠ ص" or " ص٠٨:٠٠")
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
    return str; // Return original if can't parse
  }).pipe(z.union([
    z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    z.undefined(),
  ])),
  place: z.string().min(1, "Place is required"),
  period: z.string().min(1, "Period is required"),
  rows: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    // Keep as string to preserve range format like "1-8", "1-9", "4-6"
    // Normalize spacing: "1 - 8" becomes "1-8"
    const str = String(val).trim();
    const normalized = str.replace(/\s*-\s*/g, "-");
    return normalized; // Return as string
  }).pipe(z.union([z.string(), z.undefined()])), // Ensure output is string or undefined
  seats: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    const num = typeof val === "string" ? parseInt(val, 10) : val;
    return isNaN(num) ? undefined : num;
  }),
});

export type ExamScheduleRow = z.infer<typeof examScheduleRowSchema>;

// Enrollment schema
export const enrollmentRowSchema = z.object({
  student_id: z.string().min(1, "Student ID is required"),
  course_code: z.string().min(1, "Course code is required"),
  class_no: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export type EnrollmentRow = z.infer<typeof enrollmentRowSchema>;

// Validation error type
export interface ValidationError {
  row: number;
  field?: string;
  message: string;
}

