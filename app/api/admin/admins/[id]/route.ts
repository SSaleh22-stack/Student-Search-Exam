import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin, getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// Update admin
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headAdmin = await requireHeadAdmin();
    if (!headAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Head admin access required." },
        { status: 403 }
      );
    }

    const { id } = params;
    const { username, password, isHeadAdmin, canUpload, canManageDatasets, canManageSettings } = await request.json();

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    // Prevent head admin from removing their own head admin status
    if (existingAdmin.isHeadAdmin && isHeadAdmin === false && headAdmin.id === id) {
      return NextResponse.json(
        { error: "Cannot remove your own head admin status" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (username !== undefined) {
      // Normalize username to lowercase for case-insensitive storage
      const normalizedUsername = username.toLowerCase().trim();
      
      // Check if new username is already taken by another admin (case-insensitive)
      const usernameTaken = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Admin" WHERE LOWER(username) = LOWER(${normalizedUsername}) AND id != ${id} LIMIT 1
      `;

      if (usernameTaken && usernameTaken.length > 0) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }

      updateData.username = normalizedUsername;
    }

    if (password !== undefined && password !== "") {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (isHeadAdmin !== undefined) {
      updateData.isHeadAdmin = isHeadAdmin;
    }

    if (canUpload !== undefined) {
      updateData.canUpload = canUpload;
    }

    if (canManageDatasets !== undefined) {
      updateData.canManageDatasets = canManageDatasets;
    }

    if (canManageSettings !== undefined) {
      updateData.canManageSettings = canManageSettings;
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        isHeadAdmin: true,
        canUpload: true,
        canManageDatasets: true,
        canManageAdmins: true,
        canManageSettings: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      admin 
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headAdmin = await requireHeadAdmin();
    if (!headAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Head admin access required." },
        { status: 403 }
      );
    }

    const { id } = params;

    // Prevent deleting yourself
    if (headAdmin.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    await prisma.admin.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true,
      message: "Admin deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

