import ExcelJS from "exceljs";

export interface FileStructure {
  isBlockStructure: boolean;
  isSectionStructure?: boolean; // Course-section organized structure (like 1.xlsx)
  blockCount?: number;
  hasHeaders: boolean;
  estimatedRows: number;
}

export async function detectFileStructure(
  file: File | Buffer
): Promise<FileStructure> {
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

  // Count empty rows
  let emptyRowCount = 0;
  let blockStarts: number[] = [1];
  let dataRowCount = 0;

  for (let rowNum = 1; rowNum <= Math.min(100, worksheet.rowCount); rowNum++) {
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

    if (hasData) {
      dataRowCount++;
      // Check if this might be a new block start
      if (rowNum > 1) {
        const prevRow = worksheet.getRow(rowNum - 1);
        let prevEmpty = true;
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = prevRow.getCell(col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            prevEmpty = false;
            break;
          }
        }
        if (prevEmpty && rowNum > 2) {
          blockStarts.push(rowNum);
        }
      }
    } else {
      emptyRowCount++;
    }
  }

  // Check if first row has headers (all text, no numbers)
  let hasHeaders = false;
  const firstRow = worksheet.getRow(1);
  let headerCellCount = 0;
  for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
    const cell = firstRow.getCell(col);
    const value = cell.value?.toString().trim() || "";
    if (value && value.length > 0) {
      headerCellCount++;
      // Check if it looks like a header (text, not a number)
      if (isNaN(parseFloat(value))) {
        hasHeaders = true;
      }
    }
  }

  // Check if it's a course-section structure (like 1.xlsx)
  // Look for patterns: "المقرر:" followed by course code, "الشعبة:" followed by section number
  let courseCount = 0;
  let sectionCount = 0;
  const coursePattern = /^[A-Z]{2,}\s*\d{2,}/i;
  const sectionHeaderPattern = /الشعبة|شعبة/i;
  const courseHeaderPattern = /المقرر/i;
  
  // Check first 200 rows for better detection
  for (let rowNum = 1; rowNum <= Math.min(200, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      const value = String(cell.value || "").trim();
      
      // Check for course header "المقرر:" followed by course code
      if (courseHeaderPattern.test(value) && (value.includes(":") || col < worksheet.columnCount)) {
        // Check next few columns for course code
        for (let nextCol = col + 1; nextCol <= Math.min(col + 5, worksheet.columnCount); nextCol++) {
          const nextCell = row.getCell(nextCol);
          const nextValue = String(nextCell.value || "").trim();
          if (coursePattern.test(nextValue)) {
            courseCount++;
            break;
          }
        }
      }
      
      // Check for section header "الشعبة:" followed by section number
      if (sectionHeaderPattern.test(value) && (value.includes(":") || col < worksheet.columnCount)) {
        // Check next few columns for section number
        for (let nextCol = col + 1; nextCol <= Math.min(col + 5, worksheet.columnCount); nextCol++) {
          const nextCell = row.getCell(nextCol);
          const nextValue = String(nextCell.value || "").trim();
          // Section number is usually a number (not text like "انتظام")
          if (/^\d+$/.test(nextValue)) {
            sectionCount++;
            break;
          }
        }
      }
    }
  }

  // Determine if it's block structure
  // If we have many empty rows and multiple block starts, it's likely block-structured
  const isEmptyRatio = emptyRowCount / Math.min(100, worksheet.rowCount);
  const isBlockStructure = blockStarts.length > 3 && isEmptyRatio > 0.1;

  // If we found multiple course and section patterns, it's likely a section-structured file
  // Need at least 2 of each to be confident
  const isSectionStructure = courseCount >= 2 && sectionCount >= 2;

  return {
    isBlockStructure: isBlockStructure && !isSectionStructure, // Don't mark as block if it's section-structured
    isSectionStructure: isSectionStructure,
    blockCount: isBlockStructure ? blockStarts.length : undefined,
    hasHeaders: hasHeaders || headerCellCount > 0,
    estimatedRows: dataRowCount,
  };
}

