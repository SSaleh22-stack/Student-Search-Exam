import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { datasetId, activateDate, activateTime } = await request.json();

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

      // Schedule activation - store date and time, but don't activate yet
      await prisma.dataset.update({
        where: { id: datasetId },
        data: { 
          activateDate,
          activateTime,
          isActive: false, // Will be activated at scheduled time
        },
      });
    } else {
      // Activate immediately - clear any scheduled activation
      await prisma.dataset.update({
        where: { id: datasetId },
        data: { 
          isActive: !dataset.isActive,
          activateDate: null,
          activateTime: null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

