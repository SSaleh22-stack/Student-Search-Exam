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
    const { getCurrentAdmin } = await import("@/lib/auth");
    const admin = await getCurrentAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin has permission to manage settings
    // Head admins can always manage settings, or admins with canManageSettings permission
    if (!admin.isHeadAdmin && !admin.canManageSettings) {
      return NextResponse.json(
        { error: "غير مصرح. ليس لديك صلاحية لإدارة الإعدادات. يرجى الاتصال برئيس المسؤولين." },
        { status: 403 }
      );
    }

    const { studentSearchActive, lecturerSearchActive } = await request.json();

    // Build update object - only include fields that are explicitly provided (not undefined)
    const updateData: any = {};
    if (studentSearchActive !== undefined) {
      updateData.studentSearchActive = studentSearchActive;
    }
    if (lecturerSearchActive !== undefined) {
      updateData.lecturerSearchActive = lecturerSearchActive;
    }

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { id: "settings" },
      update: updateData,
      create: {
        id: "settings",
        studentSearchActive: studentSearchActive !== undefined ? studentSearchActive : true,
        lecturerSearchActive: lecturerSearchActive !== undefined ? lecturerSearchActive : true,
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



