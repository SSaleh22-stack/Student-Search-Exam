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

    const formData = await request.formData();
    
    // Early file size validation (10MB per file, 20MB total)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
    
    const examFiles = formData.getAll("examFiles") as File[];
    const enrollFiles = formData.getAll("enrollFiles") as File[];
    const lecturerFiles = formData.getAll("lecturerFiles") as File[];
    
    let totalSize = 0;
    for (const file of [...examFiles, ...enrollFiles, ...lecturerFiles]) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { 
            error: `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum file size is 10MB. Please split the file into smaller parts.`,
            fileSize: file.size,
            maxFileSize: MAX_FILE_SIZE,
          },
          { status: 400 }
        );
      }
      totalSize += file.size;
    }
    
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { 
          error: `Total file size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the limit of 20MB. Please upload fewer or smaller files.`,
          totalSize,
          maxTotalSize: MAX_TOTAL_SIZE,
        },
        { status: 400 }
      );
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
      // Process exam and enrollment files in parallel for faster processing
      console.log(`[Upload] Processing ${examFiles.length} exam file(s) and ${enrollFiles.length} enrollment file(s) in parallel`);
      
      const [examResults, enrollResults] = await Promise.all([
        // Process all exam files in parallel
        Promise.all(
          examFiles.map(async (examFile, i) => {
            try {
              const result = await parseExamSchedule(examFile, examMapping);
              console.log(`[Upload] Exam file ${i + 1}/${examFiles.length}: ${result.validRows.length} valid rows`);
              return result;
            } catch (err) {
              console.error(`[Upload] Error parsing exam file ${i + 1}:`, err);
              throw new Error(`Failed to parse exam schedule file ${i + 1}: ${examFile.name}`);
            }
          })
        ),
        // Process all enrollment files in parallel
        Promise.all(
          enrollFiles.map(async (enrollFile, i) => {
            try {
              // Detect file structure
              const enrollStructure = await detectFileStructure(enrollFile);
              
              // Use appropriate parser based on detected structure
              let result;
              if (enrollStructure.isBlockStructure) {
                fileType = "block-structured";
                result = await parseEnrollmentsFromBlocks(enrollFile);
                console.log(`[Upload] Enrollment file ${i + 1}: Block-structured - ${result.validRows.length} enrollments`);
              } else if (enrollStructure.isSectionStructure) {
                fileType = "section-structured";
                result = await parseEnrollmentsFromSections(enrollFile);
                console.log(`[Upload] Enrollment file ${i + 1}: Section-structured - ${result.validRows.length} enrollments`);
              } else {
                // Regular table structure - requires mapping
                if (!enrollMapping) {
                  throw new Error(`Header mapping required for table-structured enrollment file ${i + 1}: ${enrollFile.name}`);
                }
                result = await parseEnrollments(enrollFile, enrollMapping);
                console.log(`[Upload] Enrollment file ${i + 1}: Table-structured - ${result.validRows.length} enrollments`);
              }
              return result;
            } catch (err) {
              console.error(`[Upload] Error processing enrollment file ${i + 1}:`, err);
              throw err instanceof Error ? err : new Error(`Failed to process enrollment file ${i + 1}: ${enrollFile.name}`);
            }
          })
        ),
      ]);

      // Combine exam results
      const allExamRows: any[] = [];
      const allExamErrors: any[] = [];
      examResults.forEach(result => {
        allExamRows.push(...result.validRows);
        allExamErrors.push(...result.errors);
      });
      
      examResult = {
        validRows: allExamRows,
        errors: allExamErrors,
      };
      console.log(`[Upload] Total exam results: ${examResult.validRows.length} valid rows, ${examResult.errors.length} errors`);

      // Combine enrollment results
      const allEnrollRows: any[] = [];
      const allEnrollErrors: any[] = [];
      enrollResults.forEach(result => {
        allEnrollRows.push(...result.validRows);
        allEnrollErrors.push(...result.errors);
      });
      
      enrollResult = {
        validRows: allEnrollRows,
        errors: allEnrollErrors,
      };
      console.log(`[Upload] Total enrollment results: ${enrollResult.validRows.length} valid rows, ${enrollResult.errors.length} errors`);

      // Warn if too many rows (may cause timeout)
      const MAX_RECOMMENDED_ROWS = 10000;
      if (enrollResult.validRows.length > MAX_RECOMMENDED_ROWS) {
        console.warn(`[Upload] WARNING: Large enrollment file detected (${enrollResult.validRows.length} rows). Processing may take longer.`);
      }
      if (examResult.validRows.length > MAX_RECOMMENDED_ROWS) {
        console.warn(`[Upload] WARNING: Large exam file detected (${examResult.validRows.length} rows). Processing may take longer.`);
      }

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

    // Process student upload type
    if (uploadType === "student") {
      // Insert enrollments FIRST (usually the largest dataset, process early to avoid timeout)
      console.log(`[Upload] Processing ${enrollResult.validRows.length} enrollments FIRST (largest dataset)`);
      const ENROLL_BATCH_SIZE = 1000; // Very large batch size for maximum speed
      const enrollmentsToInsert = enrollResult.validRows.map(enroll => ({
        datasetId: dataset.id,
        studentId: String(enroll.studentId).trim(),
        courseCode: String(enroll.courseCode).trim(),
        classNo: String(enroll.classNo).trim(),
      }));

      // Process in large batches - let database handle duplicates
      for (let i = 0; i < enrollmentsToInsert.length; i += ENROLL_BATCH_SIZE) {
        const batch = enrollmentsToInsert.slice(i, i + ENROLL_BATCH_SIZE);
        try {
          // Use createMany with skipDuplicates - fastest method
          const result = await prisma.enrollment.createMany({
            data: batch,
            skipDuplicates: true,
          });
          enrollInserted += result.count;
        } catch (err) {
          console.error(`[Upload] Error inserting enrollment batch ${Math.floor(i / ENROLL_BATCH_SIZE) + 1}:`, err);
          // If large batch fails, try medium batches
          const MEDIUM_BATCH = 500;
          for (let j = 0; j < batch.length; j += MEDIUM_BATCH) {
            const mediumBatch = batch.slice(j, j + MEDIUM_BATCH);
            try {
              const result = await prisma.enrollment.createMany({
                data: mediumBatch,
                skipDuplicates: true,
              });
              enrollInserted += result.count;
            } catch (e) {
              // If medium batch fails, try small batches
              const SMALL_BATCH = 100;
              for (let k = 0; k < mediumBatch.length; k += SMALL_BATCH) {
                const smallBatch = mediumBatch.slice(k, k + SMALL_BATCH);
                try {
                  const result = await prisma.enrollment.createMany({
                    data: smallBatch,
                    skipDuplicates: true,
                  });
                  enrollInserted += result.count;
                } catch (smallErr) {
                  console.error("Error inserting small enrollment batch:", smallErr);
                  failed += smallBatch.length;
                }
              }
            }
          }
        }
      }
      console.log(`[Upload] Enrollment insertion complete: ${enrollInserted} inserted, ${failed} failed`);

      // Insert exam schedules (after enrollments)
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

        // Validate date format (should be YYYY-MM-DD, supports both Hijri and Gregorian dates)
        const examDateStr = String(exam.examDate).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(examDateStr)) {
          console.error(`[Upload] Invalid date format for exam:`, exam.examDate);
          failed++;
          continue;
        }

        // Keep date as-is from Excel (Hijri or Gregorian - no conversion)

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

      // Batch process exams in larger parallel batches for speed
      console.log(`[Upload] Processing ${validExams.length} valid exams in batches of 100`);
      const BATCH_SIZE = 100; // Increased batch size
      for (let i = 0; i < validExams.length; i += BATCH_SIZE) {
        const batch = validExams.slice(i, i + BATCH_SIZE);
        // Process batch in parallel
        await Promise.all(
          batch.map(async (exam) => {
            try {
              // Try to create first (faster for new records)
              try {
                await prisma.courseExam.create({ data: exam });
                examInserted++;
              } catch (createErr: any) {
                // If unique constraint violation, update instead
                if (createErr?.code === 'P2002') {
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
                  throw createErr;
                }
              }
            } catch (err) {
              console.error(`[Upload] Error processing exam:`, err);
              failed++;
            }
          })
        );
      }
      console.log(`[Upload] Exam insertion complete: ${examInserted} inserted, ${examUpdated} updated, ${failed} failed`);
    }

    // Insert lecturer exams (only for lecturer upload type)
    let lecturerInserted = 0;
    if (uploadType === "lecturer") {
      console.log(`[Upload] Starting to insert ${lecturerResult.validRows.length} lecturer exams into dataset ${dataset.id}`);
      for (const exam of lecturerResult.validRows) {
        try {
          // Keep date as-is from Excel (Hijri or Gregorian - no conversion)
          const examDateStr = String(exam.examDate).trim();

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
              examDate: examDateStr,
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

