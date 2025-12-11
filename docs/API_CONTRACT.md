# API Contract

## Student APIs

### GET /api/student/schedule

Look up exam schedule for a student.

**Query Parameters:**
- `studentId` (string, required): The student ID to look up

**Response (200 OK):**
```json
{
  "schedules": [
    {
      "courseName": "Introduction to Computer Science",
      "courseCode": "CS101",
      "classNo": "1",
      "examDate": "2025-03-15",
      "startTime": "09:00",
      "endTime": "11:00",
      "place": "Building A, Room 201",
      "period": "Midterm"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid studentId
- `404 Not Found`: No active dataset found
- `500 Internal Server Error`: Server error

---

## Admin APIs

All admin APIs require authentication via session cookie.

### POST /api/admin/login

Authenticate as admin.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing username or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

---

### POST /api/admin/logout

Log out from admin session.

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### GET /api/admin/check

Check if admin session is valid.

**Response (200 OK):**
```json
{
  "authenticated": true
}
```

**Response (401 Unauthorized):**
```json
{
  "authenticated": false
}
```

---

### GET /api/admin/datasets

Get list of all datasets.

**Response (200 OK):**
```json
{
  "datasets": [
    {
      "id": "clx...",
      "name": "Term 1 2025",
      "createdAt": "2025-01-15T10:00:00Z",
      "isActive": true
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Server error

---

### POST /api/admin/upload

Upload Excel files and create a new dataset.

**Request (multipart/form-data):**
- `examFile` (File): ExamSchedule.xlsx file
- `enrollFile` (File): StudentEnrollments.xlsx file
- `datasetName` (string): Name for the dataset

**Response (200 OK):**
```json
{
  "success": true,
  "datasetId": "clx...",
  "summary": {
    "inserted": 150,
    "updated": 0,
    "failed": 0
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing files, validation errors, or parsing errors
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Server error

**Validation Error Response (400):**
```json
{
  "error": "Validation errors found",
  "examErrors": [
    {
      "row": 5,
      "field": "exam_date",
      "message": "Date must be in YYYY-MM-DD format"
    }
  ],
  "enrollErrors": []
}
```

---

### POST /api/admin/activate

Activate a dataset (deactivates all others).

**Request Body:**
```json
{
  "datasetId": "clx..."
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing datasetId
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Server error




