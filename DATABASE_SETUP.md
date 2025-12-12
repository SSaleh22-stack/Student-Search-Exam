# Database Setup Guide

This guide will help you set up a PostgreSQL database for the Exam Schedule Lookup application.

## Option 1: Local PostgreSQL Installation

### Step 1: Install PostgreSQL

**Windows:**
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

**macOS:**
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

**Using psql (Command Line):**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE exam_schedule;

# Create a user (optional, but recommended)
CREATE USER exam_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE exam_schedule TO exam_user;

# Exit
\q
```

**Using pgAdmin (GUI):**
1. Open pgAdmin
2. Right-click on "Databases" → "Create" → "Database"
3. Name: `exam_schedule`
4. Click "Save"

### Step 3: Configure Connection String

Create or update your `.env` file:

```env
# Using default postgres user
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/exam_schedule?schema=public"

# OR using custom user
DATABASE_URL="postgresql://exam_user:your_password@localhost:5432/exam_schedule?schema=public"
```

---

## Option 2: Cloud Database (Recommended for Easy Setup)

### Using Supabase (Free Tier Available)

1. **Sign up**: Go to https://supabase.com and create an account
2. **Create Project**: Click "New Project"
3. **Get Connection String**:
   - Go to Project Settings → Database
   - Copy the "Connection string" (URI format)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
4. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres?schema=public"
   ```

### Using Railway (Free Tier Available)

1. **Sign up**: Go to https://railway.app and create an account
2. **Create Project**: Click "New Project" → "Provision PostgreSQL"
3. **Get Connection String**:
   - Click on the PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL`
4. **Update `.env`** with the connection string

### Using Neon (Free Tier Available)

1. **Sign up**: Go to https://neon.tech and create an account
2. **Create Project**: Click "Create Project"
3. **Get Connection String**:
   - Copy the connection string from the dashboard
4. **Update `.env`** with the connection string

---

## Step 4: Initialize Database Schema

After setting up your database and `.env` file, run these commands:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database (creates tables)
npx prisma db push
```

This will create all the necessary tables:
- `Dataset` - Stores dataset information
- `CourseExam` - Stores exam schedule data
- `Enrollment` - Stores student enrollments

---

## Step 5: Verify Database Setup

**Option A: Using Prisma Studio (Visual Tool)**
```bash
npx prisma studio
```
This opens a web interface at http://localhost:5555 where you can view and edit your database.

**Option B: Using psql**
```bash
psql -U postgres -d exam_schedule

# List tables
\dt

# View Dataset table structure
\d "Dataset"

# Exit
\q
```

---

## Troubleshooting

### Connection Error: "password authentication failed"
- Check your password in the `.env` file
- Make sure you're using the correct username

### Connection Error: "database does not exist"
- Make sure you created the database (see Step 2)
- Verify the database name in your `DATABASE_URL`

### Connection Error: "connection refused"
- Make sure PostgreSQL is running
- Check if PostgreSQL is listening on port 5432
- For cloud databases, check firewall/network settings

### Windows: "psql is not recognized"
- Add PostgreSQL bin directory to PATH:
  - Usually: `C:\Program Files\PostgreSQL\15\bin`
  - Or use pgAdmin instead

---

## Quick Start (If you have PostgreSQL installed)

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE exam_schedule;"

# 2. Create .env file with:
# DATABASE_URL="postgresql://postgres:your_password@localhost:5432/exam_schedule?schema=public"

# 3. Initialize schema
npx prisma generate
npx prisma db push

# 4. Done! Start the app
npm run dev
```

---

## Database Schema Overview

The database contains 3 main tables:

1. **Dataset**: Stores different exam periods/terms
   - Each upload creates a new dataset
   - Only one dataset can be active at a time

2. **CourseExam**: Stores exam schedule information
   - Linked to a dataset
   - Contains: course code, name, class, date, time, location, period

3. **Enrollment**: Stores student-course enrollments
   - Links students to courses and classes
   - Used to match students with their exams

---

## Need Help?

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Prisma Docs**: https://www.prisma.io/docs
- **Supabase Docs**: https://supabase.com/docs






