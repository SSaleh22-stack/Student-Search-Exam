import ExcelJS from "exceljs";
import { z } from "zod";
import { enrollmentRowSchema, type ValidationError } from "./schemas";

export interface ParseEnrollResult {
  validRows: Array<{
    studentId: string;
    courseCode: string;
    classNo: string;
  }>;
  errors: ValidationError[];
}

export interface EnrollmentHeaderMapping {
  student_id: string;
  course_code: string;
  class_no: string;
}

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
};

export async function parseEnrollments(
  file: File | Buffer,
  headerMapping?: EnrollmentHeaderMapping
): Promise<ParseEnrollResult> {
  const workbook = new ExcelJS.Workbook();
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  // Read headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(cell.value?.toString() || "");
  });

  // Use provided mapping or try to auto-detect
  let mapping: EnrollmentHeaderMapping;
  if (headerMapping) {
    mapping = headerMapping;
  } else {
    // Auto-detect: normalize headers and try to match
    const normalizedHeaders = headers.map(normalizeHeader);
    mapping = {
      student_id:
        normalizedHeaders.find((h) =>
          ["student_id", "studentid", "id", "student"].includes(h)
        ) || headers[0],
      course_code:
        normalizedHeaders.find((h) =>
          ["course_code", "coursecode", "code", "course"].includes(h)
        ) || headers[1],
      class_no:
        normalizedHeaders.find((h) =>
          ["class_no", "classno", "class", "section"].includes(h)
        ) || headers[2],
    };
  }

  // Create reverse mapping: Excel header -> field name
  const headerToField: Record<string, string> = {};
  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    Object.entries(mapping).forEach(([field, mappedHeader]) => {
      if (normalizeHeader(mappedHeader) === normalized) {
        headerToField[header] = field;
      }
    });
  });

  // Validate that all required fields are mapped
  const requiredFields = Object.keys(mapping);
  const mappedFields = Object.values(headerToField);
  const missingFields = requiredFields.filter((f) => !mappedFields.includes(f));
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required field mappings: ${missingFields.join(", ")}`
    );
  }

  const validRows: ParseEnrollResult["validRows"] = [];
  const errors: ValidationError[] = [];

  // Process data rows (starting from row 2)
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: Record<string, any> = {};

    // Skip empty rows
    let isEmpty = true;
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell.value;
      if (value !== null && value !== undefined && value !== "") {
        isEmpty = false;
      }
      // Map Excel header to field name
      const fieldName = headerToField[header];
      if (fieldName) {
        rowData[fieldName] = value;
      }
    });

    if (isEmpty) continue;

    // Validate row
    try {
      const validated = enrollmentRowSchema.parse(rowData);
      validRows.push({
        studentId: validated.student_id,
        courseCode: validated.course_code,
        classNo: validated.class_no,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        errors.push({
          row: rowNum,
          field: err.errors[0]?.path.join("."),
          message: err.errors[0]?.message || "Validation failed",
        });
      } else {
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return { validRows, errors };
}
