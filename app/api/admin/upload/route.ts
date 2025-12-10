import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExamSchedule } from "@/lib/excel/parseExam";
import { parseEnrollments } from "@/lib/excel/parseEnroll";
import { parseEnrollmentsFromBlocks } from "@/lib/excel/parseEnrollBlocks";
import { parseEnrollmentsFromSections } from "@/lib/excel/parseEnrollSections";
import { detectFileStructure } from "@/lib/excel/detectStructure";
import { parseLecturerSchedule } from "@/lib/excel/parseLecturer";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uploadType = formData.get("uploadType") as string;
    const datasetName = formData.get("datasetName") as string;
    const examMappingStr = formData.get("examMapping") as string;
    const enrollMappingStr = formData.get("enrollMapping") as string;
    const lecturerMappingStr = formData.get("lecturerMapping") as string;

    if (!uploadType || !datasetName) {
      return NextResponse.json(
        { error: "Missing required fields. Please provide upload type and dataset name." },
        { status: 400 }
      );
    }

    if (uploadType === "student") {
      if (!examFiles || examFiles.length === 0 || !enrollFiles || enrollFiles.length === 0) {
        return NextResponse.json(
          { error: "Missing required fields. Please provide at least one exam file and one enrollment file." },
          { status: 400 }
        );
      }
    } else if (uploadType === "lecturer") {
      if (!lecturerFiles || lecturerFiles.length === 0) {
        return NextResponse.json(
          { error: "Missing required fields. Please provide at least one lecturer file." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid upload type. Must be 'student' or 'lecturer'." },
        { status: 400 }
      );
    }

    // Parse header mappings if provided
    let examMapping = undefined;
    let enrollMapping = undefined;
    let lecturerMapping = undefined;
    try {
      if (examMappingStr) {
        examMapping = JSON.parse(examMappingStr);
      }
      if (enrollMappingStr) {
        enrollMapping = JSON.parse(enrollMappingStr);
      }
      if (lecturerMappingStr) {
        lecturerMapping = JSON.parse(lecturerMappingStr);
      }
    } catch (err) {
      // Mapping is optional for block-structured files
      if (enrollMappingStr || lecturerMappingStr) {
        return NextResponse.json(
          { error: "Invalid header mapping format" },
          { status: 400 }
        );
      }
    }

    // Process files based on upload type
    let examResult: { validRows: any[]; errors: any[] } = { validRows: [], errors: [] };
    let enrollResult: { validRows: any[]; errors: any[] } = { validRows: [], errors: [] };
    let lecturerResult: { validRows: any[]; errors: any[] } = { validRows: [], errors: [] };
    let fileType = "table";

    if (uploadType === "student") {
      // Process all exam files and combine results
      const allExamRows: any[] = [];
      const allExamErrors: any[] = [];
      
      console.log(`[Upload] Processing ${examFiles.length} exam file(s)`);
      for (let i = 0; i < examFiles.length; i++) {
        const examFile = examFiles[i];
        try {
          const result = await parseExamSchedule(examFile, examMapping);
          console.log(`[Upload] Exam file ${i + 1}/${examFiles.length}: ${result.validRows.length} valid rows, ${result.errors.length} errors`);
          allExamRows.push(...result.validRows);
          allExamErrors.push(...result.errors);
        } catch (err) {
          console.error(`[Upload] Error parsing exam file ${i + 1}:`, err);
          return NextResponse.json(
            {
              error: `Failed to parse exam schedule file ${i + 1}: ${examFile.name}`,
              details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      }
      
      examResult = {
        validRows: allExamRows,
        errors: allExamErrors,
      };
      console.log(`[Upload] Total exam results: ${examResult.validRows.length} valid rows, ${examResult.errors.length} errors`);
      
      // Process all enrollment files and combine results
      const allEnrollRows: any[] = [];
      const allEnrollErrors: any[] = [];
      
      console.log(`[Upload] Processing ${enrollFiles.length} enrollment file(s)`);
      for (let i = 0; i < enrollFiles.length; i++) {
        const enrollFile = enrollFiles[i];
        
        // Detect file structure for each enrollment file
        let enrollStructure;
        try {
          enrollStructure = await detectFileStructure(enrollFile);
        } catch (err) {
          console.error(`[Upload] Error detecting enrollment file ${i + 1} structure:`, err);
          return NextResponse.json(
            {
              error: `Failed to analyze enrollment file ${i + 1} structure: ${enrollFile.name}`,
              details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
          );
        }
        
        // Use appropriate parser based on detected structure
        let result;
        if (enrollStructure.isBlockStructure) {
          fileType = "block-structured";
          result = await parseEnrollmentsFromBlocks(enrollFile);
          console.log(`[Upload] Enrollment file ${i + 1}: Block-structured - ${enrollStructure.blockCount} blocks, ${result.validRows.length} enrollments`);
        } else if (enrollStructure.isSectionStructure) {
          fileType = "section-structured";
          result = await parseEnrollmentsFromSections(enrollFile);
          console.log(`[Upload] Enrollment file ${i + 1}: Section-structured - ${result.validRows.length} enrollments`);
        } else {
          // Regular table structure - requires mapping
          if (!enrollMapping) {
            return NextResponse.json(
              { error: `Header mapping required for table-structured enrollment file ${i + 1}: ${enrollFile.name}` },
              { status: 400 }
            );
          }
          result = await parseEnrollments(enrollFile, enrollMapping);
          console.log(`[Upload] Enrollment file ${i + 1}: Table-structured - ${result.validRows.length} enrollments`);
        }
        
        allEnrollRows.push(...result.validRows);
        allEnrollErrors.push(...result.errors);
      }
      
      enrollResult = {
        validRows: allEnrollRows,
        errors: allEnrollErrors,
      };
      console.log(`[Upload] Total enrollment results: ${enrollResult.validRows.length} valid rows, ${enrollResult.errors.length} errors`);

      // Check for critical errors - but allow some errors if we have valid rows
      const hasValidExams = examResult.validRows.length > 0;
      const hasValidEnrollments = enrollResult.validRows.length > 0;
      
      // Only fail if we have no valid rows at all
      if (!hasValidExams && !hasValidEnrollments) {
        // Group errors by type for better error messages
        const examErrorTypes: Record<string, number> = {};
        examResult.errors.forEach(err => {
          const key = err.field || err.message;
          examErrorTypes[key] = (examErrorTypes[key] || 0) + 1;
        });
        
        return NextResponse.json(
          {
            error: `No valid data found in Excel files. ${examResult.errors.length} exam errors, ${enrollResult.errors.length} enrollment errors.`,
            examErrors: examResult.errors.slice(0, 10), // Show first 10 errors
            enrollErrors: enrollResult.errors.slice(0, 10),
            totalExamErrors: examResult.errors.length,
            totalEnrollErrors: enrollResult.errors.length,
            examErrorSummary: examErrorTypes,
            suggestion: "Please check your Excel file format. Common issues: date format (should be YYYY-MM-DD), time format (should be HH:MM), or missing required fields.",
          },
          { status: 400 }
        );
      }
      
      // Log warnings if there are errors but we have valid data
      if (examResult.errors.length > 0) {
        console.warn(`Warning: ${examResult.errors.length} exam validation errors, but ${examResult.validRows.length} valid rows found`);
        // Log sample errors for debugging
        const sampleErrors = examResult.errors.slice(0, 5);
        sampleErrors.forEach(err => {
          console.warn(`  Row ${err.row}: ${err.field || 'unknown'} - ${err.message}`);
        });
      }
      if (enrollResult.errors.length > 0) {
        console.warn(`Warning: ${enrollResult.errors.length} enrollment validation errors, but ${enrollResult.validRows.length} valid rows found`);
      }
    } else if (uploadType === "lecturer") {
      // Process all lecturer files and combine results
      const allLecturerRows: any[] = [];
      const allLecturerErrors: any[] = [];
      
      console.log(`[Upload] Processing ${lecturerFiles.length} lecturer file(s)`);
      for (let i = 0; i < lecturerFiles.length; i++) {
        const lecturerFile = lecturerFiles[i];
        try {
          const result = await parseLecturerSchedule(lecturerFile, lecturerMapping);
          console.log(`[Upload] Lecturer file ${i + 1}/${lecturerFiles.length}: ${result.validRows.length} valid rows, ${result.errors.length} errors`);
          allLecturerRows.push(...result.validRows);
          allLecturerErrors.push(...result.errors);
        } catch (err) {
          console.error(`[Upload] Error parsing lecturer file ${i + 1}:`, err);
          return NextResponse.json(
            {
              error: `Failed to parse lecturer file ${i + 1}: ${lecturerFile.name}`,
              details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      }
      
      lecturerResult = {
        validRows: allLecturerRows,
        errors: allLecturerErrors,
      };
      console.log(`[Upload] Total lecturer results: ${lecturerResult.validRows.length} valid rows, ${lecturerResult.errors.length} errors`);

      // Check for critical errors
      if (lecturerResult.validRows.length === 0) {
        // Group errors by type for better error messages
        const errorTypes: Record<string, number> = {};
        lecturerResult.errors.forEach(err => {
          const key = err.field || err.message || "unknown";
          errorTypes[key] = (errorTypes[key] || 0) + 1;
        });
        
        // Get sample errors
        const sampleErrors = lecturerResult.errors.slice(0, 20);
        
        return NextResponse.json(
          {
            error: `No valid data found in lecturer files. ${lecturerResult.errors.length} errors.`,
            lecturerErrors: sampleErrors,
            totalLecturerErrors: lecturerResult.errors.length,
            errorSummary: errorTypes,
            suggestion: "Please check your Excel file format. Common issues: date format (should be YYYY-MM-DD), time format (should be HH:MM), or missing required fields. Check the error details below for specific issues.",
          },
          { status: 400 }
        );
      }
      
      // Log warnings if there are errors but we have valid data
      if (lecturerResult.errors.length > 0) {
        console.warn(`Warning: ${lecturerResult.errors.length} lecturer validation errors, but ${lecturerResult.validRows.length} valid rows found`);
      }
    }

    // Create dataset with type
    const dataset = await prisma.dataset.create({
      data: {
        name: datasetName.trim(),
        isActive: false,
        type: uploadType, // "student" or "lecturer"
      },
    });

    let examInserted = 0;
    let examUpdated = 0;
    let enrollInserted = 0;
    let failed = 0;

    // Insert exam schedules (only for student upload type)
    if (uploadType === "student") {
      console.log(`[Upload] Starting to insert ${examResult.validRows.length} exams into dataset ${dataset.id}`);
      
      // Validate and prepare exam data in batch
      const validExams = [];
      for (const exam of examResult.validRows) {
        // Validate exam data before inserting
        if (!exam.courseCode || !exam.examDate || !exam.period) {
          console.warn(`[Upload] Skipping invalid exam row:`, exam);
          failed++;
          continue;
        }

        // Validate date format (should be YYYY-MM-DD, supports Hijri dates)
        const examDateStr = String(exam.examDate).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(examDateStr)) {
          console.error(`[Upload] Invalid date format for exam:`, exam.examDate);
          failed++;
          continue;
        }

        // Ensure all required fields are present
        if (!exam.courseName || !exam.startTime || !exam.place) {
          console.warn(`[Upload] Missing required fields for exam:`, exam);
          failed++;
          continue;
        }

        validExams.push({
          datasetId: dataset.id,
          courseCode: exam.courseCode.trim(),
          courseName: exam.courseName.trim(),
          classNo: exam.classNo.trim(),
          examDate: examDateStr,
          startTime: exam.startTime.trim(),
          endTime: exam.endTime?.trim() || null,
          place: exam.place.trim(),
          period: exam.period.trim(),
          rows: exam.rows ? String(exam.rows) : null,
          seats: exam.seats ?? null,
        });
      }

      // Batch process exams in parallel (smaller batches to avoid timeout)
      console.log(`[Upload] Processing ${validExams.length} valid exams in batches of 50`);
      const BATCH_SIZE = 50;
      for (let i = 0; i < validExams.length; i += BATCH_SIZE) {
        const batch = validExams.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (exam) => {
            try {
              const existing = await prisma.courseExam.findUnique({
                where: {
                  datasetId_courseCode_classNo_examDate_period: {
                    datasetId: exam.datasetId,
                    courseCode: exam.courseCode,
                    classNo: exam.classNo,
                    examDate: exam.examDate,
                    period: exam.period,
                  },
                },
              });

              if (existing) {
                await prisma.courseExam.update({
                  where: {
                    datasetId_courseCode_classNo_examDate_period: {
                      datasetId: exam.datasetId,
                      courseCode: exam.courseCode,
                      classNo: exam.classNo,
                      examDate: exam.examDate,
                      period: exam.period,
                    },
                  },
                  data: {
                    courseName: exam.courseName,
                    startTime: exam.startTime,
                    endTime: exam.endTime,
                    place: exam.place,
                    rows: exam.rows,
                    seats: exam.seats,
                  },
                });
                examUpdated++;
              } else {
                await prisma.courseExam.create({ data: exam });
                examInserted++;
              }
            } catch (err) {
              console.error(`[Upload] Error processing exam:`, err);
              failed++;
            }
          })
        );
      }
      console.log(`[Upload] Exam insertion complete: ${examInserted} inserted, ${examUpdated} updated, ${failed} failed`);

      // Insert enrollments in batches
      console.log(`[Upload] Processing ${enrollResult.validRows.length} enrollments in batches`);
      const ENROLL_BATCH_SIZE = 200;
      const enrollmentsToInsert = enrollResult.validRows.map(enroll => ({
        datasetId: dataset.id,
        studentId: enroll.studentId,
        courseCode: enroll.courseCode,
        classNo: enroll.classNo,
      }));

      for (let i = 0; i < enrollmentsToInsert.length; i += ENROLL_BATCH_SIZE) {
        const batch = enrollmentsToInsert.slice(i, i + ENROLL_BATCH_SIZE);
        try {
          // Use createMany with skipDuplicates for better performance
          const result = await prisma.enrollment.createMany({
            data: batch,
            skipDuplicates: true,
          });
          enrollInserted += result.count;
        } catch (err) {
          console.error("Error inserting enrollment batch:", err);
          // Fallback to individual inserts if batch fails
          for (const enroll of batch) {
            try {
              await prisma.enrollment.create({
                data: enroll,
              });
              enrollInserted++;
            } catch (e) {
              // Skip duplicates
              if (!(e as any).code?.includes('P2002')) {
                failed++;
              }
            }
          }
        }
      }
    }

    // Insert lecturer exams (only for lecturer upload type)
    let lecturerInserted = 0;
    if (uploadType === "lecturer") {
      console.log(`[Upload] Starting to insert ${lecturerResult.validRows.length} lecturer exams into dataset ${dataset.id}`);
      for (const exam of lecturerResult.validRows) {
        try {
          await prisma.lecturerExam.create({
            data: {
              datasetId: dataset.id,
              lecturerName: exam.lecturerName.trim(),
              role: exam.role?.trim() || null,
              grade: exam.grade?.trim() || null,
              examCode: exam.examCode?.trim() || null,
              section: exam.section.trim(),
              courseCode: exam.courseCode.trim(),
              courseName: exam.courseName.trim(),
              numberOfStudents: exam.numberOfStudents ?? null,
              room: exam.room.trim(),
              column: exam.column || null,
              day: exam.day?.trim() || null,
              examDate: exam.examDate,
              examPeriod: exam.examPeriod.trim(),
              periodStart: exam.periodStart.trim(),
              invigilator: exam.invigilator?.trim() || null,
            },
          });
          lecturerInserted++;
        } catch (err) {
          console.error(`[Upload] Error inserting lecturer exam:`, err);
          failed++;
        }
      }
      console.log(`[Upload] Lecturer insertion complete: ${lecturerInserted} inserted, ${failed} failed`);
    }

    // Verify data was actually saved
    const savedExamCount = await prisma.courseExam.count({
      where: { datasetId: dataset.id },
    });
    const savedEnrollCount = await prisma.enrollment.count({
      where: { datasetId: dataset.id },
    });
    const savedLecturerCount = await prisma.lecturerExam.count({
      where: { datasetId: dataset.id },
    });
    
    console.log(`[Upload] Verification: ${savedExamCount} exams, ${savedEnrollCount} enrollments, ${savedLecturerCount} lecturer exams saved to database`);

    return NextResponse.json({
      success: true,
      datasetId: dataset.id,
      fileType,
      filesProcessed: {
        examFiles: uploadType === "student" ? examFiles.length : 0,
        enrollFiles: uploadType === "student" ? enrollFiles.length : 0,
        lecturerFiles: uploadType === "lecturer" ? lecturerFiles.length : 0,
      },
      summary: {
        inserted: examInserted + enrollInserted + lecturerInserted,
        updated: examUpdated,
        failed,
        savedExamCount,
        savedEnrollCount,
        savedLecturerCount,
        details: {
          exams: { inserted: examInserted, updated: examUpdated },
          enrollments: { inserted: enrollInserted },
          lecturerExams: { inserted: lecturerInserted },
        },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    // Check if it's a timeout error
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('TIMEOUT'))) {
      return NextResponse.json(
        {
          error: "Upload timeout: File processing took too long. Please try splitting large files into smaller ones or reducing the number of rows.",
          timeout: true,
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

