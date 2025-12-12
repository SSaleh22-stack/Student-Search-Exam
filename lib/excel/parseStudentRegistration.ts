import ExcelJS from "exceljs";
import { z } from "zod";
import { type ValidationError } from "./schemas";

export interface ParseStudentRegistrationResult {
  validRows: Array<{
    studentId: string;
    courseCode: string;
    courseName: string;
    classNo: string;
  }>;
  errors: ValidationError[];
}

const studentRegistrationRowSchema = z.object({
  student_id: z.string().min(1, "Student ID is required"),
  course_code: z.string().min(1, "Course code is required"),
  course_name: z.string().min(1, "Course name is required"),
  class_no: z.string().min(1, "Class/Section number is required"),
});

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
};

/**
 * Parse student registration file with block structure
 * Structure: Each block starts with a student ID, followed by multiple rows
 * with course code, course name, and section/class for that student
 * 
 * Example:
 * Block 1:
 *   Row 1: Student ID: 123456789
 *   Row 2: CS101 | Introduction to CS | 1
 *   Row 3: MATH101 | Calculus | 2
 *   Row 4: (empty row - end of block)
 * Block 2:
 *   Row 5: Student ID: 987654321
 *   ...
 */
export async function parseStudentRegistration(
  file: File | Buffer
): Promise<ParseStudentRegistrationResult> {
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

  const validRows: ParseStudentRegistrationResult["validRows"] = [];
  const errors: ValidationError[] = [];

  // Patterns for detection
  const studentIdPattern = /^\d{6,10}$/; // 6-10 digit student ID
  const courseCodePattern = /^[A-Z]{2,}[.\s]*\d{2,}/i; // Course code like CS101, MATH.201, ENG 103, IC  103

  let currentStudentId = "";
  let inStudentBlock = false;
  let pastCourseHeader = false; // Track if we've passed the course header row

  // Process all rows
  for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // Get cell values by column number (not just non-empty cells)
    const getCellValue = (colNum: number): string => {
      const cell = row.getCell(colNum);
      return cell.value?.toString()?.trim() || "";
    };

    // Check if row is empty
    let isEmpty = true;
    for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
      if (getCellValue(col)) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      // Don't reset pastCourseHeader on empty rows - we might have empty rows between courses
      continue;
    }

    // Check for student ID in column 4 (based on file structure)
    const studentIdCell = getCellValue(4);
    if (studentIdPattern.test(studentIdCell)) {
      currentStudentId = studentIdCell;
      inStudentBlock = true;
      pastCourseHeader = false;
      continue; // Move to next row
    }

    // Check if this is the course header row (has "رقم المقرر" or "اسم المقرر" or "الشعبة")
    const col2 = getCellValue(2);
    const col7 = getCellValue(7);
    const col13 = getCellValue(13);
    
    if (col2.includes("رقم المقرر") || col7.includes("اسم المقرر") || col13.includes("الشعبة")) {
      pastCourseHeader = true;
      continue; // Skip header row
    }

    // If we have a student ID and past the course header, extract course data
    if (currentStudentId && inStudentBlock && pastCourseHeader) {
      // Based on file structure:
      // Column 2 = Course Code
      // Column 7 = Course Name
      // Column 13 = Section/Class Number
      
      const courseCode = getCellValue(2);
      const courseName = getCellValue(7);
      const classNo = getCellValue(13);

      // Validate that we have a course code (pattern match)
      if (courseCodePattern.test(courseCode) && courseName && classNo && classNo !== "-") {
        const rowData = {
          student_id: currentStudentId,
          course_code: courseCode,
          course_name: courseName,
          class_no: classNo,
        };

        try {
          const validated = studentRegistrationRowSchema.parse(rowData);
          validRows.push({
            studentId: validated.student_id,
            courseCode: validated.course_code,
            courseName: validated.course_name,
            classNo: validated.class_no,
          });
        } catch (err) {
          if (err instanceof z.ZodError) {
            errors.push({
              row: rowNum,
              field: err.errors[0]?.path.join("."),
              message: err.errors[0]?.message || "Validation failed",
            });
          } else {
            errors.push({
              row: rowNum,
              message: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }
      } else if (courseCode && courseCodePattern.test(courseCode)) {
        // Has course code but missing name or section - log error
        errors.push({
          row: rowNum,
          message: `Incomplete course data for student ${currentStudentId}. Course: ${courseCode}, Name: ${courseName || 'missing'}, Section: ${classNo || 'missing'}`,
        });
      }
    }

    // Check if we've hit a new block (rows with "المقر:" or "الكلية:" or "القسم:" or "المقرر:")
    const col1 = getCellValue(1);
    if (col1.includes("المقر:") || col1.includes("الكلية:") || col1.includes("القسم:") || col1.includes("المقرر:")) {
      // New block starting, reset current student
      if (inStudentBlock) {
        inStudentBlock = false;
        currentStudentId = "";
        pastCourseHeader = false;
      }
    }
  }

  return { validRows, errors };
}

