"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Clock, MapPin, BookOpen, Loader2, Printer, Copy, Check, Grid3x3, Lock } from "lucide-react";
import { formatHijriDate } from "@/lib/utils/hijri-converter";
import Image from "next/image";

interface ExamSchedule {
  courseName: string;
  courseCode: string;
  classNo: string;
  examDate: string;
  startTime: string;
  endTime: string;
  place: string;
  period: string;
  rows?: string; // Row range like "1-8", "1-9", "4-6"
  seats?: number;
}

export default function HomePage() {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isActive, setIsActive] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if student search is active
    fetch("/api/settings/student-search")
      .then((res) => res.json())
      .then((data) => {
        setIsActive(data.isActive ?? true);
      })
      .catch(() => {
        setIsActive(true); // Default to active if check fails
      });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      setError("الرجاء إدخال رقم الطالب");
      return;
    }

    setLoading(true);
    setError(null);
    setSchedules([]);

    try {
      const response = await fetch(`/api/student/schedule?studentId=${encodeURIComponent(studentId.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في جلب الجدول");
      }

      setSchedules(data.schedules || []);
      if (data.schedules && data.schedules.length === 0) {
        setError("لم يتم العثور على جدول امتحانات لهذا الرقم");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Check if date is already in Hijri format (year between 1200-1600)
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        // If year is in Hijri range, return as-is
        if (year >= 1200 && year < 1600) {
          return dateString; // Already Hijri, return in YYYY-MM-DD format
        }
        // Otherwise, convert Gregorian to Hijri
        const hijriDate = formatHijriDate(dateString);
        return hijriDate; // Return in YYYY-MM-DD format
      }
      // If not in YYYY-MM-DD format, try to convert
      const hijriDate = formatHijriDate(dateString);
      return hijriDate;
    } catch {
      return dateString;
    }
  };
  
  const formatDateShort = (dateString: string) => {
    try {
      // Check if date is already in Hijri format
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        // If year is in Hijri range, return as-is
        if (year >= 1200 && year < 1600) {
          return dateString; // Already Hijri, return in YYYY-MM-DD format
        }
      }
      // Convert to Hijri if needed
      return formatHijriDate(dateString);
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const text = schedules
      .map(
        (s) =>
          `${s.courseName} (${s.courseCode}) - ${formatDate(s.examDate)} ${s.startTime}-${s.endTime} في ${s.place}`
      )
      .join("\n");
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Show loading state while checking activation status
  if (isActive === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show deactivated message if search is not active
  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            البحث غير متاح
          </h1>
          <p className="text-gray-600">
            تم تعطيل البحث عن جدول امتحانات الطلاب من قبل المسؤول حالياً.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            يرجى الاتصال بالمسؤول إذا كنت بحاجة إلى الوصول.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image 
              src="/img/Qassim_University_logo.png" 
              alt="Qassim University Logo" 
              width={200}
              height={80}
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            البحث عن جدول الامتحانات
          </h1>
          <p className="text-gray-600 mb-4">
            أدخل رقم الطالب لعرض جدول الامتحانات
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/lecturer"
              className="text-sm text-purple-600 hover:text-purple-800 underline"
            >
              هل أنت محاضر؟ اضغط هنا للبحث بالاسم
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 no-print">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                رقم الطالب
              </label>
              <div className="flex gap-2">
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="أدخل رقم الطالب"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري البحث...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      بحث
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {schedules.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                جدول الامتحانات ({schedules.length} {schedules.length === 1 ? "امتحان" : schedules.length === 2 ? "امتحانان" : "امتحانات"})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2 transition-colors"
                  title="Copy schedule"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      نسخ
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2 transition-colors print:hidden"
                  title="Print schedule"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
              </div>
            </div>
            {schedules.map((schedule, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {schedule.courseName}
                    </h3>
                    <p className="text-base font-medium text-gray-700">
                      {schedule.courseCode} • <span className="text-lg font-semibold">الفصل {schedule.classNo}</span>
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {schedule.period}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{formatDate(schedule.examDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{schedule.place}</span>
                  </div>
                  {schedule.rows && (
                    <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                      <Grid3x3 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">نطاق المقاعد: {schedule.rows}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-md p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 md:col-span-2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && schedules.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>أدخل رقم الطالب أعلاه لعرض جدول الامتحانات</p>
          </div>
        )}
      </div>
    </div>
  );
}

