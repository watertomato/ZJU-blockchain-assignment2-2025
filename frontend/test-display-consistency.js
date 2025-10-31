/**
 * 测试交易市场显示数量与购买验证数量的一致性
 * 验证修复后的显示逻辑是否与购买验证逻辑保持一致
 */

const { ethers } = require('ethers');

// 合约地址和ABI
const EASYBET_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const TICKET_NFT_CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const EASYBET_ABI = [
  'function getActiveListings() view returns (uint256[])',
  'function getListingDetails(uint256 listingId) view returns (uint256 id, uint256 projectId, uint256 ticketId, address seller, uint256 price, bool isActive, uint256 listTime)',
  'function getProject(uint256) view returns (uint256, string, string, string[], uint256, uint256, uint256, address, bool, bool, uint256, uint256)'
];

const TICKET_NFT_ABI = [
  'function getTicketInfo(uint256 tokenId) view returns (uint256 projectId, uint256 optionIndex, uint256 betAmount, address bettor, uint256 purchaseTimestamp, string metadataURI)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

async function testDisplayConsistency() {
  console.log('🔍 开始测试显示数量与购买验证数量的一致性...\n');

  // 连接到本地网络
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const easybetContract = new ethers.Contract(EASYBET_CONTRACT_ADDRESS, EASYBET_ABI, provider);
  const ticketNFTContract = new ethers.Contract(TICKET_NFT_CONTRACT_ADDRESS, TICKET_NFT_ABI, provider);

  try {
    // 1. 获取所有活跃挂单
    console.log('📋 获取所有活跃挂单...');
    const activeListingIds = await easybetContract.getActiveListings();
    console.log(`找到 ${activeListingIds.length} 个活跃挂单`);

    // 2. 模拟MarketPage的显示逻辑（修复后）
    console.log('\n🖥️  模拟MarketPage显示逻辑（修复后）...');
    const displayAggregatedData = new Map();
    let displayValidListings = 0;
    let displaySkippedListings = 0;

    for (const listingId of activeListingIds) {
      try {
        const listingDetails = await easybetContract.getListingDetails(listingId);
        
        if (!listingDetails.isActive) {
          console.log(`跳过非活跃挂单: ${listingId}`);
          continue;
        }

        // 验证NFT所有权（MarketPage新增的逻辑）
        try {
          const currentOwner = await ticketNFTContract.ownerOf(listingDetails.ticketId);
          if (currentOwner.toLowerCase() !== listingDetails.seller.toLowerCase()) {
            console.log(`显示逻辑跳过所有权不匹配的挂单: ${listingId}`);
            displaySkippedListings++;
            continue;
          }
        } catch (ownerError) {
          console.log(`显示逻辑跳过所有权验证失败的挂单: ${listingId}`);
          displaySkippedListings++;
          continue;
        }

        // 获取彩票信息
        const ticketInfo = await ticketNFTContract.getTicketInfo(listingDetails.ticketId);
        const projectId = listingDetails.projectId.toString();
        const optionIndex = ticketInfo.optionIndex.toNumber();
        const key = `${projectId}-${optionIndex}`;

        if (!displayAggregatedData.has(key)) {
          displayAggregatedData.set(key, {
            projectId,
            optionIndex,
            listings: []
          });
        }

        displayAggregatedData.get(key).listings.push({
          listingId: listingDetails.id,
          price: parseFloat(ethers.utils.formatEther(listingDetails.price)),
          seller: listingDetails.seller
        });

        displayValidListings++;
      } catch (error) {
        console.error(`处理挂单 ${listingId} 失败:`, error.message);
        displaySkippedListings++;
      }
    }

    // 3. 模拟calculateBulkPurchasePrice的验证逻辑
    console.log('\n💰 模拟购买验证逻辑...');
    const purchaseAggregatedData = new Map();
    let purchaseValidListings = 0;
    let purchaseSkippedListings = 0;

    for (const listingId of activeListingIds) {
      try {
        const listingDetails = await easybetContract.getListingDetails(listingId);
        
        if (!listingDetails.isActive) {
          continue;
        }

        // 获取彩票信息
        const ticketInfo = await ticketNFTContract.getTicketInfo(listingDetails.ticketId);
        
        // 验证NFT所有权（购买验证逻辑）
        try {
          const currentOwner = await ticketNFTContract.ownerOf(listingDetails.ticketId);
          if (currentOwner.toLowerCase() !== listingDetails.seller.toLowerCase()) {
            console.log(`购买验证跳过所有权不匹配的挂单: ${listingId}`);
            purchaseSkippedListings++;
            continue;
          }
        } catch (ownerError) {
          console.log(`购买验证跳过所有权验证失败的挂单: ${listingId}`);
          purchaseSkippedListings++;
          continue;
        }

        const projectId = listingDetails.projectId.toString();
        const optionIndex = ticketInfo.optionIndex.toNumber();
        const key = `${projectId}-${optionIndex}`;

        if (!purchaseAggregatedData.has(key)) {
          purchaseAggregatedData.set(key, {
            projectId,
            optionIndex,
            listings: []
          });
        }

        purchaseAggregatedData.get(key).listings.push({
          listingId: listingDetails.id,
          price: parseFloat(ethers.utils.formatEther(listingDetails.price)),
          seller: listingDetails.seller
        });

        purchaseValidListings++;
      } catch (error) {
        console.error(`购买验证处理挂单 ${listingId} 失败:`, error.message);
        purchaseSkippedListings++;
      }
    }

    // 4. 比较结果
    console.log('\n📊 比较结果:');
    console.log(`总挂单数: ${activeListingIds.length}`);
    console.log(`显示逻辑 - 有效挂单: ${displayValidListings}, 跳过挂单: ${displaySkippedListings}`);
    console.log(`购买验证 - 有效挂单: ${purchaseValidListings}, 跳过挂单: ${purchaseSkippedListings}`);

    // 5. 详细比较每个项目选项的数量
    console.log('\n🔍 详细比较每个项目选项的数量:');
    const allKeys = new Set([...displayAggregatedData.keys(), ...purchaseAggregatedData.keys()]);
    let consistencyIssues = 0;

    for (const key of allKeys) {
      const displayCount = displayAggregatedData.get(key)?.listings.length || 0;
      const purchaseCount = purchaseAggregatedData.get(key)?.listings.length || 0;
      
      const status = displayCount === purchaseCount ? '✅' : '❌';
      console.log(`${status} ${key}: 显示=${displayCount}, 购买验证=${purchaseCount}`);
      
      if (displayCount !== purchaseCount) {
        consistencyIssues++;
        console.log(`   差异详情:`);
        
        if (displayAggregatedData.has(key)) {
          console.log(`   显示逻辑挂单: ${displayAggregatedData.get(key).listings.map(l => l.listingId.toString()).join(', ')}`);
        }
        
        if (purchaseAggregatedData.has(key)) {
          console.log(`   购买验证挂单: ${purchaseAggregatedData.get(key).listings.map(l => l.listingId.toString()).join(', ')}`);
        }
      }
    }

    // 6. 总结
    console.log('\n📋 测试总结:');
    if (consistencyIssues === 0) {
      console.log('🎉 修复成功！显示数量与购买验证数量完全一致');
    } else {
      console.log(`⚠️  仍存在 ${consistencyIssues} 个不一致的项目选项`);
    }

    console.log(`总体一致性: ${displayValidListings === purchaseValidListings ? '✅ 一致' : '❌ 不一致'}`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testDisplayConsistency()
  .then(() => {
    console.log('\n✅ 一致性测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });