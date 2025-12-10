const ExcelJS = require("exceljs");
const path = require("path");

async function extractSampleStudents(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    console.log("=".repeat(60));
    console.log("Extracting Sample Students and Courses");
    console.log("=".repeat(60));
    console.log("");

    const students = [];
    let currentStudent = null;
    let inStudentBlock = false;
    let studentHeaderFound = false;

    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
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

      if (!hasData) {
        // Empty row - end current student block
        if (currentStudent && currentStudent.courses.length > 0) {
          students.push(currentStudent);
          console.log(`\n✓ Completed student: ${currentStudent.studentId} (${currentStudent.courses.length} courses)`);
          
          if (students.length >= 3) {
            break;
          }
        }
        currentStudent = null;
        inStudentBlock = false;
        studentHeaderFound = false;
        continue;
      }

      // Check for student header row (contains "رقم الطالب")
      const col4 = row.getCell(4).value?.toString().trim() || "";
      const col8 = row.getCell(8).value?.toString().trim() || "";
      
      if (col4.includes("رقم الطالب") || col8.includes("اسم الطالب")) {
        studentHeaderFound = true;
        inStudentBlock = true;
        console.log(`\n📋 Found student header at row ${rowNum}`);
        continue;
      }

      // If we just found the header, next row should be student data
      if (studentHeaderFound && !currentStudent) {
        const studentId = row.getCell(4).value?.toString().trim() || "";
        const studentName = row.getCell(8).value?.toString().trim() || "";
        
        console.log(`   Checking row ${rowNum}: ID="${studentId}", Name="${studentName.substring(0, 30)}..."`);
        
        if (studentId && studentId.length >= 4) {
          // Check if it's numeric (student ID) or alphanumeric
          if (/^\d+$/.test(studentId) || /^[A-Z0-9]+$/i.test(studentId)) {
            currentStudent = {
              studentId: studentId,
              studentName: studentName || "N/A",
              courses: []
            };
            console.log(`\n👤 Found Student: ${studentId}`);
            console.log(`   Name: ${studentName || "N/A"}`);
            studentHeaderFound = false; // Reset for next iteration
            continue;
          }
        }
      }

      // If we're in a student block and have a student, look for courses
      if (currentStudent && inStudentBlock) {
        // Course codes are usually in column 2
        const courseCodeCell = row.getCell(2).value?.toString().trim() || "";
        const courseNameCell = row.getCell(7).value?.toString().trim() || "";
        
        // Check if this looks like a course code (format: "PHYS 202", "ARAB103", etc.)
        if (courseCodeCell && /^[A-Z]{2,}\s*\d{2,}/i.test(courseCodeCell)) {
          // Clean course code (remove spaces, keep only letters and numbers)
          const cleanCode = courseCodeCell.replace(/\s+/g, "").toUpperCase();
          
          // Check if we already have this course
          if (!currentStudent.courses.find(c => c.courseCode === cleanCode)) {
            currentStudent.courses.push({
              courseCode: cleanCode,
              courseName: courseNameCell || "N/A"
            });
            console.log(`   → Course: ${cleanCode} - ${courseNameCell || "N/A"}`);
          }
        }
      }
    }

    // Add last student if exists
    if (currentStudent && currentStudent.courses.length > 0) {
      students.push(currentStudent);
    }

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("SAMPLE STUDENTS AND THEIR COURSES");
    console.log("=".repeat(60));
    
    students.slice(0, 3).forEach((student, index) => {
      console.log(`\n👤 Student ${index + 1}:`);
      console.log(`   Student ID: ${student.studentId}`);
      console.log(`   Student Name: ${student.studentName}`);
      console.log(`   Number of Courses: ${student.courses.length}`);
      console.log(`   Courses:`);
      student.courses.forEach((course, cIndex) => {
        console.log(`      ${cIndex + 1}. ${course.courseCode} - ${course.courseName}`);
      });
    });

    console.log("\n" + "=".repeat(60));
    console.log("Summary:");
    console.log(`Total students found: ${students.length}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error extracting students:", error.message);
    process.exit(1);
  }
}

const filePath = process.argv[2] || path.join(__dirname, "..", "samples", "111.xlsx");
extractSampleStudents(filePath);

