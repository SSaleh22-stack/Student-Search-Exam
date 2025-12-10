const ExcelJS = require("exceljs");
const path = require("path");

async function extractStudentWithCourses() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "111.xlsx"));
  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(70));
  console.log("Extracting Student with Courses - Test Example");
  console.log("=".repeat(70));
  console.log("");

  // Find first student (9-digit ID in column 4)
  let studentFound = null;
  
  for (let rowNum = 7; rowNum <= Math.min(50, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col4 = row.getCell(4).value;
    
    let studentId = null;
    if (col4) {
      const idStr = String(col4).trim();
      // Check if it's a 9-digit student ID
      if (/^\d{9}$/.test(idStr)) {
        const studentName = row.getCell(8).value?.toString().trim() || "";
        
        studentFound = {
          studentId: idStr,
          studentName: studentName,
          row: rowNum,
          courses: []
        };
        
        console.log(`✅ Found Student:`);
        console.log(`   Student ID: ${studentFound.studentId}`);
        console.log(`   Name: ${studentFound.studentName}`);
        console.log(`   Row: ${rowNum}`);
        console.log("");
        
        // Now find courses for this student
        // Look in the same block (before next student or empty block)
        let blockEnd = worksheet.rowCount;
        
        // Find where this block ends (next student or empty section)
        for (let nextRow = rowNum + 1; nextRow <= Math.min(rowNum + 100, worksheet.rowCount); nextRow++) {
          const nextRowData = worksheet.getRow(nextRow);
          const nextCol4 = nextRowData.getCell(4).value;
          
          // Check if next student found
          if (nextCol4) {
            const nextIdStr = String(nextCol4).trim();
            if (/^\d{9}$/.test(nextIdStr)) {
              blockEnd = nextRow - 1;
              break;
            }
          }
        }
        
        console.log(`   Searching for courses in rows ${rowNum + 1} to ${blockEnd}...`);
        
        // Look for course information in this block
        // Courses are usually listed after course headers
        let foundCourseSection = false;
        
        for (let searchRow = rowNum + 1; searchRow <= blockEnd; searchRow++) {
          const searchRowData = worksheet.getRow(searchRow);
          
          // Check column 2 for course codes or course headers
          const col2 = searchRowData.getCell(2).value?.toString().trim() || "";
          const col3 = searchRowData.getCell(3).value?.toString().trim() || "";
          const col7 = searchRowData.getCell(7).value?.toString().trim() || "";
          
          // Look for course header
          if (col2.includes("رقم المقرر") || col2.includes("المقرر")) {
            foundCourseSection = true;
            console.log(`   → Found course section at row ${searchRow}`);
            continue;
          }
          
          // If we're in course section, look for course codes
          if (foundCourseSection) {
            // Course codes are usually in format like "PHYS202", "ARAB103", etc.
            const coursePatternLocal = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
            
            if (coursePatternLocal.test(col2) || coursePatternLocal.test(col3)) {
              const courseCode = (col2.match(coursePatternLocal)?.[0] || col3.match(coursePatternLocal)?.[0] || "")
                .replace(/[\s\.]+/g, "")
                .toUpperCase();
              
              const courseName = col7 || "";
              
              if (courseCode && !studentFound.courses.find(c => c.courseCode === courseCode)) {
                studentFound.courses.push({
                  courseCode: courseCode,
                  courseName: courseName.substring(0, 50),
                  classNo: "1"
                });
                console.log(`   → Course: ${courseCode} - ${courseName.substring(0, 40)}`);
              }
            }
          }
          
          // Also check if we hit the block header (course info at top)
          if (searchRow <= rowNum + 5) {
            // Check for course code in first few rows of block
            const coursePattern2 = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
            if (coursePattern2.test(col2) || coursePattern2.test(col3)) {
              const courseCode = (col2.match(coursePattern2)?.[0] || col3.match(coursePattern2)?.[0] || "")
                .replace(/[\s\.]+/g, "")
                .toUpperCase();
              
              if (courseCode && courseCode.length >= 5 && 
                  !studentFound.courses.find(c => c.courseCode === courseCode)) {
                const courseName = col7 || "";
                studentFound.courses.push({
                  courseCode: courseCode,
                  courseName: courseName.substring(0, 50),
                  classNo: "1"
                });
                console.log(`   → Course (from header): ${courseCode} - ${courseName.substring(0, 40)}`);
              }
            }
          }
        }
        
        break; // Found first student, stop
      }
    }
  }

  if (studentFound) {
    console.log("");
    console.log("=".repeat(70));
    console.log("FINAL RESULT - Test Student Extraction");
    console.log("=".repeat(70));
    console.log("");
    console.log(`Student ID: ${studentFound.studentId}`);
    console.log(`Student Name: ${studentFound.studentName}`);
    console.log(`Number of Courses: ${studentFound.courses.length}`);
    console.log("");
    
    if (studentFound.courses.length > 0) {
      console.log("Courses:");
      studentFound.courses.forEach((course, idx) => {
        console.log(`  ${idx + 1}. ${course.courseCode} - ${course.courseName || "N/A"} (Class ${course.classNo})`);
      });
    } else {
      console.log("⚠️  No courses found. The file structure may need adjustment.");
    }
    
    console.log("");
    console.log("=".repeat(70));
    console.log("JSON Format (for testing):");
    console.log("=".repeat(70));
    console.log(JSON.stringify({
      studentId: studentFound.studentId,
      studentName: studentFound.studentName,
      courses: studentFound.courses.map(c => ({
        courseCode: c.courseCode,
        classNo: c.classNo,
      })),
    }, null, 2));
    
    console.log("");
    console.log("=".repeat(70));
    console.log("This student would be enrolled in:");
    studentFound.courses.forEach((course, idx) => {
      console.log(`  ${idx + 1}. ${course.courseCode} - Class ${course.classNo}`);
    });
  } else {
    console.log("❌ No student found with 9-digit ID");
  }
}

extractStudentWithCourses().catch(console.error);

