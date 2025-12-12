@echo off
echo ========================================
echo Database Setup Script
echo ========================================
echo.

echo Step 1: Creating database...
psql -U postgres -c "CREATE DATABASE exam_schedule;" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not create database.
    echo Please make sure PostgreSQL is installed and running.
    echo.
    echo You can also create it manually:
    echo   1. Open pgAdmin or psql
    echo   2. Run: CREATE DATABASE exam_schedule;
    echo.
    pause
    exit /b 1
)

echo Database created successfully!
echo.

echo Step 2: Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo Step 3: Pushing schema to database...
echo (Make sure your .env file has DATABASE_URL set)
call npx prisma db push
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to push schema
    echo Please check your DATABASE_URL in .env file
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup complete!
echo ========================================
echo.
echo Next steps:
echo   1. Make sure .env file has DATABASE_URL
echo   2. Run: npm run dev
echo.
pause






