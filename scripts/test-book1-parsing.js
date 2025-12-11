const ExcelJS = require('exceljs');
const { parseExamSchedule } = require('../lib/excel/parseExam');

(async () => {
  try {
    const filePath = 'C:\\Users\\week8\\Desktop\\Student Search Exam\\samples\\Book1.xlsx';
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log('=== Testing Book1.xlsx Parsing ===\n');
    
    // Test without mapping (auto-detect)
    console.log('Testing with auto-detection...');
    const result = await parseExamSchedule(fileBuffer);
    
    console.log(`\nValid rows: ${result.validRows.length}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.validRows.length > 0) {
      console.log('\nFirst 3 valid rows:');
      result.validRows.slice(0, 3).forEach((row, idx) => {
        console.log(`\nRow ${idx + 1}:`);
        console.log(`  Course Code: ${row.courseCode}`);
        console.log(`  Course Name: ${row.courseName}`);
        console.log(`  Class: ${row.classNo}`);
        console.log(`  Date: ${row.examDate}`);
        console.log(`  Time: ${row.startTime} - ${row.endTime}`);
        console.log(`  Place: ${row.place}`);
        console.log(`  Period: ${row.period}`);
        console.log(`  Rows: ${row.rows || 'N/A'}`);
        console.log(`  Seats: ${row.seats || 'N/A'}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\nFirst 5 errors:');
      result.errors.slice(0, 5).forEach((err, idx) => {
        console.log(`  Error ${idx + 1} (Row ${err.row}): ${err.message}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
})();




