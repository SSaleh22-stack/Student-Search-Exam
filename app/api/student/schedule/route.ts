import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkAllScheduledActivations } from "@/lib/scheduled-activation";

export async function GET(request: NextRequest) {
  // Check for scheduled activations first
  try {
    await checkAllScheduledActivations();
  } catch (error) {
    console.error("Error checking scheduled activations:", error);
    // Continue even if check fails
  }

  // Check if student search is active
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "settings" },
    });

    if (settings && !settings.studentSearchActive) {
      return NextResponse.json(
        { error: "Student search is currently disabled" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error checking student search settings:", error);
    // Continue if settings check fails (for backward compatibility)
  }

  // Rate limiting
  const clientId = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(`student-lookup-${clientId}`);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");

    if (!studentId || !studentId.trim()) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Find active student datasets
    const activeDatasets = await prisma.dataset.findMany({
      where: { 
        isActive: true,
        OR: [
          { type: "student" },
          { type: null }, // For backward compatibility if type is not set
        ],
      },
    });

    if (activeDatasets.length === 0) {
      return NextResponse.json(
        { error: "No active student dataset found" },
        { status: 404 }
      );
    }

    const datasetIds = activeDatasets.map(d => d.id);

    // Find enrollments for this student across all active student datasets
    const enrollments = await prisma.enrollment.findMany({
      where: {
        datasetId: { in: datasetIds },
        studentId: studentId.trim(),
      },
    });

    if (enrollments.length === 0) {
      return NextResponse.json({ schedules: [] });
    }

    // Find all exams in active datasets (we'll do flexible matching)
    const allExams = await prisma.courseExam.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
      orderBy: [
        { examDate: "asc" },
        { startTime: "asc" },
      ],
    });

    // Helper function to normalize for matching (trim and handle whitespace)
    const normalizeForMatching = (str: string): string => {
      return str.trim().replace(/\s+/g, ' ').toUpperCase();
    };

    // Create a map of exams by normalized courseCode + classNo for quick lookup
    // Store arrays to handle multiple exams per course+class (different dates/periods)
    const examMap = new Map<string, typeof allExams>();
    const examMapByNormalized = new Map<string, typeof allExams>();
    
    allExams.forEach((exam) => {
      const normalizedKey = `${normalizeForMatching(exam.courseCode)}|${normalizeForMatching(exam.classNo)}`;
      const exactKey = `${exam.courseCode}|${exam.classNo}`;
      
      // Store both exact and normalized keys (arrays to handle multiple exams)
      if (!examMap.has(exactKey)) {
        examMap.set(exactKey, []);
      }
      examMap.get(exactKey)!.push(exam);
      
      if (!examMapByNormalized.has(normalizedKey)) {
        examMapByNormalized.set(normalizedKey, []);
      }
      examMapByNormalized.get(normalizedKey)!.push(exam);
    });

    // Build schedules: include all enrollments, with exam data if available
    const formattedSchedules = enrollments.map((enrollment) => {
      // Try exact match first
      const exactKey = `${enrollment.courseCode}|${enrollment.classNo}`;
      let examArray = examMap.get(exactKey);
      
      // If no exact match, try normalized match
      if (!examArray || examArray.length === 0) {
        const normalizedKey = `${normalizeForMatching(enrollment.courseCode)}|${normalizeForMatching(enrollment.classNo)}`;
        examArray = examMapByNormalized.get(normalizedKey);
      }
      
      // If still no match, try case-insensitive and trimmed match
      if (!examArray || examArray.length === 0) {
        examArray = allExams.filter(e => 
          normalizeForMatching(e.courseCode) === normalizeForMatching(enrollment.courseCode) &&
          normalizeForMatching(e.classNo) === normalizeForMatching(enrollment.classNo)
        );
      }

      // Get the first exam (earliest date) if multiple exist
      const exam = examArray && examArray.length > 0 
        ? examArray.sort((a, b) => {
            if (a.examDate !== b.examDate) {
              return a.examDate.localeCompare(b.examDate);
            }
            return (a.startTime || "").localeCompare(b.startTime || "");
          })[0]
        : null;

      if (exam) {
        // Has exam information
        return {
          courseName: exam.courseName,
          courseCode: exam.courseCode,
          classNo: exam.classNo,
          examDate: exam.examDate,
          startTime: exam.startTime,
          endTime: exam.endTime,
          place: exam.place,
          period: exam.period,
          rows: exam.rows,
          seats: exam.seats,
          hasInfo: true,
        };
      } else {
        // No exam information available - need to get course name from enrollment if available
        // For now, we'll use courseCode as courseName if not available
        // Note: Enrollment table doesn't have courseName, so we'll need to handle this
        return {
          courseName: enrollment.courseCode, // Fallback, will be updated if we have course name
          courseCode: enrollment.courseCode,
          classNo: enrollment.classNo,
          examDate: null,
          startTime: null,
          endTime: null,
          place: null,
          period: null,
          rows: null,
          seats: null,
          hasInfo: false,
        };
      }
    });

    // Try to get course names from exams for enrollments without exam info
    // Check if any exam has the same courseCode to get the course name (even if different classNo)
    const courseNameMap = new Map<string, string>();
    const courseNameMapNormalized = new Map<string, string>();
    
    allExams.forEach((exam) => {
      // Store both exact and normalized course codes
      if (!courseNameMap.has(exam.courseCode)) {
        courseNameMap.set(exam.courseCode, exam.courseName);
      }
      const normalizedCode = normalizeForMatching(exam.courseCode);
      if (!courseNameMapNormalized.has(normalizedCode)) {
        courseNameMapNormalized.set(normalizedCode, exam.courseName);
      }
    });
    
    formattedSchedules.forEach((schedule) => {
      if (!schedule.hasInfo) {
        // Try to find course name from any exam with same courseCode (exact or normalized)
        let courseName = courseNameMap.get(schedule.courseCode);
        if (!courseName) {
          const normalizedCode = normalizeForMatching(schedule.courseCode);
          courseName = courseNameMapNormalized.get(normalizedCode);
        }
        if (courseName) {
          schedule.courseName = courseName;
        }
      }
    });

    // Sort: exams with dates first, then by date/time, then courses without info
    formattedSchedules.sort((a, b) => {
      if (a.hasInfo && !b.hasInfo) return -1;
      if (!a.hasInfo && b.hasInfo) return 1;
      if (a.hasInfo && b.hasInfo) {
        if (a.examDate !== b.examDate) {
          return a.examDate!.localeCompare(b.examDate!);
        }
        return (a.startTime || "").localeCompare(b.startTime || "");
      }
      // Both have no info, sort by course code
      return a.courseCode.localeCompare(b.courseCode);
    });

    return NextResponse.json({ schedules: formattedSchedules });
  } catch (error) {
    console.error("Schedule lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

