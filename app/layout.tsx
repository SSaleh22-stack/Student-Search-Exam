import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Get base URL from environment or use default
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Default fallback - should be set in production
  return "https://student-search-exam.vercel.app";
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "امتحانات مقر جامعة القصيم في الرس",
  description: "البحث عن جدول الامتحانات في مقر الجامعة بمحافظة الرس",
  openGraph: {
    title: "امتحانات مقر جامعة القصيم في الرس",
    description: "البحث عن جدول الامتحانات في مقر الجامعة بمحافظة الرس",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}



