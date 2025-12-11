import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { datasetId } = await request.json();

    if (!datasetId) {
      return NextResponse.json(
        { error: "Dataset ID is required" },
        { status: 400 }
      );
    }

    // Get the dataset to check if it exists
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    // Deactivate the dataset
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deactivate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



