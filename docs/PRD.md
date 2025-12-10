# Product Requirements Document (PRD)
## Exam Schedule Lookup Web Application

### Overview
A production-ready web application that allows students to look up their exam schedules by entering their student ID. Administrators (doctors) can upload Excel files containing exam schedules and student enrollments.

### Goals
1. **Student Experience**: Students can quickly find their exam schedule by entering their student ID
2. **Admin Management**: Admins can upload and manage multiple datasets (e.g., different terms/semesters)
3. **Data Integrity**: Robust validation and error handling for Excel uploads
4. **Privacy**: Students only see their own schedule, no access to other students' data

### User Roles

#### Students
- Access: Public (no authentication required)
- Actions:
  - Enter student ID
  - View exam schedule (course name, code, class, date, time, location, period)

#### Administrators
- Access: Protected by authentication
- Actions:
  - Login to admin panel
  - Upload Excel files (ExamSchedule.xlsx and StudentEnrollments.xlsx)
  - Create and manage datasets
  - Activate/deactivate datasets
  - View upload summaries and error reports

### Core Features

#### Dataset Versioning
- Each upload creates a new dataset with a name (e.g., "Term 1 2025")
- Only one dataset can be active at a time
- Historical datasets are preserved
- Re-uploading does not break older datasets

#### Excel File Processing
- **ExamSchedule.xlsx**: Contains course exam information
- **StudentEnrollments.xlsx**: Contains student-course enrollments
- Header validation (case-insensitive)
- Row-by-row validation with detailed error reporting
- Support for .xlsx and .xls formats

#### Data Privacy
- Students can only query their own schedule
- No exposure of other students' data
- Admin routes are protected by authentication

### Technical Requirements
- Next.js 14 (App Router)
- TypeScript
- PostgreSQL database
- Prisma ORM
- ExcelJS for Excel parsing
- Zod for validation
- Tailwind CSS for styling

### Non-Functional Requirements
- Input sanitization
- Rate limiting on student lookup
- Error logging
- Clear error messages
- Empty state handling
- Responsive design



