import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Tag, Modal, InputNumber, message, Select, Input } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useWallet } from '../hooks/useWallet';
import { Ticket, BettingProject } from '../types';
import { 
  getUserTickets, 
  getProjectDetails, 
  listTicketForSale, 
  buyListedTicket, 
  getActiveListings 
} from '../utils/contract';
import { ethers } from 'ethers';

const { TabPane } = Tabs;
const { Option } = Select;

interface MarketOrder {
  id: string;
  projectId: string;
  projectTitle: string;
  optionName: string;
  seller: string;
  unitPrice: number; // 单价
  remainingCount: number; // 剩余张数
}

interface MarketPageProps {
  defaultTab?: string;
}

const MarketPage: React.FC<MarketPageProps> = ({ defaultTab = 'market' }) => {
  const { address, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedOrder, setSelectedOrder] = useState<MarketOrder | null>(null);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sellUnitPrice, setSellUnitPrice] = useState<number>(0); // 出售单价
  const [sellQuantity, setSellQuantity] = useState<number>(1); // 出售数量
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<string>('price_asc');

  // 获取provider
  const getProvider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    }
    return null;
  };

  // Mock data - 将被真实数据替换
  const [marketOrders, setMarketOrders] = useState<MarketOrder[]>([]);

  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);

  // 获取市场挂单数据
  const fetchMarketOrders = async () => {
    const provider = getProvider();
    if (!provider) {
      setMarketOrders([]);
      return;
    }

    setMarketLoading(true);
    try {
      console.log('📋 开始获取市场挂单数据...');
      const rawListings = await getActiveListings(provider);
      console.log('📊 原始挂单数据:', rawListings);

      // 处理挂单数据，获取项目详情
      const processedOrders: MarketOrder[] = [];
      for (const listing of rawListings) {
        try {
          const project = await getProjectDetails(provider, listing.projectId);
          if (project && listing.isActive && parseInt(listing.remainingQuantity) > 0) {
            // 从 ticketId 获取选项信息 - 这里需要调用 TicketNFT 合约
            // 暂时使用项目的第一个选项作为默认值
            const optionName = project.options[0]?.name || '未知选项';
            
            processedOrders.push({
              id: listing.id,
              projectId: listing.projectId,
              projectTitle: project.title,
              optionName: optionName,
              seller: listing.seller,
              unitPrice: parseFloat(listing.unitPrice),
              remainingCount: parseInt(listing.remainingQuantity)
            });
          }
        } catch (error) {
          console.error('处理挂单数据失败:', listing.id, error);
        }
      }

      console.log('✅ 处理后的市场订单:', processedOrders);
      setMarketOrders(processedOrders);
    } catch (error) {
      console.error('❌ 获取市场挂单失败:', error);
      message.error('获取市场数据失败');
    } finally {
      setMarketLoading(false);
    }
  };

  // 获取用户彩票数据
  const fetchUserTickets = async () => {
    const provider = getProvider();
    if (!provider || !address) {
      setUserTickets([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🎫 开始获取用户彩票数据...');
      const rawTickets = await getUserTickets(provider, address);
      console.log('📊 原始彩票数据:', rawTickets);

      // 按项目和选项分组彩票，但保留单价信息
      const ticketGroups = new Map<string, {
        projectId: string;
        optionIndex: number;
        tickets: any[];
        unitPrice: number; // 单张彩票的价格
      }>();

      for (const ticket of rawTickets) {
        const key = `${ticket.projectId}-${ticket.optionIndex}`;
        if (!ticketGroups.has(key)) {
          ticketGroups.set(key, {
            projectId: ticket.projectId,
            optionIndex: parseInt(ticket.optionIndex),
            tickets: [],
            unitPrice: parseFloat(ticket.betAmount) // 单张彩票的价格
          });
        }
        const group = ticketGroups.get(key)!;
        group.tickets.push(ticket);
      }

      // 获取项目详情并构建最终的彩票数据
      const processedTickets: Ticket[] = [];
      const groupEntries = Array.from(ticketGroups.entries());
      for (const [key, group] of groupEntries) {
        try {
          const project = await getProjectDetails(provider, group.projectId);
          if (project) {
            const option = project.options[group.optionIndex];
            processedTickets.push({
              id: key, // 使用组合键作为ID
              projectId: group.projectId,
              projectTitle: project.title,
              owner: address,
              option: group.optionIndex,
              optionName: option?.name || `选项 ${group.optionIndex + 1}`,
              ticketCount: group.tickets.length, // 该组合的彩票数量
              price: group.unitPrice.toString(), // 单张彩票的价格
              ticketIds: group.tickets.map(t => t.ticketId) // 保存所有ticketId用于出售
            });
          }
        } catch (error) {
          console.error('获取项目详情失败:', group.projectId, error);
        }
      }

      console.log('✅ 处理后的彩票数据:', processedTickets);
      setUserTickets(processedTickets);
    } catch (error) {
      console.error('❌ 获取用户彩票失败:', error);
      message.error('获取彩票数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 监听钱包连接状态变化
  useEffect(() => {
    fetchUserTickets();
    fetchMarketOrders(); // 同时获取市场数据
  }, [address]);

  const handleBuyTicket = (order: MarketOrder) => {
    setSelectedOrder(order);
    setBuyModalVisible(true);
  };

  const handleSellTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSellUnitPrice(parseFloat(ticket.price)); // 默认使用原价
    setSellQuantity(1); // 默认出售1张
    setSellModalVisible(true);
  };

  const confirmBuy = async () => {
    if (!selectedOrder) return;
    
    const provider = getProvider();
    if (!provider) {
      message.error('请先连接钱包');
      return;
    }

    try {
      // 默认购买1张彩票
      const quantity = 1;
      const totalAmount = (selectedOrder.unitPrice * quantity).toString();
      
      console.log('🛒 开始购买彩票...', {
        listingId: selectedOrder.id,
        quantity,
        totalAmount
      });

      const result = await buyListedTicket(provider, selectedOrder.id, quantity, totalAmount);
      
      if (result.success) {
        message.success('成功购买彩票！');
        
        // 重新获取数据
        fetchUserTickets();
        fetchMarketOrders();
      } else {
        message.error(result.error || '购买失败');
      }
    } catch (error: any) {
      console.error('购买失败:', error);
      message.error(error.message || '购买失败');
    }
    
    setBuyModalVisible(false);
    setSelectedOrder(null);
  };

  const confirmSell = async () => {
    if (!selectedTicket || !sellUnitPrice || !sellQuantity) {
      message.error('请填写完整的出售信息');
      return;
    }

    // 添加调试信息
    console.log('🔍 挂单调试信息:', {
      selectedTicket,
      sellQuantity,
      sellQuantityType: typeof sellQuantity,
      ticketIds: selectedTicket.ticketIds,
      ticketIdsLength: selectedTicket.ticketIds?.length,
      ticketCount: selectedTicket.ticketCount
    });

    if (!selectedTicket.ticketIds || selectedTicket.ticketIds.length < sellQuantity) {
      console.error('❌ 数量验证失败:', {
        hasTicketIds: !!selectedTicket.ticketIds,
        ticketIdsLength: selectedTicket.ticketIds?.length,
        sellQuantity,
        comparison: (selectedTicket.ticketIds?.length || 0) < sellQuantity
      });
      message.error(`出售数量超过拥有的彩票数量。拥有: ${selectedTicket.ticketIds?.length || 0}, 尝试出售: ${sellQuantity}`);
      return;
    }

    const provider = getProvider();
    if (!provider || !address) {
      message.error('请先连接钱包');
      return;
    }

    try {
      // 选择要出售的彩票ID（取前sellQuantity个）
      const ticketsToSell = selectedTicket.ticketIds.slice(0, sellQuantity);
      
      console.log('💰 开始挂单出售...', {
        ticketsToSell,
        unitPrice: sellUnitPrice,
        quantity: sellQuantity
      });

      // 对每张彩票分别调用挂单函数
      let successCount = 0;
      for (const ticketId of ticketsToSell) {
        try {
          const result = await listTicketForSale(
            provider, 
            ticketId, 
            sellUnitPrice.toString(), 
            1 // 每次挂单1张
          );
          
          if (result.success) {
            successCount++;
          } else {
            console.error(`彩票 ${ticketId} 挂单失败:`, result.error);
          }
        } catch (error) {
          console.error(`彩票 ${ticketId} 挂单异常:`, error);
        }
      }
      
      if (successCount === sellQuantity) {
        message.success(`成功挂单 ${successCount} 张彩票！`);
        
        // 重新获取数据
        fetchUserTickets();
        fetchMarketOrders();
      } else if (successCount > 0) {
        message.warning(`部分成功：${successCount}/${sellQuantity} 张彩票挂单成功`);
        
        // 重新获取数据
        fetchUserTickets();
        fetchMarketOrders();
      } else {
        message.error('所有彩票挂单失败');
      }
    } catch (error: any) {
      console.error('挂单失败:', error);
      message.error(error.message || '挂单失败');
    }
    
    setSellModalVisible(false);
    setSelectedTicket(null);
    setSellUnitPrice(0);
    setSellQuantity(1);
  };

  const filteredOrders = marketOrders.filter(order => {
    const matchesSearch = order.projectTitle.toLowerCase().includes(searchText.toLowerCase()) ||
                         order.optionName.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.unitPrice - b.unitPrice;
      case 'price_desc':
        return b.unitPrice - a.unitPrice;
      case 'time':
      default:
        return 0; // 暂时不按时间排序，因为没有时间字段
    }
  });

  const marketColumns = [
    {
      title: '项目',
      dataIndex: 'projectTitle',
      key: 'projectTitle',
      render: (title: string) => (
        <span style={{ fontWeight: 'bold' }}>{title}</span>
      )
    },
    {
      title: '选项',
      dataIndex: 'optionName',
      key: 'optionName',
      render: (optionName: string) => (
        <Tag color="blue">{optionName}</Tag>
      )
    },
    {
      title: '卖家',
      dataIndex: 'seller',
      key: 'seller',
      render: (text: string) => `${text.slice(0, 6)}...${text.slice(-4)}`
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => (
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{price} ETH</span>
      )
    },
    {
      title: '剩余张数',
      dataIndex: 'remainingCount',
      key: 'remainingCount',
      render: (count: number) => (
        <span style={{ color: '#1890ff' }}>{count} 张</span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MarketOrder) => (
        <Button 
          type="primary" 
          icon={<ShoppingCartOutlined />}
          disabled={record.seller === address}
          onClick={() => handleBuyTicket(record)}
        >
          购买
        </Button>
      )
    }
  ];

  const userTicketColumns = [
    {
      title: '项目',
      dataIndex: 'projectTitle',
      key: 'projectTitle',
      render: (title: string) => (
        <span style={{ fontWeight: 'bold' }}>{title}</span>
      )
    },
    {
      title: '选项',
      dataIndex: 'optionName',
      key: 'optionName',
      render: (optionName: string) => (
        <Tag color="blue">{optionName}</Tag>
      )
    },
    {
      title: '彩票张数',
      dataIndex: 'ticketCount',
      key: 'ticketCount',
      render: (count: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {count} 张
        </span>
      )
    },
    {
      title: '单张价格',
      key: 'unitPrice',
      render: (_: any, record: Ticket) => {
        // 现在 record.price 已经是单张彩票的价格
        return `${parseFloat(record.price).toFixed(4)} ETH`;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <Button 
          type="primary" 
          icon={<DollarOutlined />}
          onClick={() => handleSellTicket(record)}
        >
          挂单出售
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="交易市场" key="market">
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Input
                placeholder="搜索项目或选项"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 120 }}
              >
                <Option value="price_asc">价格升序</Option>
                <Option value="price_desc">价格降序</Option>
              </Select>
            </div>
            
            <Table
              columns={marketColumns}
              dataSource={sortedOrders}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab="我的彩票" key="myTickets">
            {!isConnected ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#999' }}>请先连接钱包查看您的彩票</p>
              </div>
            ) : (
              <Table
                columns={userTicketColumns}
                dataSource={userTickets}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                locale={{
                  emptyText: loading ? '加载中...' : '暂无彩票数据'
                }}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 购买确认弹窗 */}
      <Modal
        title="确认购买"
        visible={buyModalVisible}
        onOk={confirmBuy}
        onCancel={() => setBuyModalVisible(false)}
        okText="确认购买"
        cancelText="取消"
      >
        {selectedOrder && (
          <div>
            <p><strong>项目:</strong> {selectedOrder.projectTitle}</p>
            <p><strong>选项:</strong> {selectedOrder.optionName}</p>
            <p><strong>单价:</strong> {selectedOrder.unitPrice.toFixed(4)} ETH</p>
            <p><strong>剩余张数:</strong> {selectedOrder.remainingCount}</p>
            <p><strong>卖家:</strong> {selectedOrder.seller}</p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              确认购买后，ETH将从您的钱包转出，彩票将转入您的账户。
            </p>
          </div>
        )}
      </Modal>

      {/* 挂单出售弹窗 */}
      <Modal
        title="挂单出售"
        visible={sellModalVisible}
        onOk={confirmSell}
        onCancel={() => setSellModalVisible(false)}
        okText="确认挂单"
        cancelText="取消"
      >
        {selectedTicket && (
          <div>
            <p><strong>项目:</strong> {selectedTicket.projectTitle}</p>
            <p><strong>选项:</strong> {selectedTicket.optionName}</p>
            <p><strong>单张原价:</strong> {parseFloat(selectedTicket.price).toFixed(4)} ETH</p>
            <p><strong>拥有数量:</strong> {selectedTicket.ticketCount} 张</p>
            <div style={{ margin: '16px 0' }}>
              <label><strong>出售单价:</strong></label>
              <InputNumber
                value={sellUnitPrice}
                onChange={(value) => setSellUnitPrice(value || 0)}
                min={0}
                step={0.0001}
                style={{ width: '100%', marginTop: '8px' }}
                addonAfter="ETH"
              />
            </div>
            <div style={{ margin: '16px 0' }}>
              <label><strong>出售数量:</strong></label>
              <InputNumber
                value={sellQuantity}
                onChange={(value) => setSellQuantity(value || 1)}
                min={1}
                max={selectedTicket.ticketCount}
                style={{ width: '100%', marginTop: '8px' }}
                addonAfter="张"
              />
            </div>
            <div style={{ margin: '16px 0', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                总价: {(sellUnitPrice * sellQuantity).toFixed(4)} ETH
              </p>
            </div>
            <p style={{ color: '#666', fontSize: '12px' }}>
              确认挂单后，选中的彩票将被锁定，其他用户可以购买。
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MarketPage;