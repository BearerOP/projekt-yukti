import prisma from './src/lib/prisma';

async function showPolls() {
  const polls = await prisma.poll.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      title: true,
      category: true,
      onChain: true,
      solanaPollId: true,
    }
  });

  console.log('\n📋 ALL ACTIVE POLLS:\n');
  console.log('═'.repeat(80));

  polls.forEach((poll, i) => {
    const badge = poll.onChain ? '✅ ON-CHAIN' : '❌ OFF-CHAIN';
    console.log(`${i + 1}. ${poll.title}`);
    console.log(`   ${badge}`);
    console.log(`   Category: ${poll.category}`);
    if (poll.onChain) {
      console.log(`   🎯 THIS IS THE ONE TO BID ON!`);
      console.log(`   Solana PDA: ${poll.solanaPollId}`);
    }
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('⚠️  ONLY BID ON THE ON-CHAIN POLL TO SEE SOL DEDUCTION!\n');

  await prisma.$disconnect();
}

showPolls();
