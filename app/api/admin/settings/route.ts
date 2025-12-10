import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create settings
    let settings = await prisma.settings.findUnique({
      where: { id: "settings" },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.settings.create({
        data: {
          id: "settings",
          studentSearchActive: true,
          lecturerSearchActive: true,
        },
      });
    }

    return NextResponse.json({
      studentSearchActive: settings.studentSearchActive,
      lecturerSearchActive: settings.lecturerSearchActive,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentSearchActive, lecturerSearchActive } = await request.json();

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { id: "settings" },
      update: {
        studentSearchActive: studentSearchActive ?? undefined,
        lecturerSearchActive: lecturerSearchActive ?? undefined,
      },
      create: {
        id: "settings",
        studentSearchActive: studentSearchActive ?? true,
        lecturerSearchActive: lecturerSearchActive ?? true,
      },
    });

    return NextResponse.json({
      studentSearchActive: settings.studentSearchActive,
      lecturerSearchActive: settings.lecturerSearchActive,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



