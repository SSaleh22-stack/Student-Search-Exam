# Complete Step-by-Step Guide: XAMPP MySQL Setup

Follow these steps in order to set up your database.

---

## ✅ Step 1: Start MySQL in XAMPP

1. **Open XAMPP Control Panel**
   - Find XAMPP in your Start Menu or Desktop
   - Double-click to open

2. **Start MySQL Service**
   - Look for "MySQL" in the list
   - Click the **"Start"** button next to MySQL
   - Wait until the status shows **"Running"** (it will turn green)
   - ✅ MySQL is now running!

---

## ✅ Step 2: Create Database in phpMyAdmin

### Method 1: Using phpMyAdmin (Easiest)

1. **Open phpMyAdmin**
   - In XAMPP Control Panel, click the **"Admin"** button next to MySQL
   - OR open your browser and go to: **http://localhost/phpmyadmin**

2. **Create New Database**
   - On the left sidebar, click **"New"** (or "New" button at the top)
   - In the "Database name" field, type: **`exam_schedule`**
   - Leave "Collation" as default (or select `utf8mb4_unicode_ci`)
   - Click **"Create"** button
   - ✅ Database created! You should see it in the left sidebar

### Method 2: Using Command Line (Alternative)

1. Open Command Prompt
2. Navigate to XAMPP MySQL: `cd C:\xampp\mysql\bin`
3. Connect: `mysql -u root`
4. Create database: `CREATE DATABASE exam_schedule;`
5. Exit: `EXIT;`

---

## ✅ Step 3: Create .env File

The `.env` file tells the application how to connect to your database.

### Option A: I Already Created It For You! ✅

I've already created the `.env` file in your project folder. It contains:
```
DATABASE_URL="mysql://root@localhost:3306/exam_schedule?schema=public"
```

**Just verify it exists:**
- Go to: `C:\Users\week8\Desktop\Student Search Exam`
- Look for a file named `.env` (you may need to show hidden files)

### Option B: Create It Manually (If Needed)

1. **Open your project folder** in a text editor (VS Code, Notepad++, etc.)
2. **Create a new file** named exactly: `.env` (with the dot at the beginning)
3. **Add this line** to the file:
   ```
   DATABASE_URL="mysql://root@localhost:3306/exam_schedule?schema=public"
   ```
4. **Save the file**

**Note:** If your MySQL has a password, change it to:
```
DATABASE_URL="mysql://root:your_password@localhost:3306/exam_schedule?schema=public"
```

---

## ✅ Step 4: Generate Prisma Client

Open Command Prompt or Terminal in your project folder and run:

```bash
npx prisma generate
```

**What this does:** Creates the database connection code for your app.

**Expected output:** You should see "✔ Generated Prisma Client"

---

## ✅ Step 5: Create Database Tables

Run this command:

```bash
npx prisma db push
```

**What this does:** Creates all the tables in your database (Dataset, CourseExam, Enrollment).

**Expected output:** 
- "Your database is now in sync with your Prisma schema"
- "✔ Generated Prisma Client"

---

## ✅ Step 6: Verify Everything Works

### Check in phpMyAdmin:

1. Go to **http://localhost/phpmyadmin**
2. Click on **`exam_schedule`** database (left sidebar)
3. You should see **3 tables**:
   - `Dataset`
   - `CourseExam`
   - `Enrollment`
   - ✅ If you see these, everything is set up correctly!

### OR Check with Prisma Studio:

Run this command:
```bash
npx prisma studio
```

This opens a web interface at **http://localhost:5555** where you can see your database.

---

## ✅ Step 7: Start Your Application

Now you're ready to run the app!

```bash
npm run dev
```

Then open: **http://localhost:3000**

---

## 📋 Quick Checklist

Before running the app, make sure:

- [ ] MySQL is running in XAMPP (green status)
- [ ] Database `exam_schedule` exists in phpMyAdmin
- [ ] `.env` file exists with correct DATABASE_URL
- [ ] Ran `npx prisma generate` successfully
- [ ] Ran `npx prisma db push` successfully
- [ ] Can see 3 tables in phpMyAdmin

---

## 🚨 Troubleshooting

### Error: "Can't connect to MySQL server"
- **Solution:** Make sure MySQL is running in XAMPP Control Panel

### Error: "Unknown database 'exam_schedule'"
- **Solution:** Go back to Step 2 and create the database

### Error: "Access denied for user 'root'"
- **Solution:** Check if MySQL has a password. If yes, update `.env` file with password

### Error: "Prisma schema validation error"
- **Solution:** Run `npx prisma generate` again

---

## 🎯 Summary of Commands

Run these commands in order (in your project folder):

```bash
# Step 4: Generate Prisma Client
npx prisma generate

# Step 5: Create tables
npx prisma db push

# Step 7: Start app
npm run dev
```

---

## 📝 What Each Step Does

1. **Start MySQL** → Makes database server available
2. **Create Database** → Creates empty database container
3. **Create .env** → Tells app where to find database
4. **Generate Prisma** → Creates database connection code
5. **Push Schema** → Creates tables in database
6. **Verify** → Confirms everything is set up
7. **Start App** → Runs your application

---

**Need help with any step?** Let me know which step you're on and I'll help you!






