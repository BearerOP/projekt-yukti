import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PrismaClient, WalletType } from '@prisma/client';
import { getSolBalance, isValidSolanaAddress } from '../../config/solana';

const prisma = new PrismaClient();

class SolanaWalletService {
  static generateVerificationMessage(userId: string): string {
    const nonce = Math.random().toString(36).slice(2);
    return `OpinionTrading verification for user:${userId} nonce:${nonce}`;
  }

  static async linkWallet(
    userId: string,
    walletAddress: string,
    walletType: WalletType | 'PHANTOM' | 'SOLFLARE' | 'BACKPACK' | 'GLOW' | 'OTHER',
    signatureBase58: string,
    message: string
  ) {
    if (!isValidSolanaAddress(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    // Verify signature of message
    const publicKey = new PublicKey(walletAddress);
    const signature = bs58.decode(signatureBase58);
    const messageBytes = new TextEncoder().encode(message);
    const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey.toBytes());
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Persist on user
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        solanaWallet: walletAddress,
        walletType: walletType as WalletType,
        updatedAt: new Date()
      },
      select: {
        id: true,
        solanaWallet: true,
        walletType: true
      }
    });

    return { wallet: updated };
  }

  static async unlinkWallet(userId: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        solanaWallet: null,
        walletType: null,
        updatedAt: new Date()
      },
      select: { id: true }
    });
    return { success: true, userId: updated.id };
  }

  static async getUserWallet(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { solanaWallet: true, walletType: true }
    });
    if (!user || !user.solanaWallet) return null;
    return {
      address: user.solanaWallet,
      type: user.walletType
    };
  }

  static async getWalletBalance(address: string) {
    if (!isValidSolanaAddress(address)) {
      throw new Error('Invalid wallet address');
    }
    return await getSolBalance(address);
  }
}

export default SolanaWalletService;


