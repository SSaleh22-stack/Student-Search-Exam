const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

async function analyzeExcel(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    console.log("=".repeat(60));
    console.log("Excel File Analysis");
    console.log("=".repeat(60));
    console.log(`File: ${path.basename(filePath)}`);
    console.log(`Number of worksheets: ${workbook.worksheets.length}`);
    console.log("");

    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`\n--- Worksheet ${index + 1}: "${worksheet.name}" ---`);
      console.log(`Total rows: ${worksheet.rowCount}`);
      console.log(`Total columns: ${worksheet.columnCount}`);
      console.log("");

      // Read first 10 rows to understand structure
      const sampleRows = Math.min(10, worksheet.rowCount);
      
      // Get headers (first row) - check all columns up to column count
      const headers = [];
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = worksheet.getCell(1, col);
        if (cell.value !== null && cell.value !== undefined) {
          headers.push({
            col: col,
            value: cell.value?.toString() || "",
            address: cell.address,
          });
        } else {
          headers.push({
            col: col,
            value: "",
            address: cell.address,
          });
        }
      }

      console.log("Headers (Row 1):");
      headers.forEach((h) => {
        if (h.value) {
          console.log(`  Column ${h.col} (${h.address}): "${h.value}"`);
        }
      });
      console.log(`Total columns with headers: ${headers.filter(h => h.value).length}`);
      console.log("");

      // Find first row with actual data
      let firstDataRow = 2;
      for (let rowNum = 2; rowNum <= Math.min(20, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        let hasData = false;
        for (let col = 1; col <= worksheet.columnCount; col++) {
          const cell = row.getCell(col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            hasData = true;
            break;
          }
        }
        if (hasData) {
          firstDataRow = rowNum;
          break;
        }
      }

      // Analyze data structure
      console.log(`First data row found at: Row ${firstDataRow}`);
      console.log("\nSample Data (First 5 data rows):");
      let dataRowCount = 0;
      for (let rowNum = firstDataRow; rowNum <= worksheet.rowCount && dataRowCount < 5; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData = {};
        let hasData = false;

        for (let col = 1; col <= headers.length; col++) {
          const cell = row.getCell(col);
          const value = cell.value;
          if (value !== null && value !== undefined && value !== "") {
            hasData = true;
            const header = headers[col - 1];
            if (header && header.value) {
              rowData[header.value] = value;
            } else {
              rowData[`Column${col}`] = value;
            }
          }
        }

        if (hasData) {
          dataRowCount++;
          console.log(`\nRow ${rowNum}:`);
          Object.entries(rowData).slice(0, 10).forEach(([key, value]) => {
            const displayValue = String(value).length > 50 ? String(value).substring(0, 50) + "..." : value;
            console.log(`  ${key}: ${displayValue}`);
          });
          if (Object.keys(rowData).length > 10) {
            console.log(`  ... and ${Object.keys(rowData).length - 10} more columns`);
          }
        }
      }

      // Detect block structure
      console.log("\n--- Structure Analysis ---");
      
      // Check for empty rows that might separate blocks
      let emptyRowCount = 0;
      let blockStarts = [1]; // First row is always a block start (headers)
      
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        let isEmpty = true;
        
        headers.forEach((header) => {
          const cell = row.getCell(header.col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
            isEmpty = false;
          }
        });

        if (isEmpty) {
          emptyRowCount++;
          // If next row has data, it might be a new block
          if (rowNum < worksheet.rowCount) {
            const nextRow = worksheet.getRow(rowNum + 1);
            let nextHasData = false;
            headers.forEach((header) => {
              const cell = nextRow.getCell(header.col);
              if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
                nextHasData = true;
              }
            });
            if (nextHasData) {
              blockStarts.push(rowNum + 1);
            }
          }
        }
      }

      console.log(`Empty rows found: ${emptyRowCount}`);
      console.log(`Possible block separators: ${blockStarts.length - 1}`);
      
      if (blockStarts.length > 1) {
        console.log("\n⚠️  BLOCK STRUCTURE DETECTED!");
        console.log("The file appears to have data organized in blocks separated by empty rows.");
        console.log(`Block start rows: ${blockStarts.join(", ")}`);
        
        // Analyze first few blocks
        console.log("\nBlock Analysis:");
        for (let i = 0; i < Math.min(3, blockStarts.length); i++) {
          const startRow = blockStarts[i];
          const endRow = i < blockStarts.length - 1 ? blockStarts[i + 1] - 1 : worksheet.rowCount;
          console.log(`\nBlock ${i + 1} (Rows ${startRow}-${endRow}):`);
          
          // Check if first row of block looks like headers
          if (startRow > 1) {
            const firstRow = worksheet.getRow(startRow);
            const firstRowData = {};
            headers.forEach((header) => {
              const cell = firstRow.getCell(header.col);
              if (cell.value !== null && cell.value !== undefined) {
                firstRowData[header.value] = cell.value;
              }
            });
            
            // Check if this row looks like a header (all text, no numbers)
            const allText = Object.values(firstRowData).every(v => 
              typeof v === "string" && isNaN(parseFloat(v))
            );
            
            if (allText && Object.keys(firstRowData).length > 0) {
              console.log("  → This block starts with what looks like headers:");
              Object.entries(firstRowData).forEach(([key, value]) => {
                console.log(`    ${key}: ${value}`);
              });
            }
          }
          
          // Count data rows in block
          let dataRows = 0;
          for (let r = startRow + 1; r <= endRow; r++) {
            const row = worksheet.getRow(r);
            let hasData = false;
            headers.forEach((header) => {
              const cell = row.getCell(header.col);
              if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
                hasData = true;
              }
            });
            if (hasData) dataRows++;
          }
          console.log(`  → Contains ${dataRows} data rows`);
        }
      } else {
        console.log("✓ Simple table structure (no blocks detected)");
      }

      // Check for repeating patterns
      console.log("\n--- Pattern Detection ---");
      if (blockStarts.length > 2) {
        const blockSizes = [];
        for (let i = 0; i < blockStarts.length - 1; i++) {
          blockSizes.push(blockStarts[i + 1] - blockStarts[i] - 1);
        }
        const avgSize = blockSizes.reduce((a, b) => a + b, 0) / blockSizes.length;
        console.log(`Average block size: ${avgSize.toFixed(1)} rows`);
        
        const allSimilar = blockSizes.every(size => Math.abs(size - avgSize) < 2);
        if (allSimilar) {
          console.log("✓ Blocks appear to have similar sizes (consistent structure)");
        }
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log("Analysis Complete");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Error analyzing Excel file:", error.message);
    process.exit(1);
  }
}

// Get file path from command line or use default
const filePath = process.argv[2] || path.join(__dirname, "..", "samples", "111.xlsx");

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

analyzeExcel(filePath);

