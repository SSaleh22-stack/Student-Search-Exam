import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ 
      authenticated: true,
      admin: {
        username: admin.username,
        name: admin.name,
        isHeadAdmin: admin.isHeadAdmin,
        canManageSettings: admin.canManageSettings ?? false,
        canDeleteDatasets: admin.canDeleteDatasets ?? false,
      }
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}



