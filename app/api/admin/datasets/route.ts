import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSession } from "@/lib/auth";

export async function GET() {
  try {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        isActive: true,
        type: true,
      },
    });

    return NextResponse.json({ datasets });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

