import prisma from './src/lib/prisma';

async function checkRecentBids() {
  const bids = await prisma.bid.findMany({
    where: {
      userId: '7b7ab1e7-f627-4e16-a22b-3e334ee861db',
    },
    include: {
      poll: {
        select: {
          id: true,
          title: true,
          onChain: true,
          solanaPollId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  console.log('\n📊 Your Recent Bids:\n');
  console.log('═'.repeat(80));

  bids.forEach((bid, i) => {
    console.log(`\n${i + 1}. Poll: ${bid.poll.title}`);
    console.log(`   Amount: ${Number(bid.amount)} SOL`);
    console.log(`   On-Chain: ${bid.poll.onChain ? '✅ YES' : '❌ NO (Database only)'}`);
    console.log(`   Solana Poll ID: ${bid.poll.solanaPollId || 'N/A'}`);
    console.log(`   Bid Time: ${bid.createdAt}`);
  });

  console.log('\n' + '═'.repeat(80));

  const onChainCount = bids.filter(b => b.poll.onChain).length;
  const offChainCount = bids.filter(b => !b.poll.onChain).length;

  console.log(`\n📈 Summary:`);
  console.log(`   On-Chain Bids: ${onChainCount}`);
  console.log(`   Off-Chain Bids: ${offChainCount}`);

  if (offChainCount > 0) {
    console.log('\n⚠️  WARNING: You have off-chain bids.');
    console.log('   Off-chain bids only deduct from database balance, not Solana wallet.');
    console.log('   To test on-chain bids, you need to create an on-chain poll first.\n');
  }

  await prisma.$disconnect();
}

checkRecentBids();
