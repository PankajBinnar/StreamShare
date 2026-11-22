import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'pankajbinnar886@gmail.com';
  const password = 'Pankaj@123';
  const username = 'pankaj_admin';

  console.log(`Setting up Admin account for ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      passwordHash,
      isBanned: false,
    },
    create: {
      email,
      username,
      passwordHash,
      role: Role.ADMIN,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  console.log(`✅ Successfully configured Admin user:`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Username: ${admin.username}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error setting up admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
