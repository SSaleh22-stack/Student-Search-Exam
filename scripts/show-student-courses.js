const ExcelJS = require("exceljs");
const path = require("path");

async function showStudentCourses() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "111.xlsx"));
  const worksheet = workbook.worksheets[0];

  // Find student 381117620
  let studentFound = null;
  
  for (let rowNum = 7; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col4 = row.getCell(4).value;
    
    if (col4) {
      const idStr = String(col4).trim();
      if (idStr === "381117620") {
        const studentName = row.getCell(8).value?.toString().trim() || "";
        
        studentFound = {
          studentId: idStr,
          studentName: studentName,
          row: rowNum,
          courses: []
        };
        
        // Find courses for this student
        let blockEnd = worksheet.rowCount;
        
        // Find where this block ends
        for (let nextRow = rowNum + 1; nextRow <= Math.min(rowNum + 100, worksheet.rowCount); nextRow++) {
          const nextRowData = worksheet.getRow(nextRow);
          const nextCol4 = nextRowData.getCell(4).value;
          
          if (nextCol4) {
            const nextIdStr = String(nextCol4).trim();
            if (/^\d{9}$/.test(nextIdStr)) {
              blockEnd = nextRow - 1;
              break;
            }
          }
        }
        
        // Look for courses
        let foundCourseSection = false;
        
        for (let searchRow = rowNum + 1; searchRow <= blockEnd; searchRow++) {
          const searchRowData = worksheet.getRow(searchRow);
          const col2 = searchRowData.getCell(2).value?.toString().trim() || "";
          const col3 = searchRowData.getCell(3).value?.toString().trim() || "";
          const col7 = searchRowData.getCell(7).value?.toString().trim() || "";
          
          // Look for course header
          if (col2.includes("رقم المقرر") || col2.includes("المقرر")) {
            foundCourseSection = true;
            continue;
          }
          
          // If we're in course section, look for course codes
          if (foundCourseSection) {
            const coursePattern = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
            
            if (coursePattern.test(col2) || coursePattern.test(col3)) {
              const courseCode = (col2.match(coursePattern)?.[0] || col3.match(coursePattern)?.[0] || "")
                .replace(/[\s\.]+/g, "")
                .toUpperCase();
              
              const courseName = col7 || "";
              
              if (courseCode && !studentFound.courses.find(c => c.courseCode === courseCode)) {
                studentFound.courses.push({
                  courseCode: courseCode,
                  courseName: courseName,
                  classNo: "1"
                });
              }
            }
          }
        }
        
        break;
      }
    }
  }

  if (studentFound) {
    console.log("=".repeat(70));
    console.log(`STUDENT: ${studentFound.studentId}`);
    console.log(`NAME: ${studentFound.studentName}`);
    console.log("=".repeat(70));
    console.log("");
    console.log(`COURSES (${studentFound.courses.length}):`);
    console.log("-".repeat(70));
    console.log("");
    
    studentFound.courses.forEach((course, idx) => {
      console.log(`${idx + 1}. ${course.courseCode}`);
      console.log(`   ${course.courseName}`);
      console.log(`   Class: ${course.classNo}`);
      console.log("");
    });
    
    console.log("=".repeat(70));
    console.log("SUMMARY:");
    console.log("=".repeat(70));
    console.log(`Total Courses: ${studentFound.courses.length}`);
    console.log("");
    console.log("Course Codes:");
    studentFound.courses.forEach((course, idx) => {
      console.log(`  ${idx + 1}. ${course.courseCode}`);
    });
  } else {
    console.log("Student 381117620 not found");
  }
}

showStudentCourses().catch(console.error);






