"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Clock, MapPin, BookOpen, Loader2, Printer, FileText, Image as ImageIcon, Calendar as CalendarIcon, Grid3x3, User, Lock } from "lucide-react";
import { safeJsonParse } from "@/lib/utils";
import { parseHijriDate } from "@/lib/utils/hijri-converter";
import Image from "next/image";

interface LecturerExam {
  lecturerName: string;
  doctorRole?: string;
  matchedRole?: string; // The role of the searched person in this exam
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
  commenter1Name?: string;
  commenter1Role?: string;
  commenter2Name?: string;
  commenter2Role?: string;
  commenter3Name?: string;
  commenter3Role?: string;
  commenter4Name?: string;
  commenter4Role?: string;
  commenter5Name?: string;
  commenter5Role?: string;
  inspectorName?: string;
  inspectorRole?: string;
}

export default function LecturerPage() {
  const [lecturerName, setLecturerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<LecturerExam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [availableLecturers, setAvailableLecturers] = useState<string[]>([]);
  const [showLecturerSelection, setShowLecturerSelection] = useState(false);

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
    setAvailableLecturers([]);
    setShowLecturerSelection(false);

    try {
      const response = await fetch(`/api/lecturer/schedule?lecturerName=${encodeURIComponent(lecturerName.trim())}`);
      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || "فشل في جلب الجدول");
      }

      // Check if multiple lecturer names were found
      if (data.multipleMatches && data.lecturerNames) {
        setAvailableLecturers(data.lecturerNames);
        setShowLecturerSelection(true);
      } else if (data.exams) {
        setExams(data.exams);
        if (data.exams.length === 0) {
          setError("لم يتم العثور على جدول امتحانات لهذا الاسم");
        }
      } else {
        setError("لم يتم العثور على جدول امتحانات لهذا الاسم");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLecturerSelect = async (selectedName: string) => {
    setLoading(true);
    setError(null);
    setExams([]);
    setShowLecturerSelection(false);
    setLecturerName(selectedName);

    try {
      const response = await fetch(`/api/lecturer/schedule?lecturerName=${encodeURIComponent(selectedName)}&exactMatch=true`);
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
      if (!dateString || !dateString.trim()) {
        return dateString;
      }
      
      // Data comes from database as-is (already in correct format - Hijri or Gregorian)
      // Just format it for display without conversion
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        // Return as-is - database already has correct format
        return dateString;
      }
      
      // If not in YYYY-MM-DD format, try to parse and format
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      
      return dateString; // Return original if can't parse
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    
    try {
      // Create professional table design - landscape with bigger table
      const wrapper = document.createElement("div");
      wrapper.style.width = "1800px";
      wrapper.style.margin = "0 auto";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.fontFamily = "Arial, sans-serif";
      
      // Header
      const header = document.createElement("div");
      header.style.backgroundColor = "#8b5cf6";
      header.style.color = "#ffffff";
      header.style.padding = "30px";
      header.style.textAlign = "center";
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 42px; font-weight: bold; margin-bottom: 10px;">جدول امتحانات المحاضرين في مقر الجامعة بمحافظة الرس</h1>
        <p style="margin: 0; font-size: 24px;">اسم المحاضر: ${lecturerName}</p>
      `;
      wrapper.appendChild(header);
      
      // Table Container
      const tableContainer = document.createElement("div");
      tableContainer.style.padding = "25px";
      
      // Create table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "15px";
      
      // Table Header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headerRow.style.backgroundColor = "#f3f4f6";
      headerRow.style.borderBottom = "2px solid #d1d5db";
      
      const headers = ["اسم المحاضر", "اسم المقرر", "رمز المقرر", "الشعبة", "التاريخ", "الوقت", "القاعة", "الفترة"];
      headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.padding = "22px 16px";
        th.style.textAlign = "right";
        th.style.fontWeight = "bold";
        th.style.fontSize = "22px";
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
          exam.lecturerName || lecturerName,
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
          td.style.padding = "20px 16px";
          td.style.textAlign = "right";
          td.style.fontSize = "20px";
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
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
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
      footer.style.fontSize = "16px";
      footer.style.borderTop = "1px solid #e5e7eb";
      footer.textContent = `تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}`;
      wrapper.appendChild(footer);
      
      // Temporarily add to DOM
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      document.body.appendChild(wrapper);
      
      // Convert to canvas
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
      
      // Create PDF from canvas - landscape orientation
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("l", "mm", "a4"); // "l" for landscape
      const pageWidth = 297; // Landscape: width and height swapped
      const pageHeight = 210;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;
      const maxContentHeight = pageHeight - (margin * 2);
      
      // Add first page
      if (imgHeight <= maxContentHeight) {
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
      } else {
        // Split into multiple pages
        let yOffset = 0;
        let pageNumber = 1;
        
        while (heightLeft > 0) {
          if (pageNumber > 1) {
            pdf.addPage();
            position = margin;
          }
          
          const pageImgHeight = Math.min(heightLeft, maxContentHeight);
          const sourceY = (yOffset / imgHeight) * canvas.height;
          const sourceHeight = (pageImgHeight / imgHeight) * canvas.height;
          
          // Create a temporary canvas for this page slice
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
            const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
            pdf.addImage(pageImgData, "PNG", margin, position, imgWidth, pageImgHeight, undefined, "FAST");
          }
          
          yOffset += pageImgHeight;
          heightLeft -= pageImgHeight;
          pageNumber++;
        }
      }
      
      pdf.save(`جدول_المحاضر_${lecturerName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  };

  const handleExportJPG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    
    try {
      // Create professional table design - bigger text for readability
      const wrapper = document.createElement("div");
      wrapper.style.width = "1800px";
      wrapper.style.margin = "0 auto";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.fontFamily = "Arial, sans-serif";
      
      // Header
      const header = document.createElement("div");
      header.style.backgroundColor = "#8b5cf6";
      header.style.color = "#ffffff";
      header.style.padding = "30px";
      header.style.textAlign = "center";
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 46px; font-weight: bold; margin-bottom: 10px;">جدول امتحانات المحاضرين في مقر الجامعة بمحافظة الرس</h1>
        <p style="margin: 0; font-size: 26px;">اسم المحاضر: ${lecturerName}</p>
      `;
      wrapper.appendChild(header);
      
      // Table Container
      const tableContainer = document.createElement("div");
      tableContainer.style.padding = "25px";
      
      // Create table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "15px";
      
      // Table Header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headerRow.style.backgroundColor = "#f3f4f6";
      headerRow.style.borderBottom = "2px solid #d1d5db";
      
      const headers = ["اسم المحاضر", "اسم المقرر", "رمز المقرر", "الشعبة", "التاريخ", "الوقت", "القاعة", "الفترة"];
      headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.padding = "24px 18px";
        th.style.textAlign = "right";
        th.style.fontWeight = "bold";
        th.style.fontSize = "24px";
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
          exam.lecturerName || lecturerName,
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
          td.style.padding = "22px 18px";
          td.style.textAlign = "right";
          td.style.fontSize = "22px";
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
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
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
      footer.style.fontSize = "16px";
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
          
          const lecturerNameText = exam.lecturerName || lecturerName;
          const summary = escapeText(`${exam.courseName} (${exam.courseCode}) - ${exam.section || ""}`.trim());
          const descriptionParts = [`المحاضر: ${lecturerNameText}`];
          if (exam.examPeriod) descriptionParts.push(`الفترة: ${exam.examPeriod}`);
          if (exam.room) descriptionParts.push(`القاعة: ${exam.room}`);
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
STATUS:CONFIRMED
SEQUENCE:0
CREATED:${formatICalDate(new Date())}
LAST-MODIFIED:${formatICalDate(new Date())}
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
X-WR-CALNAME:جدول امتحانات المحاضرين في مقر الجامعة بمحافظة الرس
X-WR-TIMEZONE:Asia/Riyadh
X-WR-CALDESC:جدول امتحانات المحاضرين في مقر الجامعة بمحافظة الرس
${icsContent}
END:VCALENDAR`;
    
    try {
      // Detect mobile devices
      const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, create blob and use a more compatible approach
        const blob = new Blob([ics], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        
        // Try to trigger download
        const link = document.createElement("a");
        link.href = url;
        link.download = `جدول_المحاضر_${lecturerName.replace(/\s+/g, "_")}.ics`;
        link.style.display = "none";
        
        // Add to DOM, click, then remove
        document.body.appendChild(link);
        
        // For iOS, we need to use a different approach
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // iOS doesn't support download attribute well, use window.open
          window.open(url, "_blank");
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
        } else {
          // For Android and other mobile browsers
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
        }
      } else {
        // For desktop, use standard blob download
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `جدول_المحاضر_${lecturerName.replace(/\s+/g, "_")}.ics`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
      }
    } catch (err) {
      console.error("Failed to export calendar:", err);
      // Fallback: try data URI
      const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
      window.open(dataUri, "_blank");
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
              style={{ width: "auto" }}
              priority
            />
          </div>
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 rounded-full blur-md opacity-60"></div>
              <div className="relative bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50 text-amber-800 px-5 sm:px-7 py-2 sm:py-2.5 rounded-full shadow-md border border-amber-300/50 backdrop-blur-sm">
                <span className="text-sm sm:text-base md:text-lg font-semibold tracking-wide flex items-center gap-2">
                  <span className="text-amber-600">⚠️</span>
                  <span>موقع تجريبي</span>
                </span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            جدول امتحانات المحاضرين في مقر الجامعة بمحافظة الرس
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
            أدخل اسمك لعرض جدول الامتحانات
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-amber-800 text-center font-medium">
              في حال وجود بيانات غير صحيحة آمل التواصل عبر الإيميل (rtcv2@qu.edu.sa)
            </p>
          </div>
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

        {showLecturerSelection && availableLecturers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              تم العثور على عدة محاضرين بهذا الاسم. الرجاء اختيار المحاضر:
            </h2>
            <div className="space-y-2">
              {availableLecturers.map((name, index) => (
                <button
                  key={index}
                  onClick={() => handleLecturerSelect(name)}
                  disabled={loading}
                  className="w-full text-right px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md text-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {name}
                </button>
              ))}
            </div>
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
                  title="تصدير كـ صورة"
                >
                  <ImageIcon className="w-4 h-4" />
                  صورة
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
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {exam.lecturerName}
                      </h3>
                    </div>
                    <div className="text-right sm:text-left">
                      {exam.matchedRole && (
                        <div className="mb-1">
                          <p className="text-xs font-medium text-purple-600">الدور:</p>
                          <p className="text-sm font-semibold text-gray-700">{exam.matchedRole}</p>
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
                  {(exam.commenter1Name || exam.commenter2Name || exam.commenter3Name || exam.commenter4Name || exam.commenter5Name) && (
                    <div className="sm:col-span-2 mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-purple-600 mb-2">الملاحظون:</p>
                      <div className="space-y-1">
                        {exam.commenter1Name && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{exam.commenter1Role || "الملاحظ الأساسي"}:</span> {exam.commenter1Name}
                          </div>
                        )}
                        {exam.commenter2Name && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{exam.commenter2Role || "ملاحظ إضافي 1"}:</span> {exam.commenter2Name}
                          </div>
                        )}
                        {exam.commenter3Name && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{exam.commenter3Role || "ملاحظ إضافي 2"}:</span> {exam.commenter3Name}
                          </div>
                        )}
                        {exam.commenter4Name && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{exam.commenter4Role || "ملاحظ إضافي 3"}:</span> {exam.commenter4Name}
                          </div>
                        )}
                        {exam.commenter5Name && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{exam.commenter5Role || "ملاحظ إضافي 4"}:</span> {exam.commenter5Name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {exam.inspectorName && (
                    <div className="sm:col-span-2 mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-purple-600 mb-2">المراقب:</p>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{exam.inspectorRole || "المراقب"}:</span> {exam.inspectorName}
                      </div>
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

