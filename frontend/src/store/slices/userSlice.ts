import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserState, UserRole } from '../../types';

const initialState: UserState = {
  address: null,
  role: 'unknown',
  balance: '0',
  isConnected: false,
  notaryNFT: {
    hasNFT: false,
    tokenId: null,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
      state.isConnected = true;
    },
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      state.role = action.payload;
    },
    setUserBalance: (state, action: PayloadAction<string>) => {
      state.balance = action.payload;
    },
    setNotaryNFT: (state, action: PayloadAction<{ hasNFT: boolean; tokenId: string | null }>) => {
      state.notaryNFT = action.payload;
    },
    updateUserState: (state, action: PayloadAction<Partial<UserState>>) => {
      return { ...state, ...action.payload };
    },
    disconnectUser: (state) => {
      state.address = null;
      state.role = 'unknown';
      state.balance = '0';
      state.isConnected = false;
      state.notaryNFT = {
        hasNFT: false,
        tokenId: null,
      };
    },
  },
});

export const {
  setUserAddress,
  setUserRole,
  setUserBalance,
  setNotaryNFT,
  updateUserState,
  disconnectUser,
} = userSlice.actions;

export default userSlice.reducer;