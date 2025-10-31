import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  poll: {
    id: string;
    title: string;
    options: Array<{ id: string; text: string; odds: number }>;
  };
  selectedOption: 'yes' | 'no' | null;
  userWallet: string | null;
  onSubmitBid: (amount: number, optionId: string) => Promise<void>;
}

const BidModal: React.FC<BidModalProps> = ({
  visible,
  onClose,
  poll,
  selectedOption,
  userWallet,
  onSubmitBid,
}) => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick amount buttons (in SOL)
  const quickAmounts = [0.01, 0.05, 0.1, 0.5];

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleSubmit = async () => {
    // Check if wallet is connected
    if (!userWallet) {
      Alert.alert(
        'Wallet Not Connected',
        'Please connect your wallet before placing a bid',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Connect Wallet',
            onPress: () => {
              onClose();
              // Navigate to the Wallet tab inside MainTabs
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'MainTabs',
                  params: {
                    screen: 'Wallet',
                  },
                })
              );
            },
          },
        ]
      );
      return;
    }

    // Validate amount
    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid amount');
      return;
    }

    if (bidAmount < 0.01) {
      Alert.alert('Minimum Bid', 'Minimum bid amount is 0.01 SOL');
      return;
    }

    if (bidAmount > 100) {
      Alert.alert('Maximum Bid', 'Maximum bid amount is 100 SOL');
      return;
    }

    // Get the selected option ID
    const optionIndex = selectedOption === 'yes' ? 0 : 1;
    const optionId = poll.options[optionIndex]?.id;

    if (!optionId) {
      Alert.alert('Error', 'Invalid option selected');
      return;
    }

    try {
      setLoading(true);
      await onSubmitBid(bidAmount, optionId);

      // Success - close modal and reset
      Alert.alert('Success', 'Your bid has been placed successfully!');
      setAmount('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  const selectedOptionData = selectedOption
    ? poll.options[selectedOption === 'yes' ? 0 : 1]
    : null;

  const potentialWin = selectedOptionData && amount
    ? (parseFloat(amount) * selectedOptionData.odds).toFixed(2)
    : '0';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Place Your Bid</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Poll Info */}
          <View style={styles.pollInfo}>
            <Text style={styles.pollTitle}>{poll.title}</Text>
            <View style={styles.optionBadge}>
              <View
                style={[
                  styles.optionDot,
                  { backgroundColor: selectedOption === 'yes' ? '#30C285' : '#FF6B6B' },
                ]}
              />
              <Text style={styles.optionText}>
                {selectedOption === 'yes' ? 'YES' : 'NO'} - {selectedOptionData?.odds}x odds
              </Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bid Amount</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currency}>SOL</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  amount === value.toString() && styles.quickAmountButtonActive,
                ]}
                onPress={() => handleQuickAmount(value)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === value.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  {value} SOL
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Potential Win */}
          {amount && selectedOptionData && (
            <View style={styles.potentialWinContainer}>
              <Text style={styles.potentialWinLabel}>Potential Win</Text>
              <Text style={styles.potentialWinAmount}>{potentialWin} SOL</Text>
            </View>
          )}

          {/* Wallet Status */}
          {!userWallet && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Wallet not connected. You'll be prompted to connect.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!amount || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!amount || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {userWallet ? 'Place Bid' : 'Connect & Place Bid'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Info */}
          <Text style={styles.infoText}>
            Platform fee: 2% on winnings. Minimum bid: 0.01 SOL
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'AbrilFatface_400Regular',
  },
  pollInfo: {
    marginBottom: 24,
  },
  pollTitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
    lineHeight: 22,
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    padding: 0,
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
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  quickAmountButtonActive: {
    backgroundColor: '#179E66',
    borderColor: '#179E66',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quickAmountTextActive: {
    color: '#fff',
  },
  potentialWinContainer: {
    backgroundColor: '#0a1913',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  potentialWinLabel: {
    fontSize: 14,
    color: '#666',
  },
  potentialWinAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#30C285',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: '#179E66',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default BidModal;
