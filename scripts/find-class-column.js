const ExcelJS = require("exceljs");
const path = require("path");

async function findClassColumn() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "111.xlsx"));
  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(70));
  console.log("Finding Class/Section (شعب) Column");
  console.log("=".repeat(70));
  console.log("");

  // Find student 381117620
  let studentRow = 0;
  for (let rowNum = 7; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col4 = row.getCell(4).value;
    if (col4 && String(col4).trim() === "381117620") {
      studentRow = rowNum;
      break;
    }
  }

  if (studentRow === 0) {
    console.log("Student not found");
    return;
  }

  // Find course header row
  let courseHeaderRow = 0;
  for (let rowNum = studentRow + 1; rowNum <= Math.min(studentRow + 20, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col2 = row.getCell(2).value?.toString().trim() || "";
    if (col2.includes("رقم المقرر") || col2.includes("المقرر")) {
      courseHeaderRow = rowNum;
      break;
    }
  }

  if (courseHeaderRow === 0) {
    console.log("Course header not found");
    return;
  }

  console.log(`Course header row: ${courseHeaderRow}\n`);
  console.log("Course Header Row - ALL COLUMNS:");
  console.log("-".repeat(70));
  const headerRow = worksheet.getRow(courseHeaderRow);
  for (let col = 1; col <= Math.min(20, worksheet.columnCount); col++) {
    const cell = headerRow.getCell(col);
    const value = cell.value?.toString().trim() || "";
    if (value) {
      console.log(`  Col ${col}: "${value}"`);
      
      // Check if it contains "شعب" or "شعبة" or "section" or "class"
      if (value.includes("شعب") || value.includes("شعبة") || 
          value.includes("Section") || value.includes("Class") ||
          value.includes("الفصل") || value.toLowerCase().includes("section")) {
        console.log(`     ⭐ THIS LOOKS LIKE CLASS/SECTION COLUMN!`);
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("First 5 Course Rows - Checking for Class Numbers:");
  console.log("=".repeat(70));
  console.log("");

  let courseCount = 0;
  for (let rowNum = courseHeaderRow + 1; rowNum <= Math.min(courseHeaderRow + 20, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col2 = row.getCell(2).value?.toString().trim() || "";
    const col3 = row.getCell(3).value?.toString().trim() || "";
    
    const coursePattern = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
    if (coursePattern.test(col2) || coursePattern.test(col3)) {
      courseCount++;
      const courseCode = (col2.match(coursePattern)?.[0] || col3.match(coursePattern)?.[0] || "")
        .replace(/[\s\.]+/g, "")
        .toUpperCase();
      
      console.log(`Course ${courseCount}: ${courseCode} (Row ${rowNum})`);
      console.log("-".repeat(70));
      
      // Show all columns for this course
      for (let col = 1; col <= Math.min(20, worksheet.columnCount); col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value) {
          // Check if it's a class number (single digit or small number)
          const isClassNum = /^[0-9]+$/.test(value) && parseInt(value) > 0 && parseInt(value) < 100;
          const marker = isClassNum ? " ⭐ POSSIBLE CLASS NUMBER" : "";
          console.log(`  Col ${col}: "${value}"${marker}`);
        }
      }
      console.log("");
      
      if (courseCount >= 5) break;
    }
  }

  // Also check if there's a "شعب" column header
  console.log("=".repeat(70));
  console.log("Searching for 'شعب' or 'شعبة' in headers:");
  console.log("=".repeat(70));
  
  for (let rowNum = studentRow; rowNum <= Math.min(studentRow + 15, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    for (let col = 1; col <= Math.min(20, worksheet.columnCount); col++) {
      const cell = row.getCell(col);
      const value = cell.value?.toString().trim() || "";
      if (value.includes("شعب") || value.includes("شعبة")) {
        console.log(`Found at Row ${rowNum}, Column ${col}: "${value}"`);
      }
    }
  }
}

findClassColumn().catch(console.error);




