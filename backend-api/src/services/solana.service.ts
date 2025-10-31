import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { BN } from 'bn.js';
import prisma from '../lib/prisma';
import { PollStatus } from '@prisma/client';
import OpinionTradingIDL from '../blockchain/solana/opinion_trading.json';

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const PROGRAM_ID_STR = process.env.SOLANA_PROGRAM_ID || '3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C';
const ADMIN_KEYPAIR_PATH = process.env.SOLANA_ADMIN_KEYPAIR || '';
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || 'GomH9QWfBSX2sYiwDms3XrQUd5nCgqT6E7DxSgHuZbB3';

// Enums
export enum BidOption {
  OptionA = 0,
  OptionB = 1,
}

export class SolanaService {
  private connection: Connection;
  private programId: PublicKey;
  private treasuryAddress: PublicKey;
  private adminKeypair: Keypair | null = null;
  private provider: AnchorProvider;
  private program: Program | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    this.programId = new PublicKey(PROGRAM_ID_STR);
    this.treasuryAddress = new PublicKey(TREASURY_ADDRESS);

    // Create a dummy wallet for operations
    const dummyKeypair = Keypair.generate();
    const wallet = new Wallet(dummyKeypair);

    this.provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );
  }

  /**
   * Get program instance (lazy load)
   */
  private getProgram(): Program {
    if (!this.program) {
      try {
        this.program = new Program(
          OpinionTradingIDL as anchor.Idl,
          this.programId,
          this.provider
        );
      } catch (error) {
        console.error('Error initializing Anchor program:', error);
        throw new Error('Failed to initialize Anchor program. IDL may be invalid.');
      }
    }
    return this.program;
  }

  /**
   * Get Poll PDA
   */
  getPollPDA(pollId: string): [PublicKey, number] {
    // Remove hyphens from UUID to fit in 32 byte seed limit
    const cleanPollId = pollId.replace(/-/g, '');
    return PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), Buffer.from(cleanPollId)],
      this.programId
    );
  }

  /**
   * Get Vault PDA
   */
  getVaultPDA(pollId: string): [PublicKey, number] {
    // Remove hyphens from UUID to fit in 32 byte seed limit
    const cleanPollId = pollId.replace(/-/g, '');
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(cleanPollId)],
      this.programId
    );
  }

  /**
   * Get Bid PDA
   */
  getBidPDA(
    pollPubkey: PublicKey,
    bettorPubkey: PublicKey,
    bidIndex: number
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('bid'),
        pollPubkey.toBuffer(),
        bettorPubkey.toBuffer(),
        new BN(bidIndex).toArrayLike(Buffer, 'le', 8),
      ],
      this.programId
    );
  }

  /**
   * Load admin keypair for program authority operations
   */
  private async getAdminKeypair(): Promise<Keypair> {
    if (!this.adminKeypair) {
      if (!ADMIN_KEYPAIR_PATH) {
        // For testing, generate a temporary keypair
        console.warn('⚠️  No admin keypair configured, using temporary keypair');
        this.adminKeypair = Keypair.generate();
        return this.adminKeypair;
      }

      // Load keypair from file
      const fs = await import('fs');
      const keypairData = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, 'utf-8'));
      this.adminKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    }

    return this.adminKeypair;
  }

  /**
   * Initialize a poll on-chain
   */
  async initializePollOnChain(pollId: string): Promise<{
    signature: string;
    pollAddress: string;
    vaultAddress: string;
  }> {
    try {
      // Get poll from database
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        throw new Error('Poll not found');
      }

      if (poll.options.length !== 2) {
        throw new Error('Only binary polls are supported on-chain');
      }

      const adminKeypair = await this.getAdminKeypair();

      // Get PDAs
      const [pollPda] = this.getPollPDA(poll.id);
      const [vaultPda] = this.getVaultPDA(poll.id);

      // Get option texts
      const optionAText = poll.options[0]?.optionText || 'Yes';
      const optionBText = poll.options[1]?.optionText || 'No';

      // Convert end date to Unix timestamp
      const endTimestamp = new BN(Math.floor(poll.endDate.getTime() / 1000));

      console.log('Creating poll on-chain:', {
        pollId: poll.id,
        pollPda: pollPda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        authority: adminKeypair.publicKey.toBase58(),
        title: poll.title,
        optionA: optionAText,
        optionB: optionBText,
        endTimestamp: endTimestamp.toString(),
      });

      // Create the actual transaction using Anchor
      const program = this.getProgram();
      const methods = program.methods as any;
      if (!methods.initializePoll) {
        throw new Error('initializePoll method not found on program');
      }

      // Remove hyphens from poll ID for on-chain storage
      const cleanPollId = poll.id.replace(/-/g, '');

      const tx = await methods.initializePoll(
        cleanPollId,
        poll.title,
        optionAText,
        optionBText,
        endTimestamp
      )
        .accounts({
          poll: pollPda,
          vault: vaultPda,
          authority: adminKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminKeypair])
        .rpc();

      console.log('✅ Poll created on-chain with signature:', tx);

      // Update poll in database
      await prisma.poll.update({
        where: { id: pollId },
        data: {
          onChain: true,
          solanaProgram: this.programId.toBase58(),
          solanaPollId: pollPda.toBase58(),
        },
      });

      return {
        signature: tx,
        pollAddress: pollPda.toBase58(),
        vaultAddress: vaultPda.toBase58(),
      };
    } catch (error) {
      console.error('Error initializing poll on-chain:', error);
      throw error;
    }
  }

  /**
   * Place a bid on-chain (creates instruction for mobile to sign)
   */
  async placeBidOnChain(
    pollId: string,
    optionId: string,
    amount: number,
    userWallet: string
  ): Promise<{
    instruction: string;
    bidAddress: string;
    bidIndex: number;
  }> {
    try {
      // Get poll from database
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        throw new Error('Poll not found');
      }

      if (!poll.onChain) {
        throw new Error('Poll is not on-chain');
      }

      // Determine which option (A or B)
      const optionIndex = poll.options.findIndex(opt => opt.id === optionId);
      if (optionIndex === -1) {
        throw new Error('Invalid option');
      }

      const bidOption = optionIndex === 0 ? BidOption.OptionA : BidOption.OptionB;
      const optionEnum = bidOption === BidOption.OptionA ? { optionA: {} } : { optionB: {} };

      // Amount is already in SOL, convert to lamports
      const amountLamports = new BN(Math.floor(amount * 1_000_000_000));

      const userPubkey = new PublicKey(userWallet);
      const [pollPDA] = this.getPollPDA(poll.id);
      const [vaultPDA] = this.getVaultPDA(poll.id);

      // Fetch the current bid index from the poll account
      let bidIndex = 0;
      try {
        const pollAccountData = await this.connection.getAccountInfo(pollPDA);
        if (pollAccountData) {
          // Parse the poll account data to get nextBidIndex
          // For now, we'll use 0 and let the program fail if incorrect
          // In production, you'd deserialize the account data properly
          bidIndex = 0;
        }
      } catch (error) {
        console.error('Failed to fetch poll account, using bidIndex 0:', error);
        bidIndex = 0;
      }

      const [bidPDA] = this.getBidPDA(pollPDA, userPubkey, bidIndex);

      // Create timestamp
      const timestamp = new BN(Math.floor(Date.now() / 1000));

      console.log('Creating bid instruction:', {
        pollPDA: pollPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        bidPDA: bidPDA.toBase58(),
        bettor: userPubkey.toBase58(),
        amount: amountLamports.toString(),
        option: bidOption,
        bidIndex,
      });

      // Create the actual transaction using Anchor
      const program = this.getProgram();
      const methods = program.methods as any;
      if (!methods.placeBid) {
        throw new Error('placeBid method not found on program');
      }

      const placeBidMethod = methods.placeBid(
        amountLamports,
        optionEnum,
        timestamp,
        new BN(bidIndex)
      );

      const tx = await placeBidMethod
        .accounts({
          poll: pollPDA,
          vault: vaultPDA,
          bid: bidPDA,
          bettor: userPubkey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Serialize the transaction
      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      const serializedInstruction = serializedTx.toString('base64');

      console.log('✅ Created real bid transaction:', {
        bidAddress: bidPDA.toBase58(),
        bidIndex,
        amountSOL: amount,
      });

      return {
        instruction: serializedInstruction,
        bidAddress: bidPDA.toBase58(),
        bidIndex,
      };
    } catch (error) {
      console.error('Error creating bid instruction:', error);
      throw error;
    }
  }

  /**
   * Settle a poll on-chain
   */
  async settlePollOnChain(pollId: string, winningOptionId: string): Promise<string> {
    try {
      // Get poll from database
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        throw new Error('Poll not found');
      }

      if (!poll.onChain) {
        throw new Error('Poll is not on-chain');
      }

      // Determine winning option
      const optionIndex = poll.options.findIndex(opt => opt.id === winningOptionId);
      if (optionIndex === -1) {
        throw new Error('Invalid winning option');
      }

      const winningOption = optionIndex === 0 ? BidOption.OptionA : BidOption.OptionB;
      const optionEnum = winningOption === BidOption.OptionA ? { optionA: {} } : { optionB: {} };

      const adminKeypair = await this.getAdminKeypair();
      const [pollPDA] = this.getPollPDA(poll.id);

      console.log('Would settle poll on-chain:', {
        pollPDA: pollPDA.toBase58(),
        authority: adminKeypair.publicKey.toBase58(),
        winningOption,
      });

      // Simulate transaction
      const tx = 'settle_simulated_' + Date.now().toString();

      return tx;
    } catch (error) {
      console.error('Error settling poll on-chain:', error);
      throw error;
    }
  }

  /**
   * Claim winnings on-chain
   */
  async claimWinningsOnChain(
    bidId: string,
    userWallet: string
  ): Promise<{
    instruction: string;
    expectedPayout: number;
  }> {
    try {
      // Get bid from database
      const bid = await prisma.bid.findUnique({
        where: { id: bidId },
        include: { poll: true },
      });

      if (!bid) {
        throw new Error('Bid not found');
      }

      if (!bid.poll.onChain || !bid.solanaAccount) {
        throw new Error('Bid is not on-chain');
      }

      const userPubkey = new PublicKey(userWallet);
      const bidPubkey = new PublicKey(bid.solanaAccount);
      const [pollPDA] = this.getPollPDA(bid.poll.id);
      const [vaultPDA] = this.getVaultPDA(bid.poll.id);

      console.log('Would create claim instruction:', {
        pollPDA: pollPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        bid: bidPubkey.toBase58(),
        bettor: userPubkey.toBase58(),
      });

      // Simulate instruction
      const serializedInstruction = Buffer.from(JSON.stringify({
        type: 'claimWinnings',
        poll: pollPDA.toBase58(),
        bid: bidPubkey.toBase58(),
      })).toString('base64');

      // Calculate expected payout
      const potentialWin = Number(bid.potentialWin);
      const platformFee = potentialWin * 0.02; // 2% fee
      const payout = potentialWin - platformFee;

      return {
        instruction: serializedInstruction,
        expectedPayout: payout,
      };
    } catch (error) {
      console.error('Error creating claim instruction:', error);
      throw error;
    }
  }

  /**
   * Cancel a poll on-chain
   */
  async cancelPollOnChain(pollId: string): Promise<string> {
    try {
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
      });

      if (!poll) {
        throw new Error('Poll not found');
      }

      if (!poll.onChain) {
        throw new Error('Poll is not on-chain');
      }

      const adminKeypair = await this.getAdminKeypair();
      const [pollPDA] = this.getPollPDA(poll.id);

      console.log('Would cancel poll on-chain:', {
        pollPDA: pollPDA.toBase58(),
        authority: adminKeypair.publicKey.toBase58(),
      });

      // Simulate transaction
      const tx = 'cancel_simulated_' + Date.now().toString();

      // Update poll status
      await prisma.poll.update({
        where: { id: pollId },
        data: { status: PollStatus.CANCELLED },
      });

      return tx;
    } catch (error) {
      console.error('Error cancelling poll on-chain:', error);
      throw error;
    }
  }

  /**
   * Sync on-chain poll data with database
   */
  async syncPollData(pollId: string): Promise<void> {
    try {
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll || !poll.onChain) {
        throw new Error('Poll not found or not on-chain');
      }

      // Simulate fetching on-chain data
      const [pollPDA] = this.getPollPDA(poll.id);

      console.log('Would sync poll data from:', pollPDA.toBase58());

      // For now, use database values (in production, fetch from blockchain)
      const totalPool = Number(poll.totalPool) || 0;
      const optionAStake = Number(poll.options[0]?.totalStaked) || 0;
      const optionBStake = Number(poll.options[1]?.totalStaked) || 0;
      const optionAOdds = Number(poll.options[0]?.currentOdds) || 0.5;
      const optionBOdds = Number(poll.options[1]?.currentOdds) || 0.5;

      // Update database
      await prisma.poll.update({
        where: { id: pollId },
        data: {
          totalPool,
          totalVolume: totalPool,
        },
      });

      // Update option odds
      if (poll.options[0]) {
        await prisma.pollOption.update({
          where: { id: poll.options[0].id },
          data: {
            currentOdds: optionAOdds / 100,
            totalStaked: optionAStake,
          },
        });
      }

      if (poll.options[1]) {
        await prisma.pollOption.update({
          where: { id: poll.options[1].id },
          data: {
            currentOdds: optionBOdds / 100,
            totalStaked: optionBStake,
          },
        });
      }
    } catch (error) {
      console.error('Error syncing poll data:', error);
      throw error;
    }
  }

  /**
   * Get user's bids from on-chain data
   */
  async getUserOnChainBids(userWallet: string): Promise<any[]> {
    try {
      const userPubkey = new PublicKey(userWallet);

      console.log('Would fetch on-chain bids for:', userPubkey.toBase58());

      // For now, return empty array (in production, fetch from blockchain)
      return [];
    } catch (error) {
      console.error('Error fetching user bids:', error);
      throw error;
    }
  }

  /**
   * Verify a Solana transaction signature
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const result = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
      });

      return result !== null && result.meta?.err === null;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get connection for direct use
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get provider for direct use
   */
  getProvider(): AnchorProvider {
    return this.provider;
  }

  /**
   * Get program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }
}

// Singleton instance
export const solanaService = new SolanaService();
