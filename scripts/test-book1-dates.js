const ExcelJS = require("exceljs");
const path = require("path");

// Simple Arabic to Western numeral conversion
const arabicToWestern = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function convertArabicNumerals(str) {
  return str.split('').map(char => arabicToWestern[char] || char).join('');
}

async function testBook1Dates() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, "..", "samples", "Book1.xlsx"));
  const worksheet = workbook.worksheets[0];

  console.log("=".repeat(80));
  console.log("BOOK1.XLSX DATE ANALYSIS");
  console.log("=".repeat(80));
  console.log("");

  // Find date column
  const headerRow = worksheet.getRow(1);
  let dateColIndex = null;
  let dateHeader = null;

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = String(cell.value || "").toLowerCase();
    if (header.includes("date") || header.includes("تاريخ") || header.includes("exam")) {
      dateColIndex = colNumber;
      dateHeader = cell.value;
      console.log(`Found date column: Column ${colNumber} - "${cell.value}"`);
    }
  });

  if (!dateColIndex) {
    console.log("No date column found!");
    return;
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("ANALYZING FIRST 10 DATA ROWS:");
  console.log("=".repeat(80));
  console.log("");

  for (let rowNum = 2; rowNum <= Math.min(11, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const cell = row.getCell(dateColIndex);

    console.log(`Row ${rowNum}:`);
    console.log(`  Header: "${dateHeader}"`);
    console.log(`  cell.value: ${JSON.stringify(cell.value)} (type: ${typeof cell.value})`);
    console.log(`  cell.value instanceof Date: ${cell.value instanceof Date}`);
    console.log(`  cell.text: "${cell.text || '(empty)'}"`);
    console.log(`  cell.type: ${cell.type}`);
    console.log(`  cell.numFmt: "${cell.numFmt || '(none)'}"`);
    
    if (cell.value instanceof Date) {
      const date = cell.value;
      console.log(`  Date object: ${date.toISOString()}`);
      console.log(`  Date formatted: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
    } else if (typeof cell.value === "number") {
      console.log(`  Number value: ${cell.value}`);
      // Try to convert Excel serial date
      try {
        const excelEpoch = new Date(1899, 11, 30);
        const jsDate = new Date(excelEpoch.getTime() + cell.value * 86400000);
        console.log(`  Converted from serial: ${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`);
      } catch (e) {
        console.log(`  Could not convert serial date: ${e.message}`);
      }
    }

    // Test our extraction function
    const cellText = cell.text?.trim() || "";
    const westernText = convertArabicNumerals(cellText);
    console.log(`  cell.text (western): "${westernText}"`);
    
    // Check if it looks like Hijri (year 1200-1600)
    const hijriMatch = westernText.match(/(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})/);
    if (hijriMatch) {
      const year = parseInt(hijriMatch[1], 10);
      if (year >= 1200 && year < 1600) {
        console.log(`  ✓ DETECTED AS HIJRI DATE (year: ${year})`);
      } else {
        console.log(`  → DETECTED AS GREGORIAN DATE (year: ${year})`);
      }
    }

    console.log("");
  }
}

testBook1Dates().catch(console.error);

