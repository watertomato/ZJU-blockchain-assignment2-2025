import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Tag, Modal, InputNumber, message, Select, Input } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useWallet } from '../hooks/useWallet';
import { Ticket, BettingProject } from '../types';
import { 
  getUserTickets, 
  getProjectDetails, 
  listTicketForSale, 
  listMultipleTicketsForSale,
  buyListedTicket, 
  getActiveListings,
  checkNFTApproval,
  approveNFT,
  setApprovalForAll,
  buyMultipleListedTickets,
  calculateBulkPurchasePrice,
  checkMultipleTicketsListed
} from '../utils/contract';
import { ethers } from 'ethers';

const { TabPane } = Tabs;
const { Option } = Select;

interface MarketOrder {
  id: string; // 使用 projectId-optionIndex 作为唯一标识
  projectId: string;
  projectTitle: string;
  optionName: string;
  minPrice: number; // 最低价格
  totalCount: number; // 总张数
  priceDistribution: Array<{
    price: number;
    count: number;
    listingIds: string[]; // 该价格下的所有挂单ID
  }>; // 价格分布
}

interface MarketPageProps {
  defaultTab?: string;
}

const MarketPage: React.FC<MarketPageProps> = ({ defaultTab = 'market' }) => {
  const { address, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedOrder, setSelectedOrder] = useState<MarketOrder | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0); // 选中的具体价格
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]); // 选中价格对应的挂单ID
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sellUnitPrice, setSellUnitPrice] = useState<number>(0); // 出售单价
  const [sellQuantity, setSellQuantity] = useState<number>(1); // 出售数量
  
  // 批量购买相关状态
  const [bulkBuyQuantity, setBulkBuyQuantity] = useState<number>(1); // 批量购买数量
  const [bulkBuyTotalPrice, setBulkBuyTotalPrice] = useState<string>('0'); // 批量购买总价
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{price: string, count: number}>>([]); // 价格分解
  const [calculatingPrice, setCalculatingPrice] = useState(false); // 是否正在计算价格
  
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set()); // 展开的行

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

      // 按项目+选项聚合挂单数据
      const aggregatedData = new Map<string, {
        projectId: string;
        projectTitle: string;
        optionName: string;
        listings: Array<{
          id: string;
          price: number;
          seller: string;
        }>;
      }>();

      // 处理挂单数据，获取项目详情并聚合（添加所有权验证）
      for (const listing of rawListings) {
        try {
          if (!listing.isActive) continue;
          
          // 验证NFT所有权（与购买验证逻辑保持一致）
          try {
            const ticketNFTContract = new ethers.Contract(
              process.env.REACT_APP_TICKET_NFT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
              [
                'function ownerOf(uint256 tokenId) view returns (address)'
              ],
              provider
            );
            
            const currentOwner = await ticketNFTContract.ownerOf(listing.ticketId);
            if (currentOwner.toLowerCase() !== listing.seller.toLowerCase()) {
              console.log('跳过所有权不匹配的挂单:', listing.id, '卖家:', listing.seller, '实际所有者:', currentOwner);
              continue;
            }
          } catch (ownerError) {
            console.warn('验证彩票所有权失败，跳过挂单:', listing.ticketId, ownerError);
            continue;
          }
          
          const project = await getProjectDetails(provider, listing.projectId);
          if (!project) continue;

          const optionIndex = listing.optionIndex || 0;
          const optionName = project.options[optionIndex]?.name || '未知选项';
          const key = `${listing.projectId}-${optionIndex}`;

          if (!aggregatedData.has(key)) {
            aggregatedData.set(key, {
              projectId: listing.projectId,
              projectTitle: project.title,
              optionName: optionName,
              listings: []
            });
          }

          const group = aggregatedData.get(key)!;
          group.listings.push({
            id: listing.id,
            price: parseFloat(listing.price),
            seller: listing.seller
          });
        } catch (error) {
          console.error('处理挂单数据失败:', listing.id, error);
        }
      }

      // 转换为最终的MarketOrder格式
      const processedOrders: MarketOrder[] = [];
      const aggregatedEntries = Array.from(aggregatedData.entries());
      for (const [key, group] of aggregatedEntries) {
        if (group.listings.length === 0) continue;

        // 按价格分组统计
        const priceGroups = new Map<number, string[]>();
        let minPrice = Infinity;

        for (const listing of group.listings) {
          const price = listing.price;
          minPrice = Math.min(minPrice, price);
          
          if (!priceGroups.has(price)) {
            priceGroups.set(price, []);
          }
          priceGroups.get(price)!.push(listing.id);
        }

        // 构建价格分布
        const priceDistribution = Array.from(priceGroups.entries())
          .map(([price, listingIds]) => ({
            price,
            count: listingIds.length,
            listingIds
          }))
          .sort((a, b) => a.price - b.price);

        processedOrders.push({
          id: key,
          projectId: group.projectId,
          projectTitle: group.projectTitle,
          optionName: group.optionName,
          minPrice: minPrice === Infinity ? 0 : minPrice,
          totalCount: group.listings.length,
          priceDistribution
        });
      }

      console.log('✅ 聚合后的市场订单:', processedOrders);
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
    setBulkBuyQuantity(1); // 默认购买1张
    setBulkBuyTotalPrice('0');
    setPriceBreakdown([]);
    setBuyModalVisible(true);
    
    // 立即计算1张的价格
    calculateBulkPrice(order, 1);
  };

  // 计算批量购买价格
  const calculateBulkPrice = async (order: MarketOrder, quantity: number) => {
    if (!order || quantity <= 0) {
      setBulkBuyTotalPrice('0');
      setPriceBreakdown([]);
      return;
    }

    const provider = getProvider();
    if (!provider) {
      message.error('请先连接钱包');
      return;
    }

    setCalculatingPrice(true);
    try {
      // 从order.id中解析出projectId和optionIndex
      const [projectId, optionIndexStr] = order.id.split('-');
      const optionIndex = parseInt(optionIndexStr);

      const result = await calculateBulkPurchasePrice(provider, projectId, optionIndex, quantity);
      
      if (result.success) {
        setBulkBuyTotalPrice(result.totalPrice || '0');
        setPriceBreakdown(result.priceBreakdown || []);
      } else {
        message.error(result.error || '价格计算失败');
        setBulkBuyTotalPrice('0');
        setPriceBreakdown([]);
      }
    } catch (error: any) {
      console.error('价格计算失败:', error);
      message.error('价格计算失败');
      setBulkBuyTotalPrice('0');
      setPriceBreakdown([]);
    } finally {
      setCalculatingPrice(false);
    }
  };

  // 当批量购买数量变化时，重新计算价格
  const handleBulkQuantityChange = (quantity: number | null) => {
    const newQuantity = quantity || 1;
    setBulkBuyQuantity(newQuantity);
    
    if (selectedOrder) {
      calculateBulkPrice(selectedOrder, newQuantity);
    }
  };

  const handleSellTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSellUnitPrice(parseFloat(ticket.price)); // 默认使用原价
    setSellQuantity(1); // 默认出售1张
    setSellModalVisible(true);
  };

  const confirmBuy = async () => {
    if (!selectedOrder || bulkBuyQuantity <= 0) return;
    
    const provider = getProvider();
    if (!provider) {
      message.error('请先连接钱包');
      return;
    }

    try {
      // 从order.id中解析出projectId和optionIndex
      const [projectId, optionIndexStr] = selectedOrder.id.split('-');
      const optionIndex = parseInt(optionIndexStr);
      
      console.log('🛒 开始批量购买彩票...', {
        projectId,
        optionIndex,
        quantity: bulkBuyQuantity,
        totalPrice: bulkBuyTotalPrice
      });

      const result = await buyMultipleListedTickets(
        provider, 
        projectId, 
        optionIndex, 
        bulkBuyQuantity
      );
      
      if (result.success) {
        message.success(`成功购买 ${bulkBuyQuantity} 张彩票！`);
        
        // 重新获取数据
        fetchUserTickets();
        fetchMarketOrders();
      } else {
        message.error(result.error || '购买失败');
      }
    } catch (error: any) {
      console.error('批量购买失败:', error);
      message.error(error.message || '购买失败');
    }
    
    setBuyModalVisible(false);
    setSelectedOrder(null);
    setBulkBuyQuantity(1);
    setBulkBuyTotalPrice('0');
    setPriceBreakdown([]);
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
      // 步骤1: 检查哪些彩票已经挂单，选择未挂单的彩票
      console.log('🔍 检查彩票挂单状态...');
      message.loading('正在检查彩票状态...', 0);
      
      const checkResult = await checkMultipleTicketsListed(provider, selectedTicket.ticketIds);
      message.destroy();
      
      if (checkResult.error) {
        message.error(`检查彩票状态失败: ${checkResult.error}`);
        return;
      }
      
      const { listedTickets, unlistedTickets } = checkResult;
      
      console.log('📊 彩票状态检查结果:', {
        总数: selectedTicket.ticketIds.length,
        已挂单: listedTickets.length,
        未挂单: unlistedTickets.length,
        需要挂单: sellQuantity
      });
      
      // 检查是否有足够的未挂单彩票
      if (unlistedTickets.length < sellQuantity) {
        const listedCount = listedTickets.length;
        const availableCount = unlistedTickets.length;
        
        message.warning(
          `无法挂单 ${sellQuantity} 张彩票。` +
          `您有 ${selectedTicket.ticketIds.length} 张彩票，其中 ${listedCount} 张已挂单，` +
          `只有 ${availableCount} 张可用于挂单。`
        );
        return;
      }
      
      // 选择要出售的彩票ID（从未挂单的彩票中选择）
      const ticketsToSell = unlistedTickets.slice(0, sellQuantity);
      
      // 如果有彩票被跳过，提示用户
      if (listedTickets.length > 0) {
        message.info(`已跳过 ${listedTickets.length} 张已挂单的彩票，将挂单 ${sellQuantity} 张未挂单的彩票`);
      }
      
      console.log('💰 开始挂单出售...', {
        ticketsToSell,
        unitPrice: sellUnitPrice,
        quantity: sellQuantity,
        skippedCount: listedTickets.length
      });

      // 步骤2: 检查授权状态
      console.log('🔍 检查 NFT 授权状态...');
      const approvalStatus = await checkNFTApproval(provider, address);
      
      if (!approvalStatus.isApprovedForAll) {
        console.log('⚠️ 需要授权 NFT 给 EasyBet 合约');
        
        // 询问用户是否要授权所有 NFT
        const shouldApproveAll = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '需要授权 NFT',
            content: (
              <div>
                <p>为了挂单出售彩票，需要先授权 EasyBet 合约操作您的 NFT。</p>
                <p><strong>推荐选择：</strong>授权所有 NFT（一次授权，后续挂单无需重复授权）</p>
                <p><strong>或者：</strong>仅授权本次要出售的 NFT（每次挂单都需要授权）</p>
              </div>
            ),
            okText: '授权所有 NFT（推荐）',
            cancelText: '仅授权本次 NFT',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (shouldApproveAll) {
          // 授权所有 NFT
          console.log('🔐 开始授权所有 NFT...');
          message.loading('正在授权所有 NFT，请在钱包中确认...', 0);
          
          const approveAllResult = await setApprovalForAll(provider, true);
          message.destroy();
          
          if (!approveAllResult.success) {
            message.error(approveAllResult.error || '授权失败');
            return;
          }
          
          message.success('成功授权所有 NFT！');
        } else {
          // 逐个授权本次要出售的 NFT
          console.log('🔐 开始逐个授权 NFT...');
          message.loading(`正在授权 ${ticketsToSell.length} 个 NFT，请在钱包中确认...`, 0);
          
          for (let i = 0; i < ticketsToSell.length; i++) {
            const ticketId = ticketsToSell[i];
            console.log(`🎫 授权第 ${i + 1}/${ticketsToSell.length} 个 NFT: ${ticketId}`);
            
            const approveResult = await approveNFT(provider, ticketId);
            if (!approveResult.success) {
              message.destroy();
              message.error(`授权 NFT ${ticketId} 失败: ${approveResult.error}`);
              return;
            }
          }
          
          message.destroy();
          message.success(`成功授权 ${ticketsToSell.length} 个 NFT！`);
        }
      } else {
        console.log('✅ NFT 已授权，可以直接挂单');
      }

      // 步骤3: 执行挂单
      console.log('📝 开始执行挂单...');
      message.loading('正在挂单，请在钱包中确认...', 0);

      if (sellQuantity === 1) {
        // 单张彩票挂单
        const result = await listTicketForSale(
          provider, 
          ticketsToSell[0], 
          sellUnitPrice.toString()
        );
        
        message.destroy();
        
        if (result.success) {
          message.success('成功挂单 1 张彩票！');
          fetchUserTickets();
          fetchMarketOrders();
        } else {
          message.error(result.error || '挂单失败');
        }
      } else {
        // 批量挂单
        const prices = Array(sellQuantity).fill(sellUnitPrice.toString());
        
        const result = await listMultipleTicketsForSale(
          provider,
          ticketsToSell,
          prices
        );
        
        message.destroy();
        
        if (result.success) {
          message.success(`成功挂单 ${sellQuantity} 张彩票！`);
          fetchUserTickets();
          fetchMarketOrders();
        } else {
          message.error(result.error || '批量挂单失败');
        }
      }
    } catch (error: any) {
      message.destroy();
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
        return a.minPrice - b.minPrice;
      case 'price_desc':
        return b.minPrice - a.minPrice;
      case 'time':
      default:
        return 0; // 暂时不按时间排序，因为没有时间字段
    }
  });

  // 切换行展开状态
  const toggleRowExpansion = (recordId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(recordId)) {
      newExpandedRows.delete(recordId);
    } else {
      newExpandedRows.add(recordId);
    }
    setExpandedRows(newExpandedRows);
  };

  // 渲染价格分布详情
  const renderPriceDistribution = (order: MarketOrder) => {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f9f9f9', margin: '8px 0' }}>
        <h4>价格详情</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {order.priceDistribution.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #d9d9d9'
            }}>
              <span>
                <strong>{item.price.toFixed(4)} ETH</strong> - {item.count} 张
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
      title: '最低价格',
      dataIndex: 'minPrice',
      key: 'minPrice',
      render: (price: number) => (
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
          {price.toFixed(4)} ETH
        </span>
      )
    },
    {
      title: '剩余张数',
      dataIndex: 'totalCount',
      key: 'totalCount',
      render: (count: number) => (
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
          {count} 张
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MarketOrder) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            type="primary" 
            icon={<ShoppingCartOutlined />}
            onClick={() => handleBuyTicket(record)}
          >
            购买最低价
          </Button>
          <Button 
            type="default"
            onClick={() => toggleRowExpansion(record.id)}
          >
            {expandedRows.has(record.id) ? '收起' : '查看详情'}
          </Button>
        </div>
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
              expandable={{
                expandedRowRender: (record) => renderPriceDistribution(record),
                expandedRowKeys: Array.from(expandedRows),
                onExpand: (expanded, record) => {
                  if (expanded) {
                    setExpandedRows(prev => new Set(Array.from(prev).concat(record.id)));
                  } else {
                    setExpandedRows(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(record.id);
                      return newSet;
                    });
                  }
                },
                showExpandColumn: false // 隐藏默认的展开列，使用自定义按钮
              }}
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
        title="批量购买彩票"
        visible={buyModalVisible}
        onOk={confirmBuy}
        onCancel={() => setBuyModalVisible(false)}
        okText="确认购买"
        cancelText="取消"
        width={600}
      >
        {selectedOrder && (
          <div>
            <p><strong>项目:</strong> {selectedOrder.projectTitle}</p>
            <p><strong>选项:</strong> {selectedOrder.optionName}</p>
            
            <div style={{ margin: '20px 0' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                购买数量:
              </label>
              <InputNumber
                min={1}
                max={selectedOrder.totalCount}
                value={bulkBuyQuantity}
                onChange={handleBulkQuantityChange}
                style={{ width: '200px' }}
                placeholder="请输入购买数量"
              />
              <span style={{ marginLeft: '10px', color: '#666' }}>
                (最多可购买 {selectedOrder.totalCount} 张)
              </span>
            </div>

            <div style={{ margin: '20px 0' }}>
              <p><strong>总价格:</strong> 
                {calculatingPrice ? (
                  <span style={{ marginLeft: '8px', color: '#1890ff' }}>计算中...</span>
                ) : (
                  <span style={{ marginLeft: '8px', fontSize: '16px', color: '#f5222d' }}>
                    {parseFloat(bulkBuyTotalPrice).toFixed(4)} ETH
                  </span>
                )}
              </p>
              
              {priceBreakdown.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>价格明细:</p>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    {priceBreakdown.map((item, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: index < priceBreakdown.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <span>{parseFloat(item.price).toFixed(4)} ETH</span>
                        <span>{item.count} 张</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <p style={{ color: '#666', fontSize: '12px' }}>
              确认购买后，ETH将从您的钱包转出，彩票将转入您的账户。系统将自动从最低价格开始购买。
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