// 简单的合约调试脚本
const { ethers } = require('ethers');

async function debugContract() {
  console.log('🔍 调试合约状态...\n');
  
  // 连接到本地网络
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // 合约地址
  const EASYBET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  try {
    // 1. 检查网络连接
    console.log('1. 检查网络连接...');
    const network = await provider.getNetwork();
    console.log(`   网络 ID: ${network.chainId}`);
    console.log(`   网络名称: ${network.name}`);
    
    // 2. 检查合约代码
    console.log('\n2. 检查合约代码...');
    const code = await provider.getCode(EASYBET_ADDRESS);
    console.log(`   合约代码长度: ${code.length}`);
    
    if (code === '0x') {
      console.log('   ❌ 合约未部署到此地址');
      console.log('   建议: 重新部署合约');
      return;
    } else {
      console.log('   ✅ 合约已部署');
    }
    
    // 3. 尝试调用合约函数
    console.log('\n3. 测试合约函数...');
    
    // 简化的 ABI，只包含我们需要测试的函数
    const abi = [
      'function projectCounter() view returns (uint256)',
      'function createProject(string title, string description, string[] options, uint256 endTime) payable returns (uint256)'
    ];
    
    const contract = new ethers.Contract(EASYBET_ADDRESS, abi, provider);
    
    try {
      const counter = await contract.projectCounter();
      console.log(`   ✅ projectCounter(): ${counter}`);
    } catch (error) {
      console.log(`   ❌ projectCounter() 失败: ${error.message}`);
    }
    
    // 4. 检查函数签名
    console.log('\n4. 检查 createProject 函数...');
    try {
      const fragment = contract.interface.getFunction('createProject');
      console.log(`   ✅ createProject 函数存在`);
      console.log(`   函数签名: ${fragment.format()}`);
    } catch (error) {
      console.log(`   ❌ createProject 函数检查失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error('调试过程出错:', error.message);
    
    if (error.code === 'NETWORK_ERROR') {
      console.log('\n💡 建议:');
      console.log('   1. 确保 Hardhat 节点正在运行: npx hardhat node');
      console.log('   2. 检查网络地址是否正确: http://127.0.0.1:8545');
    }
  }
}

debugContract().catch(console.error);