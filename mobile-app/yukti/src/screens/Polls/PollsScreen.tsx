import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { pollsAPI } from '../../services/api';
import {
  SearchBar,
  MarketCard,
  FeaturedBanner,
} from '../../components/Polls';
import { PlantDecoration, SmallPlantDecoration } from '../../components/Polls/SVGDecorations';
import Colors from '../../../constants/Colors';
import { MyPoll } from '../../types';

interface Market {
  id: string;
  category: string;
  categoryColor: string;
  changePercent: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  volume: string;
}

// Category color mapping
const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    CRYPTO: '#30c285',
    STOCKS: '#4ECDC4',
    POLITICS: '#FF6B6B',
    SPORTS: '#FFA07A',
    ENTERTAINMENT: '#9B59B6',
    TECHNOLOGY: '#3498DB',
    BUSINESS: '#F39C12',
    OTHER: '#95A5A6',
  };
  return colorMap[category.toUpperCase()] || colorMap.OTHER;
};

// Transform API poll to Market display format
const transformPollToMarket = (poll: MyPoll): Market => {
  const yesOption = poll.options.find(opt => opt.optionText.toLowerCase() === 'yes');
  const noOption = poll.options.find(opt => opt.optionText.toLowerCase() === 'no');

  const yesOdds = yesOption ? Number(yesOption.currentOdds) : 0.5;
  const noOdds = noOption ? Number(noOption.currentOdds) : 0.5;

  // Calculate change percent (mock for now - could be based on historical data)
  const changePercent = Math.random() > 0.5
    ? `+ ${(Math.random() * 20).toFixed(0)} %`
    : `- ${(Math.random() * 20).toFixed(0)} %`;

  return {
    id: poll.id,
    category: poll.category,
    categoryColor: getCategoryColor(poll.category),
    changePercent,
    question: poll.title,
    yesPrice: `${yesOdds.toFixed(2)} SOL`,
    noPrice: `${noOdds.toFixed(2)} SOL`,
    volume: `${(Number(poll.totalVolume) / 10000).toFixed(2)} SOL`,
  };
};

const categories = ['All', 'CRYPTO', 'STOCKS', 'POLITICS', 'SPORTS', 'ENTERTAINMENT', 'TECHNOLOGY', 'BUSINESS'];

const PollsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Market[]>([]);
  const notificationAnim = useRef(new Animated.Value(0)).current;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cardAnimations, setCardAnimations] = useState<Record<string, Animated.Value>>({});
  const [chipAnimations] = useState(() =>
    categories.reduce((acc, cat) => {
      acc[cat] = new Animated.Value(cat === 'All' ? 1 : 0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );
  const user = useSelector((state: RootState) => state.auth.user);

  const notifications = [
    { id: '1', message: 'Your bid on Bitcoin market was successful', type: 'bid', market: 'Crypto' },
    { id: '2', message: 'New poll: Tesla stock prediction', type: 'new', market: 'Stocks' },
    { id: '3', message: 'Poll results updated for Politics market', type: 'update', market: 'Politics' },
  ];

  useEffect(() => {
    loadMarkets();
  }, []);

  const handleCategorySelect = (category: string) => {
    if (category === selectedCategory) return;

    // Animate out the previous selected chip
    Animated.timing(chipAnimations[selectedCategory], {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();

    // Animate in the newly selected chip
    Animated.spring(chipAnimations[category], {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    setSelectedCategory(category);
  };

  // Animate cards when filtered markets change
  useEffect(() => {
    const filtered = selectedCategory === 'All'
      ? markets
      : markets.filter(m => m.category === selectedCategory);

    // Reset all card animations to 0
    const animations: Record<string, Animated.Value> = {};
    filtered.forEach((market) => {
      animations[market.id] = new Animated.Value(0);
    });
    setCardAnimations(animations);

    // Animate cards in with stagger
    const animationsArray = filtered.map((market, index) =>
      Animated.timing(animations[market.id], {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      })
    );

    if (animationsArray.length > 0) {
      Animated.parallel(animationsArray).start();
    }
  }, [selectedCategory, markets]);

  const loadMarkets = async () => {
    try {
      setLoading(true);

      // Fetch active polls from the API
      const response = await pollsAPI.getAll({
        status: 'ACTIVE',
        limit: 50
      });

      if (response.data.success) {
        const polls = response.data.data as MyPoll[];
        const transformedMarkets = polls.map(transformPollToMarket);
        setMarkets(transformedMarkets);
        console.log(`Loaded ${transformedMarkets.length} markets from database`);
      }
    } catch (error: any) {
      console.error('Failed to load markets:', error);

      // If error is not authentication related, show empty state
      if (error.response?.status !== 401) {
        console.warn('Could not load markets from API, showing empty state');
        setMarkets([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMarkets();
  };

  const handleNotificationPress = () => {
    if (showNotifications) {
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowNotifications(false));
    } else {
      setShowNotifications(true);
      Animated.spring(notificationAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleNotificationItemPress = (notification: any) => {
    setShowNotifications(false);
    Animated.timing(notificationAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Navigate to relevant screen based on notification type
    console.log('Navigate to notification:', notification);
  };

  // Debounced search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search for 300ms
    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim() === '') {
        setSearchResults([]);
        return;
      }

      // Search in markets (case-insensitive)
      const filtered = markets.filter((market) =>
        market.question.toLowerCase().includes(query.toLowerCase()) ||
        market.category.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(filtered);

      // TODO: Implement API search when backend is ready
      // const searchMarkets = async () => {
      //   try {
      //     const response = await pollsAPI.search(query, selectedCategory);
      //     setSearchResults(response.data);
      //   } catch (error) {
      //     console.error('Search failed:', error);
      //   }
      // };
      // searchMarkets();
    }, 300);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleCloseNotifications = () => {
    if (showNotifications) {
      setShowNotifications(false);
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleProfilePress = () => {
    (navigation as any).navigate('Profile');
  };

  const handleMarketPress = (market: Market) => {
    (navigation as any).navigate('MarketPollDetail', { market });
  };

  const handleSeeAll = () => {
    (navigation as any).navigate('AllPolls');
  };

  const handleExploreFeatured = () => {
    // Use the first available market or a default one
    const featuredMarket = markets.length > 0 ? markets[0] : {
      id: 'featured',
      category: 'POLITICS',
      categoryColor: '#179E66',
      changePercent: '+ 8 %',
      question: "Explore our prediction markets",
      yesPrice: '0.52 SOL',
      noPrice: '0.48 SOL',
      volume: '2.5 SOL',
    };
    (navigation as any).navigate('MarketPollDetail', { market: featuredMarket });
  };

  // Determine which markets to display
  const filteredMarkets = searchQuery.trim() !== ''
    ? searchResults // Show search results when searching
    : selectedCategory === 'All'
    ? markets
    : markets.filter(m => m.category.toUpperCase() === selectedCategory.toUpperCase());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Wrapper with overflow hidden to clip the decorations */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={[ '#0a1913','transparent']}
          style={styles.header}
        >
          {/* Large Plant SVG Decoration */}
          <PlantDecoration />
          <SmallPlantDecoration />

          {/* Navigation */}
          <View style={styles.nav}>
            <View style={styles.navLeft}>
              <Text style={styles.welcomeText}>Welcome back 👋</Text>
              <Text style={styles.userName}>
                {user?.fullName || 'Guest User'}
              </Text>
            </View>
            <View style={styles.navRight}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleNotificationPress}>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={handleProfilePress}>
                <Ionicons name="person" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={handleClearSearch}
          />

          {/* Featured Banner */}
          <FeaturedBanner onExplorePress={handleExploreFeatured} />
        </LinearGradient>
      </View>

      {/* Notifications Dropdown Backdrop - Outside headerWrapper */}
      {showNotifications && (
        <TouchableWithoutFeedback onPress={handleCloseNotifications}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: '#0a1913',
                opacity: notificationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
                zIndex: 998,
              },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Notifications Dropdown - Outside headerWrapper */}
      {showNotifications && (
        <Animated.View
          style={[
            styles.notificationDropdownContainer,
            {
              opacity: notificationAnim,
              transform: [
                {
                  translateY: notificationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}>
          <BlurView intensity={80} tint="dark" style={styles.notificationDropdown}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={styles.notificationItem}
                onPress={() => handleNotificationItemPress(notification)}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="notifications" size={16} color={Colors.status.success} />
                </View>
                <Text style={styles.notificationText} numberOfLines={2}>
                  {notification.message}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.dark.textTertiary} />
              </TouchableOpacity>
            ))}
          </BlurView>
        </Animated.View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Trending Header */}
          <View style={styles.trendingHeader}>
            <Text style={styles.trendingTitle}>Trending Now</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={handleSeeAll}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Category Filters */}
          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category;

                return (
                  <TouchableOpacity
                    key={category}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => handleCategorySelect(category)}>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            scale: chipAnimations[category].interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.05],
                            }),
                          },
                        ],
                      }}>
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextActive,
                        ]}>
                        {category}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Markets List */}
          {loading && markets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading markets...</Text>
            </View>
          ) : filteredMarkets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={64} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyStateTitle}>No Markets Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim() !== ''
                  ? 'No markets match your search. Try different keywords.'
                  : selectedCategory !== 'All'
                  ? `No active markets in ${selectedCategory} category.`
                  : 'No active markets available at the moment.'}
              </Text>
            </View>
          ) : (
            filteredMarkets.map((market) => {
              const cardAnim = cardAnimations[market.id];

              return (
                <Animated.View
                  key={market.id}
                  style={{
                    opacity: cardAnim || 0,
                    marginBottom: 12,
                    transform: [
                      {
                        translateY: cardAnim ? cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }) : 20,
                      },
                      {
                        scale: cardAnim ? cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }) : 0.9,
                      },
                    ],
                  }}>
                  <TouchableOpacity
                    onPress={() => handleMarketPress(market)}
                    activeOpacity={0.9}>
                    <MarketCard {...market} />
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1913',
  },
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.shadows.light.medium.shadowColor,
    shadowOffset: Colors.shadows.light.medium.shadowOffset,
    shadowOpacity: Colors.shadows.light.medium.shadowOpacity * 1.5,
    shadowRadius: Colors.shadows.light.medium.shadowRadius * 1.25,
    elevation: Colors.shadows.light.medium.elevation,
  },
  header: {
    paddingTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  navLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '400',
    color: Colors.dark.text,
    letterSpacing: -0.5,
    fontFamily: 'AbrilFatface_400Regular',
  },
  navRight: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 50,
    height: 50,
    backgroundColor: '#207372', // Custom teal accent
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 50,
    height: 50,
    backgroundColor: '#0a1913',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 100,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  trendingTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: Colors.dark.text,
    fontFamily: 'AbrilFatface_400Regular',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textDecorationLine: 'underline',
  },
  notificationDropdownContainer: {
    position: 'absolute',
    top: 124,
    right: 18,
    borderRadius: 18,
    zIndex: 1000,
    shadowColor: Colors.shadows.light.large.shadowColor,
    shadowOffset: Colors.shadows.light.large.shadowOffset,
    shadowOpacity: Colors.shadows.light.large.shadowOpacity,
    shadowRadius: Colors.shadows.light.large.shadowRadius,
    elevation: Colors.shadows.light.large.elevation,
    borderWidth: 1,
    borderColor: Colors.opacity.dark[20],
  },
  notificationDropdown: {
    width: 300,
    borderRadius: 18,
    padding: 8,
    backgroundColor: 'rgba(23, 158, 102, 0.3)', // Dark green with opacity
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0a1913',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.opacity.dark[10],
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.opacity.dark[20],
    overflow: 'hidden',
  },
  categoryChipActive: {
    backgroundColor: Colors.status.success,
    borderColor: Colors.status.success,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.dark.textTertiary,
    lineHeight: 16,
  },
  categoryChipTextActive: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PollsScreen;