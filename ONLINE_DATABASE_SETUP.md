# Online Database Setup Guide

This guide will help you set up an online PostgreSQL database for the Exam Schedule Lookup application. Using an online database allows you to access your data from anywhere and makes deployment easier.

## Recommended Online Database Providers

### Option 1: Supabase (Recommended - Free Tier Available)

**Why Supabase?**
- Free tier with 500MB database storage
- Easy setup and management
- Built-in connection pooling
- PostgreSQL database
- Great documentation and support

**Setup Steps:**

1. **Sign up for Supabase**
   - Go to https://supabase.com
   - Click "Start your project" and create a free account
   - Sign in with GitHub, Google, or email

2. **Create a New Project**
   - Click "New Project"
   - Choose your organization (or create one)
   - Enter project details:
     - **Name**: `exam-schedule-lookup` (or any name you prefer)
     - **Database Password**: Create a strong password (save this!)
     - **Region**: Choose the closest region to you
   - Click "Create new project"
   - Wait 2-3 minutes for the project to be created

3. **Get Your Connection String**
   - Once your project is ready, go to **Settings** (gear icon) → **Database**
   - Scroll down to **Connection string** section
   - Select **URI** tab
   - Copy the connection string (it looks like):
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with the password you set when creating the project

4. **Update Your `.env` File**
   - Create a `.env` file in your project root (if it doesn't exist)
   - Add your connection string:
     ```env
     DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public"
     ```
   - Replace `YOUR_PASSWORD` with your actual database password
   - Replace `db.xxxxx.supabase.co` with your actual Supabase host

5. **Initialize the Database Schema**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push schema to database (creates tables)
   npx prisma db push
   ```

6. **Verify Setup**
   ```bash
   # Open Prisma Studio to view your database
   npx prisma studio
   ```

---

### Option 2: Neon (Serverless PostgreSQL - Free Tier)

**Why Neon?**
- Serverless PostgreSQL
- Free tier with 3GB storage
- Auto-scaling
- Branching feature (like Git for databases)

**Setup Steps:**

1. **Sign up for Neon**
   - Go to https://neon.tech
   - Click "Sign Up" and create a free account
   - Sign in with GitHub, Google, or email

2. **Create a New Project**
   - Click "Create a project"
   - Enter project details:
     - **Name**: `exam-schedule-lookup`
     - **Region**: Choose the closest region
     - **PostgreSQL version**: 15 or 16 (recommended)
   - Click "Create project"

3. **Get Your Connection String**
   - After project creation, you'll see a connection string in the dashboard
   - It looks like:
     ```
     postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
     ```
   - Click "Copy" to copy the full connection string

4. **Update Your `.env` File**
   ```env
   DATABASE_URL="postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require&schema=public"
   ```

5. **Initialize the Database Schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

### Option 3: Railway (Free Tier Available)

**Why Railway?**
- Simple deployment platform
- Free tier with $5 credit monthly
- Easy PostgreSQL setup

**Setup Steps:**

1. **Sign up for Railway**
   - Go to https://railway.app
   - Click "Start a New Project" and sign up with GitHub

2. **Create PostgreSQL Database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create a PostgreSQL database

3. **Get Your Connection String**
   - Click on the PostgreSQL service
   - Go to the "Variables" tab
   - Copy the `DATABASE_URL` value

4. **Update Your `.env` File**
   ```env
   DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"
   ```

5. **Initialize the Database Schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

### Option 4: Render (Free Tier Available)

**Why Render?**
- Free PostgreSQL database
- 90-day free trial
- Simple setup

**Setup Steps:**

1. **Sign up for Render**
   - Go to https://render.com
   - Create a free account

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Enter details:
     - **Name**: `exam-schedule-lookup`
     - **Database**: `exam_schedule`
     - **User**: `exam_user` (or default)
     - **Region**: Choose closest region
   - Click "Create Database"

3. **Get Your Connection String**
   - After creation, go to the database dashboard
   - Find "Internal Database URL" or "External Database URL"
   - Copy the connection string

4. **Update Your `.env` File**
   ```env
   DATABASE_URL="postgresql://exam_user:password@dpg-xxxxx-a.oregon-postgres.render.com/exam_schedule"
   ```

5. **Initialize the Database Schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

### Option 5: PlanetScale (MySQL Alternative)

**Note:** If you prefer MySQL, PlanetScale is a great option, but you'll need to change the Prisma schema back to MySQL.

**Setup Steps:**

1. **Sign up for PlanetScale**
   - Go to https://planetscale.com
   - Create a free account

2. **Create Database**
   - Create a new database
   - Get the connection string

3. **Update Prisma Schema**
   - Change `provider = "postgresql"` to `provider = "mysql"` in `prisma/schema.prisma`

4. **Update `.env` File**
   ```env
   DATABASE_URL="mysql://username:password@host:port/database"
   ```

---

## Quick Setup Checklist

After choosing a provider and getting your connection string:

- [ ] Create `.env` file in project root
- [ ] Add `DATABASE_URL` with your connection string
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push`
- [ ] Verify with `npx prisma studio`
- [ ] Test your application with `npm run dev`

## Connection String Format

The connection string format for PostgreSQL is:
```
postgresql://[username]:[password]@[host]:[port]/[database]?[parameters]
```

Common parameters:
- `schema=public` - Database schema name
- `sslmode=require` - Required for some cloud providers (like Neon)

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Make sure `.env` is in your `.gitignore`
   - Use environment variables in production

2. **Use strong passwords**
   - Generate secure passwords for your database
   - Store them in a password manager

3. **Restrict database access**
   - Most cloud providers allow IP whitelisting
   - Only allow connections from trusted IPs in production

4. **Use connection pooling**
   - Some providers (like Supabase) offer connection pooling
   - Use pooled connections for better performance

## Troubleshooting

### Connection Error: "password authentication failed"
- Double-check your password in the connection string
- Make sure you're using the correct username
- Some providers require URL encoding for special characters in passwords

### Connection Error: "connection refused" or "timeout"
- Check if your IP is whitelisted (if required by provider)
- Verify the host and port are correct
- Check firewall settings

### SSL/TLS Errors
- Add `?sslmode=require` to your connection string
- Some providers require SSL connections

### Schema Push Fails
- Make sure you have the correct permissions
- Check if the database exists
- Verify the connection string is correct

## Migration from Local Database

If you're migrating from a local database:

1. **Export your data** (if you have existing data):
   ```bash
   # Using Prisma Studio or database tools
   # Export your data to CSV or SQL
   ```

2. **Set up online database** (follow steps above)

3. **Import your data**:
   ```bash
   # Use Prisma Studio or database import tools
   # Or write a migration script
   ```

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Railway Docs**: https://docs.railway.app
- **Prisma Docs**: https://www.prisma.io/docs

---

## Recommended Provider Comparison

| Provider | Free Tier | Storage | Best For |
|----------|-----------|---------|----------|
| **Supabase** | ✅ 500MB | 500MB | General use, easy setup |
| **Neon** | ✅ 3GB | 3GB | Serverless, auto-scaling |
| **Railway** | ✅ $5 credit | Varies | Simple deployment |
| **Render** | ✅ 90 days | 1GB | Free tier testing |

**Our Recommendation**: Start with **Supabase** for the easiest setup and good free tier.

