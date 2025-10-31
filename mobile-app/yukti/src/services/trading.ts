// src/services/trading.ts
// On-chain bid placement scaffold using Anchor-style instruction layout

import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { SolanaWalletClient, getProgramPublicKey } from './solanaWallet';

export interface PlaceBidParams {
  pollId: string;             // Off-chain ID to associate with program data
  optionId: string;           // Selected option ID
  amountLamports: number;     // Amount to escrow in lamports
  bidder: string;             // Bidder wallet public key (base58)
  programId: string;          // Anchor program ID for escrow
  escrowPdaSeed?: string;     // Optional PDA seed customization
}

export interface PlaceBidResult {
  signature: string;
}

// Helper to derive an escrow PDA; keep seed stable between client and program
export async function deriveEscrowPda(programId: PublicKey, pollId: string, bidderPk: PublicKey): Promise<[PublicKey, number]> {
  const seedA = Buffer.from('escrow');
  const seedB = Buffer.from(pollId);
  const seedC = bidderPk.toBuffer();
  return await PublicKey.findProgramAddress([seedA, seedB, seedC], programId);
}

// Build an Anchor-compatible instruction data buffer for `place_bid` method.
// In a real Anchor client, you'd use IDL and @project-serum/anchor; here we pack a placeholder.
function buildPlaceBidData(amountLamports: number, pollId: string, optionId: string): Buffer {
  // Placeholder encoding: discriminator(8) + amount(8) + lengths + strings
  const discriminator = Buffer.from([112, 108, 97, 99, 101, 95, 98, 105]); // "place_bi" placeholder
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amountLamports));
  const pollBuf = Buffer.from(pollId);
  const optionBuf = Buffer.from(optionId);

  const lenPoll = Buffer.alloc(2);
  lenPoll.writeUInt16LE(pollBuf.length);
  const lenOption = Buffer.alloc(2);
  lenOption.writeUInt16LE(optionBuf.length);

  return Buffer.concat([discriminator, amountBuf, lenPoll, pollBuf, lenOption, optionBuf]);
}

export async function placeOnchainBid(params: PlaceBidParams): Promise<PlaceBidResult> {
  const { pollId, optionId, amountLamports, bidder, programId } = params;

  const wallet = new SolanaWalletClient('devnet');
  const bidderPk = new PublicKey(bidder);
  const programPk = getProgramPublicKey(programId);

  const [escrowPda] = await deriveEscrowPda(programPk, pollId, bidderPk);

  const instructionData = buildPlaceBidData(amountLamports, pollId, optionId);

  const keys = [
    { pubkey: bidderPk, isSigner: true, isWritable: true },
    { pubkey: escrowPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({ keys, programId: programPk, data: instructionData });

  const tx = new Transaction();
  tx.feePayer = bidderPk;
  tx.add(ix);
  tx.recentBlockhash = await wallet.getRecentBlockhash();

  // Hand off to mobile wallet for signing and sending
  const signature = await wallet.signAndSend(tx);
  return { signature };
}


