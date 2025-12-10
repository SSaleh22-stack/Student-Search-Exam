@echo off
echo ========================================
echo XAMPP MySQL Database Setup
echo ========================================
echo.
echo IMPORTANT: Make sure MySQL is running in XAMPP Control Panel!
echo.
pause

echo.
echo Step 1: Checking if MySQL is accessible...
mysql -u root -e "SELECT 1;" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Cannot connect to MySQL!
    echo.
    echo Please:
    echo   1. Open XAMPP Control Panel
    echo   2. Start MySQL service
    echo   3. Make sure MySQL is running (green)
    echo   4. Run this script again
    echo.
    pause
    exit /b 1
)

echo MySQL connection OK!
echo.

echo Step 2: Creating database 'exam_schedule'...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS exam_schedule;" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not create database.
    echo You may need to create it manually in phpMyAdmin:
    echo   1. Go to http://localhost/phpmyadmin
    echo   2. Click "New" 
    echo   3. Database name: exam_schedule
    echo   4. Click "Create"
    echo.
    pause
    exit /b 1
)

echo Database created successfully!
echo.

echo Step 3: Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo Step 4: Pushing schema to database...
echo (Make sure your .env file has DATABASE_URL set)
echo.
call npx prisma db push
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to push schema
    echo.
    echo Please check:
    echo   1. .env file exists with DATABASE_URL
    echo   2. DATABASE_URL format: mysql://root@localhost:3306/exam_schedule?schema=public
    echo   3. MySQL is running in XAMPP
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup complete!
echo ========================================
echo.
echo Your .env file should have:
echo DATABASE_URL="mysql://root@localhost:3306/exam_schedule?schema=public"
echo.
echo Next steps:
echo   1. Verify in phpMyAdmin: http://localhost/phpmyadmin
echo   2. Run: npm run dev
echo.
pause



