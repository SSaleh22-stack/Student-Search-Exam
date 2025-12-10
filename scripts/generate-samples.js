const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const samplesDir = path.join(__dirname, "..", "samples");

// Ensure samples directory exists
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// Generate ExamSchedule sample
async function generateExamSchedule() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Exam Schedule");

  // Headers
  worksheet.columns = [
    { header: "course_code", key: "course_code", width: 15 },
    { header: "course_name", key: "course_name", width: 40 },
    { header: "class_no", key: "class_no", width: 10 },
    { header: "exam_date", key: "exam_date", width: 12 },
    { header: "start_time", key: "start_time", width: 12 },
    { header: "end_time", key: "end_time", width: 12 },
    { header: "place", key: "place", width: 30 },
    { header: "period", key: "period", width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Sample data
  const sampleData = [
    {
      course_code: "CS101",
      course_name: "Introduction to Computer Science",
      class_no: "1",
      exam_date: "2025-03-15",
      start_time: "09:00",
      end_time: "11:00",
      place: "Building A, Room 201",
      period: "Midterm",
    },
    {
      course_code: "CS101",
      course_name: "Introduction to Computer Science",
      class_no: "2",
      exam_date: "2025-03-15",
      start_time: "14:00",
      end_time: "16:00",
      place: "Building A, Room 202",
      period: "Midterm",
    },
    {
      course_code: "MATH201",
      course_name: "Calculus I",
      class_no: "1",
      exam_date: "2025-03-20",
      start_time: "10:00",
      end_time: "12:00",
      place: "Building B, Room 301",
      period: "Final",
    },
    {
      course_code: "ENG101",
      course_name: "English Composition",
      class_no: "1",
      exam_date: "2025-03-18",
      start_time: "13:00",
      end_time: "15:00",
      place: "Building C, Room 101",
      period: "Midterm",
    },
  ];

  sampleData.forEach((row) => {
    worksheet.addRow(row);
  });

  const filePath = path.join(samplesDir, "ExamSchedule.sample.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`✓ Generated ${filePath}`);
}

// Generate StudentEnrollments sample
async function generateStudentEnrollments() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Student Enrollments");

  // Headers
  worksheet.columns = [
    { header: "student_id", key: "student_id", width: 15 },
    { header: "course_code", key: "course_code", width: 15 },
    { header: "class_no", key: "class_no", width: 10 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Sample data
  const sampleData = [
    { student_id: "STU001", course_code: "CS101", class_no: "1" },
    { student_id: "STU001", course_code: "MATH201", class_no: "1" },
    { student_id: "STU001", course_code: "ENG101", class_no: "1" },
    { student_id: "STU002", course_code: "CS101", class_no: "2" },
    { student_id: "STU002", course_code: "MATH201", class_no: "1" },
    { student_id: "STU003", course_code: "ENG101", class_no: "1" },
  ];

  sampleData.forEach((row) => {
    worksheet.addRow(row);
  });

  const filePath = path.join(samplesDir, "StudentEnrollments.sample.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`✓ Generated ${filePath}`);
}

// Run generators
async function main() {
  console.log("Generating sample Excel files...\n");
  await generateExamSchedule();
  await generateStudentEnrollments();
  console.log("\n✓ All sample files generated successfully!");
}

main().catch(console.error);



