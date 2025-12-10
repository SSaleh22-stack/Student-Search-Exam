const ExcelJS = require('exceljs');

(async () => {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:\\Users\\week8\\Desktop\\Student Search Exam\\samples\\Book1.xlsx');
    const ws = wb.worksheets[0];
    
    console.log('=== Analyzing Book1.xlsx ===\n');
    
    // Get headers from row 1
    const row1 = ws.getRow(1);
    const headers = [];
    row1.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString() || '');
    });
    
    console.log('Headers in row 1:');
    headers.forEach((h, idx) => {
      console.log(`  Column ${idx + 1}: "${h}"`);
    });
    
    console.log('\nFirst 3 data rows:');
    for (let i = 2; i <= Math.min(4, ws.rowCount); i++) {
      const row = ws.getRow(i);
      const values = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        values.push(cell.value?.toString() || '');
      });
      console.log(`\nRow ${i}:`);
      values.slice(0, 10).forEach((v, idx) => {
        console.log(`  ${headers[idx] || `Col${idx+1}`}: "${v.substring(0, 50)}"`);
      });
    }
    
    // Check for Arabic headers
    console.log('\n=== Checking Arabic patterns ===');
    const arabicPatterns = {
      course_code: ['رمز', 'رمز_المقرر'],
      course_name: ['اسم', 'اسم_المقرر'],
      class_no: ['شعبة', 'الشعبة'],
      exam_date: ['تاريخ', 'التاريخ'],
      start_time: ['وقت', 'بداية', 'وقت_البداية'],
      end_time: ['نهاية', 'وقت_النهاية'],
      place: ['مكان', 'المكان', 'قاعة', 'القاعة'],
      period: ['فترة', 'فترة_الاختبار'],
      rows: ['عمود', 'العمود'],
      seats: ['عدد', 'عدد_الطلاب']
    };
    
    Object.entries(arabicPatterns).forEach(([field, patterns]) => {
      const found = headers.find(h => {
        const hLower = h.toLowerCase();
        return patterns.some(p => hLower.includes(p.toLowerCase()));
      });
      if (found) {
        console.log(`✓ ${field}: Found "${found}"`);
      } else {
        console.log(`✗ ${field}: Not found`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

