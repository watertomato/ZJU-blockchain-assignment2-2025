const { ethers } = require('ethers');

// 合约地址和ABI
const EASYBET_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const TICKET_NFT_CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const EASYBET_ABI = [
  'function getProjectListings(uint256 projectId) view returns (uint256[])',
  'function getListingDetails(uint256 listingId) view returns (uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 price, bool isActive, uint256 listTime)',
  'function buyMultipleListedTickets(uint256 projectId, uint256 optionIndex, uint256 quantity) payable returns (uint256[])'
];

const TICKET_NFT_ABI = [
  'function getTicketInfo(uint256 tokenId) view returns (uint256 projectId, uint256 optionIndex, uint256 betAmount, address bettor, uint256 purchaseTimestamp, string metadataURI)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

async function testBatchPurchaseLogic() {
  console.log('🧪 测试批量购买逻辑一致性...');
  
  try {
    // 连接到本地Hardhat网络
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    
    // 获取账户
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      console.log('❌ 没有可用账户，请确保Hardhat网络正在运行');
      return;
    }
    
    console.log('👤 使用账户:', accounts[0]);
    
    // 创建合约实例
    const contract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
    const ticketContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);
    
    // 测试参数
    const projectId = 1;
    const optionIndex = 0;
    
    console.log(`📊 测试项目 ${projectId}，选项 ${optionIndex} 的挂单...`);
    
    // 获取项目挂单
    const listingIds = await contract.getProjectListings(projectId);
    console.log('📋 项目挂单ID:', listingIds.map(id => id.toString()));
    
    if (listingIds.length === 0) {
      console.log('ℹ️ 该项目没有挂单，无法测试批量购买');
      return;
    }
    
    // 模拟前端的挂单筛选逻辑（修复后的版本）
    const matchingListings = [];
    
    for (const listingId of listingIds) {
      try {
        const listingDetails = await contract.getListingDetails(listingId);
        
        if (!listingDetails.isActive) {
          console.log(`⏭️ 跳过非活跃挂单: ${listingId}`);
          continue;
        }
        
        const ticketInfo = await ticketContract.getTicketInfo(listingDetails.ticketId);
        if (ticketInfo.optionIndex.toNumber() !== optionIndex) {
          console.log(`⏭️ 跳过不匹配选项的挂单: ${listingId}`);
          continue;
        }
        
        // 验证NFT所有权（修复的关键部分）
        try {
          const currentOwner = await ticketContract.ownerOf(listingDetails.ticketId);
          if (currentOwner.toLowerCase() !== listingDetails.seller.toLowerCase()) {
            console.log(`⚠️ 所有权不匹配的挂单: ${listingId}`);
            console.log(`   卖家: ${listingDetails.seller}`);
            console.log(`   实际所有者: ${currentOwner}`);
            continue;
          }
        } catch (ownerError) {
          console.log(`❌ 验证所有权失败: ${listingId}`, ownerError.message);
          continue;
        }
        
        matchingListings.push({
          listingId: listingDetails.id.toString(),
          ticketId: listingDetails.ticketId.toString(),
          seller: listingDetails.seller,
          price: ethers.utils.formatEther(listingDetails.price),
          priceWei: listingDetails.price
        });
        
      } catch (error) {
        console.log(`❌ 处理挂单 ${listingId} 失败:`, error.message);
      }
    }
    
    console.log(`✅ 找到 ${matchingListings.length} 个有效挂单:`);
    matchingListings.forEach((listing, index) => {
      console.log(`  ${index + 1}. 挂单ID: ${listing.listingId}, 价格: ${listing.price} ETH, 卖家: ${listing.seller}`);
    });
    
    // 按价格排序
    matchingListings.sort((a, b) => {
      if (a.priceWei.lt(b.priceWei)) return -1;
      if (a.priceWei.gt(b.priceWei)) return 1;
      return 0;
    });
    
    console.log('\n📊 按价格排序后:');
    matchingListings.forEach((listing, index) => {
      console.log(`  ${index + 1}. 挂单ID: ${listing.listingId}, 价格: ${listing.price} ETH`);
    });
    
    if (matchingListings.length >= 2) {
      console.log('\n🎯 可以测试批量购买不同价格的彩票');
      console.log('💡 建议在前端界面中尝试购买 2-3 张不同价格的彩票');
    } else {
      console.log('\n⚠️ 有效挂单数量不足，无法测试批量购买不同价格的功能');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testBatchPurchaseLogic().catch(console.error);