import { createSlice } from "@reduxjs/toolkit";

export const pollsSlice = createSlice({
  name: 'polls',
  initialState: {
    polls: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    setPolls: (state, action) => {
      state.polls = action.payload;
    },
  },
});

export const { setPolls } = pollsSlice.actions;
export default pollsSlice.reducer;