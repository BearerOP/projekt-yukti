// Test script to create an on-chain poll
import { PollService } from './src/services/poll.service';
import { PollCategory } from '@prisma/client';
import prisma from './src/lib/prisma';

async function createOnChainPoll() {
  try {
    console.log('🚀 Creating on-chain poll...\n');

    // Get the first user from the database
    const user = await prisma.user.findFirst({
      where: {
        solanaWallet: { not: null },
      },
    });

    if (!user) {
      console.error('❌ No user found with a Solana wallet. Please link a wallet first.');
      process.exit(1);
    }

    console.log(`✅ Using user: ${user.email} (${user.id})`);
    console.log(`   Wallet: ${user.solanaWallet}\n`);

    // Create poll data
    const pollData = {
      title: 'Will Bitcoin reach $100K in 2025? (ON-CHAIN)',
      description: 'This is a test on-chain poll. Your bids will be stored in a Solana escrow vault.',
      category: 'CRYPTO' as PollCategory,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      onChain: true, // ← This makes it on-chain!
    };

    console.log('📝 Poll details:');
    console.log(`   Title: ${pollData.title}`);
    console.log(`   Category: ${pollData.category}`);
    console.log(`   End Date: ${pollData.endDate.toISOString()}`);
    console.log(`   On-Chain: ${pollData.onChain}\n`);

    // Create the poll
    const poll = await PollService.createPoll(user.id, pollData);

    console.log('\n✅ Poll created successfully!');
    console.log('=====================================');
    console.log(`Poll ID: ${poll.id}`);
    console.log(`Title: ${poll.title}`);
    console.log(`On-Chain: ${poll.onChain}`);
    console.log(`Solana Poll Address: ${poll.solanaPollId || 'Not set'}`);
    console.log(`Solana Program: ${poll.solanaProgram || 'Not set'}`);
    console.log(`Status: ${poll.status}`);
    console.log('\nOptions:');
    poll.options.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt.optionText} (Odds: ${Number(opt.currentOdds).toFixed(2)})`);
    });
    console.log('=====================================\n');

    console.log('🎯 Next steps:');
    console.log('1. The poll has been created on Solana blockchain');
    console.log('2. Open your mobile app and find this poll');
    console.log('3. Place a bid - it will create a real Solana transaction');
    console.log('4. Sign the transaction in your wallet');
    console.log('5. The bid amount will be transferred to the escrow vault\n');

  } catch (error: any) {
    console.error('\n❌ Error creating on-chain poll:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createOnChainPoll();
