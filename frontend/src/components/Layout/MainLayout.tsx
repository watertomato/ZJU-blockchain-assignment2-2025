import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Badge, Drawer } from 'antd';
import {
  TrophyOutlined,
  ShoppingOutlined,
  UserOutlined,
  MenuOutlined,
  WalletOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { useWallet } from '../../hooks/useWallet';
import WalletConnection from '../WalletConnection';
import './MainLayout.css';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
  selectedKey?: string;
  onMenuSelect?: (key: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  selectedKey = 'projects',
  onMenuSelect 
}) => {
  const { isConnected, role, shortAddress, balance, hasNotaryNFT } = useWallet();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  // 菜单项配置
  const menuItems = [
    {
      key: 'projects',
      icon: <TrophyOutlined />,
      label: '竞猜项目',
    },
    {
      key: 'market',
      icon: <ShoppingOutlined />,
      label: '交易市场',
    },
  ];

  const handleMenuClick = (e: any) => {
    onMenuSelect?.(e.key);
  };

  // 用户信息显示
  const UserInfo = () => (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        {role === 'notary' ? (
          <Badge.Ribbon text="公证人" color="green">
            <div style={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              background: '#52c41a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <SafetyOutlined style={{ fontSize: 24, color: 'white' }} />
            </div>
          </Badge.Ribbon>
        ) : (
          <div style={{ 
            width: 60, 
            height: 60, 
            borderRadius: '50%', 
            background: '#1890ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <UserOutlined style={{ fontSize: 24, color: 'white' }} />
          </div>
        )}
        
        {!collapsed && (
          <>
            <Text strong style={{ display: 'block', fontSize: 12 }}>
              {shortAddress}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {parseFloat(balance).toFixed(4)} ETH
            </Text>
            {hasNotaryNFT && (
              <Text style={{ display: 'block', fontSize: 10, color: '#52c41a' }}>
                ✅ NFT认证
              </Text>
            )}
          </>
        )}
      </div>
    </Space>
  );

  // 侧边栏内容
  const SiderContent = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isConnected && <UserInfo />}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );

  // 如果未连接钱包，显示连接界面
  if (!isConnected) {
    return <WalletConnection />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth="80"
        width={240}
        className="desktop-sider"
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #303030'
        }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            {collapsed ? 'EB' : 'EasyBet'}
          </Title>
        </div>
        <SiderContent />
      </Sider>

      <Layout>
        {/* 顶部导航栏 */}
        <Header style={{ 
          background: '#fff', 
          padding: '0 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* 移动端菜单按钮 */}
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerVisible(true)}
            className="mobile-menu-btn"
          />

          {/* 标题 */}
          <Title level={3} style={{ margin: 0, flex: 1, textAlign: 'center' }}>
            EasyBet 去中心化竞猜平台
          </Title>

          {/* 用户信息 */}
          <Space>
            <WalletOutlined />
            <Text>{shortAddress}</Text>
            <Text type="secondary">{parseFloat(balance).toFixed(4)} ETH</Text>
            {role === 'notary' && (
              <Badge dot color="green">
                <SafetyOutlined style={{ color: '#52c41a' }} />
              </Badge>
            )}
          </Space>
        </Header>

        {/* 主内容区域 */}
        <Content style={{ 
          margin: 0,
          background: '#f0f2f5',
          minHeight: 'calc(100vh - 64px)'
        }}>
          {children}
        </Content>
      </Layout>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title="EasyBet"
        placement="left"
        onClose={() => setMobileDrawerVisible(false)}
        open={mobileDrawerVisible}
        styles={{ body: { padding: 0, background: '#001529' } }}
        width={240}
      >
        <SiderContent />
      </Drawer>
    </Layout>
  );
};

export default MainLayout;