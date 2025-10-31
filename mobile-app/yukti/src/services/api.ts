// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend URL
const API_URL = __DEV__
  ? 'http://192.168.1.12:8000/api/v1'  // Development - use your local IP
  // ? 'http://172.16.19.135:8000/api/v1'  // Alternative local IP
  // ? 'http://10.0.2.2:8000/api/v1'  // Android emulator
  : 'https://yukti-api.bearerop.live/api/v1';  // Production

// For Android emulator, use: http://10.0.2.2:8000/api/v1
// For iOS simulator, use: http://localhost:8000/api/v1
// For physical device, use your computer's IP: http://192.168.x.x:8000/api/v1

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for auth endpoints (login, register, refresh-token)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh-token');

    // If 401 and not already retried and not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { token } = response.data;
        await AsyncStorage.setItem('authToken', token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
        // Navigate to login (implement navigation here)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Methods
export const authAPI = {
  register: (data: {
    email: string;
    phone: string;
    password: string;
    fullName: string;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  verifyOTP: (data: { phone: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  logout: () => api.post('/auth/logout'),
};

export const pollsAPI = {
  getAll: (params?: { category?: string; status?: string; search?: string; limit?: number; offset?: number }) =>
    api.get('/polls', { params }),

  getById: (id: string) => api.get(`/polls/${id}`),

  getTrending: () => api.get('/polls/trending'),

  getMyBids: () => api.get('/polls/my-bids'),

  // Poll creation and management
  create: (data: {
    title: string;
    description?: string;
    category: string;
    endDate: string;
    imageUrl?: string;
  }) => api.post('/polls', data),

  getMyPolls: (params?: { status?: string; category?: string }) =>
    api.get('/polls/my-polls', { params }),

  update: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    endDate?: string;
    imageUrl?: string;
    status?: string;
  }) => api.put(`/polls/${id}`, data),

  delete: (id: string) => api.delete(`/polls/${id}`),
};

export const bidsAPI = {
  place: (data: {
    pollId: string;
    optionId: string;
    amount: number;
  }) => api.post('/bids', data),

  getMyBids: (status?: string) => api.get('/bids/my-bids', { params: { status } }),

  getHistory: () => api.get('/bids/history'),

  getById: (id: string) => api.get(`/bids/${id}`),

  getPollBids: (pollId: string) => api.get(`/bids/poll/${pollId}`),

  getMarketStats: (pollId: string) => api.get(`/bids/market-stats/${pollId}`),
};

export const walletAPI = {
  getBalance: () => api.get('/users/wallet/balance'),

  getWalletHistory: () => api.get('/wallet/history'),

  initiateDeposit: (amount: number) =>
    api.post('/payments/deposit/initiate', { amount }),

  verifyDeposit: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post('/payments/deposit/verify', data),

  withdraw: (amount: number) =>
    api.post('/payments/withdraw', { amount }),

  getTransactions: () => api.get('/payments/transactions'),

  // Solana wallet linking
  getVerificationMessage: () => api.get('/wallet/verification-message'),

  linkWallet: (data: {
    walletAddress: string;
    walletType?: 'PHANTOM' | 'SOLFLARE' | 'BACKPACK' | 'GLOW' | 'OTHER';
    signature?: string;
    message?: string;
  }) => api.post('/wallet/link', data),

  getLinkedWallet: () => api.get('/wallet'),

  unlinkWallet: () => api.delete('/wallet/unlink'),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),

  updateProfile: (data: any) => api.put('/users/profile', data),

  uploadKYC: (data: FormData) =>
    api.post('/users/kyc', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),

  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export default api;