import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface FeaturedBannerProps {
  onExplorePress?: () => void;
}

const FeaturedBanner: React.FC<FeaturedBannerProps> = ({ onExplorePress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredText}>⭐ Featured</Text>
      </View>
      <Text style={styles.title}>Bihar Assembly Elections 2025'</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onExplorePress}>
        <Text style={styles.buttonText}>Explore →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 20,
    position: 'relative',
    overflow: 'hidden',
    
  },
  featuredBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 1,
    borderRadius: 18,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    lineHeight: 30,
    fontFamily: 'serif',
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 5,
    height: 35,
    width: 129,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8.7 },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 3,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

export default FeaturedBanner;

