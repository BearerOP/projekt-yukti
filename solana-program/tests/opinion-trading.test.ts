import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { OpinionTrading } from '../target/types/opinion_trading';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assert, expect } from 'chai';

describe('Opinion Trading Platform Tests', () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.opinion_trading as Program<OpinionTrading>;

  // Test accounts
  const admin = provider.wallet as anchor.Wallet;
  let bettor1: Keypair;
  let bettor2: Keypair;

  // Test data
  const pollId = 'test-poll-' + Date.now();
  let endTimestampSeconds: number;
  const pollTitle = 'Will Bitcoin reach $100k by end of 2025?';
  const optionA = 'Yes, BTC will hit $100k';
  const optionB = 'No, BTC stays below $100k';

  // PDAs
  let pollPDA: PublicKey;
  let vaultPDA: PublicKey;
  let pollBump: number;
  let vaultBump: number;
  let bidIndex = 0; // next bid index for main poll

  before(async () => {
    // Create test bettor accounts
    bettor1 = Keypair.generate();
    bettor2 = Keypair.generate();

    // Airdrop SOL to bettors for testing
    const airdrop1 = await provider.connection.requestAirdrop(
      bettor1.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    const airdrop2 = await provider.connection.requestAirdrop(
      bettor2.publicKey,
      10 * LAMPORTS_PER_SOL
    );

    // Wait for confirmations
    await provider.connection.confirmTransaction(airdrop1);
    await provider.connection.confirmTransaction(airdrop2);

    // Derive PDAs
    [pollPDA, pollBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), Buffer.from(pollId)],
      program.programId
    );

    [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(pollId)],
      program.programId
    );

    console.log('\n📋 Test Setup:');
    console.log('Admin:', admin.publicKey.toBase58());
    console.log('Bettor 1:', bettor1.publicKey.toBase58());
    console.log('Bettor 2:', bettor2.publicKey.toBase58());
    console.log('Poll PDA:', pollPDA.toBase58());
    console.log('Vault PDA:', vaultPDA.toBase58());
  });

  describe('1. Initialize Poll', () => {
    it('Should create a new prediction poll', async () => {
      endTimestampSeconds = Math.floor(Date.now() / 1000) + 30; // 30s window
      const endTimestamp = new anchor.BN(endTimestampSeconds);

      await program.methods
        .initializePoll(pollId, pollTitle, optionA, optionB, endTimestamp)
        .accounts({
          poll: pollPDA,
          vault: vaultPDA,
          authority: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Fetch poll account
      const poll = await program.account.poll.fetch(pollPDA);

      assert.equal(poll.pollId, pollId);
      assert.equal(poll.title, pollTitle);
      assert.equal(poll.optionAText, optionA);
      assert.equal(poll.optionBText, optionB);
      assert.equal(poll.optionAStake.toNumber(), 0);
      assert.equal(poll.optionBStake.toNumber(), 0);
      assert.equal(poll.totalPool.toNumber(), 0);
      assert.equal(poll.optionAOdds.toNumber(), 5000); // 50%
      assert.equal(poll.optionBOdds.toNumber(), 5000); // 50%

      console.log('✅ Poll created successfully');
      console.log('   Initial odds: 50% / 50%');
    });

    it('Should fail with poll ID too long', async () => {
      const longId = 'x'.repeat(65);
      const endTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) + 60);

      let longPollPDA: PublicKey;
      let longVaultPDA: PublicKey;
      try {
        [longPollPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('poll'), Buffer.from(longId)],
          program.programId
        );
        [longVaultPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('vault'), Buffer.from(longId)],
          program.programId
        );
      } catch (e) {
        assert.include(e.toString(), 'Max seed length exceeded');
        console.log('✅ Correctly rejected long poll ID (seed too long)');
        return;
      }

      try {
        await program.methods
          .initializePoll(longId, pollTitle, optionA, optionB, endTimestamp)
          .accounts({
            poll: longPollPDA,
            vault: longVaultPDA,
            authority: admin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail('Should have thrown error');
      } catch (error) {
        // Deriving PDA with an overlong seed will fail client-side
        assert.include(error.toString(), 'Max seed length exceeded');
        console.log('✅ Correctly rejected long poll ID (seed too long)');
      }
    });
  });

  describe('2. Place Bids', () => {
    it('Bettor 1 should place bid on Option A', async () => {
      const bidAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
      const timestamp = Math.floor(Date.now() / 1000);

      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          pollPDA.toBuffer(),
          bettor1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(bidIndex).toArray('le', 8)),
        ],
        program.programId
      );

      const vaultBalanceBefore = await provider.connection.getBalance(vaultPDA);

      await program.methods
        .placeBid(bidAmount, { optionA: {} }, new anchor.BN(timestamp), new anchor.BN(bidIndex))
        .accounts({
          poll: pollPDA,
          vault: vaultPDA,
          bid: bidPDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      bidIndex += 1;

      // Check vault received funds
      const vaultBalanceAfter = await provider.connection.getBalance(vaultPDA);
      assert.equal(
        vaultBalanceAfter - vaultBalanceBefore,
        bidAmount.toNumber(),
        'Vault should receive bid amount'
      );

      // Check bid account
      const bid = await program.account.bid.fetch(bidPDA);
      assert.equal(bid.amount.toNumber(), bidAmount.toNumber());
      assert.equal(bid.oddsAtPurchase.toNumber(), 5000); // 50% initial odds

      // Check poll updated
      const poll = await program.account.poll.fetch(pollPDA);
      assert.equal(poll.optionAStake.toNumber(), bidAmount.toNumber());
      assert.equal(poll.totalPool.toNumber(), bidAmount.toNumber());

      console.log('✅ Bettor 1 placed 1 SOL on Option A');
      console.log(`   New odds: A=${poll.optionAOdds.toNumber()/100}% B=${poll.optionBOdds.toNumber()/100}%`);
    });

    it('Bettor 2 should place bid on Option B', async () => {
      const bidAmount = new anchor.BN(2 * LAMPORTS_PER_SOL); // 2 SOL
      const timestamp = Math.floor(Date.now() / 1000);

      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          pollPDA.toBuffer(),
          bettor2.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(bidIndex).toArray('le', 8)),
        ],
        program.programId
      );

      await program.methods
        .placeBid(bidAmount, { optionB: {} }, new anchor.BN(timestamp), new anchor.BN(bidIndex))
        .accounts({
          poll: pollPDA,
          vault: vaultPDA,
          bid: bidPDA,
          bettor: bettor2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor2])
        .rpc();

      bidIndex += 1;

      // Check poll updated with AMM odds
      const poll = await program.account.poll.fetch(pollPDA);
      assert.equal(poll.totalPool.toNumber(), 3 * LAMPORTS_PER_SOL); // 1 + 2 SOL

      // Option B should have higher odds now (more stake)
      assert.isAbove(poll.optionBOdds.toNumber(), poll.optionAOdds.toNumber());

      console.log('✅ Bettor 2 placed 2 SOL on Option B');
      console.log(`   AMM adjusted odds: A=${poll.optionAOdds.toNumber()/100}% B=${poll.optionBOdds.toNumber()/100}%`);
      console.log(`   Total pool: ${poll.totalPool.toNumber() / LAMPORTS_PER_SOL} SOL`);
    });

    it('Should fail with bet amount too low', async () => {
      const tooLowAmount = new anchor.BN(0.001 * LAMPORTS_PER_SOL); // 0.001 SOL
      const timestamp = Math.floor(Date.now() / 1000);

      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          pollPDA.toBuffer(),
          bettor1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(bidIndex).toArray('le', 8)),
        ],
        program.programId
      );

      try {
        await program.methods
          .placeBid(tooLowAmount, { optionA: {} }, new anchor.BN(timestamp), new anchor.BN(bidIndex))
          .accounts({
            poll: pollPDA,
            vault: vaultPDA,
            bid: bidPDA,
            bettor: bettor1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor1])
          .rpc();

        assert.fail('Should have thrown error');
      } catch (error) {
        assert.include(error.toString(), 'InvalidBetAmount');
        console.log('✅ Correctly rejected low bet amount');
      }
    });
  });

  describe('3. Settle Poll', () => {
    it('Should settle poll with Option A as winner', async () => {
      // wait until poll end time has passed
      const now = Math.floor(Date.now() / 1000);
      const waitMs = Math.max(0, (endTimestampSeconds - now + 2) * 1000);
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));

      await program.methods
        .settlePoll({ optionA: {} })
        .accounts({
          poll: pollPDA,
          authority: admin.publicKey,
        })
        .rpc();

      const poll = await program.account.poll.fetch(pollPDA);
      assert.equal(poll.status.settled !== undefined, true);
      assert.deepEqual(poll.winner, { optionA: {} });

      console.log('✅ Poll settled with Option A as winner');
    });

    it('Should fail if non-admin tries to settle', async () => {
      try {
        await program.methods
          .settlePoll({ optionA: {} })
          .accounts({
            poll: pollPDA,
            authority: bettor1.publicKey,
          })
          .signers([bettor1])
          .rpc();

        assert.fail('Should have thrown error');
      } catch (error) {
        assert.include(error.toString(), 'Unauthorized');
        console.log('✅ Correctly prevented non-admin from settling');
      }
    });
  });

  describe('4. Claim Winnings', () => {
    it('Winner (Bettor 1) should claim payout with 2% fee', async () => {
      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          pollPDA.toBuffer(),
          bettor1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(0).toArray('le', 8)),
        ],
        program.programId
      );

      const bid = await program.account.bid.fetch(bidPDA);
      const potentialWin = bid.potentialWin.toNumber();
      const expectedFee = Math.floor(potentialWin * 0.02); // 2%
      const expectedPayout = potentialWin - expectedFee;

      const balanceBefore = await provider.connection.getBalance(bettor1.publicKey);

      const treasury = Keypair.generate().publicKey; // Mock treasury

      await program.methods
        .claimWinnings()
        .accounts({
          poll: pollPDA,
          vault: vaultPDA,
          bid: bidPDA,
          bettor: bettor1.publicKey,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(bettor1.publicKey);
      const actualPayout = balanceAfter - balanceBefore;

      // Check bid marked as won
      const updatedBid = await program.account.bid.fetch(bidPDA);
      assert.deepEqual(updatedBid.status, { won: {} });

      console.log('✅ Winner claimed payout');
      console.log(`   Potential win: ${potentialWin / LAMPORTS_PER_SOL} SOL`);
      console.log(`   Platform fee (2%): ${expectedFee / LAMPORTS_PER_SOL} SOL`);
      console.log(`   Net payout: ~${actualPayout / LAMPORTS_PER_SOL} SOL`);
    });

    it('Loser (Bettor 2) should not be able to claim', async () => {
      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          pollPDA.toBuffer(),
          bettor2.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(1).toArray('le', 8)),
        ],
        program.programId
      );

      const treasury = Keypair.generate().publicKey;

      try {
        await program.methods
          .claimWinnings()
          .accounts({
            poll: pollPDA,
            vault: vaultPDA,
            bid: bidPDA,
            bettor: bettor2.publicKey,
            treasury: treasury,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor2])
          .rpc();

        assert.fail('Should have thrown error');
      } catch (error) {
        assert.include(error.toString(), 'BidDidNotWin');
        console.log('✅ Correctly prevented loser from claiming');
      }
    });
  });

  describe('5. Cancel and Refund', () => {
    let cancelPollId: string;
    let cancelPollPDA: PublicKey;
    let cancelVaultPDA: PublicKey;
    let cancelBidIndex = 0;

    before(async () => {
      // Create new poll for cancellation test
      cancelPollId = 'cancel-test-' + Date.now();
      const endTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      [cancelPollPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), Buffer.from(cancelPollId)],
        program.programId
      );

      [cancelVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), Buffer.from(cancelPollId)],
        program.programId
      );

      await program.methods
        .initializePoll(cancelPollId, 'Test Cancel Poll', optionA, optionB, endTimestamp)
        .accounts({
          poll: cancelPollPDA,
          vault: cancelVaultPDA,
          authority: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Place a bid
      const bidAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
      const timestamp = Math.floor(Date.now() / 1000);

      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          cancelPollPDA.toBuffer(),
          bettor1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(cancelBidIndex).toArray('le', 8)),
        ],
        program.programId
      );

      await program.methods
        .placeBid(bidAmount, { optionA: {} }, new anchor.BN(timestamp), new anchor.BN(cancelBidIndex))
        .accounts({
          poll: cancelPollPDA,
          vault: cancelVaultPDA,
          bid: bidPDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      cancelBidIndex += 1;
    });

    it('Should cancel poll', async () => {
      await program.methods
        .cancelPoll()
        .accounts({
          poll: cancelPollPDA,
          authority: admin.publicKey,
        })
        .rpc();

      const poll = await program.account.poll.fetch(cancelPollPDA);
      assert.equal(poll.status.cancelled !== undefined, true);

      console.log('✅ Poll cancelled successfully');
    });

    it('Should refund bettor for cancelled poll', async () => {
      const [bidPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          cancelPollPDA.toBuffer(),
          bettor1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(0).toArray('le', 8)),
        ],
        program.programId
      );

      const bid = await program.account.bid.fetch(bidPDA);
      const refundAmount = bid.amount.toNumber();

      const balanceBefore = await provider.connection.getBalance(bettor1.publicKey);

      await program.methods
        .claimRefund()
        .accounts({
          poll: cancelPollPDA,
          vault: cancelVaultPDA,
          bid: bidPDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(bettor1.publicKey);

      // Check refund received
      const actualRefund = balanceAfter - balanceBefore;
      assert.approximately(actualRefund, refundAmount, 10000); // Allow for tx fees

      // Check bid marked as refunded
      const updatedBid = await program.account.bid.fetch(bidPDA);
      assert.deepEqual(updatedBid.status, { refunded: {} });

      console.log('✅ Bettor received full refund');
      console.log(`   Refund amount: ${refundAmount / LAMPORTS_PER_SOL} SOL`);
    });
  });

  describe('6. Statistics & Data', () => {
    it('Should fetch all active polls', async () => {
      const allPolls = await program.account.poll.all();
      console.log(`✅ Found ${allPolls.length} polls on-chain`);

      allPolls.forEach((poll, index) => {
        console.log(`   Poll ${index + 1}: ${poll.account.title}`);
        console.log(`      Total pool: ${poll.account.totalPool.toNumber() / LAMPORTS_PER_SOL} SOL`);
      });
    });

    it('Should fetch user bids', async () => {
      const allBids = await program.account.bid.all([
        {
          memcmp: {
            offset: 8,
            bytes: bettor1.publicKey.toBase58(),
          },
        },
      ]);

      console.log(`✅ Bettor 1 has ${allBids.length} bids`);

      allBids.forEach((bid, index) => {
        console.log(`   Bid ${index + 1}: ${bid.account.amount.toNumber() / LAMPORTS_PER_SOL} SOL`);
      });
    });
  });
});
