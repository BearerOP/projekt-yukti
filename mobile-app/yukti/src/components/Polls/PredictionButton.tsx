import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface PredictionButtonProps {
  type: 'YES' | 'NO';
  price: string;
}

const PredictionButton: React.FC<PredictionButtonProps> = ({ type, price }) => {
  const [selected, setSelected] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        selected && styles.buttonSelected,
      ]}
      onPress={() => setSelected(!selected)}
    >
      <Text style={styles.type}>{type}</Text>
      <Text style={styles.price}>{price}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: '#091408',
    borderRadius: 18,
    borderWidth: 0.3,
    borderColor: '#555555',
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: '#0f523c',
  },
  type: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PredictionButton;

