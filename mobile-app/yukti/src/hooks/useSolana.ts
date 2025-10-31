import { useState, useEffect } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { solanaService, Poll, Bid, BidOption } from '../services/solana.service';

/**
 * Custom hook for Solana blockchain interactions
 */
export function useSolana(wallet?: any) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [userBids, setUserBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize program when wallet is connected
  useEffect(() => {
    if (wallet) {
      try {
        solanaService.initializeProgram(wallet);
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Solana program:', err);
        setError('Failed to connect to Solana');
      }
    }
  }, [wallet]);

  /**
   * Fetch all active polls from blockchain
   */
  const fetchActivePolls = async (): Promise<Poll[]> => {
    if (!isInitialized) {
      setError('Solana not initialized. Please connect your wallet.');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedPolls = await solanaService.getAllPolls();
      setPolls(fetchedPolls);
      return fetchedPolls;
    } catch (err: any) {
      console.error('Error fetching polls:', err);
      setError(err.message || 'Failed to fetch polls');
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch a specific poll by ID
   */
  const fetchPoll = async (pollId: string): Promise<Poll | null> => {
    if (!isInitialized) {
      setError('Solana not initialized. Please connect your wallet.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const poll = await solanaService.getPoll(pollId);
      return poll;
    } catch (err: any) {
      console.error('Error fetching poll:', err);
      setError(err.message || 'Failed to fetch poll');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch user's bids from blockchain
   */
  const fetchUserBids = async (userPubkey: PublicKey): Promise<Bid[]> => {
    if (!isInitialized) {
      setError('Solana not initialized. Please connect your wallet.');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const bids = await solanaService.getUserBids(userPubkey);
      setUserBids(bids);
      return bids;
    } catch (err: any) {
      console.error('Error fetching user bids:', err);
      setError(err.message || 'Failed to fetch bids');
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Place a bid on a poll
   * Returns a transaction for the user to sign
   */
  const placeBid = async (
    pollId: string,
    bettor: PublicKey,
    amountSol: number,
    option: BidOption,
    bidIndex: number
  ): Promise<Transaction | null> => {
    if (!isInitialized) {
      setError('Solana not initialized. Please connect your wallet.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const transaction = await solanaService.placeBid(
        pollId,
        bettor,
        amountSol,
        option,
        bidIndex
      );

      return transaction;
    } catch (err: any) {
      console.error('Error creating bid transaction:', err);
      setError(err.message || 'Failed to create bid');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Claim winnings from a winning bid
   * Returns a transaction for the user to sign
   */
  const claimWinnings = async (
    pollId: string,
    bidAddress: string,
    bettor: PublicKey
  ): Promise<Transaction | null> => {
    if (!isInitialized) {
      setError('Solana not initialized. Please connect your wallet.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const transaction = await solanaService.claimWinnings(
        pollId,
        bidAddress,
        bettor
      );

      return transaction;
    } catch (err: any) {
      console.error('Error creating claim transaction:', err);
      setError(err.message || 'Failed to claim winnings');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get connection to Solana
   */
  const getConnection = () => {
    return solanaService.getConnection();
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    // State
    isInitialized,
    polls,
    userBids,
    loading,
    error,

    // Methods
    fetchActivePolls,
    fetchPoll,
    fetchUserBids,
    placeBid,
    claimWinnings,
    getConnection,
    clearError,
  };
}

export default useSolana;
