import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import walletReducer from './slices/walletSlice';
import projectsReducer from './slices/projectsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    wallet: walletReducer,
    projects: projectsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 忽略这些 action types 的序列化检查
        ignoredActions: ['wallet/setProvider'],
        // 忽略这些 paths 的序列化检查
        ignoredPaths: ['wallet.provider'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;