# Quick Deployment Guide - 5 Minutes to Live! 🚀

## Step 1: Push to GitHub (2 minutes)

If you haven't already:

```bash
# Initialize Git (if needed)
git init
git add .
git commit -m "Ready for deployment"

# Create a repository on GitHub, then:
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

## Step 2: Deploy to Vercel (3 minutes)

1. **Go to**: https://vercel.com
2. **Sign up** with GitHub (one click)
3. **Click**: "Add New..." → "Project"
4. **Import** your repository
5. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add:
     ```
     DATABASE_URL = postgresql://username:password@host:port/database?sslmode=require&schema=public
     ```
     **⚠️ IMPORTANT:** Replace with your actual database connection string. Never commit real credentials to Git!
6. **Click**: "Deploy"
7. **Wait 2-3 minutes** ⏳
8. **Done!** Your app is live! 🎉

## Your App URL

After deployment, you'll get a URL like:
- `https://your-project-name.vercel.app`

## Next Steps

1. **Test your app**: Visit the URL and try student lookup
2. **Login to admin**: Go to `/admin` and login
3. **Upload data**: Upload your Excel files
4. **Share**: Share the URL with students!

## Optional: Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS instructions
4. Free SSL certificate included!

---

**That's it! Your app is now live on the web!** 🌐

For more details, see [DEPLOYMENT.md](./DEPLOYMENT.md)

