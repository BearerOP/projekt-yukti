import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';

// Program ID (must match Anchor.toml)
export const OPINION_TRADING_PROGRAM_ID = new PublicKey(
  '3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C'
);

// Treasury for platform fees
export const TREASURY_PUBKEY = new PublicKey(
  'GomH9QWfBSX2sYiwDms3XrQUd5nCgqT6E7DxSgHuZbB3'
);

// Enums matching the Rust program
export enum PollStatus {
  Active = 0,
  Settled = 1,
  Cancelled = 2,
}

export enum BidOption {
  OptionA = 0,
  OptionB = 1,
}

export enum BidStatus {
  Active = 0,
  Won = 1,
  Lost = 2,
  Refunded = 3,
}

// Type definitions
export interface Poll {
  authority: PublicKey;
  pollId: string;
  title: string;
  optionAText: string;
  optionBText: string;
  optionAStake: BN;
  optionBStake: BN;
  totalPool: BN;
  optionAOdds: BN;
  optionBOdds: BN;
  endTimestamp: BN;
  status: PollStatus;
  winner: BidOption | null;
  vaultBump: number;
  bump: number;
}

export interface Bid {
  bettor: PublicKey;
  poll: PublicKey;
  amount: BN;
  option: BidOption;
  oddsAtPurchase: BN;
  potentialWin: BN;
  status: BidStatus;
  timestamp: BN;
  bump: number;
}

export interface InitializePollParams {
  pollId: string;
  title: string;
  optionAText: string;
  optionBText: string;
  endTimestamp: number; // Unix timestamp
}

export interface PlaceBidParams {
  pollId: string;
  amount: number; // In SOL
  option: BidOption;
}

// =============================================================================
// SDK CLASS
// =============================================================================

export class OpinionTradingSDK {
  constructor(
    private connection: Connection,
    private programId: PublicKey = OPINION_TRADING_PROGRAM_ID
  ) {}

  // ===========================================================================
  // PDA DERIVATION
  // ===========================================================================

