import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Check if lecturer search is active
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "settings" },
    });

    if (settings && !settings.lecturerSearchActive) {
      return NextResponse.json(
        { error: "Lecturer search is currently disabled" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error checking lecturer search settings:", error);
    // Continue if settings check fails (for backward compatibility)
  }

  // Rate limiting
  const clientId = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(`lecturer-lookup-${clientId}`);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const lecturerName = searchParams.get("lecturerName");

    if (!lecturerName || !lecturerName.trim()) {
      return NextResponse.json(
        { error: "Lecturer name is required" },
        { status: 400 }
      );
    }

    // Find active lecturer datasets
    const activeDatasets = await prisma.dataset.findMany({
      where: { 
        isActive: true,
        type: "lecturer",
      },
    });

    if (activeDatasets.length === 0) {
      return NextResponse.json(
        { error: "No active lecturer dataset found" },
        { status: 404 }
      );
    }

    const datasetIds = activeDatasets.map(d => d.id);

    // Find exams for this lecturer (case-insensitive search with flexible matching)
    // Split search query into words and match all words (in any order)
    const searchWords = lecturerName.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    if (searchWords.length === 0) {
      return NextResponse.json(
        { error: "Lecturer name is required" },
        { status: 400 }
      );
    }
    
    const allExams = await prisma.lecturerExam.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
    });
    
    // Filter: all search words must appear in the lecturer name (in any order)
    const exams = allExams.filter(exam => {
      const examNameLower = exam.lecturerName.toLowerCase();
      // Check if all search words are present in the lecturer name
      return searchWords.every(word => examNameLower.includes(word));
    }).sort((a, b) => {
      // Sort by date then time
      if (a.examDate !== b.examDate) {
        return a.examDate.localeCompare(b.examDate);
      }
      return a.periodStart.localeCompare(b.periodStart);
    });

    // Format response
    const formattedExams = exams.map((exam) => ({
      lecturerName: exam.lecturerName,
      role: exam.role,
      grade: exam.grade,
      examCode: exam.examCode,
      section: exam.section,
      courseCode: exam.courseCode,
      courseName: exam.courseName,
      numberOfStudents: exam.numberOfStudents,
      room: exam.room,
      column: exam.column,
      day: exam.day,
      examDate: exam.examDate,
      examPeriod: exam.examPeriod,
      periodStart: exam.periodStart,
      invigilator: exam.invigilator,
    }));

    return NextResponse.json({ exams: formattedExams });
  } catch (error) {
    console.error("Lecturer schedule lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

