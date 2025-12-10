const ExcelJS = require("exceljs");
const path = require("path");

async function extract() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "111.xlsx"));
  const worksheet = workbook.worksheets[0];

  const students = [];
  let currentStudent = null;

  for (let rowNum = 7; rowNum <= Math.min(100, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col4 = row.getCell(4).value;
    const col8 = row.getCell(8).value;
    
    // Check if this is a student ID row (could be string or number)
    let studentId = null;
    if (col4) {
      if (typeof col4 === 'number') {
        studentId = col4.toString();
      } else if (typeof col4 === 'string') {
        studentId = col4.trim();
      } else {
        studentId = String(col4).trim();
      }
    }
    
    // Check if it looks like a student ID (9 digits)
    if (studentId && /^\d{9}$/.test(studentId)) {
      const studentName = col8 ? String(col8).trim() : "N/A";
      
      currentStudent = {
        studentId: studentId,
        studentName: studentName,
        courses: []
      };
      students.push(currentStudent);
      console.log(`\n👤 Student: ${studentId} - ${studentName.substring(0, 40)}`);
      
      // Look ahead for courses (skip empty row after student, then find course header, then courses)
      let foundCourseHeader = false;
      for (let nextRow = rowNum + 1; nextRow <= Math.min(rowNum + 25, worksheet.rowCount); nextRow++) {
        const nextRowData = worksheet.getRow(nextRow);
        
        // Check if empty row
        let isEmpty = true;
        for (let c = 1; c <= 12; c++) {
          const cellVal = nextRowData.getCell(c).value;
          if (cellVal !== null && cellVal !== undefined && cellVal !== "") {
            isEmpty = false;
            break;
          }
        }
        
        // If we found course header before, and now empty row, we're done with this student
        if (foundCourseHeader && isEmpty) {
          break;
        }
        
        if (isEmpty) continue;
        
        // Check if this is course header row (contains "رقم المقرر" in column 2)
        const col2 = nextRowData.getCell(2).value;
        const col2Str = col2 ? String(col2).trim() : "";
        
        // Check multiple ways for the header text
        if (col2Str && (col2Str.includes("رقم المقرر") || col2Str.includes("المقرر") || col2Str.includes("مقرر"))) {
          foundCourseHeader = true;
          console.log(`   Found course header at row ${nextRow}: "${col2Str.substring(0, 20)}"`);
          continue;
        }
        
        // If we found header, next non-empty rows are courses
        if (foundCourseHeader) {
          const courseCode = nextRowData.getCell(2).value?.toString().trim() || "";
          
          // Check if it's a course code (format like "ARAB103", "PHYS 202", "ENG 103", etc.)
          if (courseCode && /^[A-Z]{2,}[\s\.]*\d{2,}/i.test(courseCode)) {
            // Clean course code (remove spaces and dots)
            const cleanCode = courseCode.replace(/[\s\.]+/g, "").toUpperCase();
            const courseName = nextRowData.getCell(7).value?.toString().trim() || "";
            
            // Avoid duplicates
            if (!currentStudent.courses.find(c => c.courseCode === cleanCode)) {
              currentStudent.courses.push({
                courseCode: cleanCode,
                courseName: courseName || "N/A"
              });
              console.log(`   → ${cleanCode} - ${(courseName || "N/A").substring(0, 40)}`);
            }
          }
        }
      }
      
      if (students.length >= 3) break;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY - 3 Sample Students:");
  console.log("=".repeat(60));
  
  students.slice(0, 3).forEach((s, i) => {
    console.log(`\n${i + 1}. Student ID: ${s.studentId}`);
    console.log(`   Name: ${s.studentName}`);
    console.log(`   Courses (${s.courses.length}):`);
    s.courses.forEach((c, ci) => {
      console.log(`      ${ci + 1}. ${c.courseCode} - ${c.courseName}`);
    });
  });
}

extract().catch(console.error);

