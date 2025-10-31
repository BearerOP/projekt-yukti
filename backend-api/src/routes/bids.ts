import express from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { BidService } from '../services/bid.service';
import { BidStatus } from '@prisma/client';

const router = express.Router();

// Validation Schemas
const placeBidSchema = z.object({
  pollId: z.string().uuid('Invalid poll ID'),
  optionId: z.string().uuid('Invalid option ID'),
  amount: z.number().min(0.01, 'Minimum bid amount is 0.01 SOL').max(100, 'Maximum bid amount is 100 SOL'),
});

const getBidsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'WON', 'LOST', 'REFUNDED', 'CANCELLED']).optional(),
  pollId: z.string().uuid().optional(),
});

// Status endpoint
router.get('/_status', (req, res) => {
  res.json({ ok: true, route: 'bids' });
});

/**
 * POST /api/v1/bids
 * Place a new bid on a poll option
 */
router.post('/', authenticate, validate(placeBidSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { pollId, optionId, amount } = req.body;

    const bid = await BidService.placeBid({
      userId,
      pollId,
      optionId,
      amount,
    });

    res.status(201).json({
      success: true,
      data: bid,
      message: 'Bid placed successfully',
    });
  } catch (error: any) {
    console.error('Error placing bid:', error.message);

    // Return 400 for user-facing validation errors
    return res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to place bid',
        code: 400,
      },
    });
  }
});

/**
 * GET /api/v1/bids/my-bids
 * Get current user's bids
 */
router.get('/my-bids', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const bids = await BidService.getUserBids(
      userId,
      status as BidStatus | undefined
    );

    res.json({
      success: true,
      data: bids,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/bids/poll/:pollId
 * Get all bids for a specific poll
 */
router.get('/poll/:pollId', async (req, res, next) => {
  try {
    const { pollId } = req.params;

    const bids = await BidService.getPollBids(pollId);

    res.json({
      success: true,
      data: bids,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/bids/market-stats/:pollId
 * Get market statistics for a poll
 */
router.get('/market-stats/:pollId', async (req, res, next) => {
  try {
    const { pollId } = req.params;

    const stats = await BidService.getPollMarketStats(pollId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/bids/settle/:pollId
 * Settle a poll and distribute winnings (Admin only)
 */
router.post('/settle/:pollId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { pollId } = req.params;
    const { winningOptionId } = req.body;

    if (!pollId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Poll ID is required',
          code: 400,
        },
      });
    }

    if (!winningOptionId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Winning option ID is required',
          code: 400,
        },
      });
    }

    // Check if user is admin
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only admins can settle polls',
          code: 403,
        },
      });
    }

    await BidService.settlePoll(pollId, winningOptionId);

    res.json({
      success: true,
      message: 'Poll settled successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;