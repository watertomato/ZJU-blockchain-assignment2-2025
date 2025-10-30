import React, { useEffect, useState } from 'react';
import { Button, Card, message, Spin, Typography, Space, Divider } from 'antd';
import { WalletOutlined, UserOutlined, SafetyOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { connectWallet, detectUserRole, getETHBalance, getNotaryNFTInfo, setupWalletListeners } from '../utils/wallet';
import { setConnecting, setError, clearError } from '../store/slices/walletSlice';
import { setUserAddress, setUserRole, setUserBalance, setNotaryNFT, disconnectUser } from '../store/slices/userSlice';
import type { RootState } from '../store';

const { Title, Text, Paragraph } = Typography;

const WalletConnection: React.FC = () => {
  const dispatch = useDispatch();
  const { isConnecting, error } = useSelector((state: RootState) => state.wallet);
  const { address, role, balance, isConnected, notaryNFT } = useSelector((state: RootState) => state.user);
  const [isDetecting, setIsDetecting] = useState(false);

  // 连接钱包并检测身份
  const handleConnect = async () => {
    try {
      dispatch(setConnecting(true));
      dispatch(clearError());

      const { address: walletAddress, provider } = await connectWallet();
      dispatch(setUserAddress(walletAddress));

      // 检测用户角色
      setIsDetecting(true);
      const userRole = await detectUserRole(walletAddress, provider);
      dispatch(setUserRole(userRole));

      // 获取余额
      const ethBalance = await getETHBalance(walletAddress, provider);
      dispatch(setUserBalance(ethBalance));

      // 获取NotaryNFT信息
      const nftInfo = await getNotaryNFTInfo(walletAddress, provider);
      dispatch(setNotaryNFT(nftInfo));

      message.success(`连接成功！身份识别为: ${userRole === 'notary' ? '公证人' : '竞猜玩家'}`);
    } catch (err: any) {
      const errorMsg = err.message || '连接失败';
      dispatch(setError(errorMsg));
      message.error(errorMsg);
    } finally {
      dispatch(setConnecting(false));
      setIsDetecting(false);
    }
  };

  // 刷新用户状态
  const handleRefreshStatus = async () => {
    if (!address || !window.ethereum) return;

    try {
      setIsDetecting(true);
      const ethersModule = await import('ethers');
      const provider = new ethersModule.providers.Web3Provider(window.ethereum);
      
      const userRole = await detectUserRole(address, provider);
      dispatch(setUserRole(userRole));

      const ethBalance = await getETHBalance(address, provider);
      dispatch(setUserBalance(ethBalance));

      const nftInfo = await getNotaryNFTInfo(address, provider);
      dispatch(setNotaryNFT(nftInfo));

      message.success('状态已刷新');
    } catch (err: any) {
      message.error('刷新失败: ' + err.message);
    } finally {
      setIsDetecting(false);
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    dispatch(disconnectUser());
    message.info('已断开钱包连接');
  };

  // 设置钱包监听器
  useEffect(() => {
    const cleanup = setupWalletListeners(
      (accounts: string[]) => {
        if (accounts.length === 0) {
          dispatch(disconnectUser());
          message.warning('钱包已断开连接');
        } else if (accounts[0] !== address) {
          // 账户切换，重新检测身份
          handleConnect();
        }
      },
      (chainId: string) => {
        message.info(`网络已切换到: ${chainId}`);
      }
    );

    return cleanup;
  }, [address, dispatch]);

  // 未连接状态 - 智能登录页面
  if (!isConnected) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card 
          style={{ 
            width: 480, 
            textAlign: 'center',
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <WalletOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 16 }} />
              <Title level={2} style={{ margin: 0 }}>欢迎使用 EasyBet</Title>
              <Text type="secondary">去中心化竞猜平台</Text>
            </div>

            <Divider />

            <div>
              <Paragraph>
                请连接您的钱包，系统将自动识别您的身份：
              </Paragraph>
              <Space direction="vertical" size="small">
                <div>
                  <SafetyOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  <Text>拥有公证人NFT → 公证人身份</Text>
                </div>
                <div>
                  <UserOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                  <Text>普通地址 → 竞猜玩家身份</Text>
                </div>
              </Space>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<WalletOutlined />}
              loading={isConnecting || isDetecting}
              onClick={handleConnect}
              style={{ width: '100%', height: 48 }}
            >
              {isConnecting ? '连接中...' : isDetecting ? '身份识别中...' : '连接钱包'}
            </Button>

            {error && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {error}
              </Text>
            )}
          </Space>
        </Card>
      </div>
    );
  }

  // 已连接状态 - 用户状态面板
  return (
    <Card 
      title="用户状态" 
      extra={
        <Space>
          <Button 
            size="small" 
            loading={isDetecting}
            onClick={handleRefreshStatus}
          >
            刷新状态
          </Button>
          <Button 
            size="small" 
            danger 
            onClick={handleDisconnect}
          >
            断开连接
          </Button>
        </Space>
      }
      style={{ margin: 16 }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div>
          <Text strong>钱包地址: </Text>
          <Text code>{address?.slice(0, 6)}...{address?.slice(-4)}</Text>
        </div>
        <div>
          <Text strong>身份: </Text>
          {role === 'notary' ? (
            <Text style={{ color: '#52c41a' }}>⚖️ 公证人</Text>
          ) : (
            <Text style={{ color: '#1890ff' }}>🎯 竞猜玩家</Text>
          )}
        </div>
        <div>
          <Text strong>ETH余额: </Text>
          <Text>{parseFloat(balance).toFixed(4)} ETH</Text>
        </div>
        {notaryNFT.hasNFT && (
          <div>
            <Text strong>NFT权限: </Text>
            <Text style={{ color: '#52c41a' }}>
              ✅ 公证人证书 #{notaryNFT.tokenId}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default WalletConnection;