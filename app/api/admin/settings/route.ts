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
      studentActivateDate: settings.studentActivateDate,
      studentActivateTime: settings.studentActivateTime,
      lecturerActivateDate: settings.lecturerActivateDate,
      lecturerActivateTime: settings.lecturerActivateTime,
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

    const { 
      studentSearchActive, 
      lecturerSearchActive,
      studentActivateDate,
      studentActivateTime,
      lecturerActivateDate,
      lecturerActivateTime,
    } = await request.json();

    // Build update object - only include fields that are explicitly provided (not undefined)
    const updateData: any = {};
    if (studentSearchActive !== undefined) {
      updateData.studentSearchActive = studentSearchActive;
      // If activating immediately, clear scheduled activation
      if (studentSearchActive) {
        updateData.studentActivateDate = null;
        updateData.studentActivateTime = null;
      }
    }
    if (lecturerSearchActive !== undefined) {
      updateData.lecturerSearchActive = lecturerSearchActive;
      // If activating immediately, clear scheduled activation
      if (lecturerSearchActive) {
        updateData.lecturerActivateDate = null;
        updateData.lecturerActivateTime = null;
      }
    }
    
    // Handle scheduled activation for student page
    if (studentActivateDate !== undefined && studentActivateTime !== undefined) {
      // Validate date format (YYYY-MM-DD)
      if (studentActivateDate && !/^\d{4}-\d{2}-\d{2}$/.test(studentActivateDate)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      // Validate time format (HH:MM)
      if (studentActivateTime && !/^\d{2}:\d{2}$/.test(studentActivateTime)) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:MM" },
          { status: 400 }
        );
      }
      updateData.studentActivateDate = studentActivateDate || null;
      updateData.studentActivateTime = studentActivateTime || null;
      // Don't activate immediately if scheduling
      if (studentActivateDate && studentActivateTime) {
        updateData.studentSearchActive = false;
      }
    }
    
    // Handle scheduled activation for lecturer page
    if (lecturerActivateDate !== undefined && lecturerActivateTime !== undefined) {
      // Validate date format (YYYY-MM-DD)
      if (lecturerActivateDate && !/^\d{4}-\d{2}-\d{2}$/.test(lecturerActivateDate)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      // Validate time format (HH:MM)
      if (lecturerActivateTime && !/^\d{2}:\d{2}$/.test(lecturerActivateTime)) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:MM" },
          { status: 400 }
        );
      }
      updateData.lecturerActivateDate = lecturerActivateDate || null;
      updateData.lecturerActivateTime = lecturerActivateTime || null;
      // Don't activate immediately if scheduling
      if (lecturerActivateDate && lecturerActivateTime) {
        updateData.lecturerSearchActive = false;
      }
    }

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { id: "settings" },
      update: updateData,
      create: {
        id: "settings",
        studentSearchActive: studentSearchActive !== undefined ? studentSearchActive : true,
        lecturerSearchActive: lecturerSearchActive !== undefined ? lecturerSearchActive : true,
        studentActivateDate: studentActivateDate || null,
        studentActivateTime: studentActivateTime || null,
        lecturerActivateDate: lecturerActivateDate || null,
        lecturerActivateTime: lecturerActivateTime || null,
      },
    });

    return NextResponse.json({
      studentSearchActive: settings.studentSearchActive,
      lecturerSearchActive: settings.lecturerSearchActive,
      studentActivateDate: settings.studentActivateDate,
      studentActivateTime: settings.studentActivateTime,
      lecturerActivateDate: settings.lecturerActivateDate,
      lecturerActivateTime: settings.lecturerActivateTime,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



