// src/screens/Portfolio/PortfolioScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import CreatePollModal from '../../components/CreatePollModal';
import { pollsAPI, bidsAPI } from '../../services/api';
import { MyPoll, PollStatus } from '../../types';

type TabType = 'active' | 'completed' | 'mypolls';

interface Bid {
  id: string;
  amount: number;
  oddsAtPurchase: number;
  potentialWin: number;
  status: string;
  createdAt: string;
  poll: {
    id: string;
    title: string;
    category: string;
    status: string;
    endDate: string;
  };
  option: {
    id: string;
    optionText: string;
    currentOdds: number;
  };
}

interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  activePositions: number;
}

export default function PortfolioScreen() {
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myPolls, setMyPolls] = useState<MyPoll[]>([]);
  const [activeBids, setActiveBids] = useState<Bid[]>([]);
  const [completedBids, setCompletedBids] = useState<Bid[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    totalInvested: 0,
    currentValue: 0,
    totalReturns: 0,
    activePositions: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const fabScale = useRef(new Animated.Value(1)).current;
  const pollsOpacity = useRef(new Animated.Value(0)).current;

  // Fetch user's bids
  const fetchUserBids = useCallback(async () => {
    try {
      // Fetch active bids
      const activeResponse = await bidsAPI.getMyBids('ACTIVE');
      if (activeResponse.data.success) {
        setActiveBids(activeResponse.data.data);
      }

      // Fetch completed bids (won/lost)
      const completedResponse = await bidsAPI.getMyBids();
      if (completedResponse.data.success) {
        const allBids = completedResponse.data.data as Bid[];
        const completed = allBids.filter(
          (bid: Bid) => bid.status === 'WON' || bid.status === 'LOST' || bid.status === 'REFUNDED'
        );
        setCompletedBids(completed);

        // Calculate portfolio stats
        const active = allBids.filter((bid: Bid) => bid.status === 'ACTIVE');
        const totalInvested = allBids.reduce((sum: number, bid: Bid) => sum + bid.amount, 0);
        const currentValue = active.reduce((sum: number, bid: Bid) => sum + bid.potentialWin, 0);
        const wonBids = allBids.filter((bid: Bid) => bid.status === 'WON');
        const totalWinnings = wonBids.reduce((sum: number, bid: Bid) => sum + bid.potentialWin, 0);
        const totalReturns = totalWinnings - totalInvested;

        setPortfolioStats({
          totalInvested,
          currentValue: currentValue > 0 ? currentValue : totalInvested,
          totalReturns,
          activePositions: active.length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user bids:', error);
    }
  }, []);

  // Fetch user's created polls
  const fetchMyPolls = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pollsAPI.getMyPolls();
      if (response.data.success) {
        setMyPolls(response.data.data);

        // Animate polls in
        Animated.timing(pollsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch (error: any) {
      console.error('Error fetching my polls:', error);
      if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to load your polls. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTab === 'mypolls') {
      fetchMyPolls();
    } else {
      fetchUserBids();
    }
  }, [selectedTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedTab === 'mypolls') {
      await fetchMyPolls();
    } else {
      await fetchUserBids();
    }
    setRefreshing(false);
  }, [selectedTab, fetchMyPolls, fetchUserBids]);

  const handleCreatePoll = () => {
    // Animate FAB press
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    setShowCreateModal(true);
  };

  const handlePollCreated = () => {
    fetchMyPolls();
    setSelectedTab('mypolls');
  };

  const handleDeletePoll = async (pollId: string) => {
    Alert.alert(
      'Delete Poll',
      'Are you sure you want to delete this poll? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await pollsAPI.delete(pollId);
              Alert.alert('Success', 'Poll deleted successfully');
              fetchMyPolls();
            } catch (error: any) {
              const errorMessage = error.response?.data?.error?.message || 'Failed to delete poll';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: PollStatus) => {
    switch (status) {
      case 'ACTIVE':
        return '#4CAF50';
      case 'DRAFT':
        return '#FF9800';
      case 'CLOSED':
        return '#9E9E9E';
      case 'SETTLED':
        return '#2196F3';
      case 'CANCELLED':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: PollStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'play-circle';
      case 'DRAFT':
        return 'file-document-edit';
      case 'CLOSED':
        return 'lock';
      case 'SETTLED':
        return 'check-circle';
      case 'CANCELLED':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SPORTS':
        return 'soccer';
      case 'POLITICS':
        return 'bank';
      case 'ENTERTAINMENT':
        return 'movie';
      case 'TECHNOLOGY':
        return 'laptop';
      case 'BUSINESS':
        return 'briefcase';
      case 'CRYPTO':
        return 'bitcoin';
      default:
        return 'dots-horizontal';
    }
  };

  const renderMyPollsTab = () => {
    if (loading && myPolls.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="loading" size={48} color="#666" />
          <Text style={styles.emptyStateText}>Loading your polls...</Text>
        </View>
      );
    }

    if (myPolls.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="poll" size={64} color="#666" />
          <Text style={styles.emptyStateTitle}>No Polls Yet</Text>
          <Text style={styles.emptyStateText}>
            Create your first poll and let others trade on your predictions
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreatePoll}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.emptyStateButtonText}>Create Poll</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Animated.View style={{ opacity: pollsOpacity }}>
        {myPolls.map((poll) => (
          <Animated.View
            key={poll.id}
            style={[
              styles.pollCard,
              {
                opacity: pollsOpacity,
                transform: [
                  {
                    translateY: pollsOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View style={styles.pollHeader}>
              <View style={styles.pollHeaderLeft}>
                <Icon
                  name={getCategoryIcon(poll.category)}
                  size={16}
                  color="#179E66"
                  style={styles.categoryIcon}
                />
                <Text style={styles.pollCategory}>{poll.category}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(poll.status)}20` }]}>
                <Icon name={getStatusIcon(poll.status)} size={12} color={getStatusColor(poll.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(poll.status) }]}>
                  {poll.status}
                </Text>
              </View>
            </View>

            <Text style={styles.pollTitle}>{poll.title}</Text>

            {poll.description && (
              <Text style={styles.pollDescription} numberOfLines={2}>
                {poll.description}
              </Text>
            )}

            <View style={styles.pollStats}>
              <View style={styles.pollStat}>
                <Icon name="clock-outline" size={14} color="#999" />
                <Text style={styles.pollStatText}>
                  Ends {new Date(poll.endDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.pollStat}>
                <Icon name="account-multiple" size={14} color="#999" />
                <Text style={styles.pollStatText}>{poll._count?.bids || 0} bids</Text>
              </View>
              <View style={styles.pollStat}>
                <Icon name="currency-usd" size={14} color="#999" />
                <Text style={styles.pollStatText}>
                  {(Number(poll.totalVolume) / 10000).toFixed(2)} SOL
                </Text>
              </View>
            </View>

            <View style={styles.pollOptions}>
              {poll.options.map((option) => (
                <View key={option.id} style={styles.optionItem}>
                  <Text style={styles.optionText}>{option.optionText}</Text>
                  <Text style={styles.optionOdds}>{(Number(option.currentOdds) * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>

            <View style={styles.pollActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => handleDeletePoll(poll.id)}
                disabled={poll._count?.bids ? poll._count.bids > 0 : false}>
                <Icon name="delete-outline" size={18} color="#F44336" />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Blur */}
      <View style={styles.headerContainer}>
        <BlurView intensity={30} tint="dark" style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
        </BlurView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#179E66" />}>
        {/* Portfolio Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Invested</Text>
              <Text style={styles.summaryValue}>{(portfolioStats.totalInvested / 10000).toFixed(2)} SOL</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Value</Text>
              <Text style={styles.summaryValue}>{(portfolioStats.currentValue / 10000).toFixed(2)} SOL</Text>
            </View>
          </View>

          <View style={styles.returnsContainer}>
            <View style={styles.returnsLeft}>
              <Text style={styles.returnsLabel}>Total Returns</Text>
              <Text style={[styles.returnsValue, { color: portfolioStats.totalReturns >= 0 ? '#4CAF50' : '#F44336' }]}>
                {portfolioStats.totalReturns >= 0 ? '+' : ''}{(portfolioStats.totalReturns / 10000).toFixed(2)} SOL
              </Text>
            </View>
            <View style={styles.percentageBadge}>
              <Icon
                name={portfolioStats.totalReturns >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={portfolioStats.totalReturns >= 0 ? '#4CAF50' : '#F44336'}
              />
              <Text style={[styles.percentageText, { color: portfolioStats.totalReturns >= 0 ? '#4CAF50' : '#F44336' }]}>
                {((portfolioStats.totalReturns / portfolioStats.totalInvested) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="briefcase" size={20} color="#179E66" />
            <Text style={styles.statValue}>{portfolioStats.activePositions}</Text>
            <Text style={styles.statLabel}>Active Positions</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Icon name="chart-timeline-variant" size={20} color="#2196F3" />
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
            onPress={() => setSelectedTab('active')}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
            onPress={() => setSelectedTab('completed')}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'mypolls' && styles.tabActive]}
            onPress={() => setSelectedTab('mypolls')}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, selectedTab === 'mypolls' && styles.tabTextActive]}>My Polls</Text>
          </TouchableOpacity>
        </View>

        {/* Positions/Polls List */}
        <View style={styles.positionsContainer}>
          {selectedTab === 'active' ? (
            activeBids.length > 0 ? (
              activeBids.map((bid) => {
                const returns = bid.potentialWin - bid.amount;
                const changePercent = (returns / bid.amount) * 100;
                return (
                  <TouchableOpacity key={bid.id} style={styles.positionCard} activeOpacity={0.8}>
                    <View style={styles.positionHeader}>
                      <Text style={styles.positionTitle}>{bid.poll.title}</Text>
                      <View style={[styles.positionBadge, changePercent >= 0 ? styles.winningBadge : styles.losingBadge]}>
                        <Text style={styles.positionBadgeText}>{bid.option.optionText}</Text>
                      </View>
                    </View>

                    <View style={styles.positionStats}>
                      <View style={styles.positionStat}>
                        <Text style={styles.positionStatLabel}>Invested</Text>
                        <Text style={styles.positionStatValue}>{(bid.amount / 10000).toFixed(4)} SOL</Text>
                      </View>

                      <View style={styles.positionStat}>
                        <Text style={styles.positionStatLabel}>Potential Win</Text>
                        <Text style={styles.positionStatValue}>{(bid.potentialWin / 10000).toFixed(4)} SOL</Text>
                      </View>

                      <View style={styles.positionStat}>
                        <Text style={styles.positionStatLabel}>Returns</Text>
                        <Text style={[styles.positionChange, { color: changePercent >= 0 ? '#4CAF50' : '#F44336' }]}>
                          {changePercent >= 0 ? '+' : ''}
                          {changePercent.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="briefcase-outline" size={64} color="#666" />
                <Text style={styles.emptyStateText}>No active positions</Text>
              </View>
            )
          ) : selectedTab === 'completed' ? (
            completedBids.length > 0 ? (
              completedBids.map((bid) => {
                const profit = bid.status === 'WON' ? bid.potentialWin - bid.amount : -bid.amount;
                return (
                  <TouchableOpacity key={bid.id} style={styles.positionCard} activeOpacity={0.8}>
                    <View style={styles.positionHeader}>
                      <Text style={styles.positionTitle}>{bid.poll.title}</Text>
                      <View style={[styles.resultBadge, bid.status === 'WON' ? styles.wonBadge : styles.lostBadge]}>
                        <Icon name={bid.status === 'WON' ? 'check-circle' : 'close-circle'} size={14} color="#fff" />
                        <Text style={styles.resultBadgeText}>{bid.status}</Text>
                      </View>
                    </View>

                    <View style={styles.positionStats}>
                      <View style={styles.positionStat}>
                        <Text style={styles.positionStatLabel}>Invested</Text>
                        <Text style={styles.positionStatValue}>{(bid.amount / 10000).toFixed(4)} SOL</Text>
                      </View>

                      <View style={styles.positionStat}>
                        <Text style={styles.positionStatLabel}>Final Value</Text>
                        <Text style={styles.positionStatValue}>
                          {bid.status === 'WON' ? (bid.potentialWin / 10000).toFixed(4) : '0.0000'} SOL
                        </Text>
                      </View>

                      <View style={styles.positionStat}>
                        <Text style={styles.positionStatLabel}>Profit/Loss</Text>
                        <Text style={[styles.positionChange, { color: profit >= 0 ? '#4CAF50' : '#F44336' }]}>
                          {profit >= 0 ? '+' : ''}{(profit / 10000).toFixed(4)} SOL
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="history" size={64} color="#666" />
                <Text style={styles.emptyStateText}>No completed positions</Text>
              </View>
            )
          ) : (
            renderMyPollsTab()
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button - Show only on My Polls tab */}
      {selectedTab === 'mypolls' && (
        <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity style={styles.fab} onPress={handleCreatePoll} activeOpacity={0.8}>
            <Icon name="plus" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePollCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1913',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: 'AbrilFatface_400Regular',
  },
  scrollContent: {
    paddingTop: 120,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#179E66',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  returnsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 16,
  },
  returnsLeft: {
    flex: 1,
  },
  returnsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  returnsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'AbrilFatface_400Regular',
  },
  percentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#179E66',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#fff',
  },
  positionsContainer: {
    paddingHorizontal: 20,
  },
  positionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  positionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
    marginRight: 12,
  },
  positionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  winningBadge: {
    backgroundColor: '#4CAF5020',
  },
  losingBadge: {
    backgroundColor: '#F4433620',
  },
  positionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  positionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionStat: {
    flex: 1,
  },
  positionStatLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  positionStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  positionChange: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  wonBadge: {
    backgroundColor: '#4CAF50',
  },
  lostBadge: {
    backgroundColor: '#F44336',
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // My Polls Tab Styles
  pollCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 6,
  },
  pollCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#179E66',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pollTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
    marginBottom: 8,
  },
  pollDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginBottom: 12,
  },
  pollStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pollStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pollStatText: {
    fontSize: 12,
    color: '#999',
  },
  pollOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  optionItem: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  optionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionOdds: {
    fontSize: 14,
    color: '#179E66',
    fontWeight: '700',
  },
  pollActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonSecondary: {
    backgroundColor: '#F4433610',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonTextDanger: {
    color: '#F44336',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#179E66',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#179E66',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
