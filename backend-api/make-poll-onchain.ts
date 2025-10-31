// Simple script to mark a poll as on-chain for testing
import prisma from './src/lib/prisma';
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = '3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C';

async function makePollOnChain() {
  try {
    console.log('🔍 Finding recent polls...\n');

    // Get recent active polls
    const polls = await prisma.poll.findMany({
      where: {
        status: 'ACTIVE',
        onChain: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        options: true,
      },
    });

    if (polls.length === 0) {
      console.log('❌ No off-chain polls found!');
      process.exit(1);
    }

    console.log('📋 Available Off-Chain Polls:\n');
    polls.forEach((poll, i) => {
      console.log(`${i + 1}. ${poll.title}`);
      console.log(`   ID: ${poll.id}`);
      console.log(`   Category: ${poll.category}`);
      console.log(`   End Date: ${poll.endDate.toISOString()}`);
      console.log(`   Options: ${poll.options.map(o => o.optionText).join(', ')}`);
      console.log('');
    });

    // Select the first poll
    const selectedPoll = polls[0];
    console.log(`✅ Selected: "${selectedPoll.title}"\n`);

    // Generate PDAs
    const cleanPollId = selectedPoll.id.replace(/-/g, '');
    const programId = new PublicKey(PROGRAM_ID);

    const [pollPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), Buffer.from(cleanPollId)],
      programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(cleanPollId)],
      programId
    );

    console.log('🔐 Generated PDAs:');
    console.log(`   Poll PDA: ${pollPDA.toBase58()}`);
    console.log(`   Vault PDA: ${vaultPDA.toBase58()}\n`);

    // Update poll to be on-chain
    const updated = await prisma.poll.update({
      where: { id: selectedPoll.id },
      data: {
        onChain: true,
        solanaProgram: PROGRAM_ID,
        solanaPollId: pollPDA.toBase58(),
      },
    });

    console.log('✅ Poll updated successfully!\n');
    console.log('═'.repeat(80));
    console.log('📊 POLL NOW ON-CHAIN');
    console.log('═'.repeat(80));
    console.log(`Poll ID: ${updated.id}`);
    console.log(`Title: ${updated.title}`);
    console.log(`On-Chain: ${updated.onChain}`);
    console.log(`Solana Poll PDA: ${updated.solanaPollId}`);
    console.log(`Solana Program: ${updated.solanaProgram}`);
    console.log('═'.repeat(80));

    console.log('\n🎯 Next Steps:\n');
    console.log('1. Open your mobile app');
    console.log('2. Find this poll: "' + updated.title + '"');
    console.log('3. Place a bid (e.g., 0.1 SOL)');
    console.log('4. Backend will create a Solana transaction');
    console.log('5. Phantom wallet will open asking for approval');
    console.log('6. Sign the transaction');
    console.log('7. ✅ Your bid amount will be transferred to the escrow vault!\n');

    console.log('⚠️  NOTE: The poll account does NOT exist on-chain yet.');
    console.log('   The first bid will fail on-chain but succeed in the database.');
    console.log('   This is expected - we marked it as on-chain for testing only.\n');

    console.log('💡 To create the poll on-chain properly, the Solana program');
    console.log('   would need to be called with initialize_poll instruction first.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makePollOnChain();
