const ExcelJS = require("exceljs");
const path = require("path");

async function analyzeEnrollFile() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "1.xlsx"));
  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(70));
  console.log("ENROLLMENT FILE ANALYSIS (1.xlsx)");
  console.log("=".repeat(70));
  console.log("");

  // Check total rows and columns
  console.log(`Total Rows: ${worksheet.rowCount}`);
  console.log(`Total Columns: ${worksheet.columnCount}`);
  console.log("");

  // Analyze first 50 rows to understand structure
  console.log("=".repeat(70));
  console.log("FIRST 50 ROWS ANALYSIS:");
  console.log("=".repeat(70));
  console.log("");

  for (let rowNum = 1; rowNum <= Math.min(50, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    console.log(`Row ${rowNum}:`);
    
    let hasData = false;
    const rowData = [];
    
    for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
      const cell = row.getCell(col);
      const value = cell.value;
      
      if (value !== null && value !== undefined && value !== "") {
        hasData = true;
        let displayValue = "";
        
        if (value instanceof Date) {
          displayValue = `[Date] ${value.toISOString()}`;
        } else if (typeof value === "number") {
          displayValue = `[Number] ${value}`;
        } else {
          displayValue = `[String] "${String(value)}"`;
        }
        
        rowData.push(`Col ${col}: ${displayValue}`);
      }
    }
    
    if (hasData) {
      console.log("  " + rowData.join(" | "));
    } else {
      console.log("  (empty row)");
    }
    console.log("");
  }

  // Look for patterns: course codes, section numbers (الشعبة), student IDs
  console.log("=".repeat(70));
  console.log("PATTERN ANALYSIS:");
  console.log("=".repeat(70));
  console.log("");

  let courseCodePattern = /^[A-Z]{2,}\s*\d{2,}/i;
  let sectionPattern = /الشعبة|شعبة|شعب/i;
  let studentIdPattern = /^\d{9}$/;

  let currentCourse = "";
  let currentSection = "";
  let studentsInSection = [];

  for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    
    // Check each column
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      const value = String(cell.value || "").trim();
      
      // Check for course code
      if (courseCodePattern.test(value)) {
        currentCourse = value.replace(/\s+/g, " ").toUpperCase();
        console.log(`Row ${rowNum}, Col ${col}: Found Course Code: "${currentCourse}"`);
      }
      
      // Check for section header
      if (sectionPattern.test(value)) {
        // Next cell might be the section number
        const nextCell = row.getCell(col + 1);
        const nextValue = String(nextCell.value || "").trim();
        if (nextValue) {
          currentSection = nextValue;
          console.log(`Row ${rowNum}, Col ${col}: Found Section Header, Col ${col + 1}: Section Number = "${currentSection}"`);
        }
      }
      
      // Check for student ID (9 digits)
      if (studentIdPattern.test(value)) {
        studentsInSection.push({
          row: rowNum,
          col: col,
          studentId: value,
          course: currentCourse,
          section: currentSection
        });
      }
    }
  }

  console.log("");
  console.log("=".repeat(70));
  console.log("STUDENT ENROLLMENTS FOUND:");
  console.log("=".repeat(70));
  console.log("");

  // Group by course and section
  const enrollments = {};
  studentsInSection.forEach(s => {
    const key = `${s.course}_${s.section}`;
    if (!enrollments[key]) {
      enrollments[key] = {
        course: s.course,
        section: s.section,
        students: []
      };
    }
    enrollments[key].students.push(s.studentId);
  });

  Object.keys(enrollments).slice(0, 10).forEach(key => {
    const e = enrollments[key];
    console.log(`Course: ${e.course}, Section: ${e.section}, Students: ${e.students.length}`);
    console.log(`  Student IDs: ${e.students.slice(0, 5).join(", ")}${e.students.length > 5 ? "..." : ""}`);
    console.log("");
  });

  console.log(`Total unique course-section combinations: ${Object.keys(enrollments).length}`);
  console.log(`Total students found: ${studentsInSection.length}`);
}

analyzeEnrollFile().catch(console.error);




