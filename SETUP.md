# Quick Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **PostgreSQL** - [Download](https://www.postgresql.org/download/) or use a cloud service like [Supabase](https://supabase.com/) or [Railway](https://railway.app/)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Create a PostgreSQL database and update the `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/exam_schedule?schema=public"
```

### 3. Initialize Database Schema

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 4. Generate Sample Excel Files (Optional)

```bash
npm run generate:samples
```

This creates sample Excel files in the `/samples` directory that you can use for testing.

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 6. Admin Login

- Navigate to `/admin`
- Default credentials:
  - Username: `admin`
  - Password: `admin`

**⚠️ Important**: Change the default password in production by setting `ADMIN_PASSWORD_HASH` in your `.env` file.

To generate a password hash:
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

## First Upload

1. Login to admin panel at `/admin/upload`
2. Use the sample Excel files from `/samples` or create your own
3. Upload both files:
   - ExamSchedule.xlsx
   - StudentEnrollments.xlsx
4. Enter a dataset name (e.g., "Term 1 2025")
5. Click "Upload Dataset"
6. Click "Activate" on the uploaded dataset

## Testing Student Lookup

1. Go to the home page (`/`)
2. Enter a student ID from your StudentEnrollments.xlsx file
3. View the exam schedule

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall settings if using a remote database

### Excel Upload Errors
- Ensure headers match exactly (case-insensitive)
- Check date format: YYYY-MM-DD
- Check time format: HH:MM (24-hour)
- Review error messages in the upload response

### Build Errors
- Run `npx prisma generate` before building
- Ensure all environment variables are set
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

## Production Deployment

1. Set environment variables in your hosting platform
2. Run database migrations: `npx prisma migrate deploy`
3. Build the app: `npm run build`
4. Start the server: `npm start`

For detailed deployment instructions, see the main [README.md](./README.md).



