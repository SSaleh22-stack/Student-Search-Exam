import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export interface AdminInfo {
  id: string;
  username: string;
  name?: string;
  isHeadAdmin: boolean;
  canManageSettings?: boolean;
  canDeleteDatasets?: boolean;
}

export async function verifyAdmin(username: string, password: string): Promise<AdminInfo | null> {
  try {
    // Normalize username to lowercase for case-insensitive lookup
    const normalizedUsername = username.toLowerCase().trim();
    
    // Use raw query for case-insensitive search (works with PostgreSQL)
    const admin = await prisma.$queryRaw<Array<{
      id: string;
      username: string;
      passwordHash: string;
      name: string | null;
      isHeadAdmin: boolean;
    }>>`
      SELECT id, username, "passwordHash", name, "isHeadAdmin" FROM "Admin" WHERE LOWER(username) = LOWER(${normalizedUsername}) LIMIT 1
    `;
    
    if (!admin || admin.length === 0) {
      return null;
    }
    
    const adminRecord = admin[0];

    const isValid = await bcrypt.compare(password, adminRecord.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      id: adminRecord.id,
      username: adminRecord.username,
      name: adminRecord.name || undefined,
      isHeadAdmin: adminRecord.isHeadAdmin,
    };
  } catch (error) {
    console.error("Error verifying admin:", error);
    return null;
  }
}

export async function createSession(adminId: string) {
  const cookieStore = await cookies();
  const now = Date.now();
  // Store adminId and timestamp in JSON format
  const sessionData = JSON.stringify({ adminId, timestamp: now });
  cookieStore.set("admin_session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // No maxAge - session cookie expires when browser closes
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

    // Parse session data (contains adminId and timestamp)
    let sessionData: { adminId: string; timestamp: number };
    try {
      sessionData = JSON.parse(session.value);
    } catch {
      // Legacy format - just adminId string
      // Try to use it as-is for backward compatibility
      const admin = await prisma.admin.findUnique({
        where: { id: session.value },
        select: {
          id: true,
          username: true,
          name: true,
          isHeadAdmin: true,
          canManageSettings: true,
          canDeleteDatasets: true,
        },
      });

      if (!admin) {
        return null;
      }

      // Update to new format with current timestamp
      await createSession(admin.id);
      
      return {
        id: admin.id,
        username: admin.username,
        name: admin.name || undefined,
        isHeadAdmin: admin.isHeadAdmin,
        canManageSettings: admin.canManageSettings || undefined,
        canDeleteDatasets: admin.canDeleteDatasets || undefined,
      };
    }

    // Check if 45 minutes (45 * 60 * 1000 ms) have passed since last activity
    const INACTIVITY_TIMEOUT = 45 * 60 * 1000; // 45 minutes in milliseconds
    const now = Date.now();
    const timeSinceLastActivity = now - sessionData.timestamp;

    if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
      // Session expired due to inactivity
      await deleteSession();
      return null;
    }

    // Session is still valid - update timestamp to reset the 45-minute timer
    await createSession(sessionData.adminId);

    const admin = await prisma.admin.findUnique({
      where: { id: sessionData.adminId },
      select: {
        id: true,
        username: true,
        name: true,
        isHeadAdmin: true,
        canManageSettings: true,
        canDeleteDatasets: true,
      },
    });

    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      name: admin.name || undefined,
      isHeadAdmin: admin.isHeadAdmin,
      canManageSettings: admin.canManageSettings || undefined,
      canDeleteDatasets: admin.canDeleteDatasets || undefined,
    };
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



