import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAllScheduledActivations } from "@/lib/scheduled-activation";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { getCurrentAdmin } = await import("@/lib/auth");
    const admin = await getCurrentAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin has permission to manage datasets
    // Head admins can always manage, or admins with canManageDatasets permission
    if (!admin.isHeadAdmin && !admin.canManageDatasets) {
      return NextResponse.json(
        { error: "غير مصرح. ليس لديك صلاحية لإدارة مجموعات البيانات. يرجى الاتصال برئيس المسؤولين." },
        { status: 403 }
      );
    }

    const { datasetId, activateDate, activateTime, timezoneOffset } = await request.json();

    if (!datasetId) {
      return NextResponse.json(
        { error: "Dataset ID is required" },
        { status: 400 }
      );
    }

    // Get the dataset to check its current state
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    // If activateDate and activateTime are provided, schedule activation
    // Otherwise, activate immediately
    if (activateDate && activateTime) {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(activateDate)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      
      // Validate time format (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(activateTime)) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:MM" },
          { status: 400 }
        );
      }

      // Check if scheduled time is in the past
      const scheduledDateTime = new Date(`${activateDate}T${activateTime}`);
      const now = new Date();
      
      if (now >= scheduledDateTime) {
        // Scheduled time has already passed, activate immediately
        // First deactivate other datasets of the same type
        if (dataset.type) {
          await prisma.dataset.updateMany({
            where: {
              type: dataset.type,
              id: { not: datasetId },
            },
            data: { isActive: false },
          });
        } else {
          await prisma.dataset.updateMany({
            where: {
              type: null,
              id: { not: datasetId },
            },
            data: { isActive: false },
          });
        }
        
        await prisma.dataset.update({
          where: { id: datasetId },
          data: { 
            isActive: true,
            activateDate: null,
            activateTime: null,
          },
        });
      } else {
        // Schedule activation - store date and time, but don't activate yet
    await prisma.dataset.update({
      where: { id: datasetId },
          data: { 
            activateDate,
            activateTime,
            isActive: false, // Will be activated at scheduled time
          },
        });
      }
    } else {
      // Activate immediately - clear any scheduled activation
      // First deactivate other datasets of the same type
      if (dataset.type) {
        await prisma.dataset.updateMany({
          where: {
            type: dataset.type,
            id: { not: datasetId },
          },
          data: { isActive: false },
        });
      } else {
        await prisma.dataset.updateMany({
          where: {
            type: null,
            id: { not: datasetId },
          },
          data: { isActive: false },
        });
      }
      
        await prisma.dataset.update({
          where: { id: datasetId },
          data: { 
            isActive: !dataset.isActive,
            activateDate: null,
            activateTime: null,
            activateTimezoneOffset: null,
          },
    });
    }

    // Check for any other scheduled activations that might be due
    await checkAllScheduledActivations();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

