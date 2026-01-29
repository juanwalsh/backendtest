import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const user1 = await prisma.casinoUser.upsert({
    where: { username: 'player1' },
    update: {},
    create: {
      username: 'player1',
      email: 'player1@casino.com',
    },
  });

  const user2 = await prisma.casinoUser.upsert({
    where: { username: 'player2' },
    update: {},
    create: {
      username: 'player2',
      email: 'player2@casino.com',
    },
  });

  console.log(`Created users: ${user1.id}, ${user2.id}`);

  // carteiras com saldo inicial
  await prisma.casinoWallet.upsert({
    where: { userId: user1.id },
    update: { playableBalance: new Prisma.Decimal(1000) },
    create: {
      userId: user1.id,
      currencyCode: 'BRL',
      playableBalance: new Prisma.Decimal(1000),
      redeemableBalance: new Prisma.Decimal(0),
    },
  });

  await prisma.casinoWallet.upsert({
    where: { userId: user2.id },
    update: { playableBalance: new Prisma.Decimal(500) },
    create: {
      userId: user2.id,
      currencyCode: 'BRL',
      playableBalance: new Prisma.Decimal(500),
      redeemableBalance: new Prisma.Decimal(0),
    },
  });

  console.log('Created wallets: player1=1000, player2=500');

  // provider Jaqpot
  const provider = await prisma.gameProvider.upsert({
    where: { code: 'JAQPOT' },
    update: {},
    create: {
      code: 'JAQPOT',
      name: 'Jaqpot Games',
      apiEndpoint: 'http://localhost:3000/provider',
      secretKey: 'provider-secret-key-change-in-production',
      isDisabled: false,
    },
  });

  console.log(`Created provider: ${provider.code}`);

  const game1 = await prisma.casinoGame.upsert({
    where: { id: 1 },
    update: {},
    create: {
      providerId: provider.id,
      providerGameId: 'fortune_tiger',
      isActive: true,
      minBet: new Prisma.Decimal(1),
      maxBet: new Prisma.Decimal(10000),
    },
  });

  const game2 = await prisma.casinoGame.upsert({
    where: { id: 2 },
    update: {},
    create: {
      providerId: provider.id,
      providerGameId: 'dragon_gold',
      isActive: true,
      minBet: new Prisma.Decimal(5),
      maxBet: new Prisma.Decimal(5000),
    },
  });

  console.log(`Created casino games: ${game1.id}, ${game2.id}`);

  // jogos no lado do provider
  await prisma.providerGame.upsert({
    where: { gameId: 'fortune_tiger' },
    update: {},
    create: {
      gameId: 'fortune_tiger',
      isActive: true,
      minBet: new Prisma.Decimal(1),
      maxBet: new Prisma.Decimal(10000),
    },
  });

  await prisma.providerGame.upsert({
    where: { gameId: 'dragon_gold' },
    update: {},
    create: {
      gameId: 'dragon_gold',
      isActive: true,
      minBet: new Prisma.Decimal(5),
      maxBet: new Prisma.Decimal(5000),
    },
  });

  console.log('Created provider games');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
