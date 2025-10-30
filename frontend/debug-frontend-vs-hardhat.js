// 前端 vs Hardhat 环境对比调试脚本
const { ethers } = require('ethers');

async function debugEnvironmentDifferences() {
  console.log('🔍 前端 vs Hardhat 环境对比调试');
  console.log('=====================================');
  
  // 1. 检查网络连接
  console.log('\n📡 网络连接检查:');
  
  try {
    // 模拟前端环境 - 连接到本地网络
    const frontendProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await frontendProvider.getNetwork();
    console.log('  前端网络:', {
      chainId: network.chainId,
      name: network.name
    });
    
    const blockNumber = await frontendProvider.getBlockNumber();
    console.log('  当前区块:', blockNumber);
    
    // 2. 检查账户余额
    console.log('\n💰 账户余额检查:');
    const accounts = await frontendProvider.listAccounts();
    console.log('  可用账户数量:', accounts.length);
    
    if (accounts.length > 0) {
      const balance = await frontendProvider.getBalance(accounts[0]);
      console.log('  第一个账户余额:', ethers.utils.formatEther(balance), 'ETH');
      console.log('  第一个账户地址:', accounts[0]);
    }
    
    // 3. 检查合约状态
    console.log('\n📋 合约状态检查:');
    const contractAddress = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
    
    const contractABI = [
      'function getProject(uint256) view returns (uint256, string, string, string[], uint256, uint256, uint256, address, bool, bool, uint256, uint256)',
      'function projectCounter() view returns (uint256)',
      'function ticketNFTAddress() view returns (address)'
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, frontendProvider);
    
    const projectCounter = await contract.projectCounter();
    console.log('  项目总数:', projectCounter.toString());
    
    const ticketNFTAddress = await contract.ticketNFTAddress();
    console.log('  TicketNFT地址:', ticketNFTAddress);
    
    // 4. 检查项目1的详细信息
    if (projectCounter.gt(0)) {
      console.log('\n📊 项目1详细信息:');
      const project = await contract.getProject(1);
      console.log('  项目ID:', project[0].toString());
      console.log('  标题:', project[1]);
      console.log('  选项:', project[3]);
      console.log('  票价:', ethers.utils.formatEther(project[4]), 'ETH');
      console.log('  结束时间:', new Date(project[5].toNumber() * 1000).toLocaleString());
      console.log('  是否活跃:', project[8]);
      console.log('  是否结束:', project[9]);
    }
    
    // 5. 模拟交易参数
    console.log('\n🔧 交易参数模拟:');
    const projectId = 1;
    const optionIndex = 0;
    const quantity = 1;
    const ticketPrice = ethers.utils.parseEther('0.01'); // 假设票价
    const totalAmount = ticketPrice.mul(quantity);
    
    console.log('  项目ID:', projectId);
    console.log('  选项索引:', optionIndex);
    console.log('  数量:', quantity);
    console.log('  总金额:', ethers.utils.formatEther(totalAmount), 'ETH');
    
    // 6. 尝试估算Gas
    console.log('\n⛽ Gas估算测试:');
    try {
      const purchaseABI = [
        'function purchaseMultipleTickets(uint256 projectId, uint256 optionIndex, uint256 quantity) payable returns (uint256[])'
      ];
      
      const purchaseContract = new ethers.Contract(contractAddress, purchaseABI, frontendProvider);
      
      // 使用第一个账户进行估算
      if (accounts.length > 0) {
        const signer = frontendProvider.getSigner(accounts[0]);
        const contractWithSigner = purchaseContract.connect(signer);
        
        const gasEstimate = await contractWithSigner.estimateGas.purchaseMultipleTickets(
          projectId,
          optionIndex,
          quantity,
          { value: totalAmount }
        );
        
        console.log('  估算Gas:', gasEstimate.toString());
        console.log('  Gas估算成功 ✅');
      }
    } catch (error) {
      console.log('  Gas估算失败 ❌');
      console.log('  错误:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
  }
}

// 运行调试
debugEnvironmentDifferences().catch(console.error);