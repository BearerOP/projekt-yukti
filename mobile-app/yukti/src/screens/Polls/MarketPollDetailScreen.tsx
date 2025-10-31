import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import BidModal from '../../components/BidModal';
import { bidsAPI, pollsAPI } from '../../services/api';

interface Market {
  id: string;
  category: string;
  categoryColor: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  volume: string;
  description?: string;
  endDate?: string;
  participants?: number;
}

const MarketPollDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { market } = route.params as { market: Market };

  // Get wallet state from Redux
  const wallet = useSelector((state: RootState) => state.wallet);

  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [pollData, setPollData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch poll details with real option IDs
  useEffect(() => {
    const fetchPollDetails = async () => {
      try {
        setLoading(true);
        const response = await pollsAPI.getById(market.id);

        if (response.data.success && response.data.data) {
          const poll = response.data.data;

          // Transform the poll data for BidModal
          const transformedData = {
            id: poll.id,
            title: poll.title,
            options: poll.options.map((option: any) => ({
              id: option.id, // Real UUID from database
              text: option.optionText,
              odds: Number(option.currentOdds) || 1.0,
            })),
          };

          setPollData(transformedData);
        } else {
          // Fallback to mock data if API fails
          setPollData({
            id: market.id,
            title: market.question,
            options: [
              { id: 'option-yes', text: 'YES', odds: parseFloat(market.yesPrice.replace(/[₹SOL\s]/g, '')) || 1.0 },
              { id: 'option-no', text: 'NO', odds: parseFloat(market.noPrice.replace(/[₹SOL\s]/g, '')) || 1.0 },
            ],
          });
        }
      } catch (error) {
        console.error('Error fetching poll details:', error);
        // Fallback to mock data
        setPollData({
          id: market.id,
          title: market.question,
          options: [
            { id: 'option-yes', text: 'YES', odds: parseFloat(market.yesPrice.replace(/[₹SOL\s]/g, '')) || 1.0 },
            { id: 'option-no', text: 'NO', odds: parseFloat(market.noPrice.replace(/[₹SOL\s]/g, '')) || 1.0 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPollDetails();
  }, [market.id]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSelectSide = (side: 'yes' | 'no') => {
    setSelectedSide(side);
    Animated.spring(slideAnim, {
      toValue: side === 'yes' ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePlaceBid = () => {
    if (!selectedSide) {
      Alert.alert('Select Side', 'Please select YES or NO before placing a bid');
      return;
    }
    setShowBidModal(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this market on Yukti: ${market.question}\n\nYES: ${market.yesPrice} | NO: ${market.noPrice}\nVolume: ${market.volume}\n\nDownload Yukti to place your bid!`,
        title: market.question,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSubmitBid = async (amount: number, optionId: string) => {
    try {
      console.log('Submitting bid:', { amount, optionId, pollId: market.id });

      // Call the real API to place bid
      const response = await bidsAPI.place({
        pollId: market.id,
        optionId,
        amount,
      });

      if (response.data.success) {
        console.log('Bid placed successfully:', response.data.data);

        // Check if this is an on-chain bid
        if (response.data.data.solanaTransaction) {
          const { instruction, bidAddress, bidIndex } = response.data.data.solanaTransaction;

          console.log('🔗 On-chain bid detected - preparing Solana transaction...');
          console.log('   Bid Address:', bidAddress);
          console.log('   Bid Index:', bidIndex);

          try {
            // Import Solana dependencies
            const { Transaction } = await import('@solana/web3.js');
            const { mobileWalletAdapter } = await import('../../utils/mobileWalletAdapter');

            // Deserialize the transaction
            const txBuffer = Buffer.from(instruction, 'base64');
            const tx = Transaction.from(txBuffer);

            console.log('📝 Transaction deserialized, requesting signature...');

            // Sign and send the transaction using the wallet adapter
            const signature = await mobileWalletAdapter.signAndSendTransaction(tx);

            console.log('✅ On-chain bid transaction confirmed!');
            console.log('   Signature:', signature);
            console.log('   Bid escrow:', bidAddress);

            // Show success message with transaction details
            Alert.alert(
              'Success! 🎉',
              `Your bid of ${amount.toFixed(4)} SOL has been placed on-chain!\n\nTransaction: ${signature.slice(0, 8)}...${signature.slice(-8)}\n\nYour funds are now in the escrow vault.`,
              [
                {
                  text: 'View Portfolio',
                  onPress: () => navigation.navigate('Portfolio' as never),
                },
                {
                  text: 'OK',
                  style: 'cancel',
                },
              ]
            );
          } catch (txError: any) {
            console.error('Failed to sign/send Solana transaction:', txError);
            Alert.alert(
              'Transaction Failed',
              `Your bid was recorded in the database, but the Solana transaction failed: ${txError.message}\n\nPlease contact support.`
            );
            return Promise.reject(txError);
          }
        } else {
          // Off-chain bid - show standard success message
          Alert.alert(
            'Success!',
            `Your bid of ${amount.toFixed(4)} SOL has been placed successfully.`,
            [
              {
                text: 'View Portfolio',
                onPress: () => navigation.navigate('Portfolio' as never),
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
        }

        return Promise.resolve();
      } else {
        throw new Error('Failed to place bid');
      }
    } catch (error: any) {
      console.error('Failed to place bid:', error);

      // Log full error response for debugging
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', JSON.stringify(error.response.data, null, 2));
      }

      // Handle specific error messages
      let errorMessage = 'Failed to place bid. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Error message to show user:', errorMessage);

      // Handle wallet not connected error - offer to link wallet
      if (errorMessage.toLowerCase().includes('connect your wallet') ||
          errorMessage.toLowerCase().includes('wallet not connected')) {
        return new Promise((resolve, reject) => {
          Alert.alert(
            'Link Wallet Required',
            'This poll requires your wallet to be linked. This will happen automatically.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => reject(new Error('Wallet linking cancelled')),
              },
              {
                text: 'Link Wallet',
                onPress: async () => {
                  try {
                    const { mobileWalletAdapter } = await import('../../utils/mobileWalletAdapter');

                    // Link wallet to backend
                    await mobileWalletAdapter.linkWalletToBackend();
                    console.log('✅ Wallet linked successfully');

                    // Retry the bid after successful linking
                    console.log('🔄 Retrying bid placement...');
                    const retryResponse = await bidsAPI.place({
                      pollId: market.id,
                      optionId,
                      amount,
                    });

                    if (retryResponse.data.success) {
                      Alert.alert(
                        'Success!',
                        `Your bid of ${(amount / 10000).toFixed(4)} SOL has been placed successfully.`,
                      );
                      resolve();
                    } else {
                      reject(new Error('Failed to place bid after linking wallet'));
                    }
                  } catch (linkError: any) {
                    console.error('Failed to link wallet:', linkError);
                    reject(new Error(linkError.message || 'Failed to link wallet'));
                  }
                },
              },
            ]
          );
        });
      }

      // Return rejected promise to show error in BidModal
      return Promise.reject(new Error(errorMessage));
    }
  };

  // Show loading state while fetching poll data
  if (loading || !pollData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#179E66" />
          <Text style={{ color: '#fff', marginTop: 16 }}>Loading poll details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Details</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Market Info */}
        <View style={styles.marketCard}>
          <View style={styles.categoryBadge}>
            <View style={[styles.categoryDot, { backgroundColor: market.categoryColor }]} />
            <Text style={styles.categoryText}>{market.category}</Text>
          </View>

          <Text style={styles.question}>{market.question}</Text>
          <Text style={styles.description}>
            {market.description || 'Place your bid on this market prediction and earn based on the outcome.'}
          </Text>

          {/* Market Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>{market.volume}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Participants</Text>
              <Text style={styles.statValue}>{market.participants || '1.2K'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ends</Text>
              <Text style={styles.statValue}>{market.endDate || 'Dec 31, 2025'}</Text>
            </View>
          </View>
        </View>

        {/* Current Prices */}
        <View style={styles.priceContainer}>
          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <View style={[styles.priceBadge, { backgroundColor: '#30C285' }]}>
                <Text style={styles.priceBadgeText}>YES</Text>
              </View>
              <View style={styles.priceValue}>
                <Text style={styles.priceAmount}>{market.yesPrice}</Text>
                <Text style={styles.priceLabel}>Current Price</Text>
              </View>
            </View>
            <View style={styles.priceStats}>
              <Text style={styles.priceChange}>+12.5%</Text>
              <Ionicons name="trending-up" size={16} color="#30C285" />
            </View>
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <View style={[styles.priceBadge, { backgroundColor: '#FF6B6B' }]}>
                <Text style={styles.priceBadgeText}>NO</Text>
              </View>
              <View style={styles.priceValue}>
                <Text style={styles.priceAmount}>{market.noPrice}</Text>
                <Text style={styles.priceLabel}>Current Price</Text>
              </View>
            </View>
            <View style={styles.priceStats}>
              <Text style={[styles.priceChange, { color: '#FF6B6B' }]}>-12.5%</Text>
              <Ionicons name="trending-down" size={16} color="#FF6B6B" />
            </View>
          </View>
        </View>

        {/* Select Side */}
        <View style={styles.selectContainer}>
          <Text style={styles.sectionTitle}>1. Select Your Position</Text>
          <View style={styles.toggleContainer}>
            <Animated.View
              style={[
                styles.toggleBackground,
                {
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 152],
                      }),
                    },
                  ],
                },
              ]}
            />
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleSelectSide('yes')}>
              <Text style={[
                styles.toggleText,
                selectedSide === 'yes' && styles.toggleTextActive
              ]}>
                YES
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleSelectSide('no')}>
              <Text style={[
                styles.toggleText,
                selectedSide === 'no' && styles.toggleTextActive
              ]}>
                NO
              </Text>
            </TouchableOpacity>
          </View>

          {/* Show potential returns */}
          {selectedSide && pollData && (
            <View style={styles.returnInfoBox}>
              <View style={styles.returnInfoRow}>
                <Ionicons name="trending-up" size={20} color="#30C285" />
                <Text style={styles.returnInfoText}>
                  Current Odds: {pollData.options[selectedSide === 'yes' ? 0 : 1]?.odds.toFixed(2)}x
                </Text>
              </View>
              <Text style={styles.returnInfoDetail}>
                Potential Return: For every 1 SOL you bet, you can win up to {pollData.options[selectedSide === 'yes' ? 0 : 1]?.odds.toFixed(2)} SOL (minus 2% platform fee)
              </Text>
            </View>
          )}
        </View>

        {/* Place Bid */}
        {selectedSide && (
          <View style={styles.bidContainer}>
            <Text style={styles.bidTitle}>2. Enter Bid Amount</Text>
            <Text style={styles.bidSubtitle}>Minimum: 0.01 SOL | Maximum: 100 SOL</Text>

            <View style={styles.quickAmounts}>
              {[0.5, 1, 2.5, 5].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setBidAmount(amount.toString())}>
                  <Text style={styles.quickAmountText}>{amount} SOL</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.placeBidButton, !selectedSide && styles.placeBidButtonDisabled]}
              onPress={handlePlaceBid}>
              <View style={styles.placeBidButtonContent}>
                <Ionicons name="wallet-outline" size={20} color="#fff" />
                <Text style={styles.placeBidText}>Continue to Place Bid</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bid Modal */}
      <BidModal
        visible={showBidModal}
        onClose={() => setShowBidModal(false)}
        poll={pollData}
        selectedOption={selectedSide}
        userWallet={wallet.address}
        onSubmitBid={handleSubmitBid}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1913',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'AbrilFatface_400Regular',
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  marketCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  question: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 32,
    fontFamily: 'AbrilFatface_400Regular',
  },
  description: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 20,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  priceContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  priceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  priceValue: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  priceLabel: {
    fontSize: 10,
    color: '#666',
  },
  priceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#30C285',
    marginRight: 4,
  },
  selectContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  toggleBackground: {
    position: 'absolute',
    width: '48%',
    top: 4,
    bottom: 4,
    backgroundColor: '#179E66',
    borderRadius: 8,
    margin: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  returnInfoBox: {
    marginTop: 16,
    backgroundColor: 'rgba(48, 194, 133, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(48, 194, 133, 0.3)',
  },
  returnInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#30C285',
    marginLeft: 8,
  },
  returnInfoDetail: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
  bidContainer: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
  },
  bidTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  bidSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1913',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  inputAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#0a1913',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  placeBidButton: {
    paddingVertical: 16,
    backgroundColor: '#179E66',
    borderRadius: 12,
    alignItems: 'center',
  },
  placeBidButtonDisabled: {
    backgroundColor: '#666',
  },
  placeBidButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeBidText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default MarketPollDetailScreen;

