import { ethers } from 'ethers';
import { BettingProject } from '../types';

// 合约地址
const EASYBET_CONTRACT_ADDRESS = process.env.REACT_APP_EASYBET_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// TicketNFT 合约地址
const TICKET_NFT_CONTRACT_ADDRESS = process.env.REACT_APP_TICKET_NFT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

// EasyBet 合约 ABI
const EASYBET_ABI = [
  // 事件
  'event ProjectCreated(uint256 indexed projectId, address indexed creator, string title, string[] options, uint256 totalPrize, uint256 endTime)',
  'event BetPlaced(uint256 indexed projectId, address indexed user, uint256 optionId, uint256 amount)',
  'event TicketPurchased(uint256 indexed projectId, address indexed buyer, uint256 indexed ticketId, uint256 optionIndex, uint256 amount)',
  'event ProjectFinalized(uint256 indexed projectId, uint256 winningOption)',
  'event MarketplaceAction(uint256 indexed listingId, uint256 indexed projectId, uint256 indexed ticketId, address seller, address buyer, uint256 unitPrice, uint256 quantity, string action)',
  
  // 查询函数
  'function getProject(uint256) view returns (uint256, string, string, string[], uint256, uint256, uint256, address, bool, bool, uint256, uint256)',
  'function getUserProjects(address user) view returns (uint256[])',
  'function getActiveProjects() view returns (uint256[])',
  'function getOptionBets(uint256 projectId) view returns (uint256[])',
  'function getUserBets(address user, uint256 projectId) view returns (uint256[])',
  'function projectCounter() view returns (uint256)',
  'function ticketNFTAddress() view returns (address)',
  'function notaryNFTAddress() view returns (address)',
  'function getActiveListings() view returns (uint256[])',
  'function getUserListings(address user) view returns (uint256[])',
  'function getProjectListings(uint256 projectId) view returns (uint256[])',
  'function getListingDetails(uint256 listingId) view returns (uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 price, bool isActive, uint256 listTime)',
  'function isTicketListed(uint256 ticketId) view returns (bool isListed, uint256 listingId)',
  
  // 函数
  'function createProject(string title, string description, string[] options, uint256 ticketPrice, uint256 endTime) payable returns (uint256)',
  'function purchaseTicket(uint256 projectId, uint256 optionIndex) payable returns (uint256)',
  'function purchaseMultipleTickets(uint256 projectId, uint256 optionIndex, uint256 quantity) payable returns (uint256[])',
  'function listTicketForSale(uint256 ticketId, uint256 price) returns (uint256)',
  'function listMultipleTicketsForSale(uint256[] ticketIds, uint256[] prices) returns (uint256[])',
  'function buyListedTicket(uint256 listingId) payable returns (bool)',
  'function buyMultipleListedTickets(uint256 projectId, uint256 optionIndex, uint256 quantity) payable returns (uint256[])',
  'function cancelListing(uint256 listingId) returns (bool)',
  
  // 管理函数
  'function setNotaryNFTAddress(address _notaryNFTAddress)',
  'function setTicketNFTAddress(address _ticketNFTAddress)'
];

// TicketNFT 合约 ABI
const TICKET_NFT_ABI = [
  // 事件
  'event TicketMinted(address indexed to, uint256 indexed tokenId, uint256 indexed projectId, uint256 optionIndex, uint256 betAmount)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  
  // 只读函数
  'function getTicketInfo(uint256 tokenId) view returns (uint256 projectId, uint256 optionIndex, uint256 betAmount, address bettor, uint256 purchaseTimestamp, string metadataURI)',
  'function getTicketsByOwner(address owner) view returns (uint256[])',
  'function getTicketsByProject(uint256 projectId) view returns (uint256[])',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function authorizedMinter() view returns (address)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  
  // 写入函数
  'function mintTicket(address to, uint256 projectId, uint256 optionIndex, uint256 betAmount, string metadataURI) returns (uint256)',
  'function setAuthorizedMinter(address minter)',
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)'
];

