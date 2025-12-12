const ExcelJS = require("exceljs");
const path = require("path");

async function analyzeExamFile() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "Book1.xlsx"));
  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(70));
  console.log("EXAM SCHEDULE FILE ANALYSIS");
  console.log("=".repeat(70));
  console.log("");

  // Check total rows and columns
  console.log(`Total Rows: ${worksheet.rowCount}`);
  console.log(`Total Columns: ${worksheet.columnCount}`);
  console.log("");

  // Analyze first 20 rows
  console.log("=".repeat(70));
  console.log("FIRST 20 ROWS ANALYSIS:");
  console.log("=".repeat(70));
  console.log("");

  for (let rowNum = 1; rowNum <= Math.min(20, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    console.log(`Row ${rowNum}:`);
    
    let hasData = false;
    for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
      const cell = row.getCell(col);
      const value = cell.value;
      
      if (value !== null && value !== undefined && value !== "") {
        hasData = true;
        let displayValue = "";
        
        if (value instanceof Date) {
          displayValue = `[Date] ${value.toISOString()} | ${value.toLocaleDateString()}`;
        } else if (typeof value === "number") {
          // Check if it might be a date serial number
          if (value > 40000 && value < 50000) {
            try {
              const date = ExcelJS.DateTime.fromExcelSerialDate(value);
              displayValue = `[Date Number] ${value} -> ${date.toISOString()}`;
            } catch (e) {
              displayValue = `[Number] ${value}`;
            }
          } else {
            displayValue = `[Number] ${value}`;
          }
        } else {
          displayValue = `[String] "${String(value)}"`;
        }
        
        console.log(`  Col ${col}: ${displayValue}`);
      }
    }
    
    if (!hasData) {
      console.log("  (empty row)");
    }
    console.log("");
  }

  // Check for headers
  console.log("=".repeat(70));
  console.log("HEADER ROW ANALYSIS (Row 1):");
  console.log("=".repeat(70));
  console.log("");

  const headerRow = worksheet.getRow(1);
  const headers = [];
  for (let col = 1; col <= worksheet.columnCount; col++) {
    const cell = headerRow.getCell(col);
    const value = cell.value;
    if (value !== null && value !== undefined && value !== "") {
      headers.push({
        col: col,
        value: String(value),
      });
      console.log(`Column ${col}: "${String(value)}"`);
    }
  }

  // Analyze a sample data row
  console.log("");
  console.log("=".repeat(70));
  console.log("SAMPLE DATA ROW ANALYSIS (Row 2):");
  console.log("=".repeat(70));
  console.log("");

  if (worksheet.rowCount > 1) {
    const dataRow = worksheet.getRow(2);
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const cell = dataRow.getCell(header.col);
      const value = cell.value;
      
      let displayValue = "";
      let type = "";
      
      if (value instanceof Date) {
        type = "Date";
        displayValue = `${value.toISOString()} | ${value.toLocaleDateString()}`;
      } else if (typeof value === "number") {
        // Check if it might be a date serial number
        if (value > 40000 && value < 50000) {
          try {
            const date = ExcelJS.DateTime.fromExcelSerialDate(value);
            type = "Date (Serial)";
            displayValue = `${value} -> ${date.toISOString()}`;
          } catch (e) {
            type = "Number";
            displayValue = String(value);
          }
        } else {
          type = "Number";
          displayValue = String(value);
        }
      } else {
        type = "String";
        displayValue = String(value || "");
      }
      
      console.log(`${header.value}: [${type}] ${displayValue}`);
    }
  }

  // Check for date patterns
  console.log("");
  console.log("=".repeat(70));
  console.log("DATE FORMAT ANALYSIS:");
  console.log("=".repeat(70));
  console.log("");

  // Find date column
  let dateCol = null;
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const headerLower = header.value.toLowerCase();
    if (headerLower.includes("date") || headerLower.includes("تاريخ") || headerLower.includes("exam")) {
      dateCol = header.col;
      console.log(`Found date column: Column ${dateCol} - "${header.value}"`);
      break;
    }
  }

  if (dateCol) {
    console.log("\nSample dates from first 5 data rows:");
    for (let rowNum = 2; rowNum <= Math.min(6, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const cell = row.getCell(dateCol);
      const value = cell.value;
      
      if (value) {
        if (value instanceof Date) {
          console.log(`  Row ${rowNum}: [Date Object] ${value.toISOString()}`);
        } else if (typeof value === "number") {
          try {
            const date = ExcelJS.DateTime.fromExcelSerialDate(value);
            console.log(`  Row ${rowNum}: [Serial] ${value} -> ${date.toISOString()}`);
          } catch (e) {
            console.log(`  Row ${rowNum}: [Number] ${value}`);
          }
        } else {
          console.log(`  Row ${rowNum}: [String] "${String(value)}"`);
        }
      }
    }
  }

  // Check for time patterns
  console.log("");
  console.log("=".repeat(70));
  console.log("TIME FORMAT ANALYSIS:");
  console.log("=".repeat(70));
  console.log("");

  // Find time columns
  const timeCols = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const headerLower = header.value.toLowerCase();
    if (headerLower.includes("time") || headerLower.includes("وقت") || 
        headerLower.includes("start") || headerLower.includes("end") ||
        headerLower.includes("begin") || headerLower.includes("finish")) {
      timeCols.push({ col: header.col, name: header.value });
    }
  }

  if (timeCols.length > 0) {
    console.log("Found time columns:");
    timeCols.forEach(tc => console.log(`  Column ${tc.col}: "${tc.name}"`));
    
    console.log("\nSample times from first 5 data rows:");
    for (let rowNum = 2; rowNum <= Math.min(6, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      console.log(`  Row ${rowNum}:`);
      timeCols.forEach(tc => {
        const cell = row.getCell(tc.col);
        const value = cell.value;
        if (value !== null && value !== undefined && value !== "") {
          if (value instanceof Date) {
            const hours = String(value.getHours()).padStart(2, "0");
            const minutes = String(value.getMinutes()).padStart(2, "0");
            console.log(`    ${tc.name}: [Date] ${hours}:${minutes}`);
          } else if (typeof value === "number" && value < 1) {
            // Time as decimal
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            console.log(`    ${tc.name}: [Decimal] ${value} -> ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
          } else {
            console.log(`    ${tc.name}: [String] "${String(value)}"`);
          }
        }
      });
    }
  }
}

analyzeExamFile().catch(console.error);






