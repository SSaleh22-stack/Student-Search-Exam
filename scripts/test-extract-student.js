const ExcelJS = require("exceljs");
const path = require("path");

async function extractStudentExample(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    console.log("=".repeat(70));
    console.log("Extracting Student Example from Block-Structured File");
    console.log("=".repeat(70));
    console.log(`File: ${path.basename(filePath)}\n`);

    // Detect blocks
    const blocks = [];
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

    console.log(`Found ${blocks.length} blocks (courses)\n`);

    // Process first few blocks to find a student
    const studentCourses = new Map(); // studentId -> [courses]

    for (let blockIdx = 0; blockIdx < Math.min(10, blocks.length); blockIdx++) {
      const block = blocks[blockIdx];
      
      // Extract course info
      let courseCode = "";
      let courseName = "";
      let classNo = "1";
      let studentHeaderRow = block.startRow;

      // Find course code and student header
      for (let rowNum = block.startRow; rowNum <= Math.min(block.startRow + 10, block.endRow); rowNum++) {
        const row = worksheet.getRow(rowNum);
        
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          
          // Find course code (like "PHYS 202")
          if (/^[A-Z]{2,}\s*\d{3}/i.test(value) && !courseCode) {
            const parts = value.split(/\s+/);
            courseCode = (parts[0] || "").toUpperCase() + (parts[1]?.replace(/\D/g, "") || "");
          }

          // Find student header
          if (value.includes("رقم الطالب") || value.includes("Student ID")) {
            studentHeaderRow = rowNum;
          }
        }
      }

      // Find student ID column
      let studentIdCol = 0;
      const headerRow = worksheet.getRow(studentHeaderRow);
      
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = headerRow.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value.includes("رقم الطالب") || value.includes("Student ID") || value.includes("student_id")) {
          studentIdCol = col;
          break;
        }
      }

      if (!studentIdCol) {
        // Try common positions
        for (let col = 4; col <= 8; col++) {
          const cell = headerRow.getCell(col);
          const value = cell.value?.toString().trim() || "";
          if (value && (value.includes("رقم") || value.includes("ID"))) {
            studentIdCol = col;
            break;
          }
        }
      }

      // Extract students from this block
      for (let rowNum = studentHeaderRow + 1; rowNum <= block.endRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        
        let isEmpty = true;
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = row.getCell(col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            isEmpty = false;
            break;
          }
        }
        if (isEmpty) continue;

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

        if (studentId && courseCode) {
          if (!studentCourses.has(studentId)) {
            studentCourses.set(studentId, []);
          }
          studentCourses.get(studentId).push({
            courseCode,
            courseName,
            classNo,
            block: blockIdx + 1,
          });
        }
      }
    }

    // Find a student with multiple courses
    let selectedStudent = null;
    for (const [studentId, courses] of studentCourses.entries()) {
      if (courses.length > 0) {
        selectedStudent = { studentId, courses };
        break;
      }
    }

    if (selectedStudent) {
      console.log("=".repeat(70));
      console.log("EXAMPLE STUDENT EXTRACTION");
      console.log("=".repeat(70));
      console.log(`\nStudent ID: ${selectedStudent.studentId}`);
      console.log(`\nEnrolled Courses (${selectedStudent.courses.length}):`);
      console.log("-".repeat(70));
      
      selectedStudent.courses.forEach((course, idx) => {
        console.log(`\n${idx + 1}. Course Code: ${course.courseCode}`);
        if (course.courseName) {
          console.log(`   Course Name: ${course.courseName}`);
        }
        console.log(`   Class/Section: ${course.classNo}`);
        console.log(`   Block Number: ${course.block}`);
      });

      console.log("\n" + "=".repeat(70));
      console.log("JSON Format (for testing):");
      console.log("=".repeat(70));
      console.log(JSON.stringify({
        studentId: selectedStudent.studentId,
        courses: selectedStudent.courses.map(c => ({
          courseCode: c.courseCode,
          classNo: c.classNo,
        })),
      }, null, 2));

      console.log("\n" + "=".repeat(70));
      console.log("This student would be enrolled in:");
      console.log("=".repeat(70));
      selectedStudent.courses.forEach((course, idx) => {
        console.log(`${idx + 1}. ${course.courseCode} - Class ${course.classNo}`);
      });
    } else {
      console.log("No students found in first 10 blocks. Processing more blocks...");
    }

  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

const filePath = process.argv[2] || path.join(__dirname, "..", "samples", "111.xlsx");
extractStudentExample(filePath);




