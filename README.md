# Exam Schedule Lookup

A production-ready web application for students to look up their exam schedules. Administrators can upload Excel files containing exam schedules and student enrollments.

## Features

- 🔍 **Student Lookup**: Students can search for their exam schedule by entering their student ID
- 📊 **Excel Upload**: Admins can upload Excel files with exam schedules and enrollments
- 📅 **Dataset Management**: Support for multiple datasets (terms/semesters) with activation
- ✅ **Data Validation**: Robust Excel parsing with detailed error reporting
- 🔒 **Admin Authentication**: Protected admin routes with session-based authentication
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (recommended) or MySQL/MariaDB
- **ORM**: Prisma
- **Excel Parsing**: ExcelJS
- **Validation**: Zod
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ and npm/yarn
- Database: PostgreSQL (recommended) or MySQL/MariaDB
  - **Online**: Use Supabase, Neon, Railway, or Render (free tiers available)
  - **Local**: Install PostgreSQL or MySQL/MariaDB (XAMPP)
- Environment variables configured

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

**For Online Database (Recommended):**
```env
# Online PostgreSQL Database (Supabase, Neon, Railway, etc.)
# See ONLINE_DATABASE_SETUP.md for detailed setup instructions
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Admin Credentials (optional - defaults to admin/admin)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="<bcrypt-hashed-password>"
```

**For Local PostgreSQL:**
```env
# Local PostgreSQL Database
DATABASE_URL="postgresql://user:password@localhost:5432/exam_schedule?schema=public"

# Admin Credentials (optional - defaults to admin/admin)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="<bcrypt-hashed-password>"
```

**For MySQL (XAMPP):**
```env
# Database (XAMPP MySQL - default no password)
DATABASE_URL="mysql://root@localhost:3306/exam_schedule?schema=public"

# Admin Credentials (optional - defaults to admin/admin)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="<bcrypt-hashed-password>"
```

**For production, generate a password hash:**
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### 3. Set Up Database

**🌐 For Online Database (Recommended):** See [ONLINE_DATABASE_SETUP.md](./ONLINE_DATABASE_SETUP.md) for step-by-step instructions on setting up Supabase, Neon, Railway, or other cloud providers.

**💻 For Local Database:**
- **PostgreSQL users:** See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.
- **XAMPP/MySQL users:** See [XAMPP_SETUP.md](./XAMPP_SETUP.md) for detailed instructions.

**Quick setup:**
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Students

1. Navigate to the home page
2. Enter your student ID
3. Click "Search" to view your exam schedule

### For Administrators

1. Navigate to `/admin`
2. Login with admin credentials (default: `admin`/`admin`)
3. Go to `/admin/upload` to:
   - Upload Excel files (ExamSchedule.xlsx and StudentEnrollments.xlsx)
   - View and manage datasets
   - Activate a dataset

### Excel File Format

See `/docs/DATA_DICTIONARY.md` for detailed specifications and `/samples/` for example templates.

**ExamSchedule.xlsx** required columns:
- `course_code`, `course_name`, `class_no`, `exam_date` (YYYY-MM-DD), `start_time` (HH:MM), `end_time` (HH:MM), `place`, `period`

**StudentEnrollments.xlsx** required columns:
- `student_id`, `course_code`, `class_no`

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── admin/            # Admin pages
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Student lookup page
├── docs/                 # Documentation
├── lib/
│   ├── excel/           # Excel parsing utilities
│   ├── auth.ts          # Authentication utilities
│   └── prisma.ts        # Prisma client
├── prisma/
│   └── schema.prisma    # Database schema
└── samples/             # Sample Excel templates
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio

## Deployment

### 🚀 Quick Deployment Guide

**Recommended Platform: Vercel** (Best for Next.js)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete step-by-step instructions for:
- Vercel (Recommended - easiest for Next.js)
- Netlify
- Railway
- Render

### Quick Start (Vercel)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com and import your repository
3. Add environment variables:
   - `DATABASE_URL` - Your Neon database connection string
   - `ADMIN_USERNAME` (optional)
   - `ADMIN_PASSWORD_HASH` (optional, but recommended)
4. Click "Deploy" - done! 🎉

### Environment Variables

Set the following environment variables in your deployment platform:

- `DATABASE_URL`: PostgreSQL connection string (required)
- `ADMIN_USERNAME`: Admin username (optional, defaults to "admin")
- `ADMIN_PASSWORD_HASH`: Bcrypt-hashed admin password (optional, but recommended for production)

### Build and Test Locally

```bash
# Test production build locally
npm run build
npm run start
```

### Database Setup

Your database schema is already set up. For production, ensure:
- Database is accessible from the deployment platform
- Connection string is correctly set in environment variables
- Schema is pushed: `npx prisma db push` (already done ✅)

## Security Notes

- Admin routes are protected by session-based authentication
- Student lookup is rate-limited (configure in production)
- Input sanitization is applied to all user inputs
- Passwords are hashed using bcrypt

## License

MIT

