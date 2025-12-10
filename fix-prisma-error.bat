@echo off
echo ========================================
echo Fixing Prisma Permission Error
echo ========================================
echo.

echo Step 1: Closing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo Node processes closed successfully.
) else (
    echo No Node processes found (or already closed).
)
echo.

echo Step 2: Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo.

echo Step 3: Deleting locked Prisma files...
if exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
    del /F /Q "node_modules\.prisma\client\query_engine-windows.dll.node" 2>nul
    echo Deleted query engine file.
) else (
    echo Query engine file not found (may already be deleted).
)
echo.

echo Step 4: Regenerating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Still having issues. Try running Command Prompt as Administrator.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Fixed! Prisma Client regenerated successfully.
echo ========================================
echo.
echo Now you can run: npx prisma db push
echo.
pause



