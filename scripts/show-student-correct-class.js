const ExcelJS = require("exceljs");
const path = require("path");

async function showStudentWithCorrectClass() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "111.xlsx"));
  const worksheet = workbook.worksheets[0];

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
  let classNoCol = 0;
  for (let rowNum = studentRow + 1; rowNum <= Math.min(studentRow + 20, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col2 = row.getCell(2).value?.toString().trim() || "";
    if (col2.includes("رقم المقرر") || col2.includes("المقرر")) {
      courseHeaderRow = rowNum;
      // Find class column
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString().trim() || "";
        if (value.includes("الشعبة") || value.includes("شعبة") || value.includes("شعب")) {
          classNoCol = col;
          break;
        }
      }
      break;
    }
  }

  console.log("=".repeat(70));
  console.log(`STUDENT: 381117620`);
  console.log(`NAME: ${worksheet.getRow(studentRow).getCell(8).value?.toString().trim() || ""}`);
  console.log("=".repeat(70));
  console.log("");
  console.log(`Class/Section Column (الشعبة): Column ${classNoCol}`);
  console.log("");

  // Extract courses with their class numbers
  const courses = [];
  let foundCourseSection = false;

  for (let rowNum = courseHeaderRow; rowNum <= Math.min(studentRow + 30, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const col2 = row.getCell(2).value?.toString().trim() || "";
    
    if (col2.includes("رقم المقرر") || col2.includes("المقرر")) {
      foundCourseSection = true;
      continue;
    }

    if (foundCourseSection) {
      const courseCodeCell = col2 || row.getCell(3).value?.toString().trim() || "";
      const coursePattern = /^[A-Z]{2,}[\s\.]*\d{2,}/i;
      
      if (coursePattern.test(courseCodeCell)) {
        const courseCode = courseCodeCell
          .match(coursePattern)?.[0] || "";
        const cleanCourseCode = courseCode
          .replace(/[\s\.]+/g, "")
          .toUpperCase();
        
        const courseName = row.getCell(7).value?.toString().trim() || "";
        
        // Get class number from class column
        let classNo = "N/A";
        if (classNoCol > 0) {
          const classCell = row.getCell(classNoCol);
          const classValue = classCell.value?.toString().trim() || "";
          if (classValue && classValue !== "-" && classValue !== "") {
            classNo = classValue;
          }
        }
        
        courses.push({
          courseCode: cleanCourseCode,
          courseName: courseName,
          classNo: classNo,
        });
      }
    }
  }

  console.log(`COURSES (${courses.length}):`);
  console.log("-".repeat(70));
  console.log("");
  
  courses.forEach((course, idx) => {
    console.log(`${idx + 1}. ${course.courseCode}`);
    console.log(`   ${course.courseName}`);
    console.log(`   Class/Section (الشعبة): ${course.classNo}`);
    console.log("");
  });

  console.log("=".repeat(70));
  console.log("JSON Format:");
  console.log("=".repeat(70));
  console.log(JSON.stringify({
    studentId: "381117620",
    courses: courses.map(c => ({
      courseCode: c.courseCode,
      classNo: c.classNo,
    })),
  }, null, 2));
}

showStudentWithCorrectClass().catch(console.error);



