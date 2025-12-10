import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export interface AdminInfo {
  id: string;
  username: string;
  isHeadAdmin: boolean;
}

export async function verifyAdmin(username: string, password: string): Promise<AdminInfo | null> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return null;
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      isHeadAdmin: admin.isHeadAdmin,
    };
  } catch (error) {
    console.error("Error verifying admin:", error);
    return null;
  }
}

export async function createSession(adminId: string) {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", adminId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}

export async function getCurrentAdmin(): Promise<AdminInfo | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    
    if (!session?.value) {
      return null;
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session.value },
      select: {
        id: true,
        username: true,
        isHeadAdmin: true,
      },
    });

    return admin;
  } catch (error) {
    console.error("Error getting current admin:", error);
    return null;
  }
}

export async function checkSession(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null;
}

export async function requireHeadAdmin(): Promise<AdminInfo | null> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.isHeadAdmin) {
    return null;
  }
  return admin;
}



