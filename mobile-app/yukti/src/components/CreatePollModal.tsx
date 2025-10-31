import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PollCategory, CreatePollRequest } from '../types';
import { pollsAPI } from '../services/api';

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: PollCategory; label: string; icon: string }[] = [
  { value: 'SPORTS', label: 'Sports', icon: 'soccer' },
  { value: 'POLITICS', label: 'Politics', icon: 'bank' },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: 'movie' },
  { value: 'TECHNOLOGY', label: 'Technology', icon: 'laptop' },
  { value: 'BUSINESS', label: 'Business', icon: 'briefcase' },
  { value: 'CRYPTO', label: 'Crypto', icon: 'bitcoin' },
  { value: 'OTHER', label: 'Other', icon: 'dots-horizontal' },
];

export default function CreatePollModal({ visible, onClose, onSuccess }: CreatePollModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PollCategory>('SPORTS');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDays, setTempDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string; endDate?: string }>({});

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('SPORTS');
      setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setTempDays(7);
      setErrors({});

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (title.length > 200) {
      newErrors.title = 'Title must not exceed 200 characters';
    }

    if (description && description.length > 1000) {
      newErrors.description = 'Description must not exceed 1000 characters';
    }

    if (endDate <= new Date()) {
      newErrors.endDate = 'End date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const pollData: CreatePollRequest = {
        title,
        description: description || undefined,
        category,
        endDate: endDate.toISOString(),
      };

      const response = await pollsAPI.create(pollData);

      if (response.data.success) {
        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Alert.alert('Success', 'Poll created successfully!', [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                onClose();
              },
            },
          ]);
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create poll. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePickerConfirm = () => {
    const newDate = new Date(Date.now() + tempDays * 24 * 60 * 60 * 1000);
    setEndDate(newDate);
    setShowDatePickerModal(false);
  };

  const handleDaysChange = (text: string) => {
    const days = parseInt(text) || 1;
    setTempDays(Math.max(1, Math.min(days, 365))); // Between 1 and 365 days
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}>
          <Animated.View
            style={[
              styles.backdropAnimated,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}>
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create New Poll</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Poll Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Will Bitcoin reach $100k by end of 2024?"
                  placeholderTextColor="#666"
                  multiline
                  maxLength={200}
                />
                <View style={styles.inputFooter}>
                  {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                  <Text style={styles.charCount}>{title.length}/200</Text>
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add more details about this poll..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                />
                <View style={styles.inputFooter}>
                  {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                  <Text style={styles.charCount}>{description.length}/1000</Text>
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Category <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryItem,
                        category === cat.value && styles.categoryItemActive,
                      ]}
                      onPress={() => setCategory(cat.value)}
                      activeOpacity={0.7}>
                      <Icon
                        name={cat.icon}
                        size={20}
                        color={category === cat.value ? '#179E66' : '#999'}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          category === cat.value && styles.categoryTextActive,
                        ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* End Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  End Date <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dateButton, errors.endDate && styles.inputError]}
                  onPress={() => setShowDatePickerModal(true)}
                  activeOpacity={0.7}>
                  <Icon name="calendar" size={20} color="#179E66" />
                  <Text style={styles.dateButtonText}>
                    {endDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
                {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}>
                {loading ? (
                  <Text style={styles.submitButtonText}>Creating...</Text>
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Create Poll</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Icon name="information" size={16} color="#2196F3" />
                <Text style={styles.infoText}>
                  Your poll will automatically create "Yes" and "No" options for users to trade on.
                </Text>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}>
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.datePickerTitle}>Set Poll End Date</Text>
            <Text style={styles.datePickerLabel}>Days from now:</Text>

            <View style={styles.daysInputContainer}>
              <TouchableOpacity
                style={styles.dayButton}
                onPress={() => setTempDays(Math.max(1, tempDays - 1))}>
                <Icon name="minus" size={24} color="#179E66" />
              </TouchableOpacity>

              <TextInput
                style={styles.daysInput}
                value={tempDays.toString()}
                onChangeText={handleDaysChange}
                keyboardType="number-pad"
                maxLength={3}
              />

              <TouchableOpacity
                style={styles.dayButton}
                onPress={() => setTempDays(Math.min(365, tempDays + 1))}>
                <Icon name="plus" size={24} color="#179E66" />
              </TouchableOpacity>
            </View>

            <Text style={styles.datePreview}>
              Poll will end on: {new Date(Date.now() + tempDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <View style={styles.quickDateButtons}>
              <TouchableOpacity style={styles.quickButton} onPress={() => setTempDays(1)}>
                <Text style={styles.quickButtonText}>1 Day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickButton} onPress={() => setTempDays(7)}>
                <Text style={styles.quickButtonText}>1 Week</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickButton} onPress={() => setTempDays(30)}>
                <Text style={styles.quickButtonText}>1 Month</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.datePickerButtonCancel]}
                onPress={() => setShowDatePickerModal(false)}>
                <Text style={styles.datePickerButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.datePickerButtonConfirm]}
                onPress={handleDatePickerConfirm}>
                <Text style={styles.datePickerButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropAnimated: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    minHeight: 50,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#F44336',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  categoryItemActive: {
    backgroundColor: '#179E6620',
    borderColor: '#179E66',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  categoryTextActive: {
    color: '#179E66',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#179E66',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#2196F310',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#2196F3',
    flex: 1,
    lineHeight: 18,
  },
  // Date Picker Modal Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    textAlign: 'center',
  },
  daysInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  dayButton: {
    width: 50,
    height: 50,
    backgroundColor: '#0F0F0F',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  daysInput: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#179E66',
    minWidth: 100,
  },
  datePreview: {
    fontSize: 14,
    color: '#179E66',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  quickButtonText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerButtonCancel: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  datePickerButtonConfirm: {
    backgroundColor: '#179E66',
  },
  datePickerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  datePickerButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
});
