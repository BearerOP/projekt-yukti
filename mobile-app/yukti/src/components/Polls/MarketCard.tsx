import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PredictionButton from './PredictionButton';

interface MarketCardProps {
  category: string;
  categoryColor: string;
  changePercent: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  volume: string;
}

export const MarketCard: React.FC<MarketCardProps> = ({
  category,
  categoryColor,
  changePercent,
  question,
  yesPrice,
  noPrice,
  volume,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.category, { color: categoryColor }]}>
          {category}
        </Text>
        <View style={styles.changeBadge}>
          <Text style={styles.changeText}>📈 {changePercent}</Text>
        </View>
      </View>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.buttonRow}>
        <PredictionButton type="YES" price={yesPrice} />
        <View style={{ width: 10 }} />
        <PredictionButton type="NO" price={noPrice} />
      </View>
      <Text style={styles.volume}>💵 {volume}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(18, 80, 60, 0.39)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 0.25,
    borderColor: 'rgba(159, 159, 159, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 3,
    marginVertical: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
  },
  changeBadge: {
    backgroundColor: 'rgba(233, 237, 166, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffeb56',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginVertical: 9,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  volume: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b0b0b0',
    marginTop: 4,
  },
});

export default MarketCard;

