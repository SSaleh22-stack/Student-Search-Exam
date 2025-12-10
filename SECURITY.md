# Security Guide

## Database Connection String Security

### ⚠️ CRITICAL: Protect Your Database Credentials

Your `DATABASE_URL` contains sensitive credentials and **MUST** be kept secure.

### Current Status

✅ **Protected:**
- `.env` file is in `.gitignore` (not committed to Git)
- Environment variables are used in deployment platforms

⚠️ **Action Required:**
If your actual database connection string was ever committed to Git or exposed in documentation:
1. **Immediately rotate your database password** in your Neon dashboard
2. Update the `DATABASE_URL` in all deployment environments
3. Update your local `.env` file

### Best Practices

1. **Never commit `.env` files**
   - ✅ `.env` is already in `.gitignore`
   - ✅ Never add `.env` to Git
   - ✅ Never commit connection strings to code

2. **Use Environment Variables**
   - ✅ Local development: Use `.env` file
   - ✅ Production: Use platform environment variables (Vercel, etc.)
   - ✅ Never hardcode credentials in source code

3. **Rotate Credentials Regularly**
   - Change database passwords periodically
   - Update all environment variables when rotating

4. **Limit Database Access**
   - Use connection pooling when available
   - Restrict IP access if possible
   - Use read-only users for non-admin operations (if needed)

5. **Monitor Access**
   - Check database logs for suspicious activity
   - Set up alerts for unusual access patterns

### How to Rotate Neon Database Password

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project
3. Go to **Settings** → **Database**
4. Click **Reset Password**
5. Generate a new secure password
6. Update `DATABASE_URL` in:
   - Local `.env` file
   - Vercel environment variables
   - Any other deployment platforms

### Connection String Format

```
postgresql://username:password@host:port/database?sslmode=require&schema=public
```

**Example (DO NOT USE REAL CREDENTIALS):**
```
postgresql://user:secure_password123@db.example.com:5432/mydb?sslmode=require&schema=public
```

### Environment Variables Checklist

- [ ] `.env` file exists locally (not in Git)
- [ ] `.env` is in `.gitignore`
- [ ] Production environment variables are set in deployment platform
- [ ] No connection strings in source code
- [ ] No connection strings in documentation (use placeholders)
- [ ] Database password is strong and unique
- [ ] Password has been rotated if exposed

### If Credentials Are Exposed

1. **Immediately rotate the password** in your database provider
2. **Update all environment variables** (local and production)
3. **Review Git history** - if committed, consider:
   - Removing from history (requires force push - coordinate with team)
   - Or accept that old credentials are invalid
4. **Monitor database logs** for unauthorized access
5. **Review access logs** in your database provider dashboard

### Additional Security Measures

1. **Use SSL/TLS**
   - ✅ Your connection string includes `sslmode=require`
   - This encrypts data in transit

2. **Network Security**
   - Use connection pooling (Neon provides this)
   - Consider IP whitelisting if your database provider supports it

3. **Application Security**
   - Keep dependencies updated
   - Use parameterized queries (Prisma does this automatically)
   - Implement rate limiting (already implemented for student lookup)

4. **Admin Account Security**
   - Use strong passwords for admin accounts
   - Store admin accounts in database (now implemented)
   - Only head admin can create new admins
   - Regularly review admin accounts

### Questions or Issues?

If you suspect your credentials have been compromised:
1. Rotate passwords immediately
2. Review database access logs
3. Contact your database provider support if needed

---

**Remember:** Security is an ongoing process. Regularly review and update your security practices.

