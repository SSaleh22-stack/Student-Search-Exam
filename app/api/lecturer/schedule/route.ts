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
    const exactMatch = searchParams.get("exactMatch") === "true";

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
    
    const allExams = await prisma.lecturerExam.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
    });
    
    // Filter exams based on search mode
    let exams;
    if (exactMatch) {
      // Exact match: match the exact lecturer name (case-insensitive)
      const searchNameLower = lecturerName.trim().toLowerCase();
      exams = allExams.filter(exam => 
        exam.lecturerName.toLowerCase() === searchNameLower
      );
    } else {
      // Flexible match: all search words must appear in the lecturer name (in any order)
      const searchWords = lecturerName.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      if (searchWords.length === 0) {
        return NextResponse.json(
          { error: "Lecturer name is required" },
          { status: 400 }
        );
      }
      
      exams = allExams.filter(exam => {
        const examNameLower = exam.lecturerName.toLowerCase();
        // Check if all search words are present in the lecturer name
        return searchWords.every(word => examNameLower.includes(word));
      });
    }

    // Get unique lecturer names
    const uniqueLecturerNames = Array.from(new Set(exams.map(exam => exam.lecturerName)));

    // If multiple unique lecturer names found, return them for selection
    if (uniqueLecturerNames.length > 1) {
      return NextResponse.json({ 
        lecturerNames: uniqueLecturerNames.sort(),
        multipleMatches: true 
      });
    }

    // If only one or zero matches, proceed with exams
    const sortedExams = exams.sort((a, b) => {
      // Sort by date then time
      if (a.examDate !== b.examDate) {
        return a.examDate.localeCompare(b.examDate);
      }
      return a.periodStart.localeCompare(b.periodStart);
    });

    // Format response
    const formattedExams = sortedExams.map((exam) => ({
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

