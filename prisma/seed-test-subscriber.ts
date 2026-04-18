import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('TestPass123!', 12);

  // Create test admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@babahalgo.com' },
    update: {},
    create: {
      email: 'admin@babahalgo.com',
      passwordHash,
      role: 'ADMIN',
      name: 'Admin BabahAlgo',
    },
  });
  console.log('Admin user:', admin.email, admin.id);

  // Create test client user
  const client = await prisma.user.upsert({
    where: { email: 'test@babahalgo.com' },
    update: {},
    create: {
      email: 'test@babahalgo.com',
      passwordHash,
      role: 'CLIENT',
      name: 'Test Subscriber',
      telegramChatId: process.env.TEST_TELEGRAM_CHAT_ID || '',
    },
  });
  console.log('Client user:', client.email, client.id);

  // Create SIGNAL_VIP subscription for test client
  const sub = await prisma.subscription.upsert({
    where: { id: 'test-sub-001' },
    update: {},
    create: {
      id: 'test-sub-001',
      userId: client.id,
      tier: 'SIGNAL_VIP',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      metadata: { notes: 'Pre-launch test subscriber' },
    },
  });
  console.log('Subscription:', sub.tier, sub.status, 'expires', sub.expiresAt.toISOString());

  // Create notification preferences for test client
  await prisma.notificationPreference.upsert({
    where: { userId: client.id },
    update: {},
    create: {
      userId: client.id,
      channels: ['TELEGRAM', 'EMAIL'],
      minConfidence: '0.70',
      language: 'id',
      timezone: 'Asia/Makassar',
    },
  });
  console.log('Notification preferences set: TELEGRAM + EMAIL');

  // Create SIGNAL_BASIC subscription for second test
  const client2 = await prisma.user.upsert({
    where: { email: 'basic@babahalgo.com' },
    update: {},
    create: {
      email: 'basic@babahalgo.com',
      passwordHash,
      role: 'CLIENT',
      name: 'Basic Subscriber',
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'test-sub-002' },
    update: {},
    create: {
      id: 'test-sub-002',
      userId: client2.id,
      tier: 'SIGNAL_BASIC',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: { notes: 'Basic tier test subscriber' },
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: client2.id },
    update: {},
    create: {
      userId: client2.id,
      channels: ['INAPP'],
      minConfidence: '0.80',
      language: 'id',
      timezone: 'Asia/Jakarta',
    },
  });

  console.log('Basic subscriber:', client2.email);
  console.log('\nSeed complete! Test accounts:');
  console.log('  Admin: admin@babahalgo.com / TestPass123!');
  console.log('  VIP:   test@babahalgo.com / TestPass123!');
  console.log('  Basic: basic@babahalgo.com / TestPass123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
