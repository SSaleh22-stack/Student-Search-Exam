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

    // Find exams for enrolled courses across all active student datasets
    const exams = await prisma.courseExam.findMany({
      where: {
        datasetId: { in: datasetIds },
        OR: enrollments.map((e) => ({
          courseCode: e.courseCode,
          classNo: e.classNo,
        })),
      },
      orderBy: [
        { examDate: "asc" },
        { startTime: "asc" },
      ],
    });

    // Create a map of exams by courseCode and classNo for quick lookup
    const examMap = new Map<string, typeof exams>();
    exams.forEach((exam) => {
      const key = `${exam.courseCode}_${exam.classNo}`;
      if (!examMap.has(key)) {
        examMap.set(key, []);
      }
      examMap.get(key)!.push(exam);
    });

    // Build schedules: include all enrollments, mark those without exam data
    const formattedSchedules: Array<{
      courseName: string;
      courseCode: string;
      classNo: string;
      examDate?: string;
      startTime?: string;
      endTime?: string | null;
      place?: string;
      period?: string;
      rows?: string | null;
      seats?: number | null;
      hasExamInfo: boolean;
    }> = [];

    enrollments.forEach((enrollment) => {
      const key = `${enrollment.courseCode}_${enrollment.classNo}`;
      const courseExams = examMap.get(key) || [];

      if (courseExams.length === 0) {
        // No exam data found for this enrollment
        formattedSchedules.push({
          courseName: "", // Will be filled from enrollment if available
          courseCode: enrollment.courseCode,
          classNo: enrollment.classNo,
          hasExamInfo: false,
        });
      } else {
        // Add all exams for this course/section
        courseExams.forEach((exam) => {
          formattedSchedules.push({
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
            hasExamInfo: true,
          });
        });
      }
    });

    // Sort: courses with exam info first, then by course code, class number, and exam date
    // Courses without exam info go to the end
    formattedSchedules.sort((a, b) => {
      // First, prioritize courses with exam info
      if (a.hasExamInfo !== b.hasExamInfo) {
        return a.hasExamInfo ? -1 : 1; // hasExamInfo: true comes first (returns -1)
      }
      
      // If both have exam info or both don't, sort by course code
      if (a.courseCode !== b.courseCode) {
        return a.courseCode.localeCompare(b.courseCode);
      }
      
      // Then by class number
      if (a.classNo !== b.classNo) {
        return a.classNo.localeCompare(b.classNo);
      }
      
      // Then by exam date (if both have exam info)
      if (a.examDate && b.examDate) {
        return a.examDate.localeCompare(b.examDate);
      }
      
      return 0;
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

