const ExcelJS = require("exceljs");
const path = require("path");

async function inspectRows(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  console.log("Inspecting specific rows to understand structure...\n");

  // Check rows around where we expect student data (after first course block)
  const rowsToCheck = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  for (const rowNum of rowsToCheck) {
    const row = worksheet.getRow(rowNum);
    console.log(`\n--- Row ${rowNum} ---`);
    
    const rowData = [];
    for (let col = 1; col <= Math.min(12, worksheet.columnCount); col++) {
      const cell = row.getCell(col);
      const value = cell.value;
      if (value !== null && value !== undefined) {
        rowData.push(`Col${col}: "${value.toString().trim()}"`);
      }
    }
    
    if (rowData.length > 0) {
      console.log(rowData.join(" | "));
    } else {
      console.log("(empty row)");
    }
  }
}

const filePath = process.argv[2] || path.join(__dirname, "..", "samples", "111.xlsx");
inspectRows(filePath);

