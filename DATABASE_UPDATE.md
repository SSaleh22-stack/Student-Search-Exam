# Database Update Instructions

## Search Page Activation Settings

To enable admin control over search page activation:

```sql
-- Create Settings table for search page activation
CREATE TABLE IF NOT EXISTS Settings (
  id VARCHAR(255) PRIMARY KEY DEFAULT 'settings',
  studentSearchActive BOOLEAN DEFAULT TRUE,
  lecturerSearchActive BOOLEAN DEFAULT TRUE,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings (both search pages active by default)
INSERT INTO Settings (id, studentSearchActive, lecturerSearchActive)
VALUES ('settings', TRUE, TRUE)
ON DUPLICATE KEY UPDATE studentSearchActive = studentSearchActive;
```

After running these commands:
1. Run `npx prisma generate` to regenerate the Prisma client
2. Restart your Next.js development server (`npm run dev`)
3. You can now control search page activation from the admin panel

---

## Multiple Active Datasets and Lecturer Support

To allow multiple datasets to be active at the same time and support lecturer datasets:

```sql
-- Add type column to Dataset table
ALTER TABLE Dataset ADD COLUMN `type` VARCHAR(20) DEFAULT 'student';

-- Update existing datasets (optional - sets all existing to 'student')
UPDATE Dataset SET `type` = 'student' WHERE `type` IS NULL;

-- Add index on type for better query performance
CREATE INDEX Dataset_type_idx ON Dataset(`type`);
```

After running these commands:
1. Restart your Next.js development server (`npm run dev`)
2. The system will now support multiple active datasets
3. Lecturer datasets will show lecturer exams instead of student exams
4. Student datasets will continue to work as before

---

# Update Database Schema - Change examDate to String (Hijri Date Support)

## Using phpMyAdmin (Easiest)

1. **Open phpMyAdmin**
   - Open your web browser
   - Go to: `http://localhost/phpmyadmin`
   - Login if required (usually no password for XAMPP)

2. **Select Your Database**
   - In the left sidebar, click on your database name (usually `exam_schedule` or similar)
   - If you're not sure, check your `.env` file for the database name

3. **Run SQL Command**
   - Click on the "SQL" tab at the top
   - Copy and paste this SQL command:
   ```sql
   ALTER TABLE CourseExam MODIFY COLUMN examDate VARCHAR(10);
   ```
   - Click "Go" or press Enter

4. **Verify the Change**
   - Click on the `CourseExam` table in the left sidebar
   - Click on the "Structure" tab
   - Verify that the `examDate` column now shows type `varchar(10)` instead of `date`

## Using MySQL Command Line

1. **Open MySQL Command Line**
   - Open XAMPP Control Panel
   - Click "Shell" button
   - Or open Command Prompt/Terminal

2. **Connect to MySQL**
   ```bash
   mysql -u root
   ```
   (No password needed for default XAMPP setup)

3. **Select Your Database**
   ```sql
   USE exam_schedule;
   ```
   (Replace `exam_schedule` with your actual database name)

4. **Run the ALTER Command**
   ```sql
   ALTER TABLE CourseExam MODIFY COLUMN examDate VARCHAR(10);
   ```

5. **Verify**
   ```sql
   DESCRIBE CourseExam;
   ```
   You should see `examDate` as `varchar(10)`

## What This Does

- Changes the `examDate` column from `DATE` to `VARCHAR(10)`
- This allows storing Hijri dates like "1447-07-01" as strings without conversion
- The `VARCHAR(10)` type can store dates in YYYY-MM-DD format (10 characters)
- Both Hijri dates (e.g., "1447-07-01") and Gregorian dates (e.g., "2025-03-15") can be stored
- Dates are stored exactly as they appear in the Excel file

## After Running the SQL

1. **Restart your Next.js development server** (to regenerate Prisma client)
   - Stop the server (Ctrl+C)
   - Run: `npm run dev`

2. Try uploading `Book1.xlsx` again
3. The dates will now be stored as strings in Hijri format (e.g., "1447-07-01")
4. Dates will be displayed in Hijri format on the student lookup page

## Important Notes

- **Existing Data**: If you have existing data with DATE type, you may need to:
  - Export the data first
  - Run the ALTER command
  - Re-import the data (or re-upload the Excel files)
  
- **Sorting**: String sorting works correctly for YYYY-MM-DD format dates (both Hijri and Gregorian)

- **Unique Constraint**: The unique constraint on `datasetId + courseCode + classNo + examDate + period` will still work correctly with string dates

## Troubleshooting

If you get an error:
- **"Table doesn't exist"**: Make sure you've selected the correct database
- **"Column doesn't exist"**: The table might not have been created yet. Try uploading a file first to create the table
- **"Access denied"**: Make sure you're logged in as the root user or have proper permissions
- **"Data truncation"**: If you have existing data, you may need to clear the table first or convert the data
