"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Clock, MapPin, BookOpen, Loader2, Printer, FileText, Image as ImageIcon, Calendar as CalendarIcon, Grid3x3, User, Lock } from "lucide-react";
import { safeJsonParse } from "@/lib/utils";
import { parseHijriDate } from "@/lib/utils/hijri-converter";
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
      const data = await safeJsonParse(response);

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

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;
      
      // Helper function to add new page if needed
      const checkNewPage = (requiredHeight: number) => {
        if (yPos + requiredHeight > pageHeight - 20) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };
      
      // Professional Header
      pdf.setFillColor(139, 92, 246); // Purple-600
      pdf.rect(0, 0, pageWidth, 25, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("جدول امتحانات المحاضرين", pageWidth / 2, 12, { align: "center" });
      pdf.setFontSize(11);
      pdf.text(`اسم المحاضر: ${lecturerName}`, pageWidth / 2, 20, { align: "center" });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPos = 35;
      
      // Table Header
      checkNewPage(15);
      pdf.setFillColor(243, 244, 246); // Gray-100
      pdf.rect(margin, yPos, contentWidth, 12, "F");
      pdf.setDrawColor(209, 213, 219); // Gray-300
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPos, contentWidth, 12);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(31, 41, 55); // Gray-800
      
      const colWidths = [45, 35, 25, 25, 25, 30];
      const headers = ["اسم المقرر", "رمز المقرر", "الشعبة", "التاريخ", "الوقت", "القاعة"];
      let xPos = margin + 2;
      
      headers.forEach((header, index) => {
        pdf.text(header, xPos, yPos + 8);
        xPos += colWidths[index];
      });
      
      yPos += 15;
      
      // Table Rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(17, 24, 39); // Gray-900
      
      exams.forEach((exam, index) => {
        checkNewPage(25);
        
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251); // Gray-50
          pdf.rect(margin, yPos, contentWidth, 23, "F");
        }
        
        // Draw row border
        pdf.setDrawColor(229, 231, 235); // Gray-200
        pdf.rect(margin, yPos, contentWidth, 23);
        
        // Course Name
        pdf.text(exam.courseName.substring(0, 25), margin + 2, yPos + 6);
        
        // Course Code
        pdf.text(exam.courseCode, margin + 47, yPos + 6);
        
        // Section
        pdf.text(exam.section, margin + 82, yPos + 6);
        
        // Date
        pdf.text(formatDate(exam.examDate), margin + 107, yPos + 6);
        
        // Time
        pdf.text(exam.periodStart, margin + 132, yPos + 6);
        
        // Room
        pdf.text(exam.room.substring(0, 15), margin + 157, yPos + 6);
        
        // Second line - Additional info
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128); // Gray-500
        let secondLineX = margin + 2;
        
        if (exam.examPeriod) {
          pdf.text(`الفترة: ${exam.examPeriod}`, secondLineX, yPos + 12);
          secondLineX += 50;
        }
        
        if (exam.role) {
          pdf.text(`الدور: ${exam.role}`, secondLineX, yPos + 12);
          secondLineX += 40;
        }
        
        if (exam.numberOfStudents) {
          pdf.text(`الطلاب: ${exam.numberOfStudents}`, secondLineX, yPos + 12);
        }
        
        pdf.setFontSize(9);
        pdf.setTextColor(17, 24, 39);
        yPos += 25;
      });
      
      // Summary
      checkNewPage(15);
      yPos += 5;
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`إجمالي عدد الامتحانات: ${exams.length}`, margin, yPos);
      
      // Footer on all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175); // Gray-400
        pdf.text(`صفحة ${i} من ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        const currentDate = new Date().toLocaleDateString("ar-SA");
        pdf.text(`تاريخ الطباعة: ${currentDate}`, margin, pageHeight - 8);
      }
      
      pdf.save(`جدول_المحاضر_${lecturerName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  };

  const handleExportJPG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    
    try {
      // Create professional table design
      const wrapper = document.createElement("div");
      wrapper.style.width = "1400px";
      wrapper.style.margin = "0 auto";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.fontFamily = "Arial, sans-serif";
      
      // Header
      const header = document.createElement("div");
      header.style.backgroundColor = "#8b5cf6";
      header.style.color = "#ffffff";
      header.style.padding = "25px";
      header.style.textAlign = "center";
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; margin-bottom: 8px;">جدول امتحانات المحاضرين</h1>
        <p style="margin: 0; font-size: 16px;">اسم المحاضر: ${lecturerName}</p>
      `;
      wrapper.appendChild(header);
      
      // Table Container
      const tableContainer = document.createElement("div");
      tableContainer.style.padding = "20px";
      
      // Create table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "10px";
      
      // Table Header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headerRow.style.backgroundColor = "#f3f4f6";
      headerRow.style.borderBottom = "2px solid #d1d5db";
      
      const headers = ["اسم المقرر", "رمز المقرر", "الشعبة", "التاريخ", "الوقت", "القاعة", "الفترة"];
      headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.padding = "12px 8px";
        th.style.textAlign = "right";
        th.style.fontWeight = "bold";
        th.style.fontSize = "12px";
        th.style.color = "#1f2937";
        th.style.borderRight = "1px solid #e5e7eb";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Table Body
      const tbody = document.createElement("tbody");
      exams.forEach((exam, index) => {
        const row = document.createElement("tr");
        if (index % 2 === 0) {
          row.style.backgroundColor = "#f9fafb";
        }
        row.style.borderBottom = "1px solid #e5e7eb";
        
        const cells = [
          exam.courseName,
          exam.courseCode,
          exam.section,
          formatDate(exam.examDate),
          exam.periodStart,
          exam.room,
          exam.examPeriod || ""
        ];
        
        cells.forEach((cellText, cellIndex) => {
          const td = document.createElement("td");
          td.textContent = cellText;
          td.style.padding = "12px 8px";
          td.style.textAlign = "right";
          td.style.fontSize = "11px";
          td.style.color = "#111827";
          td.style.borderRight = "1px solid #e5e7eb";
          row.appendChild(td);
        });
        
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      tableContainer.appendChild(table);
      
      // Summary
      const summary = document.createElement("div");
      summary.style.marginTop = "20px";
      summary.style.padding = "15px";
      summary.style.backgroundColor = "#f3f4f6";
      summary.style.borderRadius = "6px";
      summary.style.textAlign = "right";
      summary.innerHTML = `
        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1f2937;">
          إجمالي عدد الامتحانات: ${exams.length}
        </p>
      `;
      tableContainer.appendChild(summary);
      
      wrapper.appendChild(tableContainer);
      
      // Footer
      const footer = document.createElement("div");
      footer.style.textAlign = "center";
      footer.style.padding = "15px";
      footer.style.color = "#6b7280";
      footer.style.fontSize = "11px";
      footer.style.borderTop = "1px solid #e5e7eb";
      footer.textContent = `تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}`;
      wrapper.appendChild(footer);
      
      // Temporarily add to DOM
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      document.body.appendChild(wrapper);
      
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
      });
      
      // Remove wrapper from DOM
      document.body.removeChild(wrapper);
      
      const link = document.createElement("a");
      link.download = `جدول_المحاضر_${lecturerName.replace(/\s+/g, "_")}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch (err) {
      console.error("Failed to export JPG:", err);
    }
  };

  const handleExportCalendar = () => {
    // Helper function to escape special characters in iCal
    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
    };
    
    // Helper function to convert date string to Gregorian Date
    const parseDate = (dateStr: string): Date => {
      // Check if it's Hijri date (year between 1200-1600)
      const hijriMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (hijriMatch) {
        const year = parseInt(hijriMatch[1], 10);
        if (year >= 1200 && year < 1600) {
          // It's a Hijri date, convert to Gregorian
          const gregorianDateStr = parseHijriDate(dateStr);
          if (gregorianDateStr) {
            return new Date(gregorianDateStr);
          }
        }
      }
      // Try to parse as Gregorian date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If parsing fails, try adding timezone
        return new Date(dateStr + "T00:00:00");
      }
      return date;
    };
    
    // Helper function to format date for iCal (convert local time to UTC)
    const formatICalDate = (date: Date): string => {
      // Get UTC components directly from the date
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      const seconds = String(date.getUTCSeconds()).padStart(2, "0");
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };
    
    const icsContent = exams
      .map((exam, index) => {
        try {
          // Parse and convert date
          const examDate = parseDate(exam.examDate);
          if (!examDate || isNaN(examDate.getTime())) {
            console.error("Invalid date:", exam.examDate);
            return "";
          }
          
          // Parse time (format: HH:MM or HH:MM:SS)
          let startHours = 0;
          let startMinutes = 0;
          if (exam.periodStart) {
            const timeParts = exam.periodStart.trim().split(":");
            startHours = parseInt(timeParts[0] || "0", 10);
            startMinutes = parseInt(timeParts[1] || "0", 10);
            if (isNaN(startHours) || isNaN(startMinutes)) {
              startHours = 0;
              startMinutes = 0;
            }
          }
          
          // Create start date in local time
          const startDate = new Date(examDate);
          startDate.setHours(startHours, startMinutes, 0, 0);
          
          // Default 2 hours duration
          const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
          
          const summary = escapeText(`${exam.courseName} (${exam.courseCode}) - ${exam.section || ""}`.trim());
          const descriptionParts = [];
          if (exam.examPeriod) descriptionParts.push(exam.examPeriod);
          if (exam.room) descriptionParts.push(exam.room);
          if (exam.invigilator) {
            descriptionParts.push(`مراقب: ${exam.invigilator}`);
          }
          const description = escapeText(descriptionParts.join(" - "));
          const location = escapeText(exam.room || "");
          
          const uid = `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}@exam-schedule`;
          
          return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICalDate(new Date())}
DTSTART:${formatICalDate(startDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT`;
        } catch (err) {
          console.error("Error creating calendar event:", err, exam);
          return "";
        }
      })
      .filter(event => event.length > 0)
      .join("\n");
    
    if (!icsContent) {
      console.error("No valid events to export");
      return;
    }
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Exam Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:جدول امتحانات المحاضرين
X-WR-TIMEZONE:Asia/Riyadh
${icsContent}
END:VCALENDAR`;
    
    // Create blob with UTF-8 BOM for better compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `جدول_المحاضر_${lecturerName.replace(/\s+/g, "_")}.ics`;
    link.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            البحث غير متاح
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            تم تعطيل البحث عن جدول امتحانات المحاضرين من قبل المسؤول حالياً.
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-4 px-4">
            يرجى الاتصال بالمسؤول إذا كنت بحاجة إلى الوصول.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Image 
              src="/img/Qassim_University_logo.png" 
              alt="Qassim University Logo" 
              width={200}
              height={80}
              className="h-12 sm:h-16 md:h-20 w-auto"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            جدول امتحانات المحاضرين
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
            أدخل اسمك لعرض جدول الامتحانات
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 no-print">
          <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="lecturerName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                اسم المحاضر
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="lecturerName"
                  type="text"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                جدول الامتحانات ({exams.length} {exams.length === 1 ? "امتحان" : exams.length === 2 ? "امتحانان" : "امتحانات"})
              </h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center justify-center gap-2 transition-colors"
                  title="تصدير كـ PDF"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleExportJPG}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center justify-center gap-2 transition-colors"
                  title="تصدير كـ JPG"
                >
                  <ImageIcon className="w-4 h-4" />
                  JPG
                </button>
                <button
                  onClick={handleExportCalendar}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center justify-center gap-2 transition-colors"
                  title="تصدير إلى التقويم"
                >
                  <CalendarIcon className="w-4 h-4" />
                  التقويم
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors print:hidden"
                  title="طباعة الجدول"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
              </div>
            </div>
            {exams.map((exam, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Lecturer Info Block */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 sm:p-4 mb-4 border border-purple-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-purple-600 mb-1">المحاضر</p>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {exam.lecturerName}
                      </h3>
                    </div>
                    <div className="text-right sm:text-left">
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

                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                      {exam.courseName}
                    </h3>
                    <p className="text-sm sm:text-base font-medium text-gray-700">
                      <span className="text-xs sm:text-sm text-gray-500">رمز المقرر: </span>
                      {exam.courseCode} • <span className="text-base sm:text-lg font-semibold">الشعبة {exam.section}</span>
                    </p>
                    {exam.examCode && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        رمز الامتحان: {exam.examCode}
                      </p>
                    )}
                  </div>
                  <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap">
                    {exam.examPeriod}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-500">التاريخ:</span>
                    <span className="font-medium break-words">{formatDate(exam.examDate)}</span>
                    {exam.day && (
                      <span className="text-xs sm:text-sm text-gray-500">({exam.day})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-500">الوقت:</span>
                    <span className="font-medium">{exam.periodStart}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base sm:col-span-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-500">القاعة:</span>
                    <span className="font-medium break-words">{exam.room}</span>
                  </div>
                  {exam.column && (
                    <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base sm:col-span-2">
                      <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                      <span className="font-medium">نطاق الأعمدة: {exam.column}</span>
                    </div>
                  )}
                  {exam.numberOfStudents && (
                    <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base sm:col-span-2">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                      <span className="font-medium">{exam.numberOfStudents} طالب</span>
                    </div>
                  )}
                  {exam.invigilator && (
                    <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base sm:col-span-2">
                      <span className="text-xs sm:text-sm text-gray-500">مراقب:</span>
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

