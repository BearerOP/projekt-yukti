import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import { mobileWalletAdapter } from '@/src/utils/mobileWalletAdapter';

type Props = {
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
};

export default function WalletConnectButton({ onConnected, onDisconnected }: Props) {
  const wallet = useSelector((state: RootState) => state.wallet);

  const shortAddress = useMemo(() => {
    if (!wallet.address) return '';
    return `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`;
  }, [wallet.address]);

  const handleConnect = useCallback(async () => {
    try {
      console.log('🔌 Initiating wallet connection...');
      const result = await mobileWalletAdapter.connect();
      console.log('✅ Wallet connected:', result.address);

      // Call the callback if provided
      onConnected?.(result.address);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to connect wallet';
      console.error('❌ Connection failed:', message);
      Alert.alert('Wallet Connection Failed', message);
    }
  }, [onConnected]);

  const handleDisconnect = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      await mobileWalletAdapter.disconnect();
      console.log('✅ Wallet disconnected');

      // Call the callback if provided
      onDisconnected?.();
    } catch (e) {
      console.error('❌ Disconnect failed:', e);
      // Still call the callback even if disconnect fails
      onDisconnected?.();
    }
  }, [onDisconnected]);

  if (wallet.connected && wallet.address) {
    return (
      <View style={styles.row}>
        <View style={styles.badge}>
          <Icon name="wallet" size={16} color="#179E66" />
          <Text style={styles.badgeText}>{shortAddress}</Text>
        </View>
        <TouchableOpacity
          style={styles.disconnect}
          onPress={handleDisconnect}
          disabled={wallet.isConnecting}
          activeOpacity={0.8}>
          {wallet.isConnecting ? (
            <ActivityIndicator color="#179E66" size="small" />
          ) : (
            <Text style={styles.disconnectText}>Disconnect</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.connectButton, wallet.isConnecting && styles.connectingButton]}
      onPress={handleConnect}
      disabled={wallet.isConnecting}
      activeOpacity={0.85}>
      {wallet.isConnecting ? (
        <>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.connectText}>Connecting...</Text>
        </>
      ) : (
        <>
          <Icon name="wallet" size={18} color="#fff" />
          <Text style={styles.connectText}>Connect Phantom</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#179E66',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#179E66',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  connectingButton: {
    opacity: 0.7,
  },
  connectText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  disconnect: {
    borderWidth: 1,
    borderColor: '#179E66',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  disconnectText: {
    color: '#179E66',
    fontSize: 14,
    fontWeight: '700',
  },
});
