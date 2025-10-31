// src/config/solana.ts
import { Connection, Cluster, clusterApiUrl, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Solana configuration
export const SOLANA_NETWORK = (process.env.SOLANA_NETWORK || 'devnet') as Cluster;
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

// Create connection
export const solanaConnection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

// Platform treasury wallet (for fees, payouts, etc.)
export const getTreasuryWallet = (): Keypair => {
  const secretKey = process.env.SOLANA_TREASURY_SECRET_KEY;
  if (!secretKey) {
    throw new Error('SOLANA_TREASURY_SECRET_KEY not configured');
  }
  const decoded = bs58.decode(secretKey);
  return Keypair.fromSecretKey(decoded);
};

// USDC token configuration (for stable coin trading)
export const USDC_MINT_ADDRESS = process.env.USDC_MINT_ADDRESS || 
  (SOLANA_NETWORK === 'mainnet-beta' 
    ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
    : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Devnet USDC
  );

// Platform fee configuration
export const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2'); // 2%
export const MIN_BID_AMOUNT = parseFloat(process.env.MIN_BID_AMOUNT || '0.1'); // 0.1 SOL or USDC

// Program IDs (deploy your Anchor programs and add here)
export const OPINION_TRADING_PROGRAM_ID = process.env.OPINION_TRADING_PROGRAM_ID || '';

// Utility: Check if wallet is valid
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
};

// Utility: Get SOL balance
export const getSolBalance = async (publicKeyString: string): Promise<number> => {
  try {
    const balance = await solanaConnection.getBalance(
      new (await import('@solana/web3.js')).PublicKey(publicKeyString)
    );
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
};

export default {
  connection: solanaConnection,
  network: SOLANA_NETWORK,
  rpcUrl: SOLANA_RPC_URL,
  getTreasuryWallet,
  USDC_MINT_ADDRESS,
  PLATFORM_FEE_PERCENTAGE,
  MIN_BID_AMOUNT,
  isValidSolanaAddress,
  getSolBalance
};