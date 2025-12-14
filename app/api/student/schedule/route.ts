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
    const schedules = await prisma.courseExam.findMany({
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

    // Format response - examDate is already a string (supports Hijri dates)
    const formattedSchedules = schedules.map((exam) => ({
      courseName: exam.courseName,
      courseCode: exam.courseCode,
      classNo: exam.classNo,
      examDate: exam.examDate, // Already a string, can be Hijri like "1447-07-01"
      startTime: exam.startTime,
      endTime: exam.endTime,
      place: exam.place,
      period: exam.period,
      rows: exam.rows,
      seats: exam.seats,
    }));

    return NextResponse.json({ schedules: formattedSchedules });
  } catch (error) {
    console.error("Schedule lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

