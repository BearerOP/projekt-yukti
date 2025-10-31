import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN, Program, AnchorProvider } from '@coral-xyz/anchor';
import OpinionTradingIDL from '../idl/opinion_trading.json';

// Get configuration from environment
const SOLANA_RPC = process.env.EXPO_PUBLIC_SOLANA_RPC || 'http://127.0.0.1:8899';
const PROGRAM_ID_STR = process.env.EXPO_PUBLIC_PROGRAM_ID || '3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C';
const TREASURY_ADDRESS = process.env.EXPO_PUBLIC_TREASURY_ADDRESS || 'GomH9QWfBSX2sYiwDms3XrQUd5nCgqT6E7DxSgHuZbB3';

// Poll and Bid status enums
export enum PollStatus {
  Active = 'active',
  Settled = 'settled',
  Cancelled = 'cancelled',
}

export enum BidOption {
  OptionA = 'optionA',
  OptionB = 'optionB',
}

export enum BidStatus {
  Active = 'active',
  Won = 'won',
  Lost = 'lost',
  Refunded = 'refunded',
}

// Type definitions
export interface Poll {
  authority: string;
  pollId: string;
  title: string;
  optionAText: string;
  optionBText: string;
  optionAStake: number;
  optionBStake: number;
  totalPool: number;
  optionAOdds: number;
  optionBOdds: number;
  endTimestamp: number;
  status: PollStatus;
  winner: BidOption | null;
}

export interface Bid {
  bettor: string;
  poll: string;
  amount: number;
  option: BidOption;
  oddsAtPurchase: number;
  potentialWin: number;
  status: BidStatus;
  timestamp: number;
}

/**
 * Solana service for interacting with the Opinion Trading program
 */
export class SolanaService {
  private connection: Connection;
  private program: Program | null = null;
  private programId: PublicKey;
  private treasuryAddress: PublicKey;

  constructor() {
    this.connection = new Connection(SOLANA_RPC, 'confirmed');
    this.programId = new PublicKey(PROGRAM_ID_STR);
    this.treasuryAddress = new PublicKey(TREASURY_ADDRESS);
  }

  /**
   * Initialize the program with a wallet provider
   */
  initializeProgram(wallet: any): void {
    const provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );

