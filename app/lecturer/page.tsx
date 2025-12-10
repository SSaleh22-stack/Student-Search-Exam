"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Clock, MapPin, BookOpen, Loader2, Printer, Copy, Check, Grid3x3, User, Lock } from "lucide-react";
import Image from "next/image";

interface LecturerExam {
  lecturerName: string;
  role?: string;
  grade?: string;
  examCode?: string;
  section: string;
  courseCode: string;
  courseName: string;
  numberOfStudents?: number;
  room: string;
  column?: string;
  day?: string;
  examDate: string;
  examPeriod: string;
  periodStart: string;
  invigilator?: string;
}

export default function LecturerPage() {
  const [lecturerName, setLecturerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<LecturerExam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isActive, setIsActive] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if lecturer search is active
    fetch("/api/settings/lecturer-search")
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
    if (!lecturerName.trim()) {
      setError("الرجاء إدخال اسم المحاضر");
      return;
    }

    setLoading(true);
    setError(null);
    setExams([]);

    try {
      const response = await fetch(`/api/lecturer/schedule?lecturerName=${encodeURIComponent(lecturerName.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في جلب الجدول");
      }

      setExams(data.exams || []);
      if (data.exams && data.exams.length === 0) {
        setError("لم يتم العثور على جدول امتحانات لهذا الاسم");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
      setExams([]);
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
      }
      return dateString; // Return as-is for display
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const text = exams
      .map(
        (e) =>
          `${e.courseName} (${e.courseCode}) - الشعبة ${e.section} - ${formatDate(e.examDate)} ${e.periodStart} في ${e.room}`
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show deactivated message if search is not active
  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            البحث غير متاح
          </h1>
          <p className="text-gray-600">
            تم تعطيل البحث عن جدول امتحانات المحاضرين من قبل المسؤول حالياً.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            يرجى الاتصال بالمسؤول إذا كنت بحاجة إلى الوصول.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
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
            جدول امتحانات المحاضرين
          </h1>
          <p className="text-gray-600 mb-4">
            أدخل اسمك لعرض جدول الامتحانات
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              بحث الطلاب
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 no-print">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label
                htmlFor="lecturerName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                اسم المحاضر
              </label>
              <div className="flex gap-2">
                <input
                  id="lecturerName"
                  type="text"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

        {exams.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                جدول الامتحانات ({exams.length} {exams.length === 1 ? "امتحان" : exams.length === 2 ? "امتحانان" : "امتحانات"})
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
            {exams.map((exam, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Lecturer Info Block */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-600 mb-1">المحاضر</p>
                      <h3 className="text-lg font-bold text-gray-900">
                        {exam.lecturerName}
                      </h3>
                    </div>
                    <div className="text-right">
                      {exam.role && (
                        <div className="mb-1">
                          <p className="text-xs font-medium text-purple-600">الدور</p>
                          <p className="text-sm font-semibold text-gray-700">{exam.role}</p>
                        </div>
                      )}
                      {exam.grade && (
                        <div>
                          <p className="text-xs font-medium text-purple-600">الدرجة</p>
                          <p className="text-sm font-semibold text-gray-700">{exam.grade}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {exam.courseName}
                    </h3>
                    <p className="text-base font-medium text-gray-700">
                      {exam.courseCode} • <span className="text-lg font-semibold">الشعبة {exam.section}</span>
                    </p>
                    {exam.examCode && (
                      <p className="text-sm text-gray-600 mt-1">
                        رمز الامتحان: {exam.examCode}
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    {exam.examPeriod}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">{formatDate(exam.examDate)}</span>
                    {exam.day && (
                      <span className="text-sm text-gray-500">({exam.day})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">{exam.periodStart}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">{exam.room}</span>
                  </div>
                  {exam.column && (
                    <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                      <Grid3x3 className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">نطاق الأعمدة: {exam.column}</span>
                    </div>
                  )}
                  {exam.numberOfStudents && (
                    <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                      <User className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">{exam.numberOfStudents} طالب</span>
                    </div>
                  )}
                  {exam.invigilator && (
                    <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                      <span className="text-sm text-gray-500">مراقب:</span>
                      <span className="font-medium">{exam.invigilator}</span>
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

        {!loading && exams.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>أدخل اسمك أعلاه لعرض جدول الامتحانات</p>
          </div>
        )}
      </div>
    </div>
  );
}

