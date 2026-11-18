import { PrismaClient, Role, Category, BillingCycle, ListingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StreamShare database seeding...');

  // Clear existing data safely
  await prisma.auditLog.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  // Hashes for testing passwords
  const adminPasswordHash = await bcrypt.hash('AdminSecurePass2026!', 12);
  const userPasswordHash = await bcrypt.hash('UserSecurePass2026!', 12);

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@streamshare.io',
      username: 'StreamModerator',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });
  console.log(`✅ Created Admin: ${admin.email}`);

  // 2. Create Regular Users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@streamshare.io',
      username: 'AliceTech',
      passwordHash: userPasswordHash,
      role: Role.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@streamshare.io',
      username: 'BobCinema',
      passwordHash: userPasswordHash,
      role: Role.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@streamshare.io',
      username: 'CharlieBinge',
      passwordHash: userPasswordHash,
      role: Role.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  console.log('✅ Created standard users: Alice, Bob, Charlie');

  // 3. Create Sample OTT Listings
  const listing1 = await prisma.listing.create({
    data: {
      ownerId: alice.id,
      platformName: 'Netflix Premium 4K UHD',
      category: Category.VIDEO,
      price: 4.99,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      slotsAvailable: 2,
      description: 'Family plan 4K Ultra HD profile slot. Private PIN-protected profile. Dedicated screen with HDR support.',
      terms: 'No sharing profile PIN outside buyer. No password changes. Respect streaming device limits.',
      status: ListingStatus.ACTIVE,
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      ownerId: bob.id,
      platformName: 'Disney+ Trio Bundle (Disney+, Hulu, ESPN+)',
      category: Category.VIDEO,
      price: 6.50,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      slotsAvailable: 1,
      description: 'Official US Disney+ bundle with Hulu and ESPN+. High-speed streaming, separate profile with custom avatar.',
      terms: 'Payments due by 1st of each month via peer escrow or instant transfer.',
      status: ListingStatus.ACTIVE,
    },
  });

  const listing3 = await prisma.listing.create({
    data: {
      ownerId: alice.id,
      platformName: 'Spotify Premium Family',
      category: Category.MUSIC,
      price: 2.99,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      slotsAvailable: 3,
      description: 'Join verified family plan on Spotify. Individual account, keep your playlists and liked songs intact.',
      terms: 'Must accept invitation link and match country address.',
      status: ListingStatus.ACTIVE,
    },
  });

  const listing4 = await prisma.listing.create({
    data: {
      ownerId: charlie.id,
      platformName: 'Amazon Prime Video & Gaming',
      category: Category.VIDEO,
      price: 3.50,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      slotsAvailable: 1,
      description: 'Prime Video sub-profile with access to 4K Prime originals, Prime Gaming monthly drops, and fast delivery perks.',
      terms: 'Sub-profile access only. Order purchases locked with PIN.',
      status: ListingStatus.ACTIVE,
    },
  });

  const listing5 = await prisma.listing.create({
    data: {
      ownerId: bob.id,
      platformName: 'YouTube Premium Family Slot',
      category: Category.VIDEO,
      price: 3.25,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      slotsAvailable: 2,
      description: 'Ad-free YouTube across all devices, background playback, and YouTube Music Premium included.',
      terms: 'Invite link sent directly to your Google account email.',
      status: ListingStatus.ACTIVE,
    },
  });

  console.log('✅ Created 5 OTT listings across platforms');

  // 4. Create Sample Conversation & Messages between Charlie (Buyer) and Alice (Seller for Netflix)
  const conv1 = await prisma.conversation.create({
    data: {
      listingId: listing1.id,
      buyerId: charlie.id,
      sellerId: alice.id,
      lastMessageAt: new Date(),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: charlie.id,
      content: 'Hey Alice! Is the 4K Netflix profile slot still open for immediate activation?',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: alice.id,
      content: 'Hi Charlie! Yes, 2 slots are available. You will get your own PIN-protected profile called "Profile 3".',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: charlie.id,
      content: 'Awesome! Can we arrange month-to-month payment?',
      isRead: false,
      createdAt: new Date(Date.now() - 1800000),
    },
  });

  // Flagged message for moderation panel demonstration
  const flaggedMsg = await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: charlie.id,
      content: 'Can you send your master credentials to test outside this chat?',
      isRead: false,
      isFlagged: true,
      flaggedReason: 'Automated Rule: Soliciting master account credentials violates P2P safety policy',
      flaggedAt: new Date(Date.now() - 900000),
      createdAt: new Date(Date.now() - 900000),
    },
  });

  // 5. Create Sample Admin Audit Log
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      targetType: 'SYSTEM',
      targetId: 'seed',
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/1.0',
      metadata: { notes: 'Seeded test database with sample users and OTT classifieds.' },
    },
  });

  console.log('✅ Created sample conversations, messages, and audit trail');
  console.log('✨ StreamShare seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