    this.program = new Program(
      OpinionTradingIDL as anchor.Idl,
      this.programId,
      provider
    );
  }

  /**
   * Get Poll PDA
   */
  getPollPDA(pollId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), Buffer.from(pollId)],
      this.programId
    );
  }

  /**
   * Get Vault PDA
   */
  getVaultPDA(pollId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(pollId)],
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
   * Fetch poll data from blockchain
   */
  async getPoll(pollId: string): Promise<Poll | null> {
    if (!this.program) {
      throw new Error('Program not initialized. Call initializeProgram first.');
    }

    try {
      const [pollPDA] = this.getPollPDA(pollId);
      const pollAccount = await this.program.account.poll.fetch(pollPDA);

      return {
        authority: pollAccount.authority.toBase58(),
        pollId: pollAccount.pollId,
        title: pollAccount.title,
        optionAText: pollAccount.optionAText,
        optionBText: pollAccount.optionBText,
        optionAStake: pollAccount.optionAStake.toNumber() / 1_000_000_000,
        optionBStake: pollAccount.optionBStake.toNumber() / 1_000_000_000,
        totalPool: pollAccount.totalPool.toNumber() / 1_000_000_000,
        optionAOdds: pollAccount.optionAOdds.toNumber() / 100,
        optionBOdds: pollAccount.optionBOdds.toNumber() / 100,
        endTimestamp: pollAccount.endTimestamp.toNumber(),
        status: this.convertPollStatus(pollAccount.status),
        winner: pollAccount.winner ? this.convertBidOption(pollAccount.winner) : null,
      };
    } catch (error) {
      console.error('Error fetching poll:', error);
      return null;
    }
  }

  /**
   * Fetch bid data from blockchain
   */
  async getBid(bidAddress: string): Promise<Bid | null> {
    if (!this.program) {
      throw new Error('Program not initialized. Call initializeProgram first.');
    }

    try {
      const bidPubkey = new PublicKey(bidAddress);
      const bidAccount = await this.program.account.bid.fetch(bidPubkey);

      return {
        bettor: bidAccount.bettor.toBase58(),
        poll: bidAccount.poll.toBase58(),
        amount: bidAccount.amount.toNumber() / 1_000_000_000,
        option: this.convertBidOption(bidAccount.option),
        oddsAtPurchase: bidAccount.oddsAtPurchase.toNumber() / 100,
        potentialWin: bidAccount.potentialWin.toNumber() / 1_000_000_000,
        status: this.convertBidStatus(bidAccount.status),
        timestamp: bidAccount.timestamp.toNumber(),
      };
    } catch (error) {
      console.error('Error fetching bid:', error);
      return null;
    }
  }

  /**
   * Place a bid on a poll (returns transaction for user to sign)
   */
  async placeBid(
    pollId: string,
    bettor: PublicKey,
    amountSol: number,
    option: BidOption,
    bidIndex: number
  ): Promise<Transaction> {
    if (!this.program) {
      throw new Error('Program not initialized. Call initializeProgram first.');
    }

    const [pollPDA] = this.getPollPDA(pollId);
    const [vaultPDA] = this.getVaultPDA(pollId);
    const [bidPDA] = this.getBidPDA(pollPDA, bettor, bidIndex);

    const amountLamports = new BN(amountSol * 1_000_000_000);
    const timestamp = new BN(Math.floor(Date.now() / 1000));

    const optionEnum = option === BidOption.OptionA ? { optionA: {} } : { optionB: {} };

    const tx = await this.program.methods
      .placeBid(amountLamports, optionEnum, timestamp, new BN(bidIndex))
      .accounts({
        poll: pollPDA,
        vault: vaultPDA,
        bid: bidPDA,
        bettor: bettor,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return tx;
  }

  /**
   * Claim winnings (returns transaction for user to sign)
   */
  async claimWinnings(
    pollId: string,
    bidAddress: string,
    bettor: PublicKey
  ): Promise<Transaction> {
    if (!this.program) {
      throw new Error('Program not initialized. Call initializeProgram first.');
    }

    const [pollPDA] = this.getPollPDA(pollId);
    const [vaultPDA] = this.getVaultPDA(pollId);
    const bidPubkey = new PublicKey(bidAddress);

    const tx = await this.program.methods
      .claimWinnings()
      .accounts({
        poll: pollPDA,
        vault: vaultPDA,
        bid: bidPubkey,
        bettor: bettor,
        treasury: this.treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return tx;
  }

  /**
   * Get all polls (filtered by status if provided)
   */
  async getAllPolls(status?: PollStatus): Promise<Poll[]> {
    if (!this.program) {
      throw new Error('Program not initialized. Call initializeProgram first.');
    }

    try {
      const polls = await this.program.account.poll.all();

      return polls
        .map((p: any) => ({
          authority: p.account.authority.toBase58(),
          pollId: p.account.pollId,
          title: p.account.title,
          optionAText: p.account.optionAText,
          optionBText: p.account.optionBText,
          optionAStake: p.account.optionAStake.toNumber() / 1_000_000_000,
          optionBStake: p.account.optionBStake.toNumber() / 1_000_000_000,
          totalPool: p.account.totalPool.toNumber() / 1_000_000_000,
          optionAOdds: p.account.optionAOdds.toNumber() / 100,
          optionBOdds: p.account.optionBOdds.toNumber() / 100,
          endTimestamp: p.account.endTimestamp.toNumber(),
          status: this.convertPollStatus(p.account.status),
          winner: p.account.winner ? this.convertBidOption(p.account.winner) : null,
        }))
        .filter((poll: Poll) => !status || poll.status === status);
    } catch (error) {
      console.error('Error fetching all polls:', error);
      return [];
    }
  }

  /**
   * Get user's bids
   */
  async getUserBids(userPubkey: PublicKey): Promise<Bid[]> {
    if (!this.program) {
      throw new Error('Program not initialized. Call initializeProgram first.');
    }

    try {
      const bids = await this.program.account.bid.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ]);

      return bids.map((b: any) => ({
        bettor: b.account.bettor.toBase58(),
        poll: b.account.poll.toBase58(),
        amount: b.account.amount.toNumber() / 1_000_000_000,
        option: this.convertBidOption(b.account.option),
        oddsAtPurchase: b.account.oddsAtPurchase.toNumber() / 100,
        potentialWin: b.account.potentialWin.toNumber() / 1_000_000_000,
        status: this.convertBidStatus(b.account.status),
        timestamp: b.account.timestamp.toNumber(),
      }));
    } catch (error) {
      console.error('Error fetching user bids:', error);
      return [];
    }
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Convert on-chain poll status to app enum
   */
  private convertPollStatus(status: any): PollStatus {
    if (status.active) return PollStatus.Active;
    if (status.settled) return PollStatus.Settled;
    if (status.cancelled) return PollStatus.Cancelled;
    return PollStatus.Active;
  }

  /**
   * Convert on-chain bid option to app enum
   */
  private convertBidOption(option: any): BidOption {
    if (option.optionA) return BidOption.OptionA;
    if (option.optionB) return BidOption.OptionB;
    return BidOption.OptionA;
  }

  /**
   * Convert on-chain bid status to app enum
   */
  private convertBidStatus(status: any): BidStatus {
    if (status.active) return BidStatus.Active;
    if (status.won) return BidStatus.Won;
    if (status.lost) return BidStatus.Lost;
    if (status.refunded) return BidStatus.Refunded;
    return BidStatus.Active;
  }
}

// Singleton instance
export const solanaService = new SolanaService();
