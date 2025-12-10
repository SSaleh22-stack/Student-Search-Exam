import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";

// For initial setup, if no hash is provided, use a default password "admin"
// In production, you should set ADMIN_PASSWORD_HASH in .env
const DEFAULT_PASSWORD = "admin";

export async function verifyAdmin(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) {
    return false;
  }

  if (ADMIN_PASSWORD_HASH) {
    // Compare with hashed password
    return await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } else {
    // Fallback to default password for development
    return password === DEFAULT_PASSWORD;
  }
}

export async function createSession() {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "authenticated", {
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

export async function checkSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "authenticated";
}



