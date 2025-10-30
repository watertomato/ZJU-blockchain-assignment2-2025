import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WalletState } from '../../types';

const initialState: WalletState = {
  isConnecting: false,
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
      if (action.payload) {
        state.error = null; // 开始连接时清除错误
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isConnecting = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setConnecting, setError, clearError } = walletSlice.actions;
export default walletSlice.reducer;