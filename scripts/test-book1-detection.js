const ExcelJS = require('exceljs');

const normalizeHeader = (header) => {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
};

(async () => {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:\\Users\\week8\\Desktop\\Student Search Exam\\samples\\Book1.xlsx');
    const ws = wb.worksheets[0];
    
    // Read headers
    const headerRow = ws.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString() || "");
    });

    const normalizedHeaders = headers.map(normalizeHeader);
    
    // Helper function to find Arabic headers (same as in parseExam.ts)
    const findArabicHeader = (patterns) => {
      for (const header of headers) {
        const headerLower = header.toLowerCase().trim();
        const headerNormalized = headerLower.replace(/[\s_]/g, '');
        
        for (const pattern of patterns) {
          const patternLower = pattern.toLowerCase();
          if (headerLower.includes(patternLower)) {
            return header;
          }
          const patternNormalized = patternLower.replace(/[\s_]/g, '');
          if (headerNormalized.includes(patternNormalized)) {
            return header;
          }
        }
      }
      return null;
    };
    
    const mapping = {
      course_code:
        findArabicHeader(["رمز المقرر", "رمز_المقرر", "رمز", "course_code", "coursecode", "code"]) ||
        normalizedHeaders.find((h) =>
          ["course_code", "coursecode", "code", "course"].includes(h)
        ) || headers[0],
      course_name:
        findArabicHeader(["اسم المقرر", "اسم_المقرر", "اسم", "course_name", "coursename", "name"]) ||
        normalizedHeaders.find((h) =>
          ["course_name", "coursename", "name", "title"].includes(h)
        ) || headers[1],
      class_no:
        findArabicHeader(["الشعبة", "شعبة", "class_no", "classno", "class", "section"]) ||
        normalizedHeaders.find((h) =>
          ["class_no", "classno", "class", "section"].includes(h)
        ) || headers[2],
      exam_date:
        findArabicHeader(["التاريخ", "تاريخ", "exam_date", "examdate", "date"]) ||
        normalizedHeaders.find((h) =>
          ["exam_date", "examdate", "date", "exam"].includes(h)
        ) || headers[3],
      start_time:
        findArabicHeader(["بداية الفترة", "بداية_الفترة", "وقت_البداية", "وقت", "start_time", "starttime", "time"]) ||
        normalizedHeaders.find((h) =>
          ["start_time", "starttime", "time", "start"].includes(h)
        ) || headers[4],
      end_time:
        findArabicHeader(["نهاية الفترة", "نهاية_الفترة", "وقت_النهاية", "نهاية", "end_time", "endtime", "end"]) ||
        normalizedHeaders.find((h) =>
          ["end_time", "endtime", "end", "finish"].includes(h)
        ) || headers[5],
      place:
        findArabicHeader(["القاعة", "قاعة", "المكان", "مكان", "place", "location", "venue"]) ||
        normalizedHeaders.find((h) =>
          ["place", "location", "venue", "room"].includes(h)
        ) || headers[6],
      period:
        findArabicHeader(["فترة الاختبار", "فترة_الاختبار", "فترة", "period", "type", "exam_type"]) ||
        normalizedHeaders.find((h) =>
          ["period", "type", "exam_type", "examtype"].includes(h)
        ) || headers[7],
      rows:
        (() => {
          const exactMatch = headers.find(h => h.toLowerCase().trim() === "العمود");
          if (exactMatch) return exactMatch;
          return findArabicHeader(["عمود", "rows", "row", "number_of_rows"]);
        })() ||
        normalizedHeaders.find((h) =>
          ["rows", "row", "number_of_rows"].includes(h)
        ) || headers[8],
      seats:
        findArabicHeader(["عدد الطلاب", "عدد_الطلاب", "عدد", "seats", "seat", "number_of_seats", "capacity"]) ||
        normalizedHeaders.find((h) =>
          ["seats", "seat", "number_of_seats", "capacity"].includes(h)
        ) || headers[9],
    };

    // Create reverse mapping
    const headerToField = {};
    headers.forEach((header) => {
      const normalized = normalizeHeader(header);
      Object.entries(mapping).forEach(([field, mappedHeader]) => {
        const mappedNormalized = normalizeHeader(mappedHeader);
        if (mappedNormalized === normalized) {
          headerToField[header] = field;
          console.log(`  DEBUG: Matched "${header}" (${normalized}) with "${mappedHeader}" (${mappedNormalized}) -> ${field}`);
        }
      });
    });
    
    console.log('\nReverse mapping results:');
    Object.entries(headerToField).forEach(([header, field]) => {
      console.log(`  "${header}" -> ${field}`);
    });

    // Check required fields
    const requiredFields = ["course_code", "course_name", "class_no", "exam_date", "start_time", "place", "period"];
    const mappedFields = Object.values(headerToField);
    const missingFields = requiredFields.filter((f) => !mappedFields.includes(f));
    
    const allMappedHeadersExist = requiredFields.every((field) => {
      const mappedHeader = mapping[field];
      return headers.includes(mappedHeader);
    });

    const canAutoDetect = missingFields.length === 0 && allMappedHeadersExist;

    console.log('=== Auto-Detection Test Results ===\n');
    console.log('Mappings:');
    Object.entries(mapping).forEach(([field, header]) => {
      const status = requiredFields.includes(field) ? (mappedFields.includes(field) ? '✓' : '✗') : '○';
      console.log(`  ${status} ${field}: "${header}"`);
    });
    
    console.log('\nMissing fields:', missingFields.length > 0 ? missingFields : 'None');
    console.log('All mapped headers exist:', allMappedHeadersExist);
    console.log('\nCan auto-detect:', canAutoDetect ? 'YES ✓' : 'NO ✗');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

