const ExcelJS = require('exceljs');
const path = require('path');

async function testParse() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../samples/111.xlsx'));
    
    const worksheet = workbook.worksheets[0];
    
    const studentIdPattern = /^\d{6,10}$/;
    const courseCodePattern = /^[A-Z]{2,}[.\s]*\d{2,}/i;
    
    let currentStudentId = "";
    let inStudentBlock = false;
    let pastCourseHeader = false;
    let foundCount = 0;
    
    console.log('Testing parser logic...\n');
    
    for (let rowNum = 1; rowNum <= Math.min(50, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      const getCellValue = (colNum) => {
        const cell = row.getCell(colNum);
        return cell.value?.toString()?.trim() || "";
      };
      
      // Check if row is empty
      let isEmpty = true;
      for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
        if (getCellValue(col)) {
          isEmpty = false;
          break;
        }
      }
      
      if (isEmpty) {
        // Don't reset pastCourseHeader on empty rows
        continue;
      }
      
      // Check for student ID in column 4
      const studentIdCell = getCellValue(4);
      if (studentIdPattern.test(studentIdCell)) {
        currentStudentId = studentIdCell;
        inStudentBlock = true;
        pastCourseHeader = false;
        console.log(`Row ${rowNum}: Found Student ID: ${currentStudentId}`);
        continue;
      }
      
      // Check if this is the course header row
      const col2 = getCellValue(2);
      const col7 = getCellValue(7);
      const col13 = getCellValue(13);
      
      if (col2.includes("رقم المقرر") || col7.includes("اسم المقرر") || col13.includes("الشعبة")) {
        pastCourseHeader = true;
        console.log(`Row ${rowNum}: Course header detected, pastCourseHeader = true`);
        continue;
      }
      
      // If we have a student ID and past the course header, extract course data
      if (currentStudentId && inStudentBlock && pastCourseHeader) {
        const courseCode = getCellValue(2);
        const courseName = getCellValue(7);
        const classNo = getCellValue(13);
        
        // Debug output
        if (courseCode || courseName || classNo) {
          console.log(`Row ${rowNum}: Checking - Code: "${courseCode}", Name: "${courseName}", Section: "${classNo}"`);
          console.log(`  - Code matches pattern: ${courseCodePattern.test(courseCode)}`);
          console.log(`  - Has name: ${!!courseName}`);
          console.log(`  - Has section: ${!!classNo && classNo !== "-"}`);
        }
        
        if (courseCodePattern.test(courseCode) && courseName && classNo && classNo !== "-") {
          foundCount++;
          console.log(`Row ${rowNum}: ✓ Found course - Student: ${currentStudentId}, Code: ${courseCode}, Name: ${courseName}, Section: ${classNo}`);
        } else if (courseCode && courseCodePattern.test(courseCode)) {
          console.log(`Row ${rowNum}: ✗ Incomplete - Code: ${courseCode}, Name: ${courseName || 'missing'}, Section: ${classNo || 'missing'}`);
        }
      } else if (currentStudentId && inStudentBlock) {
        // Debug: show why we're not processing
        const courseCode = getCellValue(2);
        if (courseCode && courseCodePattern.test(courseCode)) {
          console.log(`Row ${rowNum}: ⚠ Has course code but pastCourseHeader=${pastCourseHeader}`);
        }
      }
      
      // Check if we've hit a new block
      const col1 = getCellValue(1);
      if (col1.includes("المقر:") || col1.includes("الكلية:") || col1.includes("القسم:") || col1.includes("المقرر:")) {
        if (inStudentBlock) {
          console.log(`Row ${rowNum}: New block detected, resetting student block`);
          inStudentBlock = false;
          currentStudentId = "";
          pastCourseHeader = false;
        }
      }
    }
    
    console.log(`\nTotal courses found: ${foundCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testParse();

