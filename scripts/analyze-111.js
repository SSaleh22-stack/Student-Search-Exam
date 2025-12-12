const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeFile() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../samples/111.xlsx'));
    
    const worksheet = workbook.worksheets[0];
    console.log('Sheet name:', worksheet.name);
    console.log('Row count:', worksheet.rowCount);
    console.log('Column count:', worksheet.columnCount);
    console.log('\n=== First 15 rows ===\n');
    
    for (let i = 1; i <= Math.min(15, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const values = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        values.push(`Col${colNumber}: ${cell.value}`);
      });
      console.log(`Row ${i}:`, values.join(' | '));
    }
    
    // Check header row specifically
    console.log('\n=== Header Row Analysis ===\n');
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers.push({ col: colNumber, value: cell.value, type: cell.type });
    });
    console.log('Headers found:');
    headers.forEach(h => {
      console.log(`  Column ${h.col}: "${h.value}" (type: ${h.type})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

analyzeFile();

