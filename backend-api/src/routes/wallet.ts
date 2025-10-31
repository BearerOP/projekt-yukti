// src/routes/wallet.ts
import express from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth';
import SolanaWalletService from '../blockchain/solana/wallet.service';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const linkWalletSchema = z.object({
  walletAddress: z.string().min(32, 'Invalid wallet address'),
  walletType: z.enum(['PHANTOM', 'SOLFLARE', 'BACKPACK', 'GLOW', 'OTHER']).optional(),
  signature: z.string().optional(),
  message: z.string().optional()
});

/**
 * GET /api/v1/wallet/verification-message
 * Get message for wallet signature verification
 */
router.get('/verification-message', authenticate, (req: AuthRequest, res) => {
  try {
    const message = SolanaWalletService.generateVerificationMessage(req.user!.id);
    
    res.json({
      success: true,
      data: { message }
    });
  } catch (error) {
    console.error('Error generating verification message:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate verification message',
        code: 500
      }
    });
  }
});

/**
 * POST /api/v1/wallet/link
 * Link Solana wallet to user account
 */
router.post('/link', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('=== Wallet Link Request ===');
    console.log('User ID:', req.user!.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);

    const { walletAddress, walletType } = req.body;

    if (!walletAddress) {
      console.error('❌ No wallet address provided');
      return res.status(400).json({
        success: false,
        error: {
          message: 'Wallet address is required',
          code: 400
        }
      });
    }

    if (walletAddress.length < 32) {
      console.error('❌ Invalid wallet address length:', walletAddress.length);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid wallet address',
          code: 400
        }
      });
    }

    console.log('✅ Linking wallet:', walletAddress);

    // Direct wallet linking without signature verification for now
    const { prisma } = await import('../lib/prisma');

    // Check if wallet is already linked to another user
    const existingWallet = await prisma.user.findFirst({
      where: {
        solanaWallet: walletAddress,
        NOT: { id: req.user!.id }
      },
      select: { id: true, email: true }
    });

    if (existingWallet) {
      console.error('❌ Wallet already linked to another user');
      return res.status(400).json({
        success: false,
        error: {
          message: 'This wallet is already linked to another account',
          code: 'WALLET_ALREADY_LINKED'
        }
      });
    }

    // Check if this user already has this wallet linked
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { solanaWallet: true }
    });

    if (currentUser?.solanaWallet === walletAddress) {
      console.log('✅ Wallet already linked to this user');
      return res.json({
        success: true,
        data: {
          wallet: {
            id: req.user!.id,
            solanaWallet: walletAddress,
            walletType: walletType || 'PHANTOM'
          },
          message: 'Wallet already linked to your account'
        }
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        solanaWallet: walletAddress,
        walletType: (walletType || 'PHANTOM') as any,
        updatedAt: new Date()
      },
      select: {
        id: true,
        solanaWallet: true,
        walletType: true
      }
    });

    console.log('✅ Wallet linked successfully:', updated.solanaWallet);

    res.json({
      success: true,
      data: { wallet: updated }
    });
  } catch (error) {
    console.error('❌ Error linking wallet:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to link wallet',
        code: 500
      }
    });
  }
});

/**
 * GET /api/v1/wallet
 * Get user's linked wallet info
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const wallet = await SolanaWalletService.getUserWallet(req.user!.id);
    
    if (!wallet) {
      return res.json({
        success: true,
        data: {
          wallet: null,
          message: 'No wallet linked'
        }
      });
    }
    
    res.json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get wallet info',
        code: 500
      }
    });
  }
});

/**
 * DELETE /api/v1/wallet/unlink
 * Unlink Solana wallet from user account
 */
router.delete('/unlink', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await SolanaWalletService.unlinkWallet(req.user!.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error unlinking wallet:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to unlink wallet',
        code: 500
      }
    });
  }
});

/**
 * GET /api/v1/wallet/balance/:address
 * Get wallet balance (public endpoint)
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const balance = await SolanaWalletService.getWalletBalance(address);

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get wallet balance',
        code: 500
      }
    });
  }
});

/**
 * GET /api/v1/wallet/history
 * Get user's wallet transaction history
 */
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../lib/prisma');

    const history = await prisma.walletHistory.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting wallet history:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get wallet history',
        code: 500
      }
    });
  }
});

export default router;