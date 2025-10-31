/**
 * 调试重复挂单问题
 * 验证同一张彩票是否可以被重复挂单
 */

const { ethers } = require('ethers');

// 合约地址和ABI
const EASYBET_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const TICKET_NFT_CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const EASYBET_ABI = [
  'function getActiveListings() view returns (uint256[])',
  'function getListingDetails(uint256 listingId) view returns (uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 price, bool isActive, uint256 listTime)',
  'function getUserListings(address user) view returns (uint256[])'
];

const TICKET_NFT_ABI = [
  'function getTicketInfo(uint256 tokenId) view returns (uint256 projectId, uint256 optionIndex, uint256 betAmount, address bettor, uint256 purchaseTimestamp, string metadataURI)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

async function debugDuplicateListing() {
  console.log('🔍 开始调试重复挂单问题...\n');

  // 连接到本地网络
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const easybetContract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
  const ticketNFTContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);

  try {
    // 1. 获取所有活跃挂单
    console.log('📋 获取所有活跃挂单...');
    const activeListingIds = await easybetContract.getActiveListings();
    console.log(`找到 ${activeListingIds.length} 个活跃挂单\n`);

    // 2. 分析每个挂单的详情
    const ticketListingMap = new Map(); // ticketId -> 挂单列表
    const duplicateTickets = new Map(); // ticketId -> 重复挂单数量

    console.log('🔍 分析挂单详情...');
    for (const listingId of activeListingIds) {
      try {
        const listingDetails = await easybetContract.getListingDetails(listingId);
        
        if (!listingDetails.isActive) {
          console.log(`跳过非活跃挂单: ${listingId}`);
          continue;
        }

        const ticketId = listingDetails.ticketId.toString();
        const price = ethers.utils.formatEther(listingDetails.price);
        
        console.log(`挂单 ${listingId}: 彩票ID=${ticketId}, 价格=${price} ETH, 卖家=${listingDetails.seller}`);

        // 检查彩票所有权
        try {
          const currentOwner = await ticketNFTContract.ownerOf(listingDetails.ticketId);
          const ownershipValid = currentOwner.toLowerCase() === listingDetails.seller.toLowerCase();
          console.log(`  所有权验证: ${ownershipValid ? '✅ 有效' : '❌ 无效'} (当前所有者: ${currentOwner})`);
          
          if (!ownershipValid) {
            console.log(`  ⚠️  彩票 ${ticketId} 的所有者已变更，但挂单仍然活跃！`);
          }
        } catch (ownerError) {
          console.log(`  ❌ 无法验证彩票 ${ticketId} 的所有权:`, ownerError.message);
        }

        // 记录彩票的挂单情况
        if (!ticketListingMap.has(ticketId)) {
          ticketListingMap.set(ticketId, []);
        }
        
        ticketListingMap.get(ticketId).push({
          listingId: listingId.toString(),
          price: price,
          seller: listingDetails.seller,
          listTime: new Date(listingDetails.listTime.toNumber() * 1000).toLocaleString()
        });

      } catch (error) {
        console.error(`❌ 获取挂单 ${listingId} 详情失败:`, error.message);
      }
    }

    console.log('\n📊 重复挂单分析:');
    
    // 3. 检查重复挂单
    let duplicateCount = 0;
    for (const [ticketId, listings] of ticketListingMap.entries()) {
      if (listings.length > 1) {
        duplicateCount++;
        duplicateTickets.set(ticketId, listings.length);
        
        console.log(`\n🚨 发现重复挂单 - 彩票ID: ${ticketId}`);
        console.log(`   重复次数: ${listings.length}`);
        listings.forEach((listing, index) => {
          console.log(`   ${index + 1}. 挂单ID: ${listing.listingId}, 价格: ${listing.price} ETH, 卖家: ${listing.seller}, 时间: ${listing.listTime}`);
        });
        
        // 验证当前彩票所有权
        try {
          const currentOwner = await ticketNFTContract.ownerOf(ticketId);
          console.log(`   当前彩票所有者: ${currentOwner}`);
          
          const validListings = listings.filter(listing => 
            listing.seller.toLowerCase() === currentOwner.toLowerCase()
          );
          
          console.log(`   有效挂单数量: ${validListings.length}/${listings.length}`);
          
          if (validListings.length === 0) {
            console.log(`   ⚠️  所有挂单都无效！彩票已被转移但挂单未清理`);
          } else if (validListings.length > 1) {
            console.log(`   🚨 同一张彩票存在多个有效挂单！这是重复挂单bug！`);
          }
          
        } catch (ownerError) {
          console.log(`   ❌ 无法验证彩票所有权:`, ownerError.message);
        }
      }
    }

    // 4. 总结报告
    console.log('\n📋 调试总结:');
    console.log(`总挂单数: ${activeListingIds.length}`);
    console.log(`涉及彩票数: ${ticketListingMap.size}`);
    console.log(`重复挂单的彩票数: ${duplicateCount}`);
    
    if (duplicateCount > 0) {
      console.log('\n🚨 发现重复挂单问题！');
      console.log('问题分析:');
      console.log('1. 合约没有检查同一张彩票是否已经在挂单中');
      console.log('2. 用户可以对同一张彩票创建多个不同价格的挂单');
      console.log('3. 当其中一个挂单被购买后，其他挂单变成"僵尸挂单"');
      console.log('4. 这导致市场显示不准确的可购买数量');
      
      console.log('\n💡 建议解决方案:');
      console.log('1. 在合约中添加 ticketId -> listingId 的映射');
      console.log('2. 挂单前检查彩票是否已经在挂单中');
      console.log('3. 购买成功后自动取消同一彩票的其他挂单');
      console.log('4. 添加挂单清理机制');
    } else {
      console.log('✅ 未发现重复挂单问题');
    }

  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

// 运行调试
debugDuplicateListing()
  .then(() => {
    console.log('\n✅ 重复挂单调试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 调试执行失败:', error);
    process.exit(1);
  });