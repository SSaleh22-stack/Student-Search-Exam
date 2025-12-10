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

interface BlockInfo {
  startRow: number;
  endRow: number;
}

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
};

export async function parseEnrollmentsFromBlocks(
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

  // Detect blocks (separated by empty rows)
  const blocks: BlockInfo[] = [];
  let currentBlockStart = 1;
  let inBlock = false;

  for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    let isEmpty = true;
    let hasData = false;

    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
        isEmpty = false;
        hasData = true;
        break;
      }
    }

    if (hasData && !inBlock) {
      currentBlockStart = rowNum;
      inBlock = true;
    } else if (isEmpty && inBlock) {
      if (rowNum < worksheet.rowCount) {
        const nextRow = worksheet.getRow(rowNum + 1);
        let nextHasData = false;
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = nextRow.getCell(col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            nextHasData = true;
            break;
          }
        }
        if (!nextHasData) {
          blocks.push({ startRow: currentBlockStart, endRow: rowNum - 1 });
          inBlock = false;
        }
      } else {
        blocks.push({ startRow: currentBlockStart, endRow: rowNum - 1 });
        inBlock = false;
      }
    }
  }

  if (inBlock) {
    blocks.push({ startRow: currentBlockStart, endRow: worksheet.rowCount });
  }

  // Process each block
  for (const block of blocks) {
    // Find student ID, name, and course information in this block
    let studentId = "";
    let studentName = "";
    let studentRow = 0;
    let courseHeaderRow = 0;
    let classNoCol = 0;
    let studentIdCol = 0;
    let studentNameCol = 0;

    // Find student row (has 9-digit ID in column 4)
    for (let rowNum = block.startRow; rowNum <= Math.min(block.startRow + 10, block.endRow); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const col4 = row.getCell(4).value?.toString().trim() || "";
      if (/^\d{9}$/.test(col4)) {
        studentId = col4;
        studentRow = rowNum;
        studentIdCol = 4;
        
        // Extract student name (usually in column 8)
        const col8 = row.getCell(8).value?.toString().trim() || "";
        if (col8 && col8.length > 2) {
          studentName = col8;
          studentNameCol = 8;
        } else {
          // Try other columns for name
          for (let col = 5; col <= 12; col++) {
            const cell = row.getCell(col);
            const value = cell.value?.toString().trim() || "";
            if (value && value.length > 5 && !/^\d+$/.test(value)) {
              studentName = value;
              studentNameCol = col;
              break;
            }
          }
        }
        break;
      }
    }

    if (!studentId) continue; // Skip blocks without student ID

    // Find course header row (contains "رقم المقرر")
    for (let rowNum = studentRow + 1; rowNum <= Math.min(block.endRow, studentRow + 20); rowNum++) {
      const row = worksheet.getRow(rowNum);
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value.includes("رقم المقرر") || value.includes("المقرر")) {
          courseHeaderRow = rowNum;
          // Find class/section column (الشعبة)
          for (let c = 1; c <= worksheet.columnCount; c++) {
            const headerCell = row.getCell(c);
            const headerValue = headerCell.value?.toString().trim() || "";
            if (headerValue.includes("الشعبة") || headerValue.includes("شعبة") || headerValue.includes("شعب")) {
              classNoCol = c;
              break;
            }
          }
          break;
        }
      }
      if (courseHeaderRow > 0) break;
    }

    if (courseHeaderRow === 0 || classNoCol === 0) continue; // Skip if no course section found

    // Extract all courses with their class numbers
    const courses: Array<{ courseCode: string; classNo: string }> = [];
    
    for (let rowNum = courseHeaderRow + 1; rowNum <= block.endRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Check if this is a course row (has course code pattern)
      const col2 = row.getCell(2).value?.toString().trim() || "";
      const col3 = row.getCell(3).value?.toString().trim() || "";
      const coursePattern = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
      
      if (coursePattern.test(col2) || coursePattern.test(col3)) {
        const courseCodeRaw = col2.match(coursePattern)?.[0] || col3.match(coursePattern)?.[0] || "";
        const courseCode = courseCodeRaw.replace(/[\s\.]+/g, "").toUpperCase();
        
        // Get class number from class column (الشعبة)
        const classCell = row.getCell(classNoCol);
        const classValue = classCell.value?.toString().trim() || "";
        
        if (courseCode && classValue && classValue !== "-" && classValue !== "") {
          // Avoid duplicates (same course code + class number)
          if (!courses.find(c => c.courseCode === courseCode && c.classNo === classValue)) {
            courses.push({
              courseCode: courseCode,
              classNo: classValue,
            });
          }
        }
      }
    }

    // Assign all courses to the student
    for (const course of courses) {
      try {
        const rowData = {
          student_id: studentId,
          course_code: course.courseCode,
          class_no: course.classNo,
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
            row: studentRow,
            field: err.errors[0]?.path.join("."),
            message: err.errors[0]?.message || "Validation failed",
          });
        }
      }
    }
  }

  return { validRows, errors };
}
