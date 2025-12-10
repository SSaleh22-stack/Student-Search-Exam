import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    return NextResponse.json({ isActive: settings.studentSearchActive });
  } catch (error) {
    console.error("Error fetching student search settings:", error);
    // Default to active if there's an error
    return NextResponse.json({ isActive: true });
  }
}



