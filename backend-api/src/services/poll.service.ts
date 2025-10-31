import { PrismaClient, PollCategory, PollStatus } from '@prisma/client';
import { solanaService } from './solana.service';

const prisma = new PrismaClient();

interface CreatePollData {
  title: string;
  description?: string;
  category: PollCategory;
  endDate: Date;
  imageUrl?: string;
  onChain?: boolean;
}

interface UpdatePollData {
  title?: string;
  description?: string;
  category?: PollCategory;
  endDate?: Date;
  imageUrl?: string;
  status?: PollStatus;
}

export class PollService {
  /**
   * Create a new poll with default YES/NO options
   */
  static async createPoll(userId: string, data: CreatePollData) {
    // Validate end date is in the future
    if (new Date(data.endDate) <= new Date()) {
      throw new Error('End date must be in the future');
    }

    // Create poll with YES/NO options
    const poll = await prisma.poll.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        endDate: new Date(data.endDate),
        imageUrl: data.imageUrl,
        onChain: data.onChain || false,
        status: PollStatus.ACTIVE,
        createdBy: userId,
        options: {
          create: [
            {
              optionText: 'Yes',
              currentOdds: 0.5,
              totalStaked: 0,
            },
            {
              optionText: 'No',
              currentOdds: 0.5,
              totalStaked: 0,
            },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    // If onChain is true, create the poll on Solana blockchain
    if (data.onChain) {
      try {
        const result = await solanaService.initializePollOnChain(poll.id);
        console.log(`Poll ${poll.id} created on-chain: ${result.pollAddress}`);
      } catch (error) {
        console.error('Failed to create poll on-chain:', error);
        // Note: Poll is created in DB but not on-chain
        // You may want to handle this differently based on your requirements
      }
    }

    return poll;
  }

  /**
   * Get all polls created by a specific user
   */
  static async getMyPolls(userId: string, filters?: { status?: PollStatus; category?: PollCategory }) {
    const where: any = {
      createdBy: userId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const polls = await prisma.poll.findMany({
      where,
      include: {
        options: true,
        _count: {
          select: {
            bids: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return polls;
  }

  /**
   * Get a single poll by ID
   */
  static async getPollById(pollId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        _count: {
          select: {
            bids: true,
          },
        },
      },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    return poll;
  }

  /**
   * Update a poll (only by creator)
   */
  static async updatePoll(pollId: string, userId: string, data: UpdatePollData) {
    // Check if poll exists and user is the creator
    const existingPoll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!existingPoll) {
      throw new Error('Poll not found');
    }

    if (existingPoll.createdBy !== userId) {
      throw new Error('You are not authorized to update this poll');
    }

    // Prevent updates if poll is closed or settled
    if (existingPoll.status === PollStatus.CLOSED || existingPoll.status === PollStatus.SETTLED) {
      throw new Error('Cannot update a closed or settled poll');
    }

    // Validate end date if provided
    if (data.endDate && new Date(data.endDate) <= new Date()) {
      throw new Error('End date must be in the future');
    }

    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        imageUrl: data.imageUrl,
        status: data.status,
      },
      include: {
        options: true,
      },
    });

    return updatedPoll;
  }

  /**
   * Delete a poll (soft delete by setting status to CANCELLED)
   */
  static async deletePoll(pollId: string, userId: string) {
    // Check if poll exists and user is the creator
    const existingPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        _count: {
          select: {
            bids: true,
          },
        },
      },
    });

    if (!existingPoll) {
      throw new Error('Poll not found');
    }

    if (existingPoll.createdBy !== userId) {
      throw new Error('You are not authorized to delete this poll');
    }

    // Prevent deletion if there are bids
    if (existingPoll._count.bids > 0) {
      throw new Error('Cannot delete a poll with existing bids');
    }

    // Soft delete by setting status to CANCELLED
    const deletedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        status: PollStatus.CANCELLED,
      },
    });

    return deletedPoll;
  }

  /**
   * Get all polls with filters
   */
  static async getAllPolls(filters?: {
    category?: PollCategory;
    status?: PollStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const polls = await prisma.poll.findMany({
      where,
      include: {
        options: true,
        _count: {
          select: {
            bids: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return polls;
  }

  /**
   * Get trending polls (most active)
   */
  static async getTrendingPolls(limit: number = 10) {
    const polls = await prisma.poll.findMany({
      where: {
        status: PollStatus.ACTIVE,
      },
      include: {
        options: true,
        _count: {
          select: {
            bids: true,
          },
        },
      },
      orderBy: {
        totalVolume: 'desc',
      },
      take: limit,
    });

    return polls;
  }
}
