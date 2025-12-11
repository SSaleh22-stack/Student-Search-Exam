import { NextRequest, NextResponse } from "next/server";
import { requireHeadAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// Get all admins (only head admin can access)
export async function GET() {
  try {
    const headAdmin = await requireHeadAdmin();
    if (!headAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Head admin access required." },
        { status: 403 }
      );
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        lastname: true,
        isHeadAdmin: true,
        canUpload: true,
        canManageDatasets: true,
        canDeleteDatasets: true,
        canManageAdmins: true,
        canManageSettings: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create new admin (only head admin can create)
export async function POST(request: NextRequest) {
  try {
    const headAdmin = await requireHeadAdmin();
    if (!headAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Head admin access required." },
        { status: 403 }
      );
    }

    const { username, password, name, lastname, isHeadAdmin, canUpload, canManageDatasets, canDeleteDatasets, canManageSettings } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Normalize username to lowercase for case-insensitive storage
    const normalizedUsername = username.toLowerCase().trim();

    // Check if username already exists (case-insensitive)
    const existingAdmin = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Admin" WHERE LOWER(username) = LOWER(${normalizedUsername}) LIMIT 1
    `;

    if (existingAdmin && existingAdmin.length > 0) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin with normalized username
    const admin = await prisma.admin.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        name: name || null,
        lastname: lastname || null,
        isHeadAdmin: isHeadAdmin === true,
        canUpload: canUpload !== false, // Default true
        canManageDatasets: canManageDatasets !== false, // Default true
        canDeleteDatasets: canDeleteDatasets === true, // Default false
        canManageSettings: canManageSettings === true, // Default false
      },
      select: {
        id: true,
        username: true,
        name: true,
        lastname: true,
        isHeadAdmin: true,
        canUpload: true,
        canManageDatasets: true,
        canManageAdmins: true,
        canManageSettings: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      admin 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

