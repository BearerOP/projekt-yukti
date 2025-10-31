import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Category {
  id: string;
  label: string;
  emoji: string;
}

const categories: Category[] = [
  { id: 'trending', label: 'Trending', emoji: '🔥' },
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'sports', label: 'Sports', emoji: '⚽️' },
];

const CategoryFilter: React.FC = () => {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['trending']));

  const toggleCategory = (id: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCategories(newSelection);
  };

  return (
    <View style={styles.container}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.button,
            selectedCategories.has(category.id) && styles.buttonActive,
          ]}
          onPress={() => toggleCategory(category.id)}
        >
          <Text
            style={[
              styles.label,
              selectedCategories.has(category.id) && styles.labelActive,
            ]}
          >
            {category.emoji} {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(7, 38, 28, 0.57)',
    minWidth: 120,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#0f523c',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  labelActive: {
    color: '#fff',
  },
});

export default CategoryFilter;

