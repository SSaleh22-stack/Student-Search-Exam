import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkAllScheduledActivations } from "@/lib/scheduled-activation";

// Helper function to normalize names for comparison
function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Helper function to check exact match
function exactNameMatch(searchName: string, targetName: string | null | undefined): boolean {
  if (!targetName) return false;
  return normalizeName(searchName) === normalizeName(targetName);
}

// Helper function to check flexible match - ALL words must appear in the target name
function flexibleNameMatch(searchName: string, targetName: string | null | undefined): boolean {
  if (!targetName) return false;
  
  const normalizedSearch = normalizeName(searchName);
  const normalizedTarget = normalizeName(targetName);
  
  // Split into words and filter out empty strings
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
  
  if (searchWords.length === 0) return false;
  
  // ALL words must appear in the target name
  const allWordsMatch = searchWords.every(word => normalizedTarget.includes(word));
  
  return allWordsMatch;
}

export async function GET(request: NextRequest) {
  // Check for scheduled activations first
  try {
    await checkAllScheduledActivations();
  } catch (error) {
    console.error("Error checking scheduled activations:", error);
  }

  // Check if lecturer search is active
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "settings" },
    });

    if (settings && !settings.lecturerSearchActive) {
      return NextResponse.json(
        { error: "Lecturer search is currently disabled" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error checking lecturer search settings:", error);
  }

  // Rate limiting
  const clientId = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(`lecturer-lookup-${clientId}`);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const lecturerName = searchParams.get("lecturerName");
    const exactMatch = searchParams.get("exactMatch") === "true";

    if (!lecturerName || !lecturerName.trim()) {
      return NextResponse.json(
        { error: "Lecturer name is required" },
        { status: 400 }
      );
    }

    // Find active lecturer datasets
    const activeDatasets = await prisma.dataset.findMany({
      where: { 
        isActive: true,
        type: "lecturer",
      },
    });

    if (activeDatasets.length === 0) {
      return NextResponse.json(
        { error: "No active lecturer dataset found" },
        { status: 404 }
      );
    }

    const datasetIds = activeDatasets.map(d => d.id);
    
    // Get all exams from active datasets
    const allExams = await prisma.lecturerExam.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
    });
    
    // Deduplicate exams based on unique identifiers
    // Use courseCode + section + examDate + periodStart + room + lecturerName as unique key
    const uniqueExamMap = new Map<string, typeof allExams[0]>();
    allExams.forEach((exam) => {
      const uniqueKey = `${exam.courseCode}_${exam.section}_${exam.examDate || ''}_${exam.periodStart || ''}_${exam.room || ''}_${exam.lecturerName || ''}`;
      if (!uniqueExamMap.has(uniqueKey)) {
        uniqueExamMap.set(uniqueKey, exam);
      }
    });
    
    const uniqueExams = Array.from(uniqueExamMap.values());
    
    console.log(`[Schedule] Search: "${lecturerName}" (exactMatch: ${exactMatch}), Total exams: ${allExams.length}, Unique exams: ${uniqueExams.length}`);
    
    // Filter exams that match the search
    const matchingExams = uniqueExams.filter(exam => {
      // Check if they're the lecturer (their own record)
      const isLecturer = exactMatch 
        ? exactNameMatch(lecturerName, exam.lecturerName)
        : flexibleNameMatch(lecturerName, exam.lecturerName);
      
      if (isLecturer) {
        console.log(`[Schedule] ✓ Match as lecturer: "${exam.lecturerName}"`);
        return true;
      }
      
      // Check if they're a commenter in this exam
      const commenters = [
        exam.commenter1Name,
        exam.commenter2Name,
        exam.commenter3Name,
        exam.commenter4Name,
        exam.commenter5Name,
      ];
      
      const isCommenter = commenters.some(name => {
        if (!name) return false;
        const matches = exactMatch 
          ? exactNameMatch(lecturerName, name)
          : flexibleNameMatch(lecturerName, name);
        
        if (matches) {
          console.log(`[Schedule] ✓ Match as commenter: "${name}"`);
        }
        return matches;
      });
      
      // If they're a commenter, only show if this is their own separate record
      // (separate commenter records have lecturerName = commenter name)
      if (isCommenter) {
        // Check if this is their own separate record (lecturerName matches)
        const isOwnRecord = exactMatch
          ? exactNameMatch(lecturerName, exam.lecturerName)
          : flexibleNameMatch(lecturerName, exam.lecturerName);
        
        if (isOwnRecord) {
          // This is their own separate commenter record
          return true;
        }
        // Otherwise, this is someone else's exam where they appear as commenter - don't show it
        return false;
      }
      
      // Check if they're the inspector in this exam
      if (exam.inspectorName) {
        const isInspector = exactMatch 
          ? exactNameMatch(lecturerName, exam.inspectorName)
          : flexibleNameMatch(lecturerName, exam.inspectorName);
        
        if (isInspector) {
          console.log(`[Schedule] ✓ Match as inspector: "${exam.inspectorName}"`);
          
          // If they're an inspector, only show if this is their own separate record
          // (separate inspector records have lecturerName = inspector name)
          const isOwnRecord = exactMatch
            ? exactNameMatch(lecturerName, exam.lecturerName)
            : flexibleNameMatch(lecturerName, exam.lecturerName);
          
          if (isOwnRecord) {
            // This is their own separate inspector record
            return true;
          }
          // Otherwise, this is someone else's exam where they appear as inspector - don't show it
          return false;
        }
      }
      
      return false;
    });
    
    console.log(`[Schedule] Found ${matchingExams.length} matching exams`);
    
    // Collect unique names for selection (only if not exact match)
    if (!exactMatch && matchingExams.length > 0) {
      const uniqueNamesMap = new Map<string, string>(); // normalized -> original
      
      matchingExams.forEach(exam => {
        // Only add lecturer name (these are the person's own records)
        if (exam.lecturerName) {
          const normalized = normalizeName(exam.lecturerName);
          if (!uniqueNamesMap.has(normalized)) {
            uniqueNamesMap.set(normalized, exam.lecturerName.trim());
          }
        }
      });
      
      const uniqueNames = Array.from(uniqueNamesMap.values()).sort();
      console.log(`[Schedule] Found ${uniqueNames.length} unique names: ${uniqueNames.slice(0, 10).join(", ")}`);
      
      // If multiple names found, return them for selection
      if (uniqueNames.length > 1) {
        return NextResponse.json({ 
          lecturerNames: uniqueNames,
          multipleMatches: true 
        });
      }
    }
    
    // If no matches, return empty
    if (matchingExams.length === 0) {
      console.log(`[Schedule] No exams found for "${lecturerName}"`);
      return NextResponse.json({ exams: [] });
    }
    
    // Sort exams by date then time
    const sortedExams = matchingExams.sort((a, b) => {
      if (a.examDate !== b.examDate) {
        return a.examDate.localeCompare(b.examDate);
      }
      return a.periodStart.localeCompare(b.periodStart);
    });

    // Format response with roles
    const formattedExams = sortedExams.map((exam) => {
      // Since we filtered to only show records where lecturerName matches (their own records),
      // the role is always in doctorRole field
      const matchedRole = exam.doctorRole || undefined;
      
      return {
        lecturerName: exam.lecturerName,
        doctorRole: exam.doctorRole,
        matchedRole: matchedRole,
        grade: exam.grade,
        examCode: exam.examCode,
        section: exam.section,
        courseCode: exam.courseCode,
        courseName: exam.courseName,
        numberOfStudents: exam.numberOfStudents,
        room: exam.room,
        column: exam.column,
        day: exam.day,
        examDate: exam.examDate,
        examPeriod: exam.examPeriod,
        periodStart: exam.periodStart,
        invigilator: exam.invigilator,
        commenter1Name: exam.commenter1Name,
        commenter1Role: exam.commenter1Role,
        commenter2Name: exam.commenter2Name,
        commenter2Role: exam.commenter2Role,
        commenter3Name: exam.commenter3Name,
        commenter3Role: exam.commenter3Role,
        commenter4Name: exam.commenter4Name,
        commenter4Role: exam.commenter4Role,
        commenter5Name: exam.commenter5Name,
        commenter5Role: exam.commenter5Role,
        inspectorName: exam.inspectorName,
        inspectorRole: exam.inspectorRole,
      };
    });

    console.log(`[Schedule] Returning ${formattedExams.length} formatted exams`);
    return NextResponse.json({ exams: formattedExams });
  } catch (error) {
    console.error("Lecturer schedule lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