  /**
   * Derive Poll PDA from poll_id
   */
  getPollPDA(pollId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), Buffer.from(pollId)],
      this.programId
    );
  }

  /**
   * Derive Vault PDA for a poll
   */
  getVaultPDA(pollId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(pollId)],
      this.programId
    );
  }

  /**
   * Derive Bid PDA
   */
  getBidPDA(
    pollPubkey: PublicKey,
    bettorPubkey: PublicKey,
    timestamp: number
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('bid'),
        pollPubkey.toBuffer(),
        bettorPubkey.toBuffer(),
        Buffer.from(new BN(timestamp).toArray('le', 8)),
      ],
      this.programId
    );
  }

  // ===========================================================================
  // INSTRUCTION BUILDERS
  // ===========================================================================

  /**
   * Initialize a new prediction poll
   */
  async initializePoll(
    authority: PublicKey,
    params: InitializePollParams
  ): Promise<TransactionInstruction> {
    const [pollPDA] = this.getPollPDA(params.pollId);
    const [vaultPDA] = this.getVaultPDA(params.pollId);

    // Create instruction data
    const instructionData = Buffer.concat([
      Buffer.from([0]), // Discriminator for initialize_poll
      this.serializeString(params.pollId),
      this.serializeString(params.title),
      this.serializeString(params.optionAText),
      this.serializeString(params.optionBText),
      Buffer.from(new BN(params.endTimestamp).toArray('le', 8)),
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: pollPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: false },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });
  }

  /**
   * Place a bid on a poll option
   */
  async placeBid(
    bettor: PublicKey,
    params: PlaceBidParams
  ): Promise<TransactionInstruction> {
    const [pollPDA] = this.getPollPDA(params.pollId);
    const [vaultPDA] = this.getVaultPDA(params.pollId);

    const timestamp = Math.floor(Date.now() / 1000);
    const [bidPDA] = this.getBidPDA(pollPDA, bettor, timestamp);

    // Convert SOL to lamports
    const amountLamports = params.amount * LAMPORTS_PER_SOL;

    const instructionData = Buffer.concat([
      Buffer.from([1]), // Discriminator for place_bid
      Buffer.from(new BN(amountLamports).toArray('le', 8)),
      Buffer.from([params.option]),
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: pollPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: bidPDA, isSigner: false, isWritable: true },
        { pubkey: bettor, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });
  }

  /**
   * Settle a poll and declare winner (admin only)
   */
  async settlePoll(
    authority: PublicKey,
    pollId: string,
    winningOption: BidOption
  ): Promise<TransactionInstruction> {
    const [pollPDA] = this.getPollPDA(pollId);

    const instructionData = Buffer.concat([
      Buffer.from([2]), // Discriminator for settle_poll
      Buffer.from([winningOption]),
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: pollPDA, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });
  }

  /**
   * Claim winnings for a winning bid
   */
  async claimWinnings(
    bettor: PublicKey,
    pollId: string,
    bidPubkey: PublicKey
  ): Promise<TransactionInstruction> {
    const [pollPDA] = this.getPollPDA(pollId);
    const [vaultPDA] = this.getVaultPDA(pollId);

    const instructionData = Buffer.from([3]); // Discriminator for claim_winnings

    return new TransactionInstruction({
      keys: [
        { pubkey: pollPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: bidPubkey, isSigner: false, isWritable: true },
        { pubkey: bettor, isSigner: true, isWritable: true },
        { pubkey: TREASURY_PUBKEY, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });
  }

  /**
   * Cancel a poll (admin only, emergency use)
   */
  async cancelPoll(
    authority: PublicKey,
    pollId: string
  ): Promise<TransactionInstruction> {
    const [pollPDA] = this.getPollPDA(pollId);

    const instructionData = Buffer.from([4]); // Discriminator for cancel_poll

    return new TransactionInstruction({
      keys: [
        { pubkey: pollPDA, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });
  }

  /**
   * Claim refund for a cancelled poll
   */
  async claimRefund(
    bettor: PublicKey,
    pollId: string,
    bidPubkey: PublicKey
  ): Promise<TransactionInstruction> {
    const [pollPDA] = this.getPollPDA(pollId);
    const [vaultPDA] = this.getVaultPDA(pollId);

    const instructionData = Buffer.from([5]); // Discriminator for claim_refund

    return new TransactionInstruction({
      keys: [
        { pubkey: pollPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: bidPubkey, isSigner: false, isWritable: true },
        { pubkey: bettor, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });
  }

  // ===========================================================================
  // ACCOUNT FETCHING
  // ===========================================================================

  /**
   * Fetch poll account data
   */
  async getPoll(pollId: string): Promise<Poll | null> {
    const [pollPDA] = this.getPollPDA(pollId);
    const accountInfo = await this.connection.getAccountInfo(pollPDA);

    if (!accountInfo) {
      return null;
    }

    return this.deserializePoll(accountInfo.data);
  }

  /**
   * Fetch bid account data
   */
  async getBid(bidPubkey: PublicKey): Promise<Bid | null> {
    const accountInfo = await this.connection.getAccountInfo(bidPubkey);

    if (!accountInfo) {
      return null;
    }

    return this.deserializeBid(accountInfo.data);
  }

  /**
   * Get all bids for a user
   */
  async getUserBids(userPubkey: PublicKey): Promise<Bid[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts
      .map((account) => this.deserializeBid(account.account.data))
      .filter((bid): bid is Bid => bid !== null);
  }

  /**
   * Get all active polls
   */
  async getActivePolls(): Promise<Poll[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        {
          dataSize: 685, // Poll account size
        },
      ],
    });

    return accounts
      .map((account) => this.deserializePoll(account.account.data))
      .filter((poll): poll is Poll => poll !== null && poll.status === PollStatus.Active);
  }

  /**
   * Get poll statistics
   */
  async getPollStats(pollId: string): Promise<{
    totalVolume: number;
    optionAVolume: number;
    optionBVolume: number;
    optionAOdds: number;
    optionBOdds: number;
    totalBids: number;
  } | null> {
    const poll = await this.getPoll(pollId);

    if (!poll) {
      return null;
    }

    // Get bid count
    const [pollPDA] = this.getPollPDA(pollId);
    const bids = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        {
          memcmp: {
            offset: 40, // Offset to poll field in Bid struct
            bytes: pollPDA.toBase58(),
          },
        },
      ],
    });

    return {
      totalVolume: poll.totalPool.toNumber() / LAMPORTS_PER_SOL,
      optionAVolume: poll.optionAStake.toNumber() / LAMPORTS_PER_SOL,
      optionBVolume: poll.optionBStake.toNumber() / LAMPORTS_PER_SOL,
      optionAOdds: poll.optionAOdds.toNumber() / 100, // Convert basis points to percentage
      optionBOdds: poll.optionBOdds.toNumber() / 100,
      totalBids: bids.length,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Serialize string for Solana program
   */
  private serializeString(str: string): Buffer {
    const strBuffer = Buffer.from(str);
    const lenBuffer = Buffer.alloc(4);
    lenBuffer.writeUInt32LE(strBuffer.length, 0);
    return Buffer.concat([lenBuffer, strBuffer]);
  }

  /**
   * Deserialize Poll account data
   */
  private deserializePoll(data: Buffer): Poll | null {
    try {
      let offset = 8; // Skip discriminator

      const authority = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const pollIdLen = data.readUInt32LE(offset);
      offset += 4;
      const pollId = data.slice(offset, offset + pollIdLen).toString();
      offset += pollIdLen;

      const titleLen = data.readUInt32LE(offset);
      offset += 4;
      const title = data.slice(offset, offset + titleLen).toString();
      offset += titleLen;

      const optionALen = data.readUInt32LE(offset);
      offset += 4;
      const optionAText = data.slice(offset, offset + optionALen).toString();
      offset += optionALen;

      const optionBLen = data.readUInt32LE(offset);
      offset += 4;
      const optionBText = data.slice(offset, offset + optionBLen).toString();
      offset += optionBLen;

      const optionAStake = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const optionBStake = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const totalPool = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const optionAOdds = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const optionBOdds = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const endTimestamp = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const status = data[offset] as PollStatus;
      offset += 1;

      const hasWinner = data[offset];
      offset += 1;
      const winner = hasWinner ? (data[offset] as BidOption) : null;
      offset += 1;

      const vaultBump = data[offset] ?? 0;
      offset += 1;

      const bump = data[offset] ?? 0;

      return {
        authority,
        pollId,
        title,
        optionAText,
        optionBText,
        optionAStake,
        optionBStake,
        totalPool,
        optionAOdds,
        optionBOdds,
        endTimestamp,
        status,
        winner,
        vaultBump,
        bump,
      };
    } catch (error) {
      console.error('Error deserializing poll:', error);
      return null;
    }
  }

  /**
   * Deserialize Bid account data
   */
  private deserializeBid(data: Buffer): Bid | null {
    try {
      let offset = 8; // Skip discriminator

      const bettor = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const poll = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const amount = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const option = data[offset] as BidOption;
      offset += 1;

      const oddsAtPurchase = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const potentialWin = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const status = data[offset] as BidStatus;
      offset += 1;

      const timestamp = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const bump = data[offset] ?? 0;

      return {
        bettor,
        poll,
        amount,
        option,
        oddsAtPurchase,
        potentialWin,
        status,
        timestamp,
        bump,
      };
    } catch (error) {
      console.error('Error deserializing bid:', error);
      return null;
    }
  }
}
