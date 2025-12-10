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
        isHeadAdmin: true,
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

    const { username, password, isHeadAdmin } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username,
        passwordHash,
        isHeadAdmin: isHeadAdmin === true,
      },
      select: {
        id: true,
        username: true,
        isHeadAdmin: true,
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

