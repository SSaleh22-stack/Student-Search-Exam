import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, createSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const admin = await verifyAdmin(username, password);
    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await createSession(admin.id);

    return NextResponse.json({ 
      success: true,
      admin: {
        username: admin.username,
        name: admin.name,
        isHeadAdmin: admin.isHeadAdmin,
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



