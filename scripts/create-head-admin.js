const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createHeadAdmin() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Enter username for head admin: ', async (username) => {
    if (!username.trim()) {
      console.error('Username is required');
      readline.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    readline.question('Enter password for head admin: ', async (password) => {
      if (!password.trim()) {
        console.error('Password is required');
        readline.close();
        await prisma.$disconnect();
        process.exit(1);
      }

      try {
        // Check if head admin already exists
        const existingHeadAdmin = await prisma.admin.findFirst({
          where: { isHeadAdmin: true },
        });

        if (existingHeadAdmin) {
          console.log('Head admin already exists. Use the admin management interface to create more admins.');
          readline.close();
          await prisma.$disconnect();
          process.exit(0);
        }

        // Check if username already exists
        const existingAdmin = await prisma.admin.findUnique({
          where: { username },
        });

        if (existingAdmin) {
          console.error('Username already exists');
          readline.close();
          await prisma.$disconnect();
          process.exit(1);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create head admin
        const admin = await prisma.admin.create({
          data: {
            username,
            passwordHash,
            isHeadAdmin: true,
          },
        });

        console.log('Head admin created successfully!');
        console.log(`Username: ${admin.username}`);
        console.log('You can now login and create more admins from the admin panel.');
        
        readline.close();
        await prisma.$disconnect();
      } catch (error) {
        console.error('Error creating head admin:', error);
        readline.close();
        await prisma.$disconnect();
        process.exit(1);
      }
    });
  });
}

createHeadAdmin();

