import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { detectFileStructure } from "@/lib/excel/detectStructure";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;

    if (!file || !fileType) {
      return NextResponse.json(
        { error: "Missing file or fileType" },
        { status: 400 }
      );
    }

    // Only check structure for enrollment files
    if (fileType !== "enroll") {
      return NextResponse.json({
        isBlockStructure: false,
        message: "Structure detection only available for enrollment files",
      });
    }

    const structure = await detectFileStructure(file);

    return NextResponse.json({
      isBlockStructure: structure.isBlockStructure,
      isSectionStructure: structure.isSectionStructure,
      blockCount: structure.blockCount,
      estimatedRows: structure.estimatedRows,
      message: structure.isBlockStructure
        ? `Block-structured file detected with ${structure.blockCount} blocks. The system will automatically extract student IDs, names, course codes, and class/section numbers.`
        : structure.isSectionStructure
        ? "Course-section structured file detected. The system will automatically extract student IDs, course codes, and section numbers."
        : "Table-structured file. Please map headers manually.",
    });
  } catch (error) {
    console.error("Error checking structure:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

