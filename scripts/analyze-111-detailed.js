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
    console.log('\n=== First 30 rows with detailed cell info ===\n');
    
    for (let i = 1; i <= Math.min(30, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const cells = [];
      
      // Check up to 15 columns
      for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
        const cell = row.getCell(col);
        const value = cell.value;
        const text = cell.text || String(value || '');
        const type = cell.type;
        
        if (value !== null && value !== undefined && value !== '') {
          cells.push({
            col: col,
            value: value,
            text: text,
            type: type,
            formatted: cell.numFmt || 'none'
          });
        }
      }
      
      if (cells.length > 0) {
        console.log(`Row ${i}:`);
        cells.forEach(c => {
          console.log(`  Col ${c.col}: "${c.text}" (type: ${c.type}, value: ${JSON.stringify(c.value)})`);
        });
        console.log('');
      } else {
        console.log(`Row ${i}: [EMPTY]\n`);
      }
    }
    
    // Look for patterns
    console.log('\n=== Pattern Analysis ===\n');
    const studentIdPattern = /^\d{6,10}$/;
    const courseCodePattern = /^[A-Z]{2,}\s*\d{2,}/i;
    
    for (let i = 1; i <= Math.min(30, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const rowData = [];
      
      for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
        const cell = row.getCell(col);
        const value = cell.value?.toString()?.trim() || '';
        if (value) {
          rowData.push({ col, value });
        }
      }
      
      if (rowData.length > 0) {
        const hasStudentId = rowData.some(c => studentIdPattern.test(c.value));
        const hasCourseCode = rowData.some(c => courseCodePattern.test(c.value));
        
        if (hasStudentId || hasCourseCode || rowData.length >= 2) {
          console.log(`Row ${i}:`);
          rowData.forEach(c => {
            const isStudentId = studentIdPattern.test(c.value);
            const isCourseCode = courseCodePattern.test(c.value);
            const markers = [];
            if (isStudentId) markers.push('STUDENT_ID');
            if (isCourseCode) markers.push('COURSE_CODE');
            console.log(`  Col ${c.col}: "${c.value}" ${markers.length > 0 ? '[' + markers.join(', ') + ']' : ''}`);
          });
          console.log('');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

analyzeFile();

