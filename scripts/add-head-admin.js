require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addHeadAdmin() {
  // Read credentials from environment variables
  const username = process.env.HEAD_ADMIN_USERNAME;
  const password = process.env.HEAD_ADMIN_PASSWORD;

  // Validate that credentials are provided
  if (!username || !password) {
    console.error('❌ Error: HEAD_ADMIN_USERNAME and HEAD_ADMIN_PASSWORD must be set in environment variables');
    console.error('   Please set these in your .env file or as environment variables');
    console.error('   Example:');
    console.error('   HEAD_ADMIN_USERNAME=your_username');
    console.error('   HEAD_ADMIN_PASSWORD=your_password');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Normalize username to lowercase for case-insensitive storage
  const normalizedUsername = username.toLowerCase().trim();

  try {
    // Check if admin already exists (case-insensitive)
    const existingAdmin = await prisma.$queryRaw`
      SELECT * FROM "Admin" WHERE LOWER(username) = LOWER(${normalizedUsername}) LIMIT 1
    `;

    if (existingAdmin && existingAdmin.length > 0) {
      const existing = existingAdmin[0];
      console.log('Admin already exists. Updating to head admin...');
      
      // Update to head admin and set new password
      const passwordHash = await bcrypt.hash(password, 10);
      const admin = await prisma.admin.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          isHeadAdmin: true,
        },
        select: {
          id: true,
          username: true,
          isHeadAdmin: true,
        },
      });

      console.log('✅ Head admin updated successfully!');
      console.log(`Username: ${admin.username}`);
      console.log(`Is Head Admin: ${admin.isHeadAdmin}`);
    } else {
      // Check if any head admin exists
      const existingHeadAdmin = await prisma.admin.findFirst({
        where: { isHeadAdmin: true },
      });

      if (existingHeadAdmin) {
        console.log('⚠️  A head admin already exists. Creating as regular admin...');
        console.log('   (You can promote this admin to head admin from the admin panel)');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create head admin with normalized username
      const admin = await prisma.admin.create({
        data: {
          username: normalizedUsername,
          passwordHash,
          isHeadAdmin: true,
        },
        select: {
          id: true,
          username: true,
          isHeadAdmin: true,
          createdAt: true,
        },
      });

      console.log('✅ Head admin created successfully!');
      console.log(`Username: ${admin.username}`);
      console.log(`Is Head Admin: ${admin.isHeadAdmin}`);
      console.log(`Created at: ${admin.createdAt}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating head admin:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addHeadAdmin();

