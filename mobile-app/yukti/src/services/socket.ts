// src/services/socket.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = __DEV__
  ? 'http://192.168.1.12:8000'  // Development - use your local IP
  // ? 'http://172.16.19.135:8000'  // Alternative local IP
  // ? 'http://10.0.2.2:8000'  // Android emulator
  : 'https://yukti-api.bearerop.live';  // Production

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect() {
    try {
      const token = await AsyncStorage.getItem('authToken');

      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'], // Allow fallback to polling
        auth: { token },
        reconnection: true, // Enable reconnection for better reliability
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 8000,
        forceNew: true,
      });

      this.setupEventListeners();
      
      console.log('Socket connection initiated');
    } catch (error) {
      console.log('Socket connection failed - backend server not available');
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket connection failed - backend server not available');
      this.disconnect();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected manually');
    }
  }

  // Poll-specific methods
  joinPollRoom(pollId: string) {
    if (this.socket) {
      this.socket.emit('join_poll', pollId);
      console.log(`Joined poll room: ${pollId}`);
    }
  }

  leavePollRoom(pollId: string) {
    if (this.socket) {
      this.socket.emit('leave_poll', pollId);
      console.log(`Left poll room: ${pollId}`);
    }
  }

  onOddsUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('odds_update', callback);
    }
  }

  offOddsUpdate() {
    if (this.socket) {
      this.socket.off('odds_update');
    }
  }

  onPollUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('poll_update', callback);
    }
  }

  offPollUpdate() {
    if (this.socket) {
      this.socket.off('poll_update');
    }
  }

  onNotification(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  offNotification() {
    if (this.socket) {
      this.socket.off('notification');
    }
  }

  // Emit bid placement (if needed)
  emitBidPlaced(data: { pollId: string; optionId: string; amount: number }) {
    if (this.socket) {
      this.socket.emit('bid_placed', data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Method to manually reconnect when backend is available
  async reconnect() {
    if (this.socket?.connected) {
      return;
    }
    await this.connect();
  }
}

export default new SocketService();