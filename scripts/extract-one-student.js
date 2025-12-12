const ExcelJS = require("exceljs");
const path = require("path");

async function extractOneStudent(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    console.log("=".repeat(70));
    console.log("Extracting One Student Example");
    console.log("=".repeat(70));
    console.log(`File: ${path.basename(filePath)}\n`);

    // Find first block and extract a real student
    let blockStart = 1;
    let blockEnd = worksheet.rowCount;
    
    // Find first empty row to determine block end
    for (let rowNum = 1; rowNum <= Math.min(100, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      let isEmpty = true;
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty && rowNum > 10) {
        blockEnd = rowNum - 1;
        break;
      }
    }

    console.log(`Analyzing first block (rows 1-${blockEnd})\n`);

    // Find student header row (contains "رقم الطالب")
    let studentHeaderRow = 0;
    let studentIdCol = 0;
    let studentNameCol = 0;

    for (let rowNum = 1; rowNum <= Math.min(20, blockEnd); rowNum++) {
      const row = worksheet.getRow(rowNum);
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        
        if (value.includes("رقم الطالب") || value.includes("Student ID")) {
          studentHeaderRow = rowNum;
          studentIdCol = col;
          
          // Find student name column (usually next to ID)
          for (let c = col + 1; c <= Math.min(col + 3, worksheet.columnCount); c++) {
            const nameCell = row.getCell(c);
            const nameValue = nameCell.value?.toString().trim() || "";
            if (nameValue.includes("اسم") || nameValue.includes("Name") || nameValue.includes("الطالب")) {
              studentNameCol = c;
              break;
            }
          }
          break;
        }
      }
      if (studentHeaderRow > 0) break;
    }

    if (studentHeaderRow === 0) {
      console.log("Could not find student header row. Trying alternative detection...");
      // Try to find by pattern - look for row with numbers in columns 4-8
      for (let rowNum = 5; rowNum <= Math.min(15, blockEnd); rowNum++) {
        const row = worksheet.getRow(rowNum);
        let hasNumericValues = 0;
        for (let col = 4; col <= 8; col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          if (/^\d+$/.test(value)) {
            hasNumericValues++;
          }
        }
        if (hasNumericValues >= 2) {
          studentHeaderRow = rowNum - 1;
          studentIdCol = 4; // Common position
          studentNameCol = 5;
          break;
        }
      }
    }

    console.log(`Student Header Row: ${studentHeaderRow}`);
    console.log(`Student ID Column: ${studentIdCol}`);
    console.log(`Student Name Column: ${studentNameCol}\n`);

    // Extract course info
    let courseCode = "";
    let courseName = "";
    
    for (let rowNum = 1; rowNum <= Math.min(10, studentHeaderRow); rowNum++) {
      const row = worksheet.getRow(rowNum);
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        
        // Find course code (like "PHYS 202" or "PHYS202")
        if (/^[A-Z]{2,}\s*\d{3}/i.test(value) && !courseCode) {
          const parts = value.split(/\s+/);
          courseCode = (parts[0] || "").toUpperCase() + (parts[1]?.replace(/\D/g, "") || "");
        }
        
        // Find course name (longer text, not a label)
        if (value.length > 10 && !courseName && !value.includes(":") && 
            !value.match(/^(المقر|الكلية|القسم|المقرر|رقم|اسم)/)) {
          courseName = value;
        }
      }
    }

    console.log(`Course Code: ${courseCode}`);
    console.log(`Course Name: ${courseName || "(not found)"}\n`);

    // Extract first few students
    const students = [];
    for (let rowNum = studentHeaderRow + 1; rowNum <= Math.min(studentHeaderRow + 10, blockEnd); rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Check if row has data
      let hasData = false;
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
          hasData = true;
          break;
        }
      }
      if (!hasData) continue;

      // Get student ID
      let studentId = "";
      if (studentIdCol > 0) {
        const cell = row.getCell(studentIdCol);
        studentId = cell.value?.toString().trim() || "";
      } else {
        // Try columns 4-8
        for (let col = 4; col <= 8; col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          if (value && /^[A-Z0-9]+$/i.test(value.replace(/\s/g, ""))) {
            studentId = value;
            break;
          }
        }
      }

      // Get student name
      let studentName = "";
      if (studentNameCol > 0) {
        const cell = row.getCell(studentNameCol);
        studentName = cell.value?.toString().trim() || "";
      }

      // Only add if we have a valid student ID (not course code)
      if (studentId && studentId !== courseCode && !studentId.includes("PHYS") && !studentId.includes("202")) {
        students.push({ studentId, studentName, row: rowNum });
      }
    }

    if (students.length === 0) {
      console.log("No students found. Showing raw data from first data rows:\n");
      for (let rowNum = studentHeaderRow + 1; rowNum <= Math.min(studentHeaderRow + 5, blockEnd); rowNum++) {
        const row = worksheet.getRow(rowNum);
        console.log(`Row ${rowNum}:`);
        for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          if (value) {
            console.log(`  Col ${col}: ${value.substring(0, 50)}`);
          }
        }
        console.log("");
      }
    } else {
      // Show first student
      const student = students[0];
      console.log("=".repeat(70));
      console.log("EXAMPLE STUDENT EXTRACTION");
      console.log("=".repeat(70));
      console.log(`\nStudent ID: ${student.studentId}`);
      if (student.studentName) {
        console.log(`Student Name: ${student.studentName}`);
      }
      console.log(`\nEnrolled in:`);
      console.log(`  Course Code: ${courseCode}`);
      if (courseName) {
        console.log(`  Course Name: ${courseName}`);
      }
      console.log(`  Class/Section: 1`);

      console.log("\n" + "=".repeat(70));
      console.log("JSON Format:");
      console.log("=".repeat(70));
      console.log(JSON.stringify({
        studentId: student.studentId,
        studentName: student.studentName || "",
        courses: [{
          courseCode: courseCode,
          classNo: "1",
        }],
      }, null, 2));
    }

  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const filePath = process.argv[2] || path.join(__dirname, "..", "samples", "111.xlsx");
extractOneStudent(filePath);






