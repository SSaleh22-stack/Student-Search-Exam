#!/bin/bash

echo "========================================"
echo "Database Setup Script"
echo "========================================"
echo ""

echo "Step 1: Creating database..."
psql -U postgres -c "CREATE DATABASE exam_schedule;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Could not create database."
    echo "Please make sure PostgreSQL is installed and running."
    echo ""
    echo "You can also create it manually:"
    echo "  1. Run: psql -U postgres"
    echo "  2. Run: CREATE DATABASE exam_schedule;"
    echo ""
    exit 1
fi

echo "Database created successfully!"
echo ""

echo "Step 2: Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate Prisma client"
    exit 1
fi

echo ""
echo "Step 3: Pushing schema to database..."
echo "(Make sure your .env file has DATABASE_URL set)"
npx prisma db push
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to push schema"
    echo "Please check your DATABASE_URL in .env file"
    exit 1
fi

echo ""
echo "========================================"
echo "Database setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Make sure .env file has DATABASE_URL"
echo "  2. Run: npm run dev"
echo ""




