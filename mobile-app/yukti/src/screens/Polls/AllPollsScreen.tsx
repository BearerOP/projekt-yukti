import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MarketCard from '../../components/Polls/MarketCard';
import { pollsAPI } from '../../services/api';
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
  volumeNumber?: number;
  timestamp?: number;
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
    volumeNumber: Number(poll.totalVolume),
    timestamp: new Date(poll.createdAt).getTime(),
  };
};

const categories = ['All', 'CRYPTO', 'STOCKS', 'POLITICS', 'SPORTS', 'ENTERTAINMENT', 'TECHNOLOGY', 'BUSINESS'];

const AllPollsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'volume'>('trending');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuAnim = useRef(new Animated.Value(0)).current;
  const [cardAnimations, setCardAnimations] = useState<Record<string, Animated.Value>>({});

  // Initialize animations for each category chip
  const [chipAnimations] = useState(() =>
    categories.reduce((acc, cat) => {
      acc[cat] = new Animated.Value(cat === 'All' ? 1 : 0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  // Load markets from API
  const loadMarkets = async () => {
    try {
      setLoading(true);
      const response = await pollsAPI.getAll({
        status: 'ACTIVE',
        limit: 100
      });

      if (response.data.success) {
        const polls = response.data.data as MyPoll[];
        const transformedMarkets = polls.map(transformPollToMarket);
        setMarkets(transformedMarkets);
      }
    } catch (error: any) {
      console.error('Failed to load markets:', error);
      if (error.response?.status !== 401) {
        setMarkets([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadMarkets();
  };

  // Remove mock markets array - now using real data
  /* const mockMarkets: Market[] = [
    {
      id: '1',
      category: 'Crypto',
      categoryColor: '#30c285',
      changePercent: '+- 12 %',
      question: 'Will Bitcoin reach $150k by end of 2025?',
      yesPrice: '0.42 SOL',
      noPrice: '0.58 SOL',
      volume: '0.89 SOL',
      volumeNumber: 89000,
      timestamp: Date.now() - 1000 * 60 * 30,
    },
    {
      id: '2',
      category: 'Stocks',
      categoryColor: '#30c285',
      changePercent: '+ 12 %',
      question: 'Tesla stock above $400 this quarter?',
      yesPrice: '0.22 SOL',
      noPrice: '0.68 SOL',
      volume: '2.19 SOL',
      volumeNumber: 219000,
      timestamp: Date.now() - 1000 * 60 * 60,
    },
    {
      id: '3',
      category: 'Politics',
      categoryColor: '#FF6B6B',
      changePercent: '+ 5 %',
      question: 'Will BJP win 2025 elections?',
      yesPrice: '0.65 SOL',
      noPrice: '0.35 SOL',
      volume: '1.2 SOL',
      volumeNumber: 1200000,
      timestamp: Date.now() - 1000 * 60 * 15,
    },
    {
      id: '4',
      category: 'Sports',
      categoryColor: '#4ECDC4',
      changePercent: '- 8 %',
      question: 'Will India win Cricket World Cup 2025?',
      yesPrice: '0.45 SOL',
      noPrice: '0.55 SOL',
      volume: '0.89 SOL',
      volumeNumber: 890000,
      timestamp: Date.now() - 1000 * 60 * 45,
    },
    {
      id: '5',
      category: 'Entertainment',
      categoryColor: '#FFA07A',
      changePercent: '+ 15 %',
      question: 'Will Dune 3 be released in 2025?',
      yesPrice: '0.38 SOL',
      noPrice: '0.62 SOL',
      volume: '0.45 SOL',
      volumeNumber: 450000,
      timestamp: Date.now() - 1000 * 60 * 20,
    },
  ]; */

  const handleBack = () => {
    navigation.goBack();
  };

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
      : markets.filter(m => m.category.toUpperCase() === selectedCategory.toUpperCase());

    // Reset all card animations to 0
    const animations: Record<string, Animated.Value> = {};
    filtered.forEach((market, index) => {
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

    Animated.parallel(animationsArray).start();
  }, [selectedCategory, markets]);

  const handleSortPress = () => {
    if (showSortMenu) {
      Animated.timing(sortMenuAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowSortMenu(false));
    } else {
      setShowSortMenu(true);
      Animated.spring(sortMenuAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSortSelect = (sort: 'trending' | 'recent' | 'volume') => {
    setSortBy(sort);
    Animated.timing(sortMenuAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowSortMenu(false));
  };

  const filteredMarkets = selectedCategory === 'All'
    ? markets
    : markets.filter(m => m.category.toUpperCase() === selectedCategory.toUpperCase());
  
  const handleMarketPress = (market: Market) => {
    (navigation as any).navigate('MarketPollDetail', { market });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Polls</Text>
        <TouchableOpacity onPress={handleSortPress} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sort Menu */}
      {showSortMenu && (
        <Animated.View
          style={[
            styles.sortMenu,
            {
              opacity: sortMenuAnim,
              transform: [
                {
                  translateY: sortMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}>
          <TouchableOpacity
            style={styles.sortMenuItem}
            onPress={() => handleSortSelect('trending')}>
            <Text style={[styles.sortMenuText, sortBy === 'trending' && styles.sortMenuTextActive]}>
              Trending
            </Text>
            {sortBy === 'trending' && <Ionicons name="checkmark" size={20} color="#179E66" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortMenuItem}
            onPress={() => handleSortSelect('recent')}>
            <Text style={[styles.sortMenuText, sortBy === 'recent' && styles.sortMenuTextActive]}>
              Recent
            </Text>
            {sortBy === 'recent' && <Ionicons name="checkmark" size={20} color="#179E66" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortMenuItem}
            onPress={() => handleSortSelect('volume')}>
            <Text style={[styles.sortMenuText, sortBy === 'volume' && styles.sortMenuTextActive]}>
              Volume
            </Text>
            {sortBy === 'volume' && <Ionicons name="checkmark" size={20} color="#179E66" />}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}>
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

      {/* Markets List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#179E66" />
        }
      >
        <View style={styles.content}>
          {filteredMarkets.map((market) => {
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
          })}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingTop: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    fontFamily: 'AbrilFatface_400Regular',
    letterSpacing: 0.5,
  },
  sortButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortMenu: {
    position: 'absolute',
    top: 52,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 140,
  },
  sortMenuText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  sortMenuTextActive: {
    color: '#179E66',
  },
  categoriesScroll: {
    maxHeight: 50,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  categoryChipActive: {
    backgroundColor: '#179E66',
    borderColor: '#179E66',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a0a0a0',
    lineHeight: 16,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
});

export default AllPollsScreen;