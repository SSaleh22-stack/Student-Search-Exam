# Deployment Guide

This guide will help you deploy your Exam Schedule Lookup application to the web. Since you're using Next.js with a Neon PostgreSQL database, here are the best deployment options.

## 🚀 Recommended: Vercel (Best for Next.js)

**Why Vercel?**
- Made by the creators of Next.js - perfect integration
- Free tier with generous limits
- Automatic deployments from Git
- Built-in CI/CD
- Global CDN for fast performance
- Zero configuration needed
- Free SSL certificates

### Step-by-Step Deployment to Vercel

#### Option A: Deploy via Vercel Dashboard (Easiest)

1. **Prepare Your Code**
   - Make sure your code is in a Git repository (GitHub, GitLab, or Bitbucket)
   - If not, initialize Git:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     ```
   - Push to GitHub/GitLab/Bitbucket

2. **Sign Up for Vercel**
   - Go to https://vercel.com
   - Click "Sign Up" and sign in with GitHub (recommended)

3. **Import Your Project**
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Vercel will automatically detect it's a Next.js project

4. **Configure Environment Variables**
   - In the project settings, go to "Environment Variables"
   - Add the following variables:
     ```
     DATABASE_URL = postgresql://neondb_owner:npg_KetP0UikvJ3W@ep-old-bar-aged5ygd-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=public
     ```
   - (Optional) Add admin credentials:
     ```
     ADMIN_USERNAME = admin
     ADMIN_PASSWORD_HASH = <your-bcrypt-hash>
     ```
   - To generate password hash:
     ```bash
     node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for the build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

6. **Automatic Deployments**
   - Every push to your main branch will automatically deploy
   - Preview deployments are created for pull requests

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked about environment variables, add them or configure later in dashboard

4. **Set Environment Variables**
   ```bash
   vercel env add DATABASE_URL
   # Paste your connection string when prompted
   
   vercel env add ADMIN_USERNAME
   vercel env add ADMIN_PASSWORD_HASH
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

---

## 🌐 Alternative: Netlify

**Why Netlify?**
- Great Next.js support
- Free tier available
- Easy deployment
- Built-in form handling

### Deployment Steps

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build Your Project**
   ```bash
   npm run build
   ```

3. **Create `netlify.toml`** (create this file in project root):
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

4. **Deploy**
   ```bash
   netlify login
   netlify init
   netlify deploy --prod
   ```

5. **Set Environment Variables**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`

---

## 🚂 Alternative: Railway

**Why Railway?**
- Simple deployment
- Good for full-stack apps
- Free tier with $5 credit monthly

### Deployment Steps

1. **Sign Up**
   - Go to https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure**
   - Railway auto-detects Next.js
   - Add environment variables in the Variables tab:
     - `DATABASE_URL`
     - `ADMIN_USERNAME`
     - `ADMIN_PASSWORD_HASH`

4. **Deploy**
   - Railway automatically deploys
   - Get your live URL from the dashboard

---

## 🎨 Alternative: Render

**Why Render?**
- Free tier available
- Simple setup
- Good documentation

### Deployment Steps

1. **Sign Up**
   - Go to https://render.com
   - Create an account

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Configure:
     - **Name**: exam-schedule-lookup
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`

3. **Add Environment Variables**
   - In the Environment section, add:
     - `DATABASE_URL`
     - `ADMIN_USERNAME`
     - `ADMIN_PASSWORD_HASH`

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] **Code is in Git repository** (GitHub/GitLab/Bitbucket)
- [ ] **`.env` file is NOT committed** (should be in `.gitignore`)
- [ ] **Database is set up** (Neon database is already configured ✅)
- [ ] **Environment variables are ready**:
  - [ ] `DATABASE_URL` (your Neon connection string)
  - [ ] `ADMIN_USERNAME` (optional, defaults to "admin")
  - [ ] `ADMIN_PASSWORD_HASH` (optional, but recommended for production)
- [ ] **Build works locally**:
  ```bash
  npm run build
  ```
- [ ] **Test the app locally**:
  ```bash
  npm run dev
  ```

---

## 🔐 Security Best Practices for Production

1. **Change Default Admin Password**
   ```bash
   # Generate a secure password hash
   node -e "console.log(require('bcryptjs').hashSync('your-secure-password', 10))"
   ```
   - Add the hash to `ADMIN_PASSWORD_HASH` environment variable

2. **Use Strong Passwords**
   - Don't use default "admin/admin" in production
   - Use a password manager to generate strong passwords

3. **Enable HTTPS**
   - All recommended platforms provide free SSL certificates
   - Ensure `secure: true` in cookie settings (already configured ✅)

4. **Environment Variables**
   - Never commit `.env` files
   - Use platform-specific environment variable settings
   - Rotate credentials periodically

---

## 🧪 Testing Your Deployment

After deployment:

1. **Test Student Lookup**
   - Visit your live URL
   - Try searching for a student ID
   - Verify results display correctly

2. **Test Admin Panel**
   - Go to `/admin`
   - Login with admin credentials
   - Test file upload functionality

3. **Test Database Connection**
   - Upload a test dataset
   - Verify data is saved correctly
   - Check that student lookup works with uploaded data

---

## 🔄 Updating Your Deployment

### Vercel (Automatic)
- Push changes to your Git repository
- Vercel automatically deploys updates

### Manual Update
```bash
# For Vercel CLI
vercel --prod

# For Netlify CLI
netlify deploy --prod

# For Railway/Render
# Push to Git, they auto-deploy
```

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Prisma Client not generated"**
```bash
# Solution: Make sure build script includes prisma generate
# Check package.json - it should have: "build": "prisma generate && next build"
```

**Error: "Database connection failed"**
- Verify `DATABASE_URL` is set correctly in environment variables
- Check if Neon database is accessible
- Ensure connection string includes `schema=public`

### Runtime Errors

**Error: "Module not found"**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Environment variable not found"**
- Double-check environment variables in deployment platform
- Restart the deployment after adding variables

### Database Issues

**Connection timeout**
- Check Neon database is active
- Verify connection string is correct
- Some platforms need connection pooling (Neon provides this)

---

## 📊 Monitoring and Analytics

### Vercel Analytics (Free)
- Built-in analytics dashboard
- View page views, performance metrics
- Enable in Vercel dashboard

### Custom Analytics
- Add Google Analytics if needed
- Use Vercel's built-in analytics

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Plans Start At |
|----------|-----------|---------------------|
| **Vercel** | ✅ Generous | $20/month |
| **Netlify** | ✅ Good | $19/month |
| **Railway** | ✅ $5 credit | $5/month |
| **Render** | ✅ 90 days | $7/month |

**Recommendation**: Start with Vercel's free tier - it's perfect for most use cases.

---

## 🎯 Quick Start (Vercel - Recommended)

```bash
# 1. Make sure code is in Git
git add .
git commit -m "Ready for deployment"
git push

# 2. Go to vercel.com and import your repo

# 3. Add environment variables in Vercel dashboard:
#    - DATABASE_URL
#    - ADMIN_USERNAME (optional)
#    - ADMIN_PASSWORD_HASH (optional)

# 4. Deploy!

# 5. Your app is live! 🎉
```

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Deployment**: https://www.prisma.io/docs/guides/deployment
- **Neon Docs**: https://neon.tech/docs

---

## 🆘 Need Help?

If you encounter issues:
1. Check the platform's documentation
2. Review build logs in the deployment dashboard
3. Test locally first: `npm run build && npm start`
4. Verify all environment variables are set correctly

---

**Ready to deploy? Start with Vercel - it's the easiest and best option for Next.js apps!** 🚀