// 创建投注项目
export const createBettingProject = async (
  provider: ethers.providers.Web3Provider,
  projectData: {
    title: string;
    description: string;
    options: string[];
    endTime: number;
    totalPrize: string; // ETH 金额
    ticketPrice: string; // 新增：彩票单价 ETH 金额
  }
): Promise<{ success: boolean; projectId?: string; error?: string }> => {
  console.log('🔧 createBettingProject 开始执行...');
  console.log('📥 接收到的参数:', projectData);
  
  try {
    console.log('🔍 开始参数验证...');
    
    // 参数验证
    if (!projectData.title || !projectData.title.trim()) {
      console.error('❌ 标题验证失败:', projectData.title);
      return { success: false, error: '项目标题不能为空' };
    }
    
    if (!projectData.description || !projectData.description.trim()) {
      console.error('❌ 描述验证失败:', projectData.description);
      return { success: false, error: '项目描述不能为空' };
    }
    
    if (!projectData.options || projectData.options.length < 2) {
      console.error('❌ 选项验证失败:', projectData.options);
      return { success: false, error: '至少需要2个选项' };
    }
    
    if (projectData.endTime <= Date.now() / 1000) {
      console.error('❌ 结束时间验证失败:', projectData.endTime);
      return { success: false, error: '结束时间必须在未来' };
    }
    
    if (!projectData.totalPrize || parseFloat(projectData.totalPrize) <= 0) {
      console.error('❌ 奖池验证失败:', projectData.totalPrize);
      return { success: false, error: '奖池金额必须大于0' };
    }
    
    if (!projectData.ticketPrice || parseFloat(projectData.ticketPrice) <= 0) {
      console.error('❌ 彩票价格验证失败:', projectData.ticketPrice);
      return { success: false, error: '彩票价格必须大于0' };
    }
    
    console.log('✅ 参数验证通过');
    
    // 获取签名者
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log('👤 签名者地址:', signerAddress);
    
    // 创建合约实例
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    console.log('📄 合约实例创建成功');
    
    // 转换金额为 wei
    const totalPrizeWei = ethers.utils.parseEther(projectData.totalPrize);
    const ticketPriceWei = ethers.utils.parseEther(projectData.ticketPrice);
    
    console.log('💰 奖池金额 (wei):', totalPrizeWei.toString());
    console.log('🎫 彩票价格 (wei):', ticketPriceWei.toString());
    
    // 调用合约创建项目
    console.log('🚀 调用 createProject 函数...');
    const tx = await contract.createProject(
      projectData.title,
      projectData.description,
      projectData.options,
      ticketPriceWei,
      projectData.endTime,
      {
        value: totalPrizeWei,
        gasLimit: 1000000
      }
    );
    
    console.log('📝 交易已发送，哈希:', tx.hash);
    console.log('⏳ 等待交易确认...');
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log('✅ 交易确认成功!');
    console.log('📋 交易收据:', receipt);
    
    // 从事件中获取项目ID
    if (receipt.events && receipt.events.length > 0) {
      const projectCreatedEvent = receipt.events.find((event: any) => 
        event.event === 'ProjectCreated'
      );
      
      if (projectCreatedEvent && projectCreatedEvent.args) {
        const projectId = projectCreatedEvent.args[0].toString();
        console.log('🎯 项目创建成功，ID:', projectId);
        
        // 记录项目创建事件的详细信息
        const parsedProjectEvent = projectCreatedEvent;
        console.log('📊 项目详情:', {
          projectId: parsedProjectEvent.args[0].toString(),
          creator: parsedProjectEvent.args[1],
          title: parsedProjectEvent.args[2],
          options: parsedProjectEvent.args[3],
          totalPrize: parsedProjectEvent.args[4].toString(),
          endTime: parsedProjectEvent.args[5].toString()
        });
        return { success: true, projectId };
      }
    }

    console.error('❌ 无法从事件中获取项目ID');
    return { success: false, error: '无法获取项目ID' };
  } catch (error: any) {
    console.error('💥 createBettingProject 异常:', error);
    console.error('错误详情:', {
      name: error?.name,
      message: error?.message,
      reason: error?.reason,
      code: error?.code,
      stack: error?.stack
    });
    return { 
      success: false, 
      error: error.reason || error.message || '创建项目失败' 
    };
  }
};

// 购买多张彩票（智能批量处理）
export const purchaseMultipleTickets = async (
  provider: ethers.providers.Web3Provider,
  projectId: string,
  optionIndex: number,
  quantity: number,
  totalAmount: string // ETH 金额 (quantity * ticketPrice)
): Promise<{ success: boolean; ticketIds?: string[]; error?: string }> => {
  try {
    console.log('🎫 开始批量购买彩票...');
    console.log('📊 购买参数:', { projectId, optionIndex, quantity, totalAmount });

    // 定义单批次最大购买数量（基于Gas限制）
    const MAX_BATCH_SIZE = 50; // 每批最多50张票，约15M Gas，安全范围内
    
    // 如果数量超过单批次限制，进行拆分处理
    if (quantity > MAX_BATCH_SIZE) {
      console.log(`🔄 数量${quantity}超过单批次限制${MAX_BATCH_SIZE}，将拆分为多个交易`);
      return await purchaseInBatches(provider, projectId, optionIndex, quantity, totalAmount);
    }

    // 单批次购买（数量 <= 50）
    return await executeSinglePurchase(provider, projectId, optionIndex, quantity, totalAmount);

  } catch (error: any) {
    console.error('❌ purchaseMultipleTickets 函数执行失败:', error);
    return {
      success: false,
      error: error?.message || '未知错误'
    };
  }
};

// 执行单次购买（内部函数）
async function executeSinglePurchase(
  provider: ethers.providers.Web3Provider,
  projectId: string,
  optionIndex: number,
  quantity: number,
  totalAmount: string
): Promise<{ success: boolean; ticketIds?: string[]; error?: string }> {
  try {
    console.log(`🧪 测试购买 ${quantity} 张彩票:`);
    
    // 获取签名者
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log(`👤 测试账户: ${signerAddress}`);
    
    // 检查账户余额
    const balance = await provider.getBalance(signerAddress);
    console.log(`💰 账户余额: ${ethers.utils.formatEther(balance)} ETH`);
    
    // 创建合约实例
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 转换金额
    const totalAmountWei = ethers.utils.parseEther(totalAmount);
    
    console.log(`📊 购买参数:`);
    console.log(`   项目ID: ${projectId}`);
    console.log(`   选项索引: ${optionIndex}`);
    console.log(`   数量: ${quantity}`);
    console.log(`   总价: ${ethers.utils.formatEther(totalAmountWei)} ETH`);
    
    // 检查账户余额是否足够
    if (balance.lt(totalAmountWei)) {
      throw new Error(`余额不足: 需要 ${totalAmount} ETH，当前余额 ${ethers.utils.formatEther(balance)} ETH`);
    }
    
    // Gas估算 - 使用debug-purchase.ts中的策略
    console.log(`⛽ 正在估算Gas...`);
    const gasEstimate = await contract.estimateGas.purchaseMultipleTickets(
      projectId,
      optionIndex,
      quantity,
      { value: totalAmountWei }
    );
    console.log(`⛽ Gas估算成功: ${gasEstimate.toString()}`);
    
    // 检查Gas限制
    if (gasEstimate.gt(ethers.utils.parseUnits("30000000", "wei"))) {
      console.warn(`⚠️  Gas估算过高: ${gasEstimate.toString()}`);
    }
    
    // 执行交易 - 使用debug-purchase.ts中的策略
    console.log(`🚀 执行交易...`);
    const tx = await contract.purchaseMultipleTickets(
      projectId,
      optionIndex,
      quantity,
      { 
        value: totalAmountWei,
        gasLimit: gasEstimate.mul(150).div(100) // 增加50%的Gas缓冲
      }
    );
    
    console.log(`📝 交易哈希: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ 购买 ${quantity} 张彩票成功！Gas使用: ${receipt.gasUsed.toString()}`);
    
    // 解析事件 - 使用debug-purchase.ts中的策略
    const events = receipt.events?.filter((e: any) => e.event === 'TicketPurchased') || [];
    console.log(`🎟️  获得彩票数量: ${events.length}`);
    
    const ticketIds: string[] = [];
    events.forEach((event: any, index: number) => {
      const ticketId = event.args?.ticketId.toString();
      console.log(`   彩票${index + 1} ID: ${ticketId}`);
      if (ticketId) {
        ticketIds.push(ticketId);
      }
    });
    
    return {
      success: true,
      ticketIds
    };
    
  } catch (error: any) {
    console.error(`❌ 购买 ${quantity} 张彩票失败:`, error.message);
    
    // 详细错误分析 - 使用debug-purchase.ts中的策略
    if (error.message.includes("revert")) {
      console.error("   这是一个合约revert错误");
      if (error.reason) {
        console.error("   Revert原因:", error.reason);
      }
    } else if (error.message.includes("gas")) {
      console.error("   这是一个Gas相关错误");
      console.error("   可能是Gas限制不足或Gas估算失败");
    } else if (error.message.includes("insufficient funds")) {
      console.error("   余额不足");
    } else {
      console.error("   其他错误类型");
    }
    
    // 如果是Gas估算失败，尝试分析原因
    if (error.message.includes("estimateGas")) {
      console.log("   🔍 Gas估算失败，可能的原因:");
      console.log("      - 合约中有require()检查失败");
      console.log("      - 数量超过了合约限制");
      console.log("      - 循环处理时Gas不足");
      console.log("      - 项目状态不允许购买");
    }
    
    return { 
      success: false, 
      error: error?.reason || error?.message || '购买失败'
    };
  }
}

