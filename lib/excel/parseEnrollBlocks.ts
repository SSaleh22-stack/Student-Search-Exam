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
    // Find ALL students in this block and process each one separately
    const studentsInBlock: Array<{ studentId: string; studentName: string; studentRow: number }> = [];
    
    // Scan the entire block for student IDs
    // Check multiple columns (2, 4, and others) as student IDs can be in different locations
    for (let rowNum = block.startRow; rowNum <= block.endRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Check common columns for student ID (9-digit number)
      let studentId = "";
      let studentIdCol = 0;
      
      // Priority: column 2, then column 4, then others
      const columnsToCheck = [2, 4, 1, 3, 5];
      for (const col of columnsToCheck) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (/^\d{9}$/.test(value)) {
          studentId = value;
          studentIdCol = col;
          break;
        }
      }
      
      if (studentId) {
        let studentName = "";
        // Extract student name (usually in column 8, but check other columns too)
        const col8 = row.getCell(8).value?.toString().trim() || "";
        if (col8 && col8.length > 2) {
          studentName = col8;
        } else {
          // Try other columns for name
          for (let col = 5; col <= 12; col++) {
            const cell = row.getCell(col);
            const value = cell.value?.toString().trim() || "";
            if (value && value.length > 5 && !/^\d+$/.test(value)) {
              studentName = value;
              break;
            }
          }
        }
        studentsInBlock.push({
          studentId: studentId,
          studentName: studentName,
          studentRow: rowNum
        });
      }
    }

    if (studentsInBlock.length === 0) continue; // Skip blocks without student IDs
    
    // Process each student in the block
    for (const student of studentsInBlock) {
      const studentId = student.studentId;
      const studentRow = student.studentRow;
      let courseHeaderRow = 0;
      let courseCodeCol = 0; // Column containing course codes (رقم المقرر)
      let classNoCol = 0;

    // Find course header row (contains "رقم المقرر")
    // IMPORTANT: Find the FIRST course header immediately after this student
    // Don't skip over course headers - use the one that comes right after the student
    // Stop if we encounter another student (9-digit ID in column 2 or 4)
    for (let rowNum = studentRow + 1; rowNum <= Math.min(block.endRow, studentRow + 50); rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Stop if we encounter another student (this ensures we use the course header immediately after the current student)
      const col2 = row.getCell(2).value?.toString().trim() || "";
      const col4 = row.getCell(4).value?.toString().trim() || "";
      if (/^\d{9}$/.test(col2) || /^\d{9}$/.test(col4)) {
        break; // Found another student, stop searching
      }
      
      // Check if this row contains "المقرر" header
      let foundHeader = false;
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value.includes("رقم المقرر") || value.includes("المقرر")) {
          foundHeader = true;
          courseHeaderRow = rowNum;
          
          // Find course code column - the course code is usually in the column AFTER "المقرر:" header
          for (let c = 1; c <= worksheet.columnCount; c++) {
            const headerCell = row.getCell(c);
            const headerValue = headerCell.value?.toString().trim() || "";
            if (headerValue.includes("رقم المقرر") || headerValue.includes("المقرر") || headerValue.includes("رمز المقرر")) {
              // When "المقرر:" is in column 1 or 2, the course code is ALWAYS in column 3
              // This is the standard pattern, so prioritize column 3
              if (c <= 2) {
                // Always use column 3 when header is in column 1 or 2
                // This ensures "281 QURN" in column 3 is used, not "CS 181" in column 2
                courseCodeCol = 3;
              } else {
                // If header is in a different column, check next columns
                // First, always check column 3 as it's the most common location
                if (courseCodeCol === 0) {
                  const col3Cell = row.getCell(3);
                  const col3Value = col3Cell.value?.toString().trim() || "";
                  // Check if column 3 contains a course code using pattern matching
                  // This works for both "281 QURN" (numbers-first) and "CS 181" (letters-first)
                  const coursePatternLettersFirst = /[A-Z]{2,}[\s\.]*\d{2,}/i;
                  const coursePatternNumbersFirst = /\d{2,}[\s\.]*[A-Z]{2,}/i;
                  if (col3Value && (coursePatternLettersFirst.test(col3Value) || coursePatternNumbersFirst.test(col3Value))) {
                    courseCodeCol = 3;
                  }
                }
                
                // If column 3 didn't work, check next columns
                if (courseCodeCol === 0) {
                  const coursePatternLettersFirst = /[A-Z]{2,}[\s\.]*\d{2,}/i;
                  const coursePatternNumbersFirst = /\d{2,}[\s\.]*[A-Z]{2,}/i;
                  for (let nextCol = c + 1; nextCol <= Math.min(c + 3, worksheet.columnCount); nextCol++) {
                    const nextCell = row.getCell(nextCol);
                    const nextValue = nextCell.value?.toString().trim() || "";
                    // Check if this looks like a course code using pattern matching
                    // This works for both numbers-first and letters-first patterns
                    if (nextValue && (coursePatternLettersFirst.test(nextValue) || coursePatternNumbersFirst.test(nextValue))) {
                      courseCodeCol = nextCol;
                      break;
                    }
                  }
                }
                
                if (courseCodeCol === 0) {
                  // Default to column 3 if we can't find it
                  courseCodeCol = Math.max(3, c + 1);
                }
              }
              break;
            }
          }
          
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
      
      // If we found a course header, stop searching
      // This ensures we use the course header immediately after the student, not a later one
      if (foundHeader) {
        break;
      }
    }

    if (courseHeaderRow === 0 || classNoCol === 0) continue; // Skip if no course section found
    
    // If course code column not found, try to infer it (usually column 2 or 3)
    if (courseCodeCol === 0) {
      // Check if column 2 or 3 in the header row contains course code pattern
      const headerRow = worksheet.getRow(courseHeaderRow);
      const col2 = headerRow.getCell(2).value?.toString().trim() || "";
      const col3 = headerRow.getCell(3).value?.toString().trim() || "";
      
      // Use pattern matching to detect course codes (supports both numbers-first and letters-first)
      const coursePatternLettersFirst = /[A-Z]{2,}[\s\.]*\d{2,}/i;
      const coursePatternNumbersFirst = /\d{2,}[\s\.]*[A-Z]{2,}/i;
      
      // Check if column 3 has a course code pattern
      if (col3 && (coursePatternLettersFirst.test(col3) || coursePatternNumbersFirst.test(col3)) && 
          !col3.includes("المقرر") && !col3.includes("الشعبة") && !col3.includes("اسم")) {
        courseCodeCol = 3;
      } 
      // Check if column 2 has a course code pattern
      else if (col2 && (coursePatternLettersFirst.test(col2) || coursePatternNumbersFirst.test(col2)) && 
               !col2.includes("المقرر") && !col2.includes("الشعبة") && !col2.includes("اسم")) {
        courseCodeCol = 2;
      }
      // If these columns don't contain headers, they might be the course code column
      else if (!col2.includes("المقرر") && !col2.includes("الشعبة") && !col2.includes("اسم")) {
        courseCodeCol = 2;
      } else if (!col3.includes("المقرر") && !col3.includes("الشعبة") && !col3.includes("اسم")) {
        courseCodeCol = 3;
      } else {
        // Default to column 3 if we can't determine (most common pattern)
        courseCodeCol = 3;
      }
    }

    // Extract all courses with their class numbers
    const courses: Array<{ courseCode: string; classNo: string }> = [];
    
    // Pattern to match course codes
    // Supports formats like:
    // - ITBS107, PHYS202, ARAB103 (letters then numbers)
    // - 281 QURN, 101 MATH (numbers then letters)
    // - COE 351 (letters, space, numbers)
    const coursePatternLettersFirst = /[A-Z]{2,}[\s\.]*\d{2,}/i;
    const coursePatternNumbersFirst = /\d{2,}[\s\.]*[A-Z]{2,}/i;
    const coursePatternMixed = /[A-Z0-9]{3,}[\s\.]*[A-Z0-9]{2,}/i; // Fallback for mixed patterns
    
    // Helper function to extract course code from a cell value
    const extractCourseCode = (value: string): string => {
      if (!value) return "";
      
      // Trim the value to remove leading/trailing whitespace
      const trimmedValue = value.trim();
      if (!trimmedValue) return "";
      
      // Try to find all matches first
      const lettersFirstMatch = trimmedValue.match(coursePatternLettersFirst);
      const numbersFirstMatch = trimmedValue.match(coursePatternNumbersFirst);
      const mixedMatch = trimmedValue.match(coursePatternMixed);
      
      // Determine which pattern to use
      // If both patterns match, prefer the one that appears first in the string
      // and is more specific (shorter match is usually better)
      let bestMatch = null;
      let bestMatchType = "";
      
      if (lettersFirstMatch && numbersFirstMatch) {
        // Both match - use the one that appears first, or the shorter one
        const lettersIndex = trimmedValue.indexOf(lettersFirstMatch[0]);
        const numbersIndex = trimmedValue.indexOf(numbersFirstMatch[0]);
        if (lettersIndex < numbersIndex) {
          bestMatch = lettersFirstMatch;
          bestMatchType = "letters";
        } else if (numbersIndex < lettersIndex) {
          bestMatch = numbersFirstMatch;
          bestMatchType = "numbers";
        } else {
          // Same position - prefer shorter match (more specific)
          bestMatch = lettersFirstMatch[0].length <= numbersFirstMatch[0].length ? lettersFirstMatch : numbersFirstMatch;
          bestMatchType = lettersFirstMatch[0].length <= numbersFirstMatch[0].length ? "letters" : "numbers";
        }
      } else if (lettersFirstMatch) {
        bestMatch = lettersFirstMatch;
        bestMatchType = "letters";
      } else if (numbersFirstMatch) {
        bestMatch = numbersFirstMatch;
        bestMatchType = "numbers";
      }
      
      // Process the best match
      if (bestMatch) {
        // Extract the match and clean it up
        let extracted = bestMatch[0].trim();
        // The pattern might capture extra text, so we need to extract just the course code part
        // For "281 QURN", we want just "281 QURN" not "281 QURN الأسرة"
        // Split by space and take only the parts that match the pattern
        const parts = extracted.split(/\s+/);
        const courseCodeParts: string[] = [];
        for (const part of parts) {
          // If the part contains only letters and numbers (course code), include it
          // Stop if we encounter Arabic characters or other non-course-code text
          // Check if part is purely alphanumeric (letters and numbers only, no Arabic)
          if (/^[A-Z0-9]+$/i.test(part)) {
            courseCodeParts.push(part);
          } else {
            // Stop at first non-course-code part (likely Arabic text or mixed content)
            break;
          }
        }
        if (courseCodeParts.length > 0) {
          extracted = courseCodeParts.join("").toUpperCase();
          // Ensure we have a valid course code (at least 3 characters)
          if (extracted.length >= 3) {
            return extracted;
          }
        }
      }
      
      // Fallback to mixed pattern if no specific match found
      if (mixedMatch && !bestMatch) {
        let extracted = mixedMatch[0].trim();
        const parts = extracted.split(/\s+/);
        const courseCodeParts: string[] = [];
        for (const part of parts) {
          // Only include parts that are purely alphanumeric (no spaces, no special chars)
          if (/^[A-Z0-9]+$/i.test(part)) {
            courseCodeParts.push(part);
          } else {
            // Stop at first non-alphanumeric part (likely Arabic text or special characters)
            break;
          }
        }
        if (courseCodeParts.length > 0) {
          extracted = courseCodeParts.join("").toUpperCase();
        } else {
          extracted = "";
        }
        if (extracted.length >= 3) {
          return extracted;
        }
      }
      
      return "";
    };
    
    // First, check if the header row itself contains a course code (common pattern)
    const headerRow = worksheet.getRow(courseHeaderRow);
    
    // Always check column 3 first (most common location for course codes)
    // This is critical for course codes starting with numbers like "281 QURN"
    let headerCourseCode = "";
    const headerCol3 = headerRow.getCell(3).value?.toString().trim() || "";
    if (headerCol3) {
      headerCourseCode = extractCourseCode(headerCol3);
    }
    
    // If column 3 didn't work, check the identified course code column (but skip if it's column 3)
    if (!headerCourseCode && courseCodeCol > 0 && courseCodeCol !== 3) {
      const headerCourseCodeCell = headerRow.getCell(courseCodeCol);
      const headerCourseCodeValue = headerCourseCodeCell.value?.toString().trim() || "";
      if (headerCourseCodeValue) {
        headerCourseCode = extractCourseCode(headerCourseCodeValue);
      }
    }
    
    // If still no course code and courseCodeCol is 3, try column 4 as fallback
    // (sometimes course code might be in column 4 if column 3 has something else)
    if (!headerCourseCode && courseCodeCol === 3) {
      const headerCol4 = headerRow.getCell(4).value?.toString().trim() || "";
      if (headerCol4) {
        headerCourseCode = extractCourseCode(headerCol4);
      }
    }
    
    // If still no course code, check column 2 as last resort (but be careful - it might have "CS 181" etc.)
    if (!headerCourseCode) {
      const headerCol2 = headerRow.getCell(2).value?.toString().trim() || "";
      if (headerCol2) {
        // Only use column 2 if it doesn't look like a header label
        if (!headerCol2.includes("المقرر") && !headerCol2.includes("الشعبة")) {
          headerCourseCode = extractCourseCode(headerCol2);
        }
      }
    }
    
    // If we found a course code in the header row, look for its section in the next row
    if (headerCourseCode) {
      const nextRow = worksheet.getRow(courseHeaderRow + 1);
      const nextRowValue = nextRow.getCell(1).value?.toString().trim() || "";
      
      // Check if the next row is the section row (contains "الشعبة")
      if (nextRowValue.includes("الشعبة") || nextRowValue.includes("شعبة")) {
        // Get section number - always check column 3 first (most common location)
        // Then check the identified section column as fallback
        let sectionNumber = "";
        
        // Check column 3 first (standard location for section numbers)
        const col3 = nextRow.getCell(3).value?.toString().trim() || "";
        if (/^\d+$/.test(col3)) {
          sectionNumber = col3;
        }
        
        // If column 3 didn't work and we have a section column, try that
        if (!sectionNumber && classNoCol > 0) {
          const sectionCell = nextRow.getCell(classNoCol);
          const sectionValue = sectionCell.value?.toString().trim() || "";
          if (sectionValue && sectionValue !== "-" && /^\d+$/.test(sectionValue)) {
            sectionNumber = sectionValue;
          }
        }
        
        if (sectionNumber && sectionNumber !== "-" && sectionNumber !== "") {
          courses.push({
            courseCode: headerCourseCode,
            classNo: sectionNumber,
          });
        }
      }
    }
    
    // Now process rows after the header row
    for (let rowNum = courseHeaderRow + 1; rowNum <= block.endRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Skip if this is the section row (we already processed it above)
      const firstCell = row.getCell(1).value?.toString().trim() || "";
      if (firstCell.includes("الشعبة") || firstCell.includes("شعبة")) {
        continue; // Already processed above
      }
      
      // Get course code from the identified course code column
      const courseCodeCell = row.getCell(courseCodeCol);
      const courseCodeValue = courseCodeCell.value?.toString().trim() || "";
      
      // Also check adjacent columns as fallback
      const col2 = row.getCell(2).value?.toString().trim() || "";
      const col3 = row.getCell(3).value?.toString().trim() || "";
      
      let courseCode = extractCourseCode(courseCodeValue);
      
      // Fallback to columns 2-3 if course code column didn't yield a result
      if (!courseCode) {
        courseCode = extractCourseCode(col2) || extractCourseCode(col3);
      }
      
      if (courseCode) {
        // Get class number from class column (الشعبة)
        const classCell = row.getCell(classNoCol);
        const classValue = classCell.value?.toString().trim() || "";
        
        if (classValue && classValue !== "-" && classValue !== "") {
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
    } // End of student loop
  } // End of block loop

  return { validRows, errors };
}
