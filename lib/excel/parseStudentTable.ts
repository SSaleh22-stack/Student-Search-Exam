import ExcelJS from "exceljs";
import { z } from "zod";
import { enrollmentRowSchema, type ValidationError } from "./schemas";

export interface ParseStudentTableResult {
  validRows: Array<{
    studentId: string;
    courseCode: string;
    classNo: string;
  }>;
  errors: ValidationError[];
}

/**
 * Parse student table Excel file format
 * Structure:
 * - Each student has a header section (rows 2-9) with:
 *   - Student ID in columns 11-12 (9-digit number)
 *   - Semester section in columns 22-24
 * - Course header row (row 10) with "رقم المقرر", "اسم المقرر", "الشعبة", etc.
 * - Course rows with:
 *   - Course code in columns 2-5 (e.g., ITBS107)
 *   - Section number in columns 17-18 (e.g., 5843)
 * - Student is enrolled in all courses listed after their header until next student header
 */
export async function parseStudentTable(
  file: File | Buffer
): Promise<ParseStudentTableResult> {
  try {
    console.log(`[parseStudentTable] Starting to parse file...`);
    const workbook = new ExcelJS.Workbook();
    let buffer: Buffer;
    if (file instanceof File) {
      console.log(`[parseStudentTable] File size: ${file.size} bytes, name: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }
    
    console.log(`[parseStudentTable] Loading workbook...`);
    await workbook.xlsx.load(buffer as any);
    console.log(`[parseStudentTable] Workbook loaded. Sheet count: ${workbook.worksheets.length}`);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Excel file must contain at least one worksheet");
    }
    
    console.log(`[parseStudentTable] Worksheet found. Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

  const validRows: ParseStudentTableResult["validRows"] = [];
  const errors: ValidationError[] = [];

  // Patterns
  const studentIdPattern = /^[0-9]{9}$/;
  const courseCodePattern = /^[A-Z]{2,}\s*\d{2,}/i;

  let currentStudentId = "";
  let courseHeaderRow = 0;

  // Find the course header row (contains "رقم المقرر" or "الشعبة")
  for (let rowNum = 1; rowNum <= Math.min(20, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    for (let col = 1; col <= Math.min(20, worksheet.columnCount); col++) {
      const cell = row.getCell(col);
      const value = cell.value?.toString().trim() || "";
      if (value.includes("رقم المقرر") || value.includes("الشعبة")) {
        courseHeaderRow = rowNum;
        break;
      }
    }
    if (courseHeaderRow > 0) break;
  }

  if (courseHeaderRow === 0) {
    throw new Error("Could not find course header row in the Excel file");
  }

  console.log(`[parseStudentTable] Starting to process ${worksheet.rowCount} rows. Course header row: ${courseHeaderRow}`);
  
  // Process rows - optimize by skipping empty rows early
  let processedCount = 0;
  let lastProgressLog = Date.now();
  let lastStudentIdRow = 0;
  const MAX_ROWS_WITHOUT_STUDENT = 100; // Stop if we haven't found a student ID in 100 rows
  
  for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
    // Log progress every 1000 rows or every 5 seconds
    processedCount++;
    const now = Date.now();
    if (processedCount % 1000 === 0 || (now - lastProgressLog) > 5000) {
      console.log(`[parseStudentTable] Processed ${processedCount}/${worksheet.rowCount} rows. Found ${validRows.length} enrollments so far. Current student: ${currentStudentId || 'none'}`);
      lastProgressLog = now;
    }
    
    // Optimization: If we haven't found a student ID in a while and we're past the course header,
    // we might have finished processing all students. Check if we should stop.
    if (rowNum > courseHeaderRow && currentStudentId && (rowNum - lastStudentIdRow) > MAX_ROWS_WITHOUT_STUDENT) {
      // Check if the next few rows are also empty - if so, we've probably finished
      let allEmpty = true;
      for (let checkRow = rowNum; checkRow <= Math.min(rowNum + 10, worksheet.rowCount); checkRow++) {
        const checkRowData = worksheet.getRow(checkRow);
        for (let col = 1; col <= 5; col++) {
          const cell = checkRowData.getCell(col);
          const value = cell.value?.toString().trim() || "";
          if (value && value.length > 0) {
            allEmpty = false;
            break;
          }
        }
        if (!allEmpty) break;
      }
      
      if (allEmpty) {
        console.log(`[parseStudentTable] Stopping early at row ${rowNum} - no more data found. Processed ${validRows.length} enrollments.`);
        break;
      }
    }
    
    const row = worksheet.getRow(rowNum);

    // Check if this is a student header row (contains student ID in columns 11-12)
    let foundStudentId = false;
    for (let col = 11; col <= 12; col++) {
      const cell = row.getCell(col);
      const value = cell.value?.toString().trim() || "";
      if (studentIdPattern.test(value)) {
        currentStudentId = value;
        foundStudentId = true;
        lastStudentIdRow = rowNum;
        console.log(`[parseStudentTable] Row ${rowNum}: Found student ID: ${currentStudentId}`);
        break;
      }
    }

    // If we found a student ID, continue to next row (courses will be processed below)
    if (foundStudentId) {
      continue;
    }

    // If we're past the course header row and have a current student ID, look for courses
    if (rowNum > courseHeaderRow && currentStudentId) {
      // Quick check: skip if row appears to be completely empty in first few columns
      let hasData = false;
      for (let col = 1; col <= 5; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value && value.length > 0) {
          hasData = true;
          break;
        }
      }
      
      // Skip empty rows early
      if (!hasData) {
        continue;
      }
      
      // Check if this row contains a course code (in columns 2-5)
      let courseCode = "";
      let sectionNumber = "";

      // Look for course code in columns 2-5
      for (let col = 2; col <= 5; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (courseCodePattern.test(value)) {
          courseCode = value;
          break;
        }
      }

      // If we found a course code, look for section number in columns 17-18
      if (courseCode) {
        for (let col = 17; col <= 18; col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          // Section numbers are typically 3-5 digit numbers (e.g., 5843, 5844, 268)
          if (/^[0-9]{3,5}$/.test(value)) {
            sectionNumber = value;
            break;
          }
        }

        // If we found both course code and section, create enrollment
        if (courseCode && sectionNumber) {
          try {
            const rowData = {
              student_id: currentStudentId,
              course_code: courseCode,
              class_no: sectionNumber,
            };

            const validated = enrollmentRowSchema.parse(rowData);
            validRows.push({
              studentId: validated.student_id,
              courseCode: validated.course_code,
              classNo: validated.class_no,
            });
            
            // Log first few enrollments for debugging
            if (validRows.length <= 5) {
              console.log(`[parseStudentTable] Row ${rowNum}: Created enrollment - Student: ${currentStudentId}, Course: ${courseCode}, Section: ${sectionNumber}`);
            }
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
        } else if (courseCode && !sectionNumber) {
          // Course code found but no section - log as error
          errors.push({
            row: rowNum,
            field: "class_no",
            message: `Course code ${courseCode} found but no section number detected`,
          });
        }
      }
    }
  }
  
  console.log(`[parseStudentTable] Finished processing. Total enrollments: ${validRows.length}, Errors: ${errors.length}`);
  
  if (validRows.length === 0 && errors.length === 0) {
    console.warn(`[parseStudentTable] WARNING: No enrollments found and no errors reported. This might indicate a parsing issue.`);
    console.warn(`[parseStudentTable] Course header row: ${courseHeaderRow}, Last student ID found: ${currentStudentId || 'none'}`);
  }

  return { validRows, errors };
  } catch (error) {
    console.error(`[parseStudentTable] Error parsing file:`, error);
    throw new Error(`Failed to parse student table file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

