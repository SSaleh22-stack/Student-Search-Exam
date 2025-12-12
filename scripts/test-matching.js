const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatching() {
  try {
    // Get a sample student ID
    const enrollments = await prisma.enrollment.findMany({
      take: 5,
      distinct: ['studentId'],
    });

    if (enrollments.length === 0) {
      console.log('No enrollments found');
      return;
    }

    const testStudentId = enrollments[0].studentId;
    console.log(`Testing with student ID: ${testStudentId}\n`);

    // Get all enrollments for this student
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: testStudentId,
      },
    });

    console.log(`Found ${studentEnrollments.length} enrollments:\n`);
    studentEnrollments.forEach((e, i) => {
      console.log(`${i + 1}. Course: ${e.courseCode}, Class: "${e.classNo}" (length: ${e.classNo.length})`);
    });

    // Get all exams that should match
    const datasetIds = [...new Set(studentEnrollments.map(e => e.datasetId))];
    console.log(`\nDataset IDs: ${datasetIds.join(', ')}\n`);

    // Try to find matching exams
    const allExams = await prisma.courseExam.findMany({
      where: {
        datasetId: { in: datasetIds },
      },
    });

    console.log(`Found ${allExams.length} total exams in datasets\n`);

    // Check matching for each enrollment
    studentEnrollments.forEach((enrollment, idx) => {
      console.log(`\n--- Enrollment ${idx + 1}: ${enrollment.courseCode}, Class "${enrollment.classNo}" ---`);
      
      // Exact match
      const exactMatch = allExams.find(e => 
        e.courseCode === enrollment.courseCode && 
        e.classNo === enrollment.classNo
      );
      
      // Trimmed match
      const trimmedMatch = allExams.find(e => 
        e.courseCode.trim() === enrollment.courseCode.trim() && 
        e.classNo.trim() === enrollment.classNo.trim()
      );
      
      // Case-insensitive match
      const caseInsensitiveMatch = allExams.find(e => 
        e.courseCode.toLowerCase().trim() === enrollment.courseCode.toLowerCase().trim() && 
        e.classNo.toLowerCase().trim() === enrollment.classNo.toLowerCase().trim()
      );
      
      // Course code match only
      const courseCodeMatches = allExams.filter(e => 
        e.courseCode.trim() === enrollment.courseCode.trim()
      );

      console.log(`  Exact match: ${exactMatch ? '✓' : '✗'}`);
      console.log(`  Trimmed match: ${trimmedMatch ? '✓' : '✗'}`);
      console.log(`  Case-insensitive match: ${caseInsensitiveMatch ? '✓' : '✗'}`);
      
      if (courseCodeMatches.length > 0) {
        console.log(`  Found ${courseCodeMatches.length} exams with same course code:`);
        courseCodeMatches.forEach(exam => {
          console.log(`    - Class: "${exam.classNo}" (length: ${exam.classNo.length}) - Match: ${exam.classNo === enrollment.classNo ? 'YES' : 'NO'}`);
        });
      } else {
        console.log(`  No exams found with course code: ${enrollment.courseCode}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatching();

