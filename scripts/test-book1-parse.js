const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function testParse() {
  const filePath = path.join(__dirname, "../samples/Book1.xlsx");
  const buffer = fs.readFileSync(filePath);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error("No worksheet found");
    return;
  }
  
  // Read headers
  const headerRow = worksheet.getRow(1);
  const headers = [];
  const headerToColumnIndex = {};
  
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    const header = cell.value?.toString() || "";
    headers.push(header);
    headerToColumnIndex[header] = cell.col;
    console.log(`Header: "${header}" at column ${cell.col}`);
  });
  
  console.log("\n=== Headers found ===");
  console.log(headers);
  console.log("\n=== Header to Column Index ===");
  console.log(headerToColumnIndex);
  
  // Read first 5 data rows
  console.log("\n=== First 5 data rows ===");
  for (let rowNum = 2; rowNum <= Math.min(6, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    console.log(`\n--- Row ${rowNum} ---`);
    
    headers.forEach((header) => {
      const colIndex = headerToColumnIndex[header];
      if (colIndex) {
        const cell = row.getCell(colIndex);
        let value = cell.value;
        
        // Handle rich text
        if (cell.type === ExcelJS.ValueType.RichText && cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
          const richText = cell.value;
          if (richText.richText && Array.isArray(richText.richText)) {
            value = richText.richText.map((rt) => rt.text || '').join('');
          } else if (richText.text) {
            value = richText.text;
          }
        }
        
        // Handle formula
        if (cell.type === ExcelJS.ValueType.Formula) {
          value = cell.result || value;
        }
        
        console.log(`  ${header}: ${JSON.stringify(value)} (type: ${typeof value}, cell type: ${cell.type})`);
      }
    });
  }
}

testParse().catch(console.error);






