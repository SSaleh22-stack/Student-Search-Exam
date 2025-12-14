import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "البحث عن جدول الامتحانات للطلاب في مقر الجامعة بمحافظة الرس",
  description: "البحث عن جدول الامتحانات في مقر الجامعة بمحافظة الرس",
  openGraph: {
    title: "البحث عن جدول الامتحانات في مقر الجامعة بمحافظة الرس",
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



