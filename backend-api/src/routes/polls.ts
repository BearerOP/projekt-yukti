import express from 'express';
import { z } from 'zod';
import { PollCategory, PollStatus } from '@prisma/client';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { PollService } from '../services/poll.service';

const router = express.Router();

// Validation Schemas
const createPollSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  category: z.enum(['SPORTS', 'POLITICS', 'ENTERTAINMENT', 'TECHNOLOGY', 'BUSINESS', 'CRYPTO', 'OTHER']),
  endDate: z.string().datetime('End date must be a valid ISO datetime string'),
  imageUrl: z.string().url('Image URL must be a valid URL').optional(),
  onChain: z.boolean().optional(),
});

const updatePollSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(['SPORTS', 'POLITICS', 'ENTERTAINMENT', 'TECHNOLOGY', 'BUSINESS', 'CRYPTO', 'OTHER']).optional(),
  endDate: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'SETTLED', 'CANCELLED']).optional(),
});

const getPollsQuerySchema = z.object({
  category: z.enum(['SPORTS', 'POLITICS', 'ENTERTAINMENT', 'TECHNOLOGY', 'BUSINESS', 'CRYPTO', 'OTHER']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'SETTLED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

// Status endpoint
router.get('/_status', (req, res) => {
  res.json({ ok: true, route: 'polls' });
});

// Get all polls with filters
router.get('/', async (req, res, next) => {
  try {
    const { category, status, search, limit, offset } = req.query as any;

    const polls = await PollService.getAllPolls({
      category: category as PollCategory,
      status: status as PollStatus,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json({
      success: true,
      data: polls,
    });
  } catch (error) {
    next(error);
  }
});

// Get trending polls
router.get('/trending', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const polls = await PollService.getTrendingPolls(limit);

    res.json({
      success: true,
      data: polls,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's created polls (authenticated)
router.get('/my-polls', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { status, category } = req.query;

    const polls = await PollService.getMyPolls(userId, {
      status: status as PollStatus,
      category: category as PollCategory,
    });

    res.json({
      success: true,
      data: polls,
    });
  } catch (error) {
    next(error);
  }
});

// Get poll by ID
router.get('/:id', async (req, res, next) => {
  try {
    const poll = await PollService.getPollById(req.params.id);

    res.json({
      success: true,
      data: poll,
    });
  } catch (error) {
    next(error);
  }
});

// Create new poll (authenticated)
router.post('/', authenticate, validate(createPollSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const pollData = req.body;

    const poll = await PollService.createPoll(userId, {
      ...pollData,
      endDate: new Date(pollData.endDate),
    });

    res.status(201).json({
      success: true,
      data: poll,
      message: 'Poll created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update poll (authenticated, owner only)
router.put('/:id', authenticate, validate(updatePollSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const pollId = req.params.id;
    const updateData = req.body;

    if (!userId || !pollId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized or invalid poll ID', code: 401 },
      });
    }

    const poll = await PollService.updatePoll(pollId, userId, {
      ...updateData,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
    });

    res.json({
      success: true,
      data: poll,
      message: 'Poll updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete poll (authenticated, owner only)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const pollId = req.params.id;

    if (!userId || !pollId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized or invalid poll ID', code: 401 },
      });
    }

    await PollService.deletePoll(pollId, userId);

    res.json({
      success: true,
      message: 'Poll deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;


