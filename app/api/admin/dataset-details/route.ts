import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const datasetId = searchParams.get("datasetId");

    if (!datasetId) {
      return NextResponse.json(
        { error: "Dataset ID is required" },
        { status: 400 }
      );
    }

    // Get dataset
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    const isLecturerDataset = dataset.type === "lecturer";

    // Get data based on dataset type
    let allExams: any[] = [];
    let allLecturerExams: any[] = [];
    let allEnrollments: any[] = [];
    let uniqueCourses: any[] = [];
    let uniqueStudents: any[] = [];
    let uniqueLecturers: any[] = [];

    if (isLecturerDataset) {
      // Get lecturer exams
      allLecturerExams = await prisma.lecturerExam.findMany({
        where: { datasetId },
        orderBy: [
          { examDate: "asc" },
          { periodStart: "asc" },
          { lecturerName: "asc" },
        ],
      });

      // Get unique lecturers for summary
      const lecturers = await prisma.lecturerExam.findMany({
        where: { datasetId },
        select: { lecturerName: true },
        distinct: ["lecturerName"],
      });
      uniqueLecturers = lecturers.map(l => l.lecturerName);
    } else {
      // Get all exams - sort by date string (works for both Hijri and Gregorian)
      allExams = await prisma.courseExam.findMany({
        where: { datasetId },
        orderBy: [
          { examDate: "asc" }, // String sorting works for YYYY-MM-DD format
          { startTime: "asc" },
          { courseCode: "asc" },
        ],
      });

      // Get all enrollments
      allEnrollments = await prisma.enrollment.findMany({
        where: { datasetId },
        orderBy: [
          { studentId: "asc" },
          { courseCode: "asc" },
        ],
      });

      // Get unique courses for summary
      uniqueCourses = await prisma.courseExam.findMany({
        where: { datasetId },
        select: { courseCode: true, courseName: true },
        distinct: ["courseCode"],
      });

      // Get unique students for summary
      const students = await prisma.enrollment.findMany({
        where: { datasetId },
        select: { studentId: true },
        distinct: ["studentId"],
      });
      uniqueStudents = students.map(s => s.studentId);
    }

    return NextResponse.json({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdAt: dataset.createdAt,
        isActive: dataset.isActive,
        type: dataset.type || "student",
      },
      summary: {
        totalExams: allExams.length,
        totalLecturerExams: allLecturerExams.length,
        totalEnrollments: allEnrollments.length,
        uniqueCourses: uniqueCourses.length,
        uniqueStudents: uniqueStudents.length,
        uniqueLecturers: uniqueLecturers.length,
      },
      exams: allExams.map((exam) => {
        try {
          return {
            id: exam.id,
            courseCode: exam.courseCode,
            courseName: exam.courseName,
            classNo: exam.classNo,
            examDate: exam.examDate instanceof Date 
              ? exam.examDate.toISOString().split("T")[0]
              : exam.examDate,
            startTime: exam.startTime,
            endTime: exam.endTime,
            place: exam.place,
            period: exam.period,
            rows: exam.rows,
            seats: exam.seats,
          };
        } catch (err) {
          console.error(`[Dataset Details] Error formatting exam ${exam.id}:`, err);
          return {
            id: exam.id,
            courseCode: exam.courseCode || "",
            courseName: exam.courseName || "",
            classNo: exam.classNo || "",
            examDate: exam.examDate || "",
            startTime: exam.startTime || "",
            endTime: exam.endTime || "",
            place: exam.place || "",
            period: exam.period || "",
            rows: exam.rows,
            seats: exam.seats,
          };
        }
      }),
      lecturerExams: allLecturerExams.map((exam) => ({
        id: exam.id,
        lecturerName: exam.lecturerName,
        doctorRole: exam.doctorRole,
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
        commenter1Name: exam.commenter1Name,
        commenter1Role: exam.commenter1Role,
        commenter2Name: exam.commenter2Name,
        commenter2Role: exam.commenter2Role,
        commenter3Name: exam.commenter3Name,
        commenter3Role: exam.commenter3Role,
        commenter4Name: exam.commenter4Name,
        commenter4Role: exam.commenter4Role,
        commenter5Name: exam.commenter5Name,
        commenter5Role: exam.commenter5Role,
      })),
      enrollments: allEnrollments.map((enroll) => ({
        id: enroll.id,
        studentId: enroll.studentId,
        courseCode: enroll.courseCode,
        classNo: enroll.classNo,
      })),
    });
  } catch (error) {
    console.error("Error fetching dataset details:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

