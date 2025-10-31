import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { message } from 'antd';
import { 
  connectWallet, 
  detectUserRole, 
  getETHBalance, 
  getNotaryNFTInfo, 
  setupWalletListeners 
} from '../utils/wallet';
import { setConnecting, setError, clearError } from '../store/slices/walletSlice';
import { 
  setUserAddress, 
  setUserRole, 
  setUserBalance, 
  setNotaryNFT, 
  disconnectUser,
  updateUserState 
} from '../store/slices/userSlice';
import type { RootState } from '../store';

export const useWallet = () => {
  const dispatch = useDispatch();
  const walletState = useSelector((state: RootState) => state.wallet);
  const userState = useSelector((state: RootState) => state.user);

  // 连接钱包
  const connect = useCallback(async () => {
    try {
      dispatch(setConnecting(true));
      dispatch(clearError());

      const { address, provider } = await connectWallet();
      dispatch(setUserAddress(address));

      // 检测用户角色和获取相关信息
      const [userRole, ethBalance, nftInfo] = await Promise.all([
        detectUserRole(address, provider),
        getETHBalance(address, provider),
        getNotaryNFTInfo(address, provider)
      ]);

      dispatch(updateUserState({
        role: userRole,
        balance: ethBalance,
        notaryNFT: nftInfo
      }));

      return { address, role: userRole };
    } catch (error: any) {
      const errorMsg = error.message || '连接失败';
      dispatch(setError(errorMsg));
      throw error;
    } finally {
      dispatch(setConnecting(false));
    }
  }, [dispatch]);

  // 断开连接
  const disconnect = useCallback(() => {
    dispatch(disconnectUser());
    dispatch(clearError());
  }, [dispatch]);

  // 刷新用户状态
  const refreshUserState = useCallback(async () => {
    if (!userState.address || !window.ethereum) {
      throw new Error('钱包未连接');
    }

    try {
      // 动态导入 ethers 以避免 TypeScript 错误
      const ethersModule = await import('ethers');
      const provider = new ethersModule.providers.Web3Provider(window.ethereum);
      
      const [userRole, ethBalance, nftInfo] = await Promise.all([
        detectUserRole(userState.address, provider),
        getETHBalance(userState.address, provider),
        getNotaryNFTInfo(userState.address, provider)
      ]);

      dispatch(updateUserState({
        role: userRole,
        balance: ethBalance,
        notaryNFT: nftInfo
      }));

      return { role: userRole, balance: ethBalance, nftInfo };
    } catch (error: any) {
      const errorMsg = error.message || '刷新失败';
      dispatch(setError(errorMsg));
      throw error;
    }
  }, [userState.address, dispatch]);

  // 设置钱包事件监听
  useEffect(() => {
    if (!userState.isConnected) return;

    const cleanup = setupWalletListeners(
      (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
          message.warning('钱包已断开连接');
        } else if (accounts[0] !== userState.address) {
          // 账户切换，重新连接
          connect().catch(console.error);
        }
      },
      (chainId: string) => {
        message.info(`网络已切换: ${parseInt(chainId, 16)}`);
        // 网络切换后刷新状态
        refreshUserState().catch(console.error);
      }
    );

    return cleanup;
  }, [userState.isConnected, userState.address, connect, disconnect, refreshUserState]);

  // 余额轮询更新
  useEffect(() => {
    if (!userState.isConnected || !userState.address) return;

    const updateBalance = async () => {
      try {
        if (!window.ethereum || !userState.address) return;
        
        const ethersModule = await import('ethers');
        const provider = new ethersModule.providers.Web3Provider(window.ethereum);
        const newBalance = await getETHBalance(userState.address, provider);
        
        // 只有余额发生变化时才更新
        if (newBalance !== userState.balance) {
          dispatch(updateUserState({
            role: userState.role,
            balance: newBalance,
            notaryNFT: userState.notaryNFT
          }));
        }
      } catch (error) {
        // 静默处理错误，避免频繁的错误提示
        console.debug('余额更新失败:', error);
      }
    };

    // 立即执行一次
    updateBalance();

    // 设置定时器，每秒更新一次
    const intervalId = setInterval(updateBalance, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [userState.isConnected, userState.address, userState.balance, userState.role, userState.notaryNFT, dispatch]);

  return {
    // 钱包状态
    isConnecting: walletState.isConnecting,
    error: walletState.error,
    
    // 用户状态
    address: userState.address,
    role: userState.role,
    balance: userState.balance,
    isConnected: userState.isConnected,
    notaryNFT: userState.notaryNFT,
    
    // 方法
    connect,
    disconnect,
    refreshUserState,
    
    // 计算属性
    isNotary: userState.role === 'notary',
    isPlayer: userState.role === 'player',
    hasNotaryNFT: userState.notaryNFT.hasNFT,
    shortAddress: userState.address 
      ? `${userState.address.slice(0, 6)}...${userState.address.slice(-4)}`
      : null,
  };
};