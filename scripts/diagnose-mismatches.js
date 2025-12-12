const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseMismatches() {
  try {
    // Get active datasets
    const activeDatasets = await prisma.dataset.findMany({
      where: { 
        isActive: true,
        OR: [
          { type: "student" },
          { type: null },
        ],
      },
    });

    if (activeDatasets.length === 0) {
      console.log('No active datasets found');
      return;
    }

    const datasetIds = activeDatasets.map(d => d.id);
    console.log(`Active datasets: ${datasetIds.length}\n`);

    // Get sample enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
      take: 100,
    });

    console.log(`Checking ${enrollments.length} enrollments...\n`);

    // Get all exams
    const allExams = await prisma.courseExam.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
    });

    console.log(`Found ${allExams.length} exams\n`);

    // Helper to normalize
    const normalize = (str) => str.trim().replace(/\s+/g, ' ').toUpperCase();

    // Check for mismatches
    const mismatches = [];
    const matches = [];

    enrollments.forEach((enrollment) => {
      // Try to find matching exam
      const exactMatch = allExams.find(e => 
        e.courseCode === enrollment.courseCode && 
        e.classNo === enrollment.classNo
      );

      const normalizedMatch = allExams.find(e => 
        normalize(e.courseCode) === normalize(enrollment.courseCode) &&
        normalize(e.classNo) === normalize(enrollment.classNo)
      );

      if (exactMatch) {
        matches.push({ enrollment, exam: exactMatch, type: 'exact' });
      } else if (normalizedMatch) {
        matches.push({ enrollment, exam: normalizedMatch, type: 'normalized' });
      } else {
        // Check if course code exists but class doesn't match
        const courseCodeMatches = allExams.filter(e => 
          normalize(e.courseCode) === normalize(enrollment.courseCode)
        );

        if (courseCodeMatches.length > 0) {
          mismatches.push({
            enrollment,
            reason: 'class_no_mismatch',
            availableClasses: courseCodeMatches.map(e => e.classNo),
          });
        } else {
          mismatches.push({
            enrollment,
            reason: 'course_code_not_found',
          });
        }
      }
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total enrollments checked: ${enrollments.length}`);
    console.log(`Exact matches: ${matches.filter(m => m.type === 'exact').length}`);
    console.log(`Normalized matches: ${matches.filter(m => m.type === 'normalized').length}`);
    console.log(`Mismatches: ${mismatches.length}\n`);

    if (mismatches.length > 0) {
      console.log(`\n=== MISMATCHES (first 20) ===\n`);
      mismatches.slice(0, 20).forEach((m, i) => {
        console.log(`${i + 1}. Student: ${m.enrollment.studentId}`);
        console.log(`   Course: "${m.enrollment.courseCode}" (length: ${m.enrollment.courseCode.length})`);
        console.log(`   Class: "${m.enrollment.classNo}" (length: ${m.enrollment.classNo.length})`);
        console.log(`   Reason: ${m.reason}`);
        if (m.reason === 'class_no_mismatch') {
          console.log(`   Available classes: ${m.availableClasses.join(', ')}`);
        }
        console.log('');
      });
    }

    // Check for common formatting issues
    console.log(`\n=== FORMATTING ANALYSIS ===\n`);
    const courseCodeFormats = new Set();
    const classNoFormats = new Set();
    
    enrollments.forEach(e => {
      courseCodeFormats.add(`"${e.courseCode}" (has spaces: ${e.courseCode.includes(' ')}, has dots: ${e.courseCode.includes('.')})`);
      classNoFormats.add(`"${e.classNo}" (length: ${e.classNo.length}, is numeric: ${/^\d+$/.test(e.classNo)})`);
    });

    console.log('Sample course code formats:');
    Array.from(courseCodeFormats).slice(0, 10).forEach(f => console.log(`  ${f}`));
    
    console.log('\nSample class number formats:');
    Array.from(classNoFormats).slice(0, 10).forEach(f => console.log(`  ${f}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseMismatches();

