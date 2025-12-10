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
    let currentCourse = null;
    let studentHeaderRow = null;
    let studentIdCol = 0;

    // Process rows to find blocks and extract data
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Check if row has data
      let hasData = false;
      const rowData = {};
      
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value) {
          hasData = true;
          rowData[`col${col}`] = value;
        }
      }

      if (!hasData) {
        // Empty row - might be block separator
        currentCourse = null;
        studentHeaderRow = null;
        studentIdCol = 0;
        continue;
      }

      // Look for course information (usually in first few columns of a block)
      if (!currentCourse) {
        // Check if this looks like a course block start
        const courseInfo = {
          courseCode: "",
          courseName: "",
          location: "",
          college: "",
          department: "",
        };

        // Check first 10 columns for course info
        for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          
          // Look for course code pattern (like "PHYS 202" or "PHYS202")
          if (/^[A-Z]{2,}\s*\d{3}/i.test(value)) {
            const parts = value.split(/\s+/);
            courseInfo.courseCode = (parts[0] || "").toUpperCase() + (parts[1]?.replace(/\D/g, "") || "");
          }
          
          // Look for location (مقر)
          if (value.includes("مقر") && col < 5) {
            // Next column might have location value
            const nextCell = row.getCell(col + 1);
            const nextValue = nextCell.value?.toString().trim() || "";
            if (nextValue && nextValue.length > 3) {
              courseInfo.location = nextValue;
            }
          }
          
          // Look for college (كلية)
          if (value.includes("كلية") && col < 5) {
            const nextCell = row.getCell(col + 1);
            const nextValue = nextCell.value?.toString().trim() || "";
            if (nextValue) {
              courseInfo.college = nextValue;
            }
          }
          
          // Look for department (قسم)
          if (value.includes("قسم") && col < 5) {
            const nextCell = row.getCell(col + 1);
            const nextValue = nextCell.value?.toString().trim() || "";
            if (nextValue) {
              courseInfo.department = nextValue;
            }
          }
          
          // Look for course name (مقرر)
          if (value.includes("مقرر") && col < 5) {
            const nextCell = row.getCell(col + 1);
            const nextValue = nextCell.value?.toString().trim() || "";
            if (nextValue && nextValue.length > 3) {
              courseInfo.courseName = nextValue;
            }
          }
        }

        // If we found course code, this is a new course block
        if (courseInfo.courseCode) {
          currentCourse = courseInfo;
          console.log(`\n📚 Found Course Block:`);
          console.log(`   Course Code: ${courseInfo.courseCode}`);
          console.log(`   Course Name: ${courseInfo.courseName || "N/A"}`);
          console.log(`   Department: ${courseInfo.department || "N/A"}`);
          console.log(`   College: ${courseInfo.college || "N/A"}`);
          console.log(`   Location: ${courseInfo.location || "N/A"}`);
        }
      }

      // Look for student header row (contains "رقم الطالب" or student ID)
      if (currentCourse && !studentHeaderRow) {
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          
          if (value.includes("رقم الطالب") || value.includes("Student ID") || value.toLowerCase().includes("student_id")) {
            studentHeaderRow = rowNum;
            studentIdCol = col;
            console.log(`   Student header found at row ${rowNum}, column ${col}`);
            break;
          }
        }
        
        // If not found, try common positions
        if (!studentHeaderRow) {
          for (let col = 4; col <= 8; col++) {
            const cell = row.getCell(col);
            const value = cell.value?.toString().trim() || "";
            if (value && (value.includes("رقم") || value.includes("ID"))) {
              studentHeaderRow = rowNum;
              studentIdCol = col;
              break;
            }
          }
        }
      }

      // Extract student data (after header row)
      if (currentCourse && studentHeaderRow && rowNum > studentHeaderRow) {
        // Check if this row has student data
        let studentId = "";
        let studentName = "";
        
        // Try to find student ID in this row - check all columns
        for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
          const cell = row.getCell(col);
          const value = cell.value?.toString().trim() || "";
          
          // Check if it looks like a student ID (numeric or alphanumeric, 4+ characters)
          if (value && value.length >= 4) {
            // Remove spaces and check if it's alphanumeric
            const cleanValue = value.replace(/\s/g, "");
            if (/^[A-Z0-9]+$/i.test(cleanValue) && cleanValue.length >= 4) {
              // Check if it's not a header label
              if (!value.includes("رقم") && !value.includes("اسم") && !value.includes("ID") && 
                  !value.includes("Student") && !value.includes("Name")) {
                studentId = cleanValue;
                studentIdCol = col;
                
                // Try to get name from next column
                if (col < worksheet.columnCount) {
                  const nameCell = row.getCell(col + 1);
                  const nameValue = nameCell.value?.toString().trim() || "";
                  if (nameValue && nameValue.length > 2 && !/^[A-Z0-9]+$/i.test(nameValue.replace(/\s/g, ""))) {
                    studentName = nameValue;
                  }
                }
                break;
              }
            }
          }
        }

        // If we found a valid student ID, add to list
        if (studentId && studentId.length >= 4) {
          // Check if we already have this student
          let existingStudent = students.find(s => s.studentId === studentId);
          
          if (!existingStudent) {
            existingStudent = {
              studentId: studentId,
              studentName: studentName || "N/A",
              courses: []
            };
            students.push(existingStudent);
            console.log(`   ✓ Found student: ${studentId} (${studentName || "N/A"})`);
          }
          
          // Add course if not already added
          if (!existingStudent.courses.find(c => c.courseCode === currentCourse.courseCode)) {
            existingStudent.courses.push({
              courseCode: currentCourse.courseCode,
              courseName: currentCourse.courseName,
              department: currentCourse.department,
              college: currentCourse.college,
            });
            console.log(`      → Enrolled in: ${currentCourse.courseCode}`);
          }

          // Stop after finding 3 students with at least 1 course each
          if (students.length >= 3 && students.every(s => s.courses.length > 0)) {
            console.log("\n   ✓ Found 3 students with courses. Stopping extraction...");
            break;
          }
        }
      }
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
        console.log(`      ${cIndex + 1}. ${course.courseCode} - ${course.courseName || "N/A"}`);
        if (course.department) {
          console.log(`         Department: ${course.department}`);
        }
        if (course.college) {
          console.log(`         College: ${course.college}`);
        }
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

