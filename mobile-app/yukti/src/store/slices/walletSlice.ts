import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PublicKey } from '@solana/web3.js';

interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: PublicKey | null;
  balance: number;
  solBalance: number;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  authToken: string | null;
}

const initialState: WalletState = {
  connected: false,
  address: null,
  publicKey: null,
  balance: 0,
  solBalance: 0,
  isLoading: false,
  isConnecting: false,
  error: null,
  authToken: null,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setConnected: (state, action: PayloadAction<{ address: string; authToken?: string }>) => {
      state.connected = true;
      state.address = action.payload.address;
      state.authToken = action.payload.authToken || null;
      state.isConnecting = false;
      state.error = null;
    },
    setDisconnected: (state) => {
      state.connected = false;
      state.address = null;
      state.publicKey = null;
      state.balance = 0;
      state.solBalance = 0;
      state.authToken = null;
      state.error = null;
    },
    setBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
    },
    setSolBalance: (state, action: PayloadAction<number>) => {
      state.solBalance = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isConnecting = false;
    },
  },
});

export const {
  setConnecting,
  setConnected,
  setDisconnected,
  setBalance,
  setSolBalance,
  setLoading,
  setError
} = walletSlice.actions;

export default walletSlice.reducer;