import prisma  from '../lib/prisma';
import { BidStatus, PollStatus, TransactionType, TransactionStatus, WalletHistoryType  } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { solanaService } from './solana.service';

interface PlaceBidInput {
  userId: string;
  pollId: string;
  optionId: string;
  amount: number;
}

interface BidWithDetails {
  id: string;
  amount: number;
  oddsAtPurchase: number;
  potentialWin: number;
  status: BidStatus;
  createdAt: Date;
  poll: {
    id: string;
    title: string;
    category: string;
    status: PollStatus;
    endDate: Date;
  };
  option: {
    id: string;
    optionText: string;
    currentOdds: number;
  };
  solanaTransaction?: {
    instruction: string;
    bidAddress: string;
    bidIndex: number;
  };
}

export class BidService {
  // Platform fee percentage (e.g., 2% of winning amount)
  private static PLATFORM_FEE_PERCENTAGE = 0.02;

  // Minimum and maximum bid amounts (in SOL)
  private static MIN_BID_AMOUNT = 0.01;  // 0.01 SOL minimum
  private static MAX_BID_AMOUNT = 100;   // 100 SOL maximum

  /**
   * Place a bid on a poll option with automatic market odds adjustment
   */
  static async placeBid(data: PlaceBidInput): Promise<BidWithDetails> {
    const { userId, pollId, optionId, amount } = data;

    // Validate bid amount (in SOL)
    if (amount < this.MIN_BID_AMOUNT) {
      throw new Error(`Minimum bid amount is ${this.MIN_BID_AMOUNT} SOL`);
    }
    if (amount > this.MAX_BID_AMOUNT) {
      throw new Error(`Maximum bid amount is ${this.MAX_BID_AMOUNT} SOL`);
    }

    // Use transaction to ensure atomicity with increased timeout
    return await prisma.$transaction(async (tx) => {
      // 1. Verify user has sufficient balance and wallet (if needed)
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, solanaWallet: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const userBalance = Number(user.walletBalance);
      if (userBalance < amount) {
        throw new Error(`Insufficient balance. You have ${userBalance.toFixed(4)} SOL, but need ${amount} SOL`);
      }

      // 2. Verify poll is active and not expired
      const poll = await tx.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        throw new Error('Poll not found');
      }

      if (poll.status !== PollStatus.ACTIVE) {
        throw new Error('Poll is not active');
      }

      if (new Date() > poll.endDate) {
        throw new Error('Poll has ended');
      }

      // 3. Check if wallet is connected for on-chain polls
      if (poll.onChain && !user.solanaWallet) {
        throw new Error('Please connect your wallet before placing a bid on this poll');
      }

      // 4. Get the selected option
      const selectedOption = poll.options.find(opt => opt.id === optionId);
      if (!selectedOption) {
        throw new Error('Invalid option selected');
      }

      // 5. Calculate current odds before bid
      const currentOdds = Number(selectedOption.currentOdds);

      // 6. Calculate potential win based on current odds
      const potentialWin = amount / currentOdds;

      // 7. Deduct amount from user's wallet
      const balanceBefore = userBalance;
      const balanceAfter = userBalance - amount;

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: balanceAfter },
      });

      // 8. Create wallet history entry
      await tx.walletHistory.create({
        data: {
          userId,
          type: WalletHistoryType.BID,
          amount: -amount,
          balanceBefore,
          balanceAfter,
          referenceId: pollId,
          referenceType: 'POLL',
          description: `Bid placed on: ${poll.title}`,
        },
      });

      // 9. Create the bid
      const bid = await tx.bid.create({
        data: {
          userId,
          pollId,
          optionId,
          amount,
          oddsAtPurchase: currentOdds,
          potentialWin,
          status: BidStatus.ACTIVE,
        },
        include: {
          poll: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              endDate: true,
            },
          },
          option: {
            select: {
              id: true,
              optionText: true,
              currentOdds: true,
            },
          },
        },
      });

      // 10. Update market dynamics (odds, volumes, pool)
      await this.updateMarketDynamics(tx, pollId, optionId, amount);

      // 11. Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.BID_PLACED,
          amount: -amount,
          status: TransactionStatus.COMPLETED,
          description: `Bid on ${selectedOption.optionText} - ${poll.title}`,
          metadata: {
            pollId,
            optionId,
            bidId: bid.id,
          },
        },
      });

      // 12. If poll is on-chain, create bid instruction for mobile to sign
      let solanaTransaction: { instruction: string; bidAddress: string; bidIndex: number } | undefined;

      if (poll.onChain && poll.solanaPollId) {
        try {
          // User wallet is guaranteed to exist at this point due to check at step 3
          const bidInstruction = await solanaService.placeBidOnChain(
            pollId,
            optionId,
            amount,
            user.solanaWallet!
          );

          solanaTransaction = bidInstruction;

          // Note: Solana transaction details are returned in the response
          // Mobile app will use these to sign the transaction
        } catch (error) {
          console.error('Failed to create on-chain bid instruction:', error);
          // Bid still exists in DB even if on-chain creation fails
        }
      }

      // Return bid with Solana transaction if applicable
      return {
        ...bid,
        amount: Number(bid.amount),
        oddsAtPurchase: Number(bid.oddsAtPurchase),
        potentialWin: Number(bid.potentialWin),
        option: {
          ...bid.option,
          currentOdds: Number(bid.option.currentOdds),
        },
        solanaTransaction,
      };
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 20000, // Maximum transaction duration (20s)
    });
  }

  /**
   * Update market dynamics when a bid is placed
   * This adjusts odds based on the Automated Market Maker (AMM) algorithm
   */
  private static async updateMarketDynamics(
    tx: any,
    pollId: string,
    optionId: string,
    bidAmount: number
  ): Promise<void> {
    // Get all options for this poll
    const options = await tx.pollOption.findMany({
      where: { pollId },
    });

    if (options.length !== 2) {
      throw new Error('Only binary polls are supported');
    }

    const selectedOption = options.find((opt: any) => opt.id === optionId)!;
    const otherOption = options.find((opt: any) => opt.id !== optionId)!;

    // Update total staked for selected option
    const newSelectedStake = Number(selectedOption.totalStaked) + bidAmount;
    const otherStake = Number(otherOption.totalStaked);

    // Calculate new pool total
    const totalPool = newSelectedStake + otherStake;

    // Calculate new odds using Constant Product Market Maker (CPMM) algorithm
    // Formula: odds = (totalPool / optionStake)
    // This ensures odds adjust dynamically based on stake distribution

    let newSelectedOdds: number;
    let newOtherOdds: number;

    if (totalPool === 0) {
      newSelectedOdds = 0.5;
      newOtherOdds = 0.5;
    } else {
      // Calculate probability based on stake ratio
      const selectedProbability = newSelectedStake / totalPool;
      const otherProbability = otherStake / totalPool;

      // Convert probability to decimal odds
      // odds = 1 / probability, but we normalize to keep it in (0, 1) range
      // We use a smoothing factor to prevent extreme odds
      const smoothingFactor = 0.1;
      newSelectedOdds = Math.max(0.05, Math.min(0.95, selectedProbability + smoothingFactor * (0.5 - selectedProbability)));
      newOtherOdds = 1 - newSelectedOdds;
    }

    // Update selected option
    await tx.pollOption.update({
      where: { id: optionId },
      data: {
        totalStaked: newSelectedStake,
        currentOdds: newSelectedOdds,
      },
    });

    // Update other option odds
    await tx.pollOption.update({
      where: { id: otherOption.id },
      data: {
        currentOdds: newOtherOdds,
      },
    });

    // Update poll totals
    await tx.poll.update({
      where: { id: pollId },
      data: {
        totalPool,
        totalVolume: totalPool, // For now, volume = pool
      },
    });
  }

  /**
   * Get user's active bids
   */
  static async getUserBids(userId: string, status?: BidStatus): Promise<BidWithDetails[]> {
    const bids = await prisma.bid.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        poll: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            endDate: true,
          },
        },
        option: {
          select: {
            id: true,
            optionText: true,
            currentOdds: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bids.map((bid: any) => ({
      ...bid,
      amount: Number(bid.amount),
      oddsAtPurchase: Number(bid.oddsAtPurchase),
      potentialWin: Number(bid.potentialWin),
      option: {
        ...bid.option,
        currentOdds: Number(bid.option.currentOdds),
      },
    }));
  }

  /**
   * Get bids for a specific poll
   */
  static async getPollBids(pollId: string) {
    const bids = await prisma.bid.findMany({
      where: { pollId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        option: {
          select: {
            id: true,
            optionText: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bids.map((bid: any) => ({
      ...bid,
      amount: Number(bid.amount),
      oddsAtPurchase: Number(bid.oddsAtPurchase),
      potentialWin: Number(bid.potentialWin),
      option: {
        ...bid.option,
        currentOdds: Number(bid.option.currentOdds),
      },
    }));
  }

  /**
   * Calculate user's profit/loss for a bid
   */
  static calculateProfitLoss(bid: {
    amount: number;
    potentialWin: number;
    status: BidStatus;
  }): { profit: number; profitPercent: number } {
    let profit = 0;

    if (bid.status === BidStatus.WON) {
      // Won: profit = potentialWin - amount - platformFee
      const platformFee = bid.potentialWin * this.PLATFORM_FEE_PERCENTAGE;
      profit = bid.potentialWin - bid.amount - platformFee;
    } else if (bid.status === BidStatus.LOST) {
      // Lost: lose entire bid amount
      profit = -bid.amount;
    } else if (bid.status === BidStatus.REFUNDED) {
      // Refunded: no profit/loss
      profit = 0;
    } else {
      // Active: unrealized profit based on current odds
      profit = bid.potentialWin - bid.amount;
    }

    const profitPercent = bid.amount > 0 ? (profit / bid.amount) * 100 : 0;

    return { profit, profitPercent };
  }

  /**
   * Settle bids for a poll when results are declared
   */
  static async settlePoll(pollId: string, winningOptionId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 0. Get poll details
      const poll = await tx.poll.findUnique({
        where: { id: pollId },
      });

      if (!poll) {
        throw new Error('Poll not found');
      }

      // If poll is on-chain, settle it on-chain first
      if (poll.onChain) {
        try {
          await solanaService.settlePollOnChain(pollId, winningOptionId);
          console.log(`Poll ${pollId} settled on-chain`);
        } catch (error) {
          console.error('Failed to settle poll on-chain:', error);
          // Continue with off-chain settlement even if on-chain fails
        }
      }

      // 1. Update poll status
      await tx.poll.update({
        where: { id: pollId },
        data: {
          status: PollStatus.SETTLED,
          result: winningOptionId,
          resultDate: new Date(),
        },
      });

      // 2. Get all bids for this poll
      const bids = await tx.bid.findMany({
        where: { pollId },
        include: {
          user: true,
          poll: true,
        },
      });

      // 3. Settle each bid
      for (const bid of bids) {
        const isWinner = bid.optionId === winningOptionId;
        const newStatus = isWinner ? BidStatus.WON : BidStatus.LOST;

        // Update bid status
        await tx.bid.update({
          where: { id: bid.id },
          data: {
            status: newStatus,
            settledAt: new Date(),
          },
        });

        // If winner, credit payout to user's wallet
        if (isWinner) {
          const potentialWin = Number(bid.potentialWin);
          const platformFee = potentialWin * this.PLATFORM_FEE_PERCENTAGE;
          const payout = potentialWin - platformFee;

          const currentBalance = Number(bid.user.walletBalance);
          const newBalance = currentBalance + payout;

          // Credit user wallet
          await tx.user.update({
            where: { id: bid.userId },
            data: { walletBalance: newBalance },
          });

          // Create wallet history
          await tx.walletHistory.create({
            data: {
              userId: bid.userId,
              type: WalletHistoryType.WIN,
              amount: payout,
              balanceBefore: currentBalance,
              balanceAfter: newBalance,
              referenceId: bid.id,
              referenceType: 'BID',
              description: `Won: ${bid.poll.title}`,
            },
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: bid.userId,
              type: TransactionType.WIN_PAYOUT,
              amount: payout,
              status: TransactionStatus.COMPLETED,
              description: `Payout for winning bid on ${bid.poll.title}`,
              metadata: {
                bidId: bid.id,
                pollId,
                platformFee,
              },
            },
          });
        }
      }
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 30000, // Maximum transaction duration (30s) - longer for settlement
    });
  }

  /**
   * Get market statistics for a poll
   */
  static async getPollMarketStats(pollId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        bids: {
          select: {
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    const totalVolume = Number(poll.totalVolume);
    const totalBids = poll.bids.length;

    // Calculate trend (change in odds over time)
    const optionsWithTrend = poll.options.map(option => {
      const optionBids = poll.bids.filter(bid => bid.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000));
      const recentActivity = optionBids.length;

      return {
        ...option,
        currentOdds: Number(option.currentOdds),
        totalStaked: Number(option.totalStaked),
        recentActivity,
        trend: recentActivity > 0 ? 'up' : 'stable',
      };
    });

    return {
      pollId: poll.id,
      title: poll.title,
      category: poll.category,
      status: poll.status,
      totalVolume,
      totalBids,
      options: optionsWithTrend,
      endDate: poll.endDate,
    };
  }
}