// 分批购买（内部函数）
async function purchaseInBatches(
  provider: ethers.providers.Web3Provider,
  projectId: string,
  optionIndex: number,
  totalQuantity: number,
  totalAmount: string
): Promise<{ success: boolean; ticketIds?: string[]; error?: string }> {
  try {
    console.log('🔄 开始分批购买...');
    console.log('📊 总数量:', totalQuantity, '总金额:', totalAmount);
    
    const MAX_BATCH_SIZE = 50;
    const batches = Math.ceil(totalQuantity / MAX_BATCH_SIZE);
    const allTicketIds: string[] = [];
    
    // 计算单张票价
    const totalAmountWei = ethers.utils.parseEther(totalAmount);
    const singleTicketPriceWei = totalAmountWei.div(totalQuantity);
    const singleTicketPrice = ethers.utils.formatEther(singleTicketPriceWei);
    
    console.log('🎫 单张票价:', singleTicketPrice, 'ETH');
    console.log('📦 将分为', batches, '批次购买');
    
    for (let i = 0; i < batches; i++) {
      const startIndex = i * MAX_BATCH_SIZE;
      const endIndex = Math.min(startIndex + MAX_BATCH_SIZE, totalQuantity);
      const batchQuantity = endIndex - startIndex;
      const batchAmount = ethers.utils.formatEther(singleTicketPriceWei.mul(batchQuantity));
      
      console.log(`🔄 执行第 ${i + 1}/${batches} 批次: ${batchQuantity} 张票, ${batchAmount} ETH`);
      
      const batchResult = await executeSinglePurchase(
        provider,
        projectId,
        optionIndex,
        batchQuantity,
        batchAmount
      );
      
      if (!batchResult.success) {
        console.error(`❌ 第 ${i + 1} 批次购买失败:`, batchResult.error);
        return {
          success: false,
          error: `第 ${i + 1} 批次购买失败: ${batchResult.error}`
        };
      }
      
      if (batchResult.ticketIds) {
        allTicketIds.push(...batchResult.ticketIds);
      }
      
      console.log(`✅ 第 ${i + 1} 批次完成，获得 ${batchResult.ticketIds?.length || 0} 张票`);
      
      // 批次间延迟，避免网络拥堵
      if (i < batches - 1) {
        console.log('⏳ 等待 2 秒后执行下一批次...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('🎉 所有批次购买完成！');
    console.log('📊 总共获得票据:', allTicketIds.length, '张');
    console.log('🎫 票据IDs:', allTicketIds);
    
    return {
      success: true,
      ticketIds: allTicketIds
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || '分批购买失败'
    };
  }
};

// 获取项目详情
export const getProjectDetails = async (
  provider: ethers.providers.Web3Provider,
  projectId: string
): Promise<BettingProject | null> => {
  try {
    console.log('🔍 获取项目详情，ID:', projectId);
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    
    // 调用合约获取项目信息
    const projectData = await contract.getProject(projectId);
    console.log('📊 原始项目数据:', projectData);
    
    // 解析项目数据
    const [
      id,
      title,
      description,
      options,
      totalPrize,
      ticketPrice,
      endTime,
      creator,
      isActive,
      isFinalized,
      winningOption,
      totalBetsAmount
    ] = projectData;
    
    // 获取每个选项的投注金额
    const optionBets = await contract.getOptionBets(projectId);
    console.log('💰 选项投注金额:', optionBets);
    
    // 计算已售票数 - 使用BigNumber进行精确计算
    const soldTickets = totalBetsAmount.div(ticketPrice).toNumber();
     
     // 转换选项格式
     const optionsWithTicketCount = options.map((option: string, index: number) => {
       const optionBetAmount = optionBets[index] || ethers.BigNumber.from(0);
       // 使用BigNumber进行精确计算，避免浮点数精度问题
       const ticketCount = ticketPrice.gt(0) ? optionBetAmount.div(ticketPrice).toNumber() : 0;
       return {
         id: index,
         name: option,
         ticketCount: ticketCount
       };
     });
     
     const project: BettingProject = {
       id: id.toString(),
       title,
       description,
       category: '区块链竞猜',
       creator,
       createdAt: Date.now(),
       endTime: parseInt(endTime.toString()) * 1000,
       totalPool: ethers.utils.formatEther(totalPrize),
       ticketPrice: ethers.utils.formatEther(ticketPrice),
       soldTickets,
       status: isFinalized ? 'settled' : (Date.now() > parseInt(endTime.toString()) * 1000 ? 'ended' : 'active'),
       options: optionsWithTicketCount,
       winningOption: isFinalized ? parseInt(winningOption.toString()) : undefined
     };
    
    console.log('✅ 项目详情解析完成:', project);
    return project;
    
  } catch (error: any) {
    console.error('❌ 获取项目详情失败:', error);
    return null;
  }
};

// 获取活跃项目列表
export const getActiveProjects = async (
  provider: ethers.providers.Web3Provider
): Promise<BettingProject[]> => {
  try {
    console.log('🔍 获取活跃项目列表...');
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const activeProjectIds = await contract.getActiveProjects();
    
    console.log('📊 活跃项目IDs:', activeProjectIds);
    
    const projects: BettingProject[] = [];
    for (const projectId of activeProjectIds) {
      const project = await getProjectDetails(provider, projectId.toString());
      if (project) {
        projects.push(project);
      }
    }
    
    console.log('✅ 获取到', projects.length, '个活跃项目');
    return projects;
  } catch (error: any) {
    console.error('❌ 获取活跃项目失败:', error);
    return [];
  }
};

// 获取用户创建的项目
export const getUserProjects = async (
  provider: ethers.providers.Web3Provider,
  userAddress: string
): Promise<BettingProject[]> => {
  try {
    console.log('🔍 获取用户项目，地址:', userAddress);
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const userProjectIds = await contract.getUserProjects(userAddress);
    
    console.log('📊 用户项目IDs:', userProjectIds);
    
    const projects: BettingProject[] = [];
    for (const projectId of userProjectIds) {
      const project = await getProjectDetails(provider, projectId.toString());
      if (project) {
        projects.push(project);
      }
    }
    
    console.log('✅ 获取到', projects.length, '个用户项目');
    return projects;
  } catch (error: any) {
    console.error('❌ 获取用户项目失败:', error);
    return [];
  }
};

// 检查合约是否已部署
export const checkContractDeployment = async (
  provider: ethers.providers.Web3Provider
): Promise<boolean> => {
  try {
    const code = await provider.getCode(EASYBET_CONTRACT_ADDRESS);
    return code !== '0x';
  } catch (error) {
    console.error('检查合约部署状态失败:', error);
    return false;
  }
};

// 获取项目计数器
export const getProjectCounter = async (
  provider: ethers.providers.Web3Provider
): Promise<number> => {
  try {
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const counter = await contract.projectCounter();
    return counter.toNumber();
  } catch (error) {
    console.error('获取项目计数器失败:', error);
    return 0;
  }
};

// 购买彩票（单张）
export const purchaseTicket = async (
  provider: ethers.providers.Web3Provider,
  projectId: string,
  optionIndex: number,
  betAmount: string // ETH 金额
): Promise<{ success: boolean; ticketId?: string; error?: string }> => {
  try {
    console.log('🎫 开始购买彩票...');
    console.log('📊 项目ID:', projectId);
    console.log('🎯 选项索引:', optionIndex);
    console.log('💰 投注金额:', betAmount, 'ETH');
    
    // 获取签名者
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log('👤 签名者地址:', signerAddress);
    
    // 创建合约实例
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    console.log('📄 合约实例创建成功');
    
    // 转换投注金额为 wei
    const betAmountWei = ethers.utils.parseEther(betAmount);
    console.log('💰 投注金额 (wei):', betAmountWei.toString());
    
    // 调用购买彩票函数
    console.log('🚀 调用 purchaseTicket 函数...');
    const tx = await contract.purchaseTicket(projectId, optionIndex, {
      value: betAmountWei,
      gasLimit: 500000 // 设置足够的 gas limit
    });
    
    console.log('📝 交易已发送，哈希:', tx.hash);
    console.log('⏳ 等待交易确认...');
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log('✅ 交易确认成功!');
    console.log('📋 交易收据:', receipt);
    
    // 从事件中获取 ticketId
    let ticketId = '';
    if (receipt.events) {
      const ticketPurchasedEvent = receipt.events.find((event: any) => 
        event.event === 'TicketPurchased'
      );
      if (ticketPurchasedEvent && ticketPurchasedEvent.args) {
        ticketId = ticketPurchasedEvent.args.ticketId.toString();
        console.log('🎫 彩票ID:', ticketId);
      }
    }
    
    return { 
      success: true, 
      ticketId: ticketId || 'unknown'
    };
    
  } catch (error: any) {
    console.error('❌ purchaseTicket 执行失败:', error);
    
    let errorMessage = '购买彩票失败';
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = '余额不足，请检查您的钱包余额';
    } else if (error.code === 'USER_REJECTED') {
      errorMessage = '用户取消了交易';
    } else if (error.message && error.message.includes('revert')) {
      // 提取 revert 原因
      const revertReason = error.message.match(/revert (.+)/)?.[1] || '合约执行失败';
      errorMessage = `交易失败: ${revertReason}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// 获取用户的彩票
export const getUserTickets = async (
  provider: ethers.providers.Web3Provider,
  userAddress: string
): Promise<any[]> => {
  try {
    console.log('🎫 获取用户彩票，地址:', userAddress);
    
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    const ticketIds = await ticketContract.getTicketsByOwner(userAddress);
    
    console.log('📊 用户彩票IDs:', ticketIds);
    
    const tickets = [];
    for (const ticketId of ticketIds) {
      try {
        const ticketInfo = await ticketContract.getTicketInfo(ticketId);
        tickets.push({
          ticketId: ticketId.toString(),
          projectId: ticketInfo.projectId.toString(),
          optionIndex: ticketInfo.optionIndex.toString(),
          betAmount: ethers.utils.formatEther(ticketInfo.betAmount),
          bettor: ticketInfo.bettor,
          purchaseTimestamp: ticketInfo.purchaseTimestamp.toString(),
          metadataURI: ticketInfo.metadataURI
        });
      } catch (error) {
        console.error('获取彩票信息失败:', ticketId.toString(), error);
      }
    }
    
    console.log('✅ 获取到', tickets.length, '张彩票');
    return tickets;
  } catch (error: any) {
    console.error('❌ 获取用户彩票失败:', error);
    return [];
  }
};

// 获取项目的所有彩票
export const getProjectTickets = async (
  provider: ethers.providers.Web3Provider,
  projectId: string
): Promise<any[]> => {
  try {
    console.log('🎫 获取项目彩票，项目ID:', projectId);
    
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    const ticketIds = await ticketContract.getTicketsByProject(projectId);
    
    console.log('📊 项目彩票IDs:', ticketIds);
    
    const tickets = [];
    for (const ticketId of ticketIds) {
      try {
        const ticketInfo = await ticketContract.getTicketInfo(ticketId);
        tickets.push({
          ticketId: ticketId.toString(),
          projectId: ticketInfo.projectId.toString(),
          optionIndex: ticketInfo.optionIndex.toString(),
          betAmount: ethers.utils.formatEther(ticketInfo.betAmount),
          bettor: ticketInfo.bettor,
          purchaseTimestamp: ticketInfo.purchaseTimestamp.toString(),
          metadataURI: ticketInfo.metadataURI
        });
      } catch (error) {
        console.error('获取彩票信息失败:', ticketId.toString(), error);
      }
    }
    
    console.log('✅ 获取到', tickets.length, '张彩票');
    return tickets;
  } catch (error: any) {
    console.error('❌ 获取项目彩票失败:', error);
    return [];
  }
};

// 挂单出售彩票
export const listTicketForSale = async (
  provider: ethers.providers.Web3Provider,
  ticketId: string,
  price: string // ETH 金额
): Promise<{ success: boolean; listingId?: string; error?: string }> => {
  try {
    console.log('🎫 开始挂单出售彩票...', { ticketId, price });
    
    const signer = provider.getSigner();
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 将价格转换为 wei
    const priceWei = ethers.utils.parseEther(price);
    
    // 调用合约函数
    const tx = await contract.listTicketForSale(
      ticketId,
      priceWei
    );
    
    console.log('📝 挂单交易已提交:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ 挂单交易已确认:', receipt.transactionHash);
    
    // 从事件中获取 listingId
    const event = receipt.events?.find((e: any) => e.event === 'MarketplaceAction');
    const listingId = event?.args?.listingId?.toString();
    
    return {
      success: true,
      listingId
    };
  } catch (error: any) {
    console.error('❌ 挂单出售失败:', error);
    return {
      success: false,
      error: error.message || '挂单出售失败'
    };
  }
};

// 批量挂单出售彩票
export const listMultipleTicketsForSale = async (
  provider: ethers.providers.Web3Provider,
  ticketIds: string[],
  prices: string[] // ETH 金额数组
): Promise<{ success: boolean; listingIds?: string[]; error?: string }> => {
  try {
    console.log('🎫 开始批量挂单出售彩票...', { ticketIds, prices });
    
    if (ticketIds.length !== prices.length) {
      throw new Error('彩票ID数量与价格数量不匹配');
    }
    
    const signer = provider.getSigner();
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 将价格转换为 wei
    const pricesWei = prices.map(price => ethers.utils.parseEther(price));
    
    // 调用合约函数
    const tx = await contract.listMultipleTicketsForSale(
      ticketIds,
      pricesWei
    );
    
    console.log('📝 批量挂单交易已提交:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ 批量挂单交易已确认:', receipt.transactionHash);
    
    // 从事件中获取所有 listingId
    const events = receipt.events?.filter((e: any) => e.event === 'MarketplaceAction') || [];
    const listingIds = events.map((event: any) => event.args?.listingId?.toString());
    
    return {
      success: true,
      listingIds
    };
  } catch (error: any) {
    console.error('❌ 批量挂单出售失败:', error);
    return {
      success: false,
      error: error.message || '批量挂单出售失败'
    };
  }
};

export const buyListedTicket = async (
  provider: ethers.providers.Web3Provider,
  listingId: string,
  totalAmount: string // ETH 金额
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🛒 开始购买挂单彩票...', { listingId, totalAmount });
    
    const signer = provider.getSigner();
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 将金额转换为 wei
    const totalAmountWei = ethers.utils.parseEther(totalAmount);
    
    // 调用合约函数
    const tx = await contract.buyListedTicket(listingId, {
      value: totalAmountWei
    });
    
    console.log('📝 购买交易已提交:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ 购买交易已确认:', receipt.transactionHash);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('❌ 购买挂单彩票失败:', error);
    return {
      success: false,
      error: error.message || '购买失败'
    };
  }
};

// 批量购买挂单彩票（从最低价开始）
export const buyMultipleListedTickets = async (
  provider: ethers.providers.Web3Provider,
  projectId: string,
  optionIndex: number,
  quantity: number
): Promise<{ success: boolean; ticketIds?: string[]; totalPrice?: string; error?: string }> => {
  try {
    console.log('🛒 开始批量购买挂单彩票...', { projectId, optionIndex, quantity });
    
    // 获取签名者
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log(`👤 购买账户: ${signerAddress}`);
    
    // 检查账户余额
    const balance = await provider.getBalance(signerAddress);
    console.log(`💰 账户余额: ${ethers.utils.formatEther(balance)} ETH`);
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 先计算总价格
    const priceCalculation = await calculateBulkPurchasePrice(provider, projectId, optionIndex, quantity);
    if (!priceCalculation.success) {
      return {
        success: false,
        error: priceCalculation.error
      };
    }
    
    // 直接使用BigNumber格式的totalPriceWei，避免精度损失
    const totalPriceWei = priceCalculation.totalPriceWei!;
    
    console.log('💰 批量购买总价:', priceCalculation.totalPrice, 'ETH');
    console.log('💰 批量购买总价(Wei):', totalPriceWei.toString(), 'Wei');
    
    // 检查账户余额是否足够
    if (balance.lt(totalPriceWei)) {
      throw new Error(`余额不足: 需要 ${priceCalculation.totalPrice} ETH，当前余额 ${ethers.utils.formatEther(balance)} ETH`);
    }
    
    // Gas估算 - 参考executeSinglePurchase的策略
    console.log(`⛽ 正在估算Gas...`);
    const gasEstimate = await contract.estimateGas.buyMultipleListedTickets(
      projectId,
      optionIndex,
      quantity,
      { value: totalPriceWei }
    );
    console.log(`⛽ Gas估算成功: ${gasEstimate.toString()}`);
    
    // 检查Gas限制
    if (gasEstimate.gt(ethers.utils.parseUnits("30000000", "wei"))) {
      console.warn(`⚠️  Gas估算过高: ${gasEstimate.toString()}`);
    }
    
    // 调用合约函数 - 使用动态Gas估算
    console.log(`🚀 执行交易...`);
    const tx = await contract.buyMultipleListedTickets(
      projectId,
      optionIndex,
      quantity,
      {
        value: totalPriceWei,
        gasLimit: gasEstimate.mul(150).div(100) // 增加50%的Gas缓冲
      }
    );
    
    console.log('📝 批量购买交易已提交:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ 批量购买交易已确认:', receipt.transactionHash);
    console.log(`✅ 购买 ${quantity} 张挂单彩票成功！Gas使用: ${receipt.gasUsed.toString()}`);
    
    // 从返回值中获取购买的彩票ID
    const ticketIds: string[] = [];
    if (receipt.events) {
      const soldEvents = receipt.events.filter((e: any) => e.event === 'MarketplaceAction' && e.args?.action === 'SOLD');
      soldEvents.forEach((event: any) => {
        if (event.args?.ticketId) {
          ticketIds.push(event.args.ticketId.toString());
        }
      });
    }
    
    console.log(`🎟️  获得彩票数量: ${ticketIds.length}`);
    ticketIds.forEach((ticketId, index) => {
      console.log(`   彩票${index + 1} ID: ${ticketId}`);
    });
    
    return {
      success: true,
      ticketIds,
      totalPrice: priceCalculation.totalPrice
    };
  } catch (error: any) {
    console.error('❌ 批量购买挂单彩票失败:', error);
    
    // 详细错误分析 - 参考executeSinglePurchase的策略
    if (error.message.includes("revert")) {
      console.error("   这是一个合约revert错误");
      if (error.reason) {
        console.error("   Revert原因:", error.reason);
      }
    } else if (error.message.includes("gas")) {
      console.error("   这是一个Gas相关错误");
      console.error("   可能是Gas限制不足或Gas估算失败");
    } else if (error.message.includes("insufficient funds")) {
      console.error("   余额不足");
    } else {
      console.error("   其他错误类型");
    }
    
    // 如果是Gas估算失败，尝试分析原因
    if (error.message.includes("estimateGas")) {
      console.log("   🔍 Gas估算失败，可能的原因:");
      console.log("      - 合约中有require()检查失败");
      console.log("      - 数量超过了合约限制");
      console.log("      - 没有足够的挂单彩票可购买");
      console.log("      - 项目状态不允许购买");
    }
    
    return {
      success: false,
      error: error?.reason || error?.message || '批量购买失败'
    };
  }
};

// 计算批量购买的总价格
export const calculateBulkPurchasePrice = async (
  provider: ethers.providers.Web3Provider,
  projectId: string,
  optionIndex: number,
  quantity: number
): Promise<{ success: boolean; totalPrice?: string; totalPriceWei?: ethers.BigNumber; priceBreakdown?: Array<{price: string, count: number}>; error?: string }> => {
  try {
    console.log('💰 计算批量购买价格...', { projectId, optionIndex, quantity });
    
    // 获取该项目和选项的所有活跃挂单
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    
    // 直接获取项目的挂单ID数组
    const listingIds = await contract.getProjectListings(projectId);
    console.log('📊 项目挂单ID数组:', listingIds);
    
    if (!listingIds || listingIds.length === 0) {
      return {
        success: false,
        error: '该项目没有活跃的挂单'
      };
    }
    
    // 过滤出匹配选项的挂单并保持BigNumber格式
    const matchingListings = [];
    
    for (const listingId of listingIds) {
      try {
        const listingDetails = await contract.getListingDetails(listingId);
        
        // 只处理活跃的挂单
        if (!listingDetails.isActive) {
          console.log('跳过非活跃挂单:', listingId.toString());
          continue;
        }
        
        const ticketInfo = await ticketContract.getTicketInfo(listingDetails.ticketId);
        if (ticketInfo.optionIndex.toNumber() === optionIndex) {
          // 验证卖家仍然拥有这张彩票（与合约逻辑保持一致）
          try {
            const currentOwner = await ticketContract.ownerOf(listingDetails.ticketId);
            if (currentOwner.toLowerCase() !== listingDetails.seller.toLowerCase()) {
              console.log('跳过所有权不匹配的挂单:', listingId.toString(), '卖家:', listingDetails.seller, '实际所有者:', currentOwner);
              continue;
            }
          } catch (ownerError) {
            console.warn('验证彩票所有权失败:', listingDetails.ticketId.toString(), ownerError);
            continue;
          }
          
          matchingListings.push({
            listingId: listingDetails.id,
            projectId: listingDetails.projectId,
            ticketId: listingDetails.ticketId,
            seller: listingDetails.seller,
            priceWei: listingDetails.price, // 保持BigNumber格式
            priceEth: ethers.utils.formatEther(listingDetails.price),
            isActive: listingDetails.isActive,
            listTime: listingDetails.listTime,
            optionIndex: ticketInfo.optionIndex.toNumber()
          });
        }
      } catch (error) {
        console.warn('获取挂单详情失败:', listingId.toString(), error);
      }
    }
    
    // 按价格从低到高排序，价格相同时按listingId排序（与合约逻辑保持一致）
    matchingListings.sort((a, b) => {
      if (a.priceWei.lt(b.priceWei)) return -1;
      if (a.priceWei.gt(b.priceWei)) return 1;
      // 价格相同时，按listingId从小到大排序（与合约的收集顺序一致）
      return a.listingId.lt(b.listingId) ? -1 : (a.listingId.gt(b.listingId) ? 1 : 0);
    });
    
    console.log('📊 匹配的挂单:', matchingListings.length, '个');
    
    if (matchingListings.length < quantity) {
      return {
        success: false,
        error: `可购买数量不足，需要 ${quantity} 张，只有 ${matchingListings.length} 张可用`
      };
    }
    
    // 计算总价格（使用BigNumber避免精度问题）
    let totalPriceWei = ethers.BigNumber.from(0);
    const priceBreakdown: Array<{price: string, count: number}> = [];
    const priceGroups: {[key: string]: number} = {};
    
    for (let i = 0; i < quantity; i++) {
      const listing = matchingListings[i];
      totalPriceWei = totalPriceWei.add(listing.priceWei);
      
      const priceStr = listing.priceEth;
      priceGroups[priceStr] = (priceGroups[priceStr] || 0) + 1;
    }
    
    // 构建价格分解
    Object.entries(priceGroups).forEach(([price, count]) => {
      priceBreakdown.push({ price, count });
    });
    
    const totalPriceEth = ethers.utils.formatEther(totalPriceWei);
    console.log('💰 总价格:', totalPriceEth, 'ETH');
    console.log('💰 总价格(Wei):', totalPriceWei.toString());
    console.log('📋 价格分解:', priceBreakdown);
    
    return {
      success: true,
      totalPrice: totalPriceEth,
      totalPriceWei: totalPriceWei,
      priceBreakdown
    };
  } catch (error: any) {
    console.error('❌ 计算批量购买价格失败:', error);
    return {
      success: false,
      error: error.message || '价格计算失败'
    };
  }
};

// 获取项目的挂单列表
export const getProjectListings = async (
  provider: ethers.providers.Web3Provider,
  projectId: string
): Promise<any[]> => {
  try {
    console.log('📋 获取项目挂单列表...', { projectId });
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    
    // 获取项目的挂单ID数组
    const listingIds = await contract.getProjectListings(projectId);
    console.log('📊 项目挂单ID数组:', listingIds);
    
    if (!listingIds || listingIds.length === 0) {
      console.log('ℹ️ 该项目没有活跃的挂单');
      return [];
    }
    
    // 逐个获取挂单详情
    const processedListings = [];
    for (const listingId of listingIds) {
      try {
        const listingDetails = await contract.getListingDetails(listingId);
        console.log(`📄 挂单 ${listingId} 详情:`, listingDetails);
        
        // 确保挂单是活跃的
        if (!listingDetails.isActive) {
          console.log(`⚠️ 跳过非活跃挂单 ${listingId}`);
          continue;
        }
        
        // 获取彩票信息以确定选项
        let optionIndex = 0;
        try {
          const ticketInfo = await ticketContract.getTicketInfo(listingDetails.ticketId);
          optionIndex = ticketInfo.optionIndex.toNumber();
        } catch (ticketError) {
          console.error(`❌ 获取彩票 ${listingDetails.ticketId} 信息失败:`, ticketError);
        }
        
        processedListings.push({
          listingId: listingDetails.id.toString(),
          projectId: listingDetails.projectId.toString(),
          ticketId: listingDetails.ticketId.toString(),
          seller: listingDetails.seller,
          price: ethers.utils.formatEther(listingDetails.price),
          isActive: listingDetails.isActive,
          listTime: listingDetails.listTime.toNumber(),
          optionIndex
        });
      } catch (error) {
        console.error(`❌ 获取挂单 ${listingId} 详情失败:`, error);
      }
    }
    
    console.log('✅ 获取到', processedListings.length, '个项目挂单');
    return processedListings;
  } catch (error: any) {
    console.error('❌ 获取项目挂单列表失败:', error);
    return [];
  }
};

// 取消挂单
export const cancelListing = async (
  provider: ethers.providers.Web3Provider,
  listingId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('❌ 开始取消挂单...', { listingId });
    
    const signer = provider.getSigner();
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 调用合约函数
    const tx = await contract.cancelListing(listingId);
    
    console.log('📝 取消挂单交易已提交:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ 取消挂单交易已确认:', receipt.transactionHash);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('❌ 取消挂单失败:', error);
    return {
      success: false,
      error: error.message || '取消挂单失败'
    };
  }
};

// 获取活跃的挂单列表
export const getActiveListings = async (
  provider: ethers.providers.Web3Provider
): Promise<any[]> => {
  try {
    console.log('📋 开始获取活跃挂单列表...');
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    
    // 首先获取活跃挂单的ID数组
    const listingIds = await contract.getActiveListings();
    console.log('📊 获取到挂单ID数组:', listingIds);
    
    if (!listingIds || listingIds.length === 0) {
      console.log('ℹ️ 没有活跃的挂单');
      return [];
    }
    
    // 逐个获取挂单详情
    const processedListings = [];
    for (const listingId of listingIds) {
      try {
        const listingDetails = await contract.getListingDetails(listingId);
        console.log(`📄 挂单 ${listingId} 详情:`, listingDetails);
        
        // 获取彩票信息以确定选项
        let optionIndex = 0;
        try {
          const ticketInfo = await ticketContract.getTicketInfo(listingDetails.ticketId);
          optionIndex = ticketInfo.optionIndex.toNumber();
          console.log(`🎫 彩票 ${listingDetails.ticketId} 选项索引:`, optionIndex);
        } catch (ticketError) {
          console.error(`❌ 获取彩票 ${listingDetails.ticketId} 信息失败:`, ticketError);
        }
        
        processedListings.push({
          id: listingDetails.id.toString(),
          projectId: listingDetails.projectId.toString(),
          ticketId: listingDetails.ticketId.toString(),
          seller: listingDetails.seller,
          price: ethers.utils.formatEther(listingDetails.price),
          isActive: listingDetails.isActive,
          listTime: listingDetails.listTime.toString(),
          optionIndex: optionIndex // 添加选项索引
        });
      } catch (error) {
        console.error(`❌ 获取挂单 ${listingId} 详情失败:`, error);
      }
    }
    
    console.log('✅ 成功处理', processedListings.length, '个活跃挂单');
    return processedListings;
  } catch (error: any) {
    console.error('❌ 获取活跃挂单列表失败:', error);
    return [];
  }
};

// 获取用户的挂单列表
export const getUserListings = async (
  provider: ethers.providers.Web3Provider,
  userAddress: string
): Promise<any[]> => {
  try {
    console.log('👤 开始获取用户挂单列表...', userAddress);
    
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const listings = await contract.getUserListings(userAddress);
    
    console.log('✅ 获取到', listings.length, '个用户挂单');
    
    // 处理挂单数据
    const processedListings = listings.map((listing: any) => ({
      id: listing.id.toString(),
      projectId: listing.projectId.toString(),
      ticketId: listing.ticketId.toString(),
      seller: listing.seller,
      unitPrice: ethers.utils.formatEther(listing.unitPrice),
      quantity: listing.quantity.toString(),
      remainingQuantity: listing.remainingQuantity.toString(),
      isActive: listing.isActive,
      listTime: listing.listTime.toString()
    }));
    
    return processedListings;
  } catch (error: any) {
    console.error('❌ 获取用户挂单列表失败:', error);
    return [];
  }
};

// 检查 NFT 是否已授权给 EasyBet 合约
export const checkNFTApproval = async (
  provider: ethers.providers.Web3Provider,
  userAddress: string,
  ticketId?: string
): Promise<{ isApproved: boolean; isApprovedForAll: boolean }> => {
  try {
    console.log('🔍 检查 NFT 授权状态...', { userAddress, ticketId });
    
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    
    // 检查是否已授权所有 NFT
    const isApprovedForAll = await ticketContract.isApprovedForAll(userAddress, EASYBET_CONTRACT_ADDRESS);
    console.log('📋 全部授权状态:', isApprovedForAll);
    
    let isApproved = false;
    if (ticketId && !isApprovedForAll) {
      // 检查特定 NFT 的授权
      const approvedAddress = await ticketContract.getApproved(ticketId);
      isApproved = approvedAddress.toLowerCase() === EASYBET_CONTRACT_ADDRESS.toLowerCase();
      console.log('🎫 单个票授权状态:', isApproved, '授权地址:', approvedAddress);
    }
    
    return {
      isApproved: isApproved || isApprovedForAll,
      isApprovedForAll
    };
  } catch (error: any) {
    console.error('❌ 检查 NFT 授权失败:', error);
    return { isApproved: false, isApprovedForAll: false };
  }
};

// 授权单个 NFT 给 EasyBet 合约
export const approveNFT = async (
  provider: ethers.providers.Web3Provider,
  ticketId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔐 开始授权单个 NFT...', ticketId);
    
    const signer = provider.getSigner();
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, signer);
    
    const tx = await ticketContract.approve(EASYBET_CONTRACT_ADDRESS, ticketId);
    console.log('📝 授权交易已提交:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ 授权交易已确认:', receipt.transactionHash);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ 授权单个 NFT 失败:', error);
    return {
      success: false,
      error: error.message || '授权失败'
    };
  }
};

// 检查彩票是否已挂单
export const isTicketListed = async (
  provider: ethers.providers.Web3Provider,
  ticketId: string
): Promise<{ isListed: boolean; listingId?: string; error?: string }> => {
  try {
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    
    const result = await contract.isTicketListed(ticketId);
    
    return {
      isListed: result.isListed,
      listingId: result.listingId.toString()
    };
  } catch (error: any) {
    console.error('检查彩票挂单状态失败:', error);
    return {
      isListed: false,
      error: error.message || '检查彩票挂单状态失败'
    };
  }
};

// 批量检查彩票是否已挂单
export const checkMultipleTicketsListed = async (
  provider: ethers.providers.Web3Provider,
  ticketIds: string[]
): Promise<{ 
  listedTickets: string[]; 
  unlistedTickets: string[]; 
  error?: string 
}> => {
  try {
    const listedTickets: string[] = [];
    const unlistedTickets: string[] = [];
    
    for (const ticketId of ticketIds) {
      const result = await isTicketListed(provider, ticketId);
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.isListed) {
        listedTickets.push(ticketId);
      } else {
        unlistedTickets.push(ticketId);
      }
    }
    
    return {
      listedTickets,
      unlistedTickets
    };
  } catch (error: any) {
    console.error('批量检查彩票挂单状态失败:', error);
    return {
      listedTickets: [],
      unlistedTickets: [],
      error: error.message || '批量检查彩票挂单状态失败'
    };
  }
};

// 授权所有 NFT 给 EasyBet 合约
export const setApprovalForAll = async (
  provider: ethers.providers.Web3Provider,
  approved: boolean = true
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔐 开始设置全部 NFT 授权...', approved);
    
    const signer = provider.getSigner();
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, signer);
    
    const tx = await ticketContract.setApprovalForAll(EASYBET_CONTRACT_ADDRESS, approved);
    console.log('📝 全部授权交易已提交:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ 全部授权交易已确认:', receipt.transactionHash);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ 设置全部 NFT 授权失败:', error);
    return {
      success: false,
      error: error.message || '授权失败'
    };
  }
};