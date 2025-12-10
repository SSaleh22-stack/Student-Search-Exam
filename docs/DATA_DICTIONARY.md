# Data Dictionary

## ExamSchedule.xlsx

### Required Headers (case-insensitive, spaces normalized to underscores)

| Column Name | Type | Format | Required | Description |
|------------|------|--------|----------|-------------|
| `course_code` | String | - | Yes | Unique identifier for the course (e.g., "CS101") |
| `course_name` | String | - | Yes | Full name of the course (e.g., "Introduction to Computer Science") |
| `class_no` | String/Number | - | Yes | Class or section number (e.g., "1", "A", "101") |
| `exam_date` | String | YYYY-MM-DD | Yes | Date of the exam (e.g., "2025-03-15") |
| `start_time` | String | HH:MM | Yes | Exam start time in 24-hour format (e.g., "09:00") |
| `end_time` | String | HH:MM | Yes | Exam end time in 24-hour format (e.g., "11:00") |
| `place` | String | - | Yes | Exam location/venue (e.g., "Building A, Room 201") |
| `period` | String | - | Yes | Exam period/type (e.g., "Midterm", "Final", "Quiz") |
| `rows` | Number | - | No | Number of rows in the exam venue (optional) |
| `seats` | Number | - | No | Number of seats per row or total seats (optional) |

### Example Row
```
course_code: CS101
course_name: Introduction to Computer Science
class_no: 1
exam_date: 2025-03-15
start_time: 09:00
end_time: 11:00
place: Building A, Room 201
period: Midterm
```

### Validation Rules
- All fields except `rows` and `seats` are required (non-empty)
- `exam_date` must be in YYYY-MM-DD format
- `start_time` and `end_time` must be in HH:MM format (24-hour)
- `class_no` can be a string or number (will be converted to string)
- `rows` and `seats` are optional numeric fields

---

## StudentEnrollments.xlsx

### Required Headers (case-insensitive, spaces normalized to underscores)

| Column Name | Type | Format | Required | Description |
|------------|------|--------|----------|-------------|
| `student_id` | String | - | Yes | Unique identifier for the student (e.g., "STU001", "2025001") |
| `course_code` | String | - | Yes | Course code matching ExamSchedule (e.g., "CS101") |
| `class_no` | String/Number | - | Yes | Class/section number matching ExamSchedule (e.g., "1") |

### Example Row
```
student_id: STU001
course_code: CS101
class_no: 1
```

### Validation Rules
- All fields are required (non-empty)
- `class_no` can be a string or number (will be converted to string)
- The combination of `student_id`, `course_code`, and `class_no` should be unique within a dataset

---

## Database Schema

### Dataset
- `id`: Unique identifier (CUID)
- `name`: Dataset name (e.g., "Term 1 2025")
- `createdAt`: Timestamp of creation
- `isActive`: Boolean flag indicating if this is the active dataset

### CourseExam
- `id`: Unique identifier
- `datasetId`: Foreign key to Dataset
- `courseCode`: Course code
- `courseName`: Course name
- `classNo`: Class/section number
- `examDate`: Date of exam
- `startTime`: Start time (HH:MM format)
- `endTime`: End time (HH:MM format)
- `place`: Exam location
- `period`: Exam period/type

**Unique Constraint**: `datasetId + courseCode + classNo + examDate + period`

### Enrollment
- `id`: Unique identifier
- `datasetId`: Foreign key to Dataset
- `studentId`: Student identifier
- `courseCode`: Course code
- `classNo`: Class/section number

**Unique Constraint**: `datasetId + studentId + courseCode + classNo`

---

## Data Relationships

1. **Student Lookup Flow**:
   - Student enters `student_id`
   - System finds active dataset
   - System finds all enrollments for that `student_id` in the active dataset
   - System joins enrollments with CourseExam on `courseCode + classNo`
   - Results are sorted by `examDate` then `startTime`

2. **Upsert Logic**:
   - CourseExam: Uses unique constraint to update existing records or create new ones
   - Enrollment: Uses unique constraint to prevent duplicate enrollments

