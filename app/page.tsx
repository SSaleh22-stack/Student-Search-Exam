"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Clock, MapPin, BookOpen, Loader2, Printer, FileText, Image as ImageIcon, Calendar as CalendarIcon, Grid3x3, Lock } from "lucide-react";
import { formatHijriDate, parseHijriDate } from "@/lib/utils/hijri-converter";
import { safeJsonParse } from "@/lib/utils";
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
      const data = await safeJsonParse(response);

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
  
  const formatDateShort = (dateString: string) => {
    try {
      if (!dateString || !dateString.trim()) {
        return dateString;
      }
      
      // Data comes from database as-is (already in correct format)
      // Just return as-is without conversion
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        return dateString; // Return as-is - database already has correct format
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
      wrapper.style.width = "1600px";
      wrapper.style.margin = "0 auto";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.fontFamily = "Arial, sans-serif";
      
      // Header
      const header = document.createElement("div");
      header.style.backgroundColor = "#2563eb";
      header.style.color = "#ffffff";
      header.style.padding = "30px";
      header.style.textAlign = "center";
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 42px; font-weight: bold; margin-bottom: 10px;">جدول الامتحانات</h1>
        <p style="margin: 0; font-size: 24px;">رقم الطالب: ${studentId}</p>
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
      
      const headers = ["اسم المقرر", "رمز المقرر", "الشعبة", "التاريخ", "الوقت", "المكان", "الفترة"];
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
      schedules.forEach((schedule, index) => {
        const row = document.createElement("tr");
        if (index % 2 === 0) {
          row.style.backgroundColor = "#f9fafb";
        }
        row.style.borderBottom = "1px solid #e5e7eb";
        
        const cells = [
          schedule.courseName,
          schedule.courseCode,
          schedule.classNo,
          formatDate(schedule.examDate),
          `${schedule.startTime}${schedule.endTime ? ` - ${schedule.endTime}` : ""}`,
          schedule.place,
          schedule.period
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
          إجمالي عدد الامتحانات: ${schedules.length}
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
      
      pdf.save(`جدول_الامتحانات_${studentId}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  };

  const handleExportJPG = async () => {
    const html2canvas = (await import("html2canvas")).default;
    
    try {
      // Create professional table design - bigger text for readability
      const wrapper = document.createElement("div");
      wrapper.style.width = "1600px";
      wrapper.style.margin = "0 auto";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.fontFamily = "Arial, sans-serif";
      
      // Header
      const header = document.createElement("div");
      header.style.backgroundColor = "#2563eb";
      header.style.color = "#ffffff";
      header.style.padding = "30px";
      header.style.textAlign = "center";
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 46px; font-weight: bold; margin-bottom: 10px;">جدول الامتحانات</h1>
        <p style="margin: 0; font-size: 26px;">رقم الطالب: ${studentId}</p>
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
      
      const headers = ["اسم المقرر", "رمز المقرر", "الشعبة", "التاريخ", "الوقت", "المكان", "الفترة"];
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
      schedules.forEach((schedule, index) => {
        const row = document.createElement("tr");
        if (index % 2 === 0) {
          row.style.backgroundColor = "#f9fafb";
        }
        row.style.borderBottom = "1px solid #e5e7eb";
        
        const cells = [
          schedule.courseName,
          schedule.courseCode,
          schedule.classNo,
          formatDate(schedule.examDate),
          `${schedule.startTime}${schedule.endTime ? ` - ${schedule.endTime}` : ""}`,
          schedule.place,
          schedule.period
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
          إجمالي عدد الامتحانات: ${schedules.length}
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
      link.download = `جدول_الامتحانات_${studentId}.jpg`;
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
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr || !dateStr.trim()) {
        console.error("Empty date string");
        return null;
      }
      
      try {
        // Check if it's Hijri date (year between 1200-1600)
        const hijriMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (hijriMatch) {
          const year = parseInt(hijriMatch[1], 10);
          const month = parseInt(hijriMatch[2], 10);
          const day = parseInt(hijriMatch[3], 10);
          
          // Validate month and day
          if (month < 1 || month > 12 || day < 1 || day > 30) {
            console.error("Invalid Hijri date:", dateStr);
            return null;
          }
          
          if (year >= 1200 && year < 1600) {
            // It's a Hijri date, convert to Gregorian
            const gregorianDateStr = parseHijriDate(dateStr);
            if (gregorianDateStr) {
              const gregorianDate = new Date(gregorianDateStr + "T00:00:00");
              if (!isNaN(gregorianDate.getTime())) {
                return gregorianDate;
              } else {
                console.error("Failed to parse converted Gregorian date:", gregorianDateStr);
                return null;
              }
            } else {
              console.error("Failed to convert Hijri date to Gregorian:", dateStr);
              return null;
            }
          }
        }
        
        // Try to parse as Gregorian date
        let date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          // If parsing fails, try adding timezone
          date = new Date(dateStr + "T00:00:00");
          if (isNaN(date.getTime())) {
            console.error("Failed to parse date:", dateStr);
            return null;
          }
        }
        return date;
      } catch (err) {
        console.error("Error parsing date:", dateStr, err);
        return null;
      }
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
    
    const icsContent = schedules
      .map((schedule, index) => {
        try {
          // Parse and convert date
          const examDate = parseDate(schedule.examDate);
          if (!examDate || isNaN(examDate.getTime())) {
            console.error("Invalid date for schedule:", schedule.examDate, schedule);
            return "";
          }
          
          // Parse time (format: HH:MM or HH:MM:SS)
          let startHours = 0;
          let startMinutes = 0;
          if (schedule.startTime) {
            const timeParts = schedule.startTime.trim().split(":");
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
          
          let endDate: Date;
          if (schedule.endTime && schedule.endTime.trim()) {
            const endTimeParts = schedule.endTime.trim().split(":");
            const endHours = parseInt(endTimeParts[0] || "0", 10);
            const endMinutes = parseInt(endTimeParts[1] || "0", 10);
            endDate = new Date(examDate);
            endDate.setHours(endHours, endMinutes, 0, 0);
            
            // Ensure end date is after start date
            if (endDate <= startDate) {
              endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
            }
          } else {
            // Default 2 hours duration
            endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
          }
          
          const summary = escapeText(`${schedule.courseName} (${schedule.courseCode})`);
          const description = escapeText(`${schedule.period || ""} - ${schedule.place || ""}`.trim());
          const location = escapeText(schedule.place || "");
          
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
          console.error("Error creating calendar event:", err, schedule);
          return "";
        }
      })
      .filter(event => event.length > 0)
      .join("\n");
    
    if (!icsContent || icsContent.trim().length === 0) {
      console.error("No valid events to export. Schedules:", schedules);
      alert("لا يمكن تصدير التقويم: لا توجد أحداث صالحة. يرجى التحقق من التواريخ.");
      return;
    }
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Exam Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:جدول الامتحانات
X-WR-TIMEZONE:Asia/Riyadh
X-WR-CALDESC:جدول الامتحانات
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
        link.download = `جدول_الامتحانات_${studentId}.ics`;
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
        link.download = `جدول_الامتحانات_${studentId}.ics`;
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            البحث غير متاح
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            تم تعطيل البحث عن جدول امتحانات الطلاب من قبل المسؤول حالياً.
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-4 px-4">
            يرجى الاتصال بالمسؤول إذا كنت بحاجة إلى الوصول.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
            البحث عن جدول الامتحانات للطلاب في مقر الجامعة بمحافظة الرس
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
            أدخل رقم الطالب لعرض جدول الامتحانات
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-amber-800 text-center font-medium">
              في حال وجود بيانات غير صحيحة آمل التواصل عبر الإيميل (rctv2@qu.edu.sa)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 no-print">
          <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                رقم الطالب
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="أدخل رقم الطالب"
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                جدول الامتحانات ({schedules.length} {schedules.length === 1 ? "امتحان" : schedules.length === 2 ? "امتحانان" : "امتحانات"})
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
            {schedules.map((schedule, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                      {schedule.courseName}
                    </h3>
                    <p className="text-sm sm:text-base font-medium text-gray-700">
                      <span className="text-xs sm:text-sm text-gray-500">رمز المقرر: </span>
                      {schedule.courseCode} • <span className="text-base sm:text-lg font-semibold">الشعبة {schedule.classNo}</span>
                    </p>
                  </div>
                  <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap">
                    {schedule.period}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-500">التاريخ:</span>
                    <span className="font-medium break-words">{formatDate(schedule.examDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-500">الوقت:</span>
                    <span className="font-medium">
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base sm:col-span-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-500">المكان:</span>
                    <span className="font-medium break-words">{schedule.place}</span>
                  </div>
                  {schedule.rows && (
                    <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base sm:col-span-2">
                      <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <span className="font-medium">الأعمدة: {schedule.rows}</span>
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

