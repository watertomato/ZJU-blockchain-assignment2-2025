import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Tag, Modal, InputNumber, message, Select, Input } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useWallet } from '../hooks/useWallet';
import { Ticket, BettingProject } from '../types';

const { TabPane } = Tabs;
const { Option } = Select;

interface MarketOrder {
  id: string;
  ticketId: string;
  projectId: string;
  projectTitle: string;
  option: string;
  seller: string;
  price: number;
  originalPrice: number;
  listTime: Date;
  status: 'active' | 'sold' | 'cancelled';
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
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('time');

  // Mock data
  const [marketOrders, setMarketOrders] = useState<MarketOrder[]>([
    {
      id: '1',
      ticketId: 'ticket_1',
      projectId: '1',
      projectTitle: '2024年世界杯冠军预测',
      option: '巴西',
      seller: '0x1234...5678',
      price: 1.2,
      originalPrice: 1.0,
      listTime: new Date('2024-01-15T10:00:00'),
      status: 'active'
    },
    {
      id: '2',
      ticketId: 'ticket_2',
      projectId: '1',
      projectTitle: '2024年世界杯冠军预测',
      option: '阿根廷',
      seller: '0x8765...4321',
      price: 0.8,
      originalPrice: 1.0,
      listTime: new Date('2024-01-15T11:30:00'),
      status: 'active'
    },
    {
      id: '3',
      ticketId: 'ticket_3',
      projectId: '2',
      projectTitle: 'BTC价格预测',
      option: '上涨',
      seller: '0xabcd...efgh',
      price: 2.5,
      originalPrice: 2.0,
      listTime: new Date('2024-01-15T14:20:00'),
      status: 'active'
    }
  ]);

  const [userTickets, setUserTickets] = useState<Ticket[]>([
    {
      id: 'user_ticket_1',
      projectId: '1',
      owner: address || '',
      option: 1,
      purchaseTime: new Date('2024-01-10T09:00:00').getTime(),
      price: '0.001'
    },
    {
      id: 'user_ticket_2',
      projectId: '2',
      owner: address || '',
      option: 2,
      purchaseTime: new Date('2024-01-12T15:30:00').getTime(),
      price: '0.001'
    }
  ]);

  const handleBuyTicket = (order: MarketOrder) => {
    setSelectedOrder(order);
    setBuyModalVisible(true);
  };

  const handleSellTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSellPrice(parseFloat(ticket.price) * 1.1); // 默认加价10%
    setSellModalVisible(true);
  };

  const confirmBuy = () => {
    if (!selectedOrder) return;
    
    // 模拟购买逻辑
    message.success(`成功购买彩票！交易哈希: 0x${Math.random().toString(16).substr(2, 8)}...`);
    
    // 更新订单状态
    setMarketOrders(prev => prev.map(order => 
      order.id === selectedOrder.id 
        ? { ...order, status: 'sold' as const }
        : order
    ));
    
    // 添加到用户彩票
    const newTicket: Ticket = {
      id: selectedOrder.ticketId,
      projectId: selectedOrder.projectId,
      owner: address || '',
      option: 1, // 需要从选项名称映射到数字
      purchaseTime: new Date().getTime(),
      price: selectedOrder.price.toString()
    };
    setUserTickets(prev => [...prev, newTicket]);
    
    setBuyModalVisible(false);
    setSelectedOrder(null);
  };

  const confirmSell = () => {
    if (!selectedTicket || !sellPrice) return;
    
    // 模拟挂单逻辑
    const newOrder: MarketOrder = {
      id: `order_${Date.now()}`,
      ticketId: selectedTicket.id,
      projectId: selectedTicket.projectId,
      projectTitle: '项目标题', // 实际应该从项目数据获取
      option: `选项 ${selectedTicket.option}`,
      seller: address || '',
      price: sellPrice,
      originalPrice: parseFloat(selectedTicket.price),
      listTime: new Date(),
      status: 'active'
    };
    
    setMarketOrders(prev => [...prev, newOrder]);
    message.success('彩票已成功挂单！');
    
    setSellModalVisible(false);
    setSelectedTicket(null);
    setSellPrice(0);
  };

  const filteredOrders = marketOrders.filter(order => {
    const matchesSearch = order.projectTitle.toLowerCase().includes(searchText.toLowerCase()) ||
                         order.option.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'time':
      default:
        return b.listTime.getTime() - a.listTime.getTime();
    }
  });

  const marketColumns = [
    {
      title: '项目',
      dataIndex: 'projectTitle',
      key: 'projectTitle',
      render: (text: string, record: MarketOrder) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <Tag color="blue">{record.option}</Tag>
        </div>
      )
    },
    {
      title: '卖家',
      dataIndex: 'seller',
      key: 'seller',
      render: (text: string) => `${text.slice(0, 6)}...${text.slice(-4)}`
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: MarketOrder) => (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{price} ETH</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            原价: {record.originalPrice} ETH
          </div>
        </div>
      )
    },
    {
      title: '涨跌幅',
      key: 'change',
      render: (_: any, record: MarketOrder) => {
        const change = ((record.price - record.originalPrice) / record.originalPrice * 100);
        const color = change >= 0 ? '#52c41a' : '#ff4d4f';
        return (
          <span style={{ color }}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        );
      }
    },
    {
      title: '挂单时间',
      dataIndex: 'listTime',
      key: 'listTime',
      render: (time: number) => new Date(time).toLocaleString()
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'green', text: '在售' },
          sold: { color: 'gray', text: '已售' },
          cancelled: { color: 'red', text: '已取消' }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MarketOrder) => (
        <Button 
          type="primary" 
          icon={<ShoppingCartOutlined />}
          disabled={record.status !== 'active' || record.seller === address}
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
      key: 'project',
      render: (_: any, record: Ticket) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>项目 #{record.projectId}</div>
          <Tag color="blue">选项 {record.option}</Tag>
        </div>
      )
    },
    {
      title: '购买价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: string) => `${price} ETH`
    },
    {
      title: '购买时间',
      dataIndex: 'purchaseTime',
      key: 'purchaseTime',
      render: (time: number) => new Date(time).toLocaleString()
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
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 120 }}
              >
                <Option value="all">全部状态</Option>
                <Option value="active">在售</Option>
                <Option value="sold">已售</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 120 }}
              >
                <Option value="time">按时间</Option>
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
            <Table
              columns={userTicketColumns}
              dataSource={userTickets}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
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
            <p><strong>选项:</strong> {selectedOrder.option}</p>
            <p><strong>价格:</strong> {selectedOrder.price} ETH</p>
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
            <p><strong>项目:</strong> 项目 #{selectedTicket.projectId}</p>
            <p><strong>选项:</strong> {selectedTicket.option}</p>
            <p><strong>原价:</strong> {selectedTicket.price} ETH</p>
            <div style={{ margin: '16px 0' }}>
              <label><strong>出售价格:</strong></label>
              <InputNumber
                value={sellPrice}
                onChange={(value) => setSellPrice(value || 0)}
                min={0}
                step={0.1}
                style={{ width: '100%', marginTop: '8px' }}
                addonAfter="ETH"
              />
            </div>
            <p style={{ color: '#666', fontSize: '12px' }}>
              设置合理的价格有助于快速成交。
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MarketPage;