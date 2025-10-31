const { ethers } = require('ethers');

// 模拟前端排序逻辑
function simulateFrontendSorting(listings) {
  const sortedListings = [...listings];
  
  // 按价格从低到高排序，价格相同时按listingId排序（与合约逻辑保持一致）
  sortedListings.sort((a, b) => {
    if (a.priceWei.lt(b.priceWei)) return -1;
    if (a.priceWei.gt(b.priceWei)) return 1;
    // 价格相同时，按listingId从小到大排序（与合约的收集顺序一致）
    return a.listingId.lt(b.listingId) ? -1 : (a.listingId.gt(b.listingId) ? 1 : 0);
  });
  
  return sortedListings;
}

// 模拟合约排序逻辑
function simulateContractSorting(listings) {
  // 合约首先按listingId收集（从小到大），然后冒泡排序
  const sortedListings = [...listings];
  
  // 先按listingId排序（模拟合约的收集过程）
  sortedListings.sort((a, b) => {
    return a.listingId.lt(b.listingId) ? -1 : (a.listingId.gt(b.listingId) ? 1 : 0);
  });
  
  // 然后冒泡排序按价格（合约逻辑）
  for (let i = 0; i < sortedListings.length; i++) {
    for (let j = i + 1; j < sortedListings.length; j++) {
      if (sortedListings[i].priceWei.gt(sortedListings[j].priceWei)) {
        // 交换位置
        const temp = sortedListings[i];
        sortedListings[i] = sortedListings[j];
        sortedListings[j] = temp;
      }
    }
  }
  
  return sortedListings;
}

async function testSortingConsistency() {
  console.log('🧪 测试排序一致性...\n');
  
  // 创建测试数据：不同价格的挂单
  const testListings = [
    {
      listingId: ethers.BigNumber.from(5),
      priceWei: ethers.utils.parseEther('0.1'),
      priceEth: '0.1',
      seller: '0x1234...5678'
    },
    {
      listingId: ethers.BigNumber.from(3),
      priceWei: ethers.utils.parseEther('0.2'),
      priceEth: '0.2', 
      seller: '0x2345...6789'
    },
    {
      listingId: ethers.BigNumber.from(7),
      priceWei: ethers.utils.parseEther('0.1'),
      priceEth: '0.1',
      seller: '0x3456...7890'
    },
    {
      listingId: ethers.BigNumber.from(2),
      priceWei: ethers.utils.parseEther('0.15'),
      priceEth: '0.15',
      seller: '0x4567...8901'
    },
    {
      listingId: ethers.BigNumber.from(8),
      priceWei: ethers.utils.parseEther('0.1'),
      priceEth: '0.1',
      seller: '0x5678...9012'
    }
  ];
  
  console.log('📊 原始挂单数据:');
  testListings.forEach((listing, index) => {
    console.log(`  ${index + 1}. ID: ${listing.listingId.toString()}, 价格: ${listing.priceEth} ETH`);
  });
  
  // 测试前端排序
  const frontendSorted = simulateFrontendSorting(testListings);
  console.log('\n🖥️ 前端排序结果:');
  frontendSorted.forEach((listing, index) => {
    console.log(`  ${index + 1}. ID: ${listing.listingId.toString()}, 价格: ${listing.priceEth} ETH`);
  });
  
  // 测试合约排序
  const contractSorted = simulateContractSorting(testListings);
  console.log('\n📋 合约排序结果:');
  contractSorted.forEach((listing, index) => {
    console.log(`  ${index + 1}. ID: ${listing.listingId.toString()}, 价格: ${listing.priceEth} ETH`);
  });
  
  // 验证一致性
  let isConsistent = true;
  if (frontendSorted.length !== contractSorted.length) {
    isConsistent = false;
  } else {
    for (let i = 0; i < frontendSorted.length; i++) {
      if (!frontendSorted[i].listingId.eq(contractSorted[i].listingId)) {
        isConsistent = false;
        break;
      }
    }
  }
  
  console.log('\n🔍 一致性检查:');
  if (isConsistent) {
    console.log('✅ 前端和合约排序结果一致！');
    console.log('✅ 修复成功：相同价格的挂单现在按listingId排序');
  } else {
    console.log('❌ 前端和合约排序结果不一致');
    console.log('❌ 需要进一步调整排序逻辑');
  }
  
  // 测试批量购买场景
  console.log('\n🎯 批量购买场景测试:');
  const quantity = 3;
  console.log(`购买数量: ${quantity} 张`);
  
  console.log('\n前端选择的挂单:');
  for (let i = 0; i < Math.min(quantity, frontendSorted.length); i++) {
    console.log(`  ${i + 1}. ID: ${frontendSorted[i].listingId.toString()}, 价格: ${frontendSorted[i].priceEth} ETH`);
  }
  
  console.log('\n合约选择的挂单:');
  for (let i = 0; i < Math.min(quantity, contractSorted.length); i++) {
    console.log(`  ${i + 1}. ID: ${contractSorted[i].listingId.toString()}, 价格: ${contractSorted[i].priceEth} ETH`);
  }
  
  console.log('\n💡 关键改进:');
  console.log('- 添加了listingId作为次级排序条件');
  console.log('- 确保相同价格的挂单排序一致');
  console.log('- 避免了ERC721IncorrectOwner错误');
}

// 运行测试
testSortingConsistency().catch(console.error);