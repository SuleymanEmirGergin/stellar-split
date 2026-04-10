/**
 * Prisma seed — creates baseline data for local development.
 * Run: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Demo users (Stellar testnet addresses — not real keys)
  const alice = await prisma.user.upsert({
    where: { walletAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' },
    update: {},
    create: {
      walletAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      reputationScore: 50,
    },
  });

  const bob = await prisma.user.upsert({
    where: { walletAddress: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGBB5BDECLE47WJFBZTJ22' },
    update: {},
    create: {
      walletAddress: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGBB5BDECLE47WJFBZTJ22',
      reputationScore: 20,
    },
  });

  // Demo group
  const group = await prisma.group.upsert({
    where: { id: 'seed-group-001' },
    update: {},
    create: {
      id: 'seed-group-001',
      name: 'Lisbon Trip',
      currency: 'XLM',
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'CREATOR' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Demo expense
  await prisma.expense.upsert({
    where: { id: 'seed-expense-001' },
    update: {},
    create: {
      id: 'seed-expense-001',
      groupId: group.id,
      description: 'Hotel — 3 nights',
      amount: 300,
      currency: 'XLM',
      paidById: alice.id,
      splitType: 'EQUAL',
      splits: {
        create: [
          { userId: alice.id, amount: 150 },
          { userId: bob.id, amount: 150 },
        ],
      },
    },
  });

  console.log('Seed complete.');
  console.log(`  Users : alice(${alice.id}), bob(${bob.id})`);
  console.log(`  Group : ${group.id} — "${group.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
