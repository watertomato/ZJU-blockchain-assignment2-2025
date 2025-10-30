import { ethers } from 'ethers';
import { UserRole } from '../types';

// 网络配置
const REQUIRED_CHAIN_ID = process.env.REACT_APP_CHAIN_ID || '31337';
const RPC_URL = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';

// 检查并切换到正确的网络
export const checkAndSwitchNetwork = async (): Promise<void> => {
  if (!window.ethereum) {
    throw new Error('请安装 MetaMask 钱包');
  }

  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const requiredChainIdHex = `0x${parseInt(REQUIRED_CHAIN_ID).toString(16)}`;

    console.log('🌐 当前网络链ID:', currentChainId);
    console.log('🎯 需要的链ID:', requiredChainIdHex);

    if (currentChainId !== requiredChainIdHex) {
      console.log('🔄 尝试切换到本地网络...');
      
      try {
        // 尝试切换到本地网络
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: requiredChainIdHex }],
        });
        console.log('✅ 网络切换成功');
      } catch (switchError: any) {
        // 如果网络不存在，尝试添加网络
        if (switchError.code === 4902) {
          console.log('📡 添加本地网络配置...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: requiredChainIdHex,
                chainName: 'Hardhat Local Network',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: null,
              },
            ],
          });
          console.log('✅ 本地网络添加成功');
        } else {
          throw switchError;
        }
      }
    } else {
      console.log('✅ 已连接到正确的网络');
    }
  } catch (error: any) {
    console.error('❌ 网络切换失败:', error);
    throw new Error(`网络切换失败: ${error.message}`);
  }
};

// MetaMask 连接
export const connectWallet = async (): Promise<{
  address: string;
  provider: ethers.providers.Web3Provider;
}> => {
  if (!window.ethereum) {
    throw new Error('请安装 MetaMask 钱包');
  }

  try {
    // 首先检查并切换网络
    await checkAndSwitchNetwork();
    
    // 请求连接钱包
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    return { address, provider };
  } catch (error: any) {
    throw new Error(`钱包连接失败: ${error.message}`);
  }
};

// 检测用户角色 (基于NFT权限)
export const detectUserRole = async (
  address: string,
  provider: ethers.providers.Web3Provider
): Promise<UserRole> => {
  try {
    // NotaryNFT 合约地址 (需要部署后更新)
    const NOTARY_NFT_ADDRESS = process.env.REACT_APP_NOTARY_NFT_ADDRESS || '';
    
    if (!NOTARY_NFT_ADDRESS) {
      console.warn('NotaryNFT 合约地址未配置');
      return 'player';
    }

    // NotaryNFT 合约 ABI (简化版)
    const notaryNFTABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function isActive(uint256 tokenId) view returns (bool)'
    ];

    const notaryNFTContract = new ethers.Contract(
      NOTARY_NFT_ADDRESS,
      notaryNFTABI,
      provider
    );

    // 检查用户是否拥有 NotaryNFT
    const balance = await notaryNFTContract.balanceOf(address);
    
    // ethers v5 返回 BigNumber，这里使用 gt(0) 进行比较
    if (balance.gt(0)) {
      // 检查第一个NFT是否激活
      const tokenId = await notaryNFTContract.tokenOfOwnerByIndex(address, 0);
      const isActive = await notaryNFTContract.isActive(tokenId);
      
      if (isActive) {
        // 检查最低ETH余额要求 (0.1 ETH)
        const ethBalance = await provider.getBalance(address);
        const minBalance = ethers.utils.parseEther('0.1');
        
        if (ethBalance.gte(minBalance)) {
          return 'notary';
        }
      }
    }

    return 'player';
  } catch (error) {
    console.error('角色检测失败:', error);
    return 'player'; // 默认为玩家角色
  }
};

// 获取用户ETH余额
export const getETHBalance = async (
  address: string,
  provider: ethers.providers.Web3Provider
): Promise<string> => {
  try {
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('获取余额失败:', error);
    return '0';
  }
};

// 检查用户的NotaryNFT信息
export const getNotaryNFTInfo = async (
  address: string,
  provider: ethers.providers.Web3Provider
): Promise<{ hasNFT: boolean; tokenId: string | null }> => {
  try {
    const NOTARY_NFT_ADDRESS = process.env.REACT_APP_NOTARY_NFT_ADDRESS || '';
    
    if (!NOTARY_NFT_ADDRESS) {
      return { hasNFT: false, tokenId: null };
    }

    const notaryNFTABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function isActive(uint256 tokenId) view returns (bool)'
    ];

    const contract = new ethers.Contract(NOTARY_NFT_ADDRESS, notaryNFTABI, provider);
    const balance = await contract.balanceOf(address);
    
    // ethers v5 返回 BigNumber，这里使用 gt(0) 进行比较
    if (balance.gt(0)) {
      const tokenId = await contract.tokenOfOwnerByIndex(address, 0);
      const isActive = await contract.isActive(tokenId);
      
      if (isActive) {
        return { hasNFT: true, tokenId: tokenId.toString() };
      }
    }

    return { hasNFT: false, tokenId: null };
  } catch (error) {
    console.error('获取NotaryNFT信息失败:', error);
    return { hasNFT: false, tokenId: null };
  }
};

// 监听钱包账户变化
export const setupWalletListeners = (
  onAccountChange: (accounts: string[]) => void,
  onChainChange: (chainId: string) => void
) => {
  if (!window.ethereum) return;

  window.ethereum.on('accountsChanged', onAccountChange);
  window.ethereum.on('chainChanged', onChainChange);

  // 返回清理函数
  return () => {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', onAccountChange);
      window.ethereum.removeListener('chainChanged', onChainChange);
    }
  };
};

// 扩展 Window 接口以包含 ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}