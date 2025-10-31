import express from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { getSolBalance } from '../config/solana';

const router = express.Router();

router.get('/_status', (req, res) => {
  res.json({ ok: true, route: 'users' });
});

/**
 * GET /api/v1/users/wallet/balance
 * Get user's wallet balance (both SOL and app balance)
 */
router.get('/wallet/balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        walletBalance: true,
        solanaWallet: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 404,
        },
      });
    }

    // Get SOL balance if wallet is connected
    let solBalance = 0;
    if (user.solanaWallet) {
      try {
        solBalance = await getSolBalance(user.solanaWallet);
      } catch (error) {
        console.error('Error fetching SOL balance:', error);
        // Continue with 0 balance if fetch fails
      }
    }

    res.json({
      success: true,
      data: {
        appBalance: Number(user.walletBalance),
        solBalance,
        walletAddress: user.solanaWallet,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        profileImage: true,
        walletBalance: true,
        solanaWallet: true,
        walletType: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 404,
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/profile
 * Update current user's profile
 */
router.put('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { fullName, profileImage } = req.body;
    const { prisma } = await import('../lib/prisma');

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName && { fullName }),
        ...(profileImage && { profileImage }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        profileImage: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;


