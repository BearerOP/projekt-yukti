import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { placeOnchainBid } from "@/src/services/trading";
import socket from "@/src/services/socket";

interface TradingState {
  isPlacing: boolean;
  lastSignature?: string;
  error?: string | null;
}

const initialState: TradingState = {
  isPlacing: false,
  lastSignature: undefined,
  error: null,
};

export const placeBid = createAsyncThunk(
  'trading/placeBid',
  async (
    params: {
      pollId: string;
      optionId: string;
      amountLamports: number;
      bidder: string;
      programId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await placeOnchainBid(params);
      // Emit socket event to update rooms/odds optimistically
      socket.emitBidPlaced({
        pollId: params.pollId,
        optionId: params.optionId,
        amount: params.amountLamports,
      });
      return result.signature;
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Failed to place on-chain bid');
    }
  }
);

export const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(placeBid.pending, (state) => {
      state.isPlacing = true;
      state.lastSignature = undefined;
      state.error = null;
    });
    builder.addCase(placeBid.fulfilled, (state, action) => {
      state.isPlacing = false;
      state.lastSignature = action.payload as string;
    });
    builder.addCase(placeBid.rejected, (state, action) => {
      state.isPlacing = false;
      state.error = (action.payload as string) ?? 'Unknown error';
    });
  },
});

export default tradingSlice.reducer;


