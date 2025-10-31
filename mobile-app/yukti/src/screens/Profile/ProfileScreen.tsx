// src/screens/Profile/ProfileScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Animated,
  Clipboard,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '@/src/store/slices/authSlice';
import { RootState, AppDispatch } from '@/src/store/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const copyAnim = useRef(new Animated.Value(1)).current;

  const toggleDropdown = () => {
    if (dropdownVisible) {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDropdownVisible(false));
    } else {
      setDropdownVisible(true);
      Animated.spring(dropdownAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const copyUserId = () => {
    if (user?.id) {
      Clipboard.setString(user.id);
      
      // Ease-in-out animation for copy feedback
      Animated.sequence([
        Animated.timing(copyAnim, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(copyAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      Alert.alert('Copied', 'User ID copied to clipboard');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logoutUser()),
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.fullName)}</Text>
            </View>
            <View
              style={[
                styles.kycBadge,
                user.kycStatus === 'verified' && styles.kycVerified,
              ]}>
              <Icon
                name={user.kycStatus === 'verified' ? 'check-circle' : 'clock-outline'}
                size={12}
                color="#fff"
              />
            </View>
          </View>

          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          {/* User ID with Copy */}
            <TouchableOpacity
              style={styles.userIdContainer}
              onPress={copyUserId}
              activeOpacity={0.7}>
              <Text style={styles.userId}>{user.id.slice(0, 12)}...</Text>
          <Animated.View style={{ transform: [{ scale: copyAnim }] }}>
              <Icon name="content-copy" size={16} color="#179E66" />
          </Animated.View>
            </TouchableOpacity>
        </View>

        {/* Wallet Balance */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Icon name="wallet" size={20} color="#179E66" />
          </View>
          <Text style={styles.balanceAmount}>
            {(parseFloat((user as any).walletBalance || '0') / 10000).toFixed(4)} SOL
          </Text>
          <TouchableOpacity style={styles.manageWalletButton}>
            <Text style={styles.manageWalletText}>Manage Wallet</Text>
            <Icon name="arrow-right" size={16} color="#179E66" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Icon name="chart-line" size={24} color="#179E66" />
            </View>
            <Text style={styles.actionText}>My Bids</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Icon name="history" size={24} color="#179E66" />
            </View>
            <Text style={styles.actionText}>Transaction History</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Icon name="bell-outline" size={24} color="#179E66" />
            </View>
            <Text style={styles.actionText}>Notifications</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Settings Dropdown */}
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsHeader}
            onPress={toggleDropdown}
            activeOpacity={0.7}>
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Icon name="cog-outline" size={24} color="#179E66" />
              </View>
              <Text style={styles.settingsText}>Settings & Privacy</Text>
            </View>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  },
                ],
              }}>
              <Icon name="chevron-down" size={24} color="#666" />
            </Animated.View>
          </TouchableOpacity>

          {dropdownVisible && (
            <Animated.View
              style={[
                styles.dropdownContent,
                {
                  opacity: dropdownAnim,
                  transform: [
                    {
                      translateY: dropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <TouchableOpacity style={styles.dropdownItem}>
                <Icon name="shield-check-outline" size={20} color="#999" />
                <Text style={styles.dropdownText}>KYC Verification</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}>
                <Icon name="lock-outline" size={20} color="#999" />
                <Text style={styles.dropdownText}>Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}>
                <Icon name="bell-cog-outline" size={20} color="#999" />
                <Text style={styles.dropdownText}>Notification Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}>
                <Icon name="file-document-outline" size={20} color="#999" />
                <Text style={styles.dropdownText}>Terms & Conditions</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}>
                <Icon name="information-outline" size={20} color="#999" />
                <Text style={styles.dropdownText}>About</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.8}>
          <Icon name="logout" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1913',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  profileCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#179E66',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  kycBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
  kycVerified: {
    backgroundColor: '#4CAF50',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 16,
    
    paddingVertical: 10,
    borderRadius: 12,
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    fontFamily: 'monospace',
  },
  balanceCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#999',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  manageWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0F0F',
    paddingVertical: 14,
    borderRadius: 12,
  },
  manageWalletText: {
    color: '#179E66',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  actionsContainer: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingsText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  dropdownContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0F0F0F',
    marginBottom: 6,
  },
  dropdownText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 16,
    borderColor: 'rgba(251, 242, 242, 0.60)',
    backgroundColor: 'linear-gradient(90deg,rgb(99, 22, 22) 14.44%,rgb(180, 24, 24) 118.03%)',
    boxShadow: '0 8.7px 13px 0 rgba(255, 255, 255, .2) inset, 0 -8.7px 8.7px 0 rgba(83, 27, 27, 0.5) inset,',
  },
  logoutText: {
    color: '#F44336',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});