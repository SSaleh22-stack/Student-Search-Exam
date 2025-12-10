import ExcelJS from "exceljs";
import { z } from "zod";
import { enrollmentRowSchema, type ValidationError } from "./schemas";

export interface ParseEnrollResult {
  validRows: Array<{
    studentId: string;
    courseCode: string;
    classNo: string;
  }>;
  errors: ValidationError[];
}

/**
 * Parse enrollment file organized by course and section
 * Structure:
 * - Row with "المقرر:" followed by course code
 * - Row with "الشعبة:" followed by section number
 * - Empty row
 * - Header row with "رقم الطالب" (Student ID)
 * - Data rows with student IDs (9-digit numbers)
 */
export async function parseEnrollmentsFromSections(
  file: File | Buffer
): Promise<ParseEnrollResult> {
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

  const validRows: ParseEnrollResult["validRows"] = [];
  const errors: ValidationError[] = [];

  let currentCourse = "";
  let currentSection = "";
  let inStudentList = false;
  let studentHeaderRow = 0;

  // Patterns
  const coursePattern = /^[A-Z]{2,}\s*\d{2,}/i;
  const sectionHeaderPattern = /الشعبة|شعبة/i;
  const studentIdHeaderPattern = /رقم\s*الطالب|رقم الطالب/i;
  const studentIdPattern = /^\d{9}$/;

  for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // Check if this row contains course code
    // Look for "المقرر:" followed by course code
    let foundCourse = false;
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      const value = String(cell.value || "").trim();
      
      // Check if this cell says "المقرر:" and next cell has course code
      if (value.includes("المقرر") && (value.includes(":") || col < worksheet.columnCount)) {
        // Check next few columns for course code
        for (let nextCol = col + 1; nextCol <= Math.min(col + 5, worksheet.columnCount); nextCol++) {
          const nextCell = row.getCell(nextCol);
          const nextValue = String(nextCell.value || "").trim();
          if (coursePattern.test(nextValue)) {
            currentCourse = nextValue.replace(/\s+/g, " ").toUpperCase();
            foundCourse = true;
            inStudentList = false;
            console.log(`Row ${rowNum}: Found course: ${currentCourse}`);
            break;
          }
        }
        if (foundCourse) break;
      }
    }

    // Check if this row contains section number
    // Look for "الشعبة:" followed by section number
    let foundSection = false;
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      const value = String(cell.value || "").trim();
      
      // Check if this cell says "الشعبة:" and next cell has section number
      if (sectionHeaderPattern.test(value) && (value.includes(":") || col < worksheet.columnCount)) {
        // Check next few columns for section number
        for (let nextCol = col + 1; nextCol <= Math.min(col + 5, worksheet.columnCount); nextCol++) {
          const nextCell = row.getCell(nextCol);
          const nextValue = String(nextCell.value || "").trim();
          // Section number is usually a number (not text like "انتظام")
          if (/^\d+$/.test(nextValue)) {
            currentSection = nextValue;
            foundSection = true;
            inStudentList = false;
            console.log(`Row ${rowNum}: Found section: ${currentSection} for course: ${currentCourse}`);
            break;
          }
        }
        if (foundSection) break;
      }
    }

    // Check if this is the student header row
    if (!inStudentList && currentCourse && currentSection) {
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = String(cell.value || "").trim();
        if (studentIdHeaderPattern.test(value)) {
          studentHeaderRow = rowNum;
          inStudentList = true;
          console.log(`Row ${rowNum}: Found student header row`);
          break;
        }
      }
    }

    // Extract student IDs from data rows
    if (inStudentList && currentCourse && currentSection && rowNum > studentHeaderRow) {
      // Check if this row has a student ID
      let studentId = "";
      
      // Student ID is usually in column 2 or 3
      for (let col = 2; col <= Math.min(5, worksheet.columnCount); col++) {
        const cell = row.getCell(col);
        const value = String(cell.value || "").trim();
        
        // Check if it's a 9-digit number (student ID)
        if (studentIdPattern.test(value)) {
          studentId = value;
          break;
        }
      }

      // If we found a student ID, create enrollment
      if (studentId) {
        try {
          const rowData = {
            student_id: studentId,
            course_code: currentCourse,
            class_no: currentSection,
          };

          const validated = enrollmentRowSchema.parse(rowData);
          validRows.push({
            studentId: validated.student_id,
            courseCode: validated.course_code,
            classNo: validated.class_no,
          });
        } catch (err) {
          if (err instanceof z.ZodError) {
            errors.push({
              row: rowNum,
              field: err.errors[0]?.path.join("."),
              message: err.errors[0]?.message || "Validation failed",
            });
          }
        }
      } else {
        // If no student ID found and we've been in student list, check if we should stop
        // (might be empty row or new course/section starting)
        let isEmpty = true;
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = row.getCell(col);
          if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== "") {
            isEmpty = false;
            break;
          }
        }
        
        // If empty row, continue; if not empty and no student ID, might be new section
        if (!isEmpty) {
          // Check if this looks like a new course/section header
          let looksLikeHeader = false;
          for (let col = 1; col <= worksheet.columnCount; col++) {
            const cell = row.getCell(col);
            const value = String(cell.value || "").trim();
            if (value.includes("المقرر") || value.includes("الشعبة") || value.includes("المقرر:")) {
              looksLikeHeader = true;
              inStudentList = false;
              break;
            }
          }
        }
      }
    }
  }

  console.log(`Parsed ${validRows.length} enrollments from ${validRows.length > 0 ? new Set(validRows.map(r => `${r.courseCode}_${r.classNo}`)).size : 0} course-section combinations`);
  
  return { validRows, errors };
}

