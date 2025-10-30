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
  
  // 只读函数
  'function getProject(uint256) view returns (uint256, string, string, string[], uint256, uint256, uint256, address, bool, bool, uint256, uint256)',
  'function getUserProjects(address user) view returns (uint256[])',
  'function getActiveProjects() view returns (uint256[])',
  'function getOptionBets(uint256 projectId) view returns (uint256[])',
  'function getUserBets(address user, uint256 projectId) view returns (uint256[])',
  'function projectCounter() view returns (uint256)',
  'function ticketNFTAddress() view returns (address)',
  'function notaryNFTAddress() view returns (address)',
  'function getActiveListings() view returns (tuple(uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 unitPrice, uint256 quantity, uint256 remainingQuantity, bool isActive, uint256 listTime)[])',
  'function getUserListings(address user) view returns (tuple(uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 unitPrice, uint256 quantity, uint256 remainingQuantity, bool isActive, uint256 listTime)[])',
  'function getProjectListings(uint256 projectId) view returns (tuple(uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 unitPrice, uint256 quantity, uint256 remainingQuantity, bool isActive, uint256 listTime)[])',
  'function getListingDetails(uint256 listingId) view returns (tuple(uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 unitPrice, uint256 quantity, uint256 remainingQuantity, bool isActive, uint256 listTime))',
  
  // 函数
  'function createProject(string title, string description, string[] options, uint256 ticketPrice, uint256 endTime) payable returns (uint256)',
  'function purchaseTicket(uint256 projectId, uint256 optionIndex) payable returns (uint256)',
  'function purchaseMultipleTickets(uint256 projectId, uint256 optionIndex, uint256 quantity) payable returns (uint256[])',
  'function listTicketForSale(uint256 ticketId, uint256 unitPrice, uint256 quantity) returns (uint256)',
  'function buyListedTicket(uint256 listingId, uint256 quantity) payable returns (bool)',
  'function cancelListing(uint256 listingId) returns (bool)',
  
  // 管理函数
  'function setNotaryNFTAddress(address _notaryNFTAddress)',
  'function setTicketNFTAddress(address _ticketNFTAddress)'
];

// TicketNFT 合约 ABI
const TICKET_NFT_ABI = [
  // 事件
  'event TicketMinted(address indexed to, uint256 indexed tokenId, uint256 indexed projectId, uint256 optionIndex, uint256 betAmount)',
  
  // 只读函数
  'function getTicketInfo(uint256 tokenId) view returns (uint256 projectId, uint256 optionIndex, uint256 betAmount, address bettor, uint256 purchaseTimestamp, string metadataURI)',
  'function getTicketsByOwner(address owner) view returns (uint256[])',
  'function getTicketsByProject(uint256 projectId) view returns (uint256[])',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function authorizedMinter() view returns (address)',
  
  // 写入函数
  'function mintTicket(address to, uint256 projectId, uint256 optionIndex, uint256 betAmount, string metadataURI) returns (uint256)',
  'function setAuthorizedMinter(address minter)'
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
  unitPrice: string, // ETH 金额
  quantity: number
): Promise<{ success: boolean; listingId?: string; error?: string }> => {
  try {
    console.log('🎫 开始挂单出售彩票...', { ticketId, unitPrice, quantity });
    
    const signer = provider.getSigner();
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 将价格转换为 wei
    const unitPriceWei = ethers.utils.parseEther(unitPrice);
    
    // 调用合约函数
    const tx = await contract.listTicketForSale(
      ticketId,
      unitPriceWei,
      quantity
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

// 购买挂单彩票
export const buyListedTicket = async (
  provider: ethers.providers.Web3Provider,
  listingId: string,
  quantity: number,
  totalAmount: string // ETH 金额
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🛒 开始购买挂单彩票...', { listingId, quantity, totalAmount });
    
    const signer = provider.getSigner();
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, signer);
    
    // 将金额转换为 wei
    const totalAmountWei = ethers.utils.parseEther(totalAmount);
    
    // 调用合约函数
    const tx = await contract.buyListedTicket(listingId, quantity, {
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
    const listings = await contract.getActiveListings();
    
    console.log('✅ 获取到', listings.length, '个活跃挂单');
    
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