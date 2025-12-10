# XAMPP MySQL Database Setup Guide

This guide will help you set up MySQL database using XAMPP for the Exam Schedule Lookup application.

## Step 1: Start XAMPP Services

1. **Open XAMPP Control Panel**
2. **Start MySQL**:
   - Click "Start" next to MySQL
   - Wait until it shows "Running" (green)

## Step 2: Create Database Using phpMyAdmin

### Option A: Using phpMyAdmin (Easiest)

1. **Open phpMyAdmin**:
   - In XAMPP Control Panel, click "Admin" next to MySQL
   - OR go to: http://localhost/phpmyadmin

2. **Create Database**:
   - Click "New" in the left sidebar
   - Database name: `exam_schedule`
   - Collation: `utf8mb4_unicode_ci` (or leave default)
   - Click "Create"

3. **Done!** The database is ready.

### Option B: Using MySQL Command Line

1. **Open MySQL Command Line**:
   - In XAMPP Control Panel, click "Shell"
   - OR open Command Prompt and navigate to: `C:\xampp\mysql\bin`

2. **Connect to MySQL**:
   ```bash
   mysql -u root
   ```
   (By default, XAMPP MySQL has no password for root user)

3. **Create Database**:
   ```sql
   CREATE DATABASE exam_schedule;
   USE exam_schedule;
   SHOW DATABASES;
   EXIT;
   ```

## Step 3: Configure Connection String

Create or update your `.env` file in the project root:

```env
# For XAMPP MySQL (default - no password)
DATABASE_URL="mysql://root@localhost:3306/exam_schedule?schema=public"

# OR if you set a password for root user
DATABASE_URL="mysql://root:your_password@localhost:3306/exam_schedule?schema=public"

# OR if you created a custom user
DATABASE_URL="mysql://username:password@localhost:3306/exam_schedule?schema=public"
```

**Default XAMPP MySQL Settings:**
- Host: `localhost`
- Port: `3306`
- Username: `root`
- Password: (usually empty/blank)

## Step 4: Install MySQL Driver (if needed)

The application should work with the default Prisma MySQL driver, but if you encounter connection issues:

```bash
npm install mysql2
```

## Step 5: Initialize Database Schema

Run these commands to create the tables:

```bash
# 1. Generate Prisma Client for MySQL
npx prisma generate

# 2. Push schema to database (creates all tables)
npx prisma db push
```

This will create:
- `Dataset` table
- `CourseExam` table  
- `Enrollment` table

## Step 6: Verify Database Setup

**Option A: Using Prisma Studio**
```bash
npx prisma studio
```
Opens at http://localhost:5555 - visual database browser

**Option B: Using phpMyAdmin**
1. Go to http://localhost/phpmyadmin
2. Click on `exam_schedule` database
3. You should see 3 tables: `Dataset`, `CourseExam`, `Enrollment`

**Option C: Using MySQL Command Line**
```bash
mysql -u root
USE exam_schedule;
SHOW TABLES;
DESCRIBE Dataset;
EXIT;
```

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Solution:**
1. Open phpMyAdmin
2. Go to "User accounts" tab
3. Edit root user → Change password (or leave blank)
4. Update `.env` file with correct password

### Error: "Can't connect to MySQL server"

**Solution:**
1. Make sure MySQL is running in XAMPP Control Panel
2. Check if port 3306 is available
3. Try restarting MySQL service in XAMPP

### Error: "Unknown database 'exam_schedule'"

**Solution:**
- Make sure you created the database (Step 2)
- Check database name in `.env` matches the created database

### Error: "Prisma schema validation error"

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate
```

## Quick Setup Script

After creating the database in phpMyAdmin, run:

```bash
# 1. Create .env file with:
# DATABASE_URL="mysql://root@localhost:3306/exam_schedule?schema=public"

# 2. Generate and push schema
npx prisma generate
npx prisma db push

# 3. Start the app
npm run dev
```

## Database Structure

After setup, your database will have:

1. **Dataset** - Stores exam periods/terms
2. **CourseExam** - Stores exam schedule information
3. **Enrollment** - Stores student-course enrollments

## Next Steps

1. ✅ Database created
2. ✅ Schema initialized
3. 🚀 Start the app: `npm run dev`
4. 📤 Upload Excel files via admin panel
5. 🔍 Test student lookup

---

**Need Help?**
- XAMPP Documentation: https://www.apachefriends.org/docs/
- phpMyAdmin Guide: https://www.phpmyadmin.net/docs/
- Prisma MySQL Docs: https://www.prisma.io/docs/concepts/database-connectors/mysql



