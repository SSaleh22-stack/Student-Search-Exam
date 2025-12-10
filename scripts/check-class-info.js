const ExcelJS = require("exceljs");
const path = require("path");

async function checkClassInfo() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "111.xlsx"));
  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(70));
  console.log("Checking Class/Section (الشعبة) Information");
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

  console.log(`Student found at row ${studentRow}\n`);

  // Check rows around the student to find class/section info
  console.log("Checking rows around student for class/section (الشعبة) info:\n");
  
  for (let rowNum = Math.max(1, studentRow - 10); rowNum <= Math.min(studentRow + 30, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // Check all columns for "الشعبة" or class-related text
    let foundClassInfo = false;
    const rowData = {};
    
    for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
      const cell = row.getCell(col);
      const value = cell.value?.toString().trim() || "";
      
      if (value) {
        // Check if this cell contains class/section info
        if (value.includes("الشعبة") || value.includes("شعبة") || 
            value.includes("Class") || value.includes("Section") ||
            value.includes("الفصل") || /^[0-9]+$/.test(value)) {
          rowData[col] = value;
          foundClassInfo = true;
        }
      }
    }
    
    if (foundClassInfo || rowNum === studentRow) {
      console.log(`Row ${rowNum}:`);
      
      // Show all columns for context
      for (let col = 1; col <= Math.min(12, worksheet.columnCount); col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value) {
          const marker = rowData[col] ? " ← CLASS INFO" : "";
          console.log(`  Col ${col}: ${value.substring(0, 40)}${marker}`);
        }
      }
      console.log("");
    }
  }

  // Now check the course section to see if classes are listed with courses
  console.log("=".repeat(70));
  console.log("Checking Course Section for Class Numbers:");
  console.log("=".repeat(70));
  console.log("");

  // Find course section
  let courseHeaderRow = 0;
  for (let rowNum = studentRow + 1; rowNum <= Math.min(studentRow + 20, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col2 = row.getCell(2).value?.toString().trim() || "";
    if (col2.includes("رقم المقرر") || col2.includes("المقرر")) {
      courseHeaderRow = rowNum;
      break;
    }
  }

  if (courseHeaderRow > 0) {
    console.log(`Course header found at row ${courseHeaderRow}\n`);
    console.log("Course header row (showing all columns):");
    const headerRow = worksheet.getRow(courseHeaderRow);
    for (let col = 1; col <= Math.min(12, worksheet.columnCount); col++) {
      const cell = headerRow.getCell(col);
      const value = cell.value?.toString().trim() || "";
      if (value) {
        console.log(`  Col ${col}: ${value}`);
      }
    }
    console.log("");

    // Check first few course rows
    console.log("First 3 course rows (checking for class numbers):");
    let courseCount = 0;
    for (let rowNum = courseHeaderRow + 1; rowNum <= Math.min(courseHeaderRow + 10, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const col2 = row.getCell(2).value?.toString().trim() || "";
      const col3 = row.getCell(3).value?.toString().trim() || "";
      
      // Check if this is a course code row
      const coursePattern = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
      if (coursePattern.test(col2) || coursePattern.test(col3)) {
        courseCount++;
        console.log(`\nCourse ${courseCount} (Row ${rowNum}):`);
        
        // Show all columns to find class number
        for (let col = 1; col <= Math.min(12, worksheet.columnCount); col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          if (value) {
            // Highlight potential class numbers
            const isClassNum = /^[0-9]+$/.test(value) && parseInt(value) > 0 && parseInt(value) < 100;
            const marker = isClassNum ? " ← POSSIBLE CLASS NUMBER" : "";
            console.log(`  Col ${col}: ${value.substring(0, 40)}${marker}`);
          }
        }
        
        if (courseCount >= 3) break;
      }
    }
  }
}

checkClassInfo().catch(console.error);



