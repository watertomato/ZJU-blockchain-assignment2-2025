// MetaMask 连接和网络调试脚本
// 在浏览器控制台中运行此脚本

async function debugMetaMaskConnection() {
  console.log('🔍 MetaMask 连接和网络调试');
  console.log('================================');
  
  // 1. 检查 MetaMask 是否可用
  console.log('\n🦊 MetaMask 可用性检查:');
  if (typeof window.ethereum !== 'undefined') {
    console.log('  ✅ MetaMask 已安装');
    console.log('  版本:', window.ethereum.version || '未知');
  } else {
    console.log('  ❌ MetaMask 未安装');
    return;
  }
  
  try {
    // 2. 检查当前网络
    console.log('\n🌐 当前网络状态:');
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('  当前链ID:', chainId);
    console.log('  十进制链ID:', parseInt(chainId, 16));
    console.log('  预期链ID: 0x7a69 (31337)');
    console.log('  网络匹配:', chainId === '0x7a69' ? '✅' : '❌');
    
    // 3. 检查账户连接
    console.log('\n👤 账户连接状态:');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    console.log('  连接的账户数:', accounts.length);
    if (accounts.length > 0) {
      console.log('  当前账户:', accounts[0]);
      
      // 4. 检查账户余额
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
      console.log('  账户余额:', balanceInEth.toFixed(4), 'ETH');
    } else {
      console.log('  ❌ 没有连接的账户');
    }
    
    // 5. 测试合约连接
    console.log('\n📋 合约连接测试:');
    const contractAddress = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
    
    try {
      // 检查合约代码
      const code = await window.ethereum.request({
        method: 'eth_getCode',
        params: [contractAddress, 'latest']
      });
      
      if (code && code !== '0x') {
        console.log('  ✅ 合约存在于当前网络');
        console.log('  合约代码长度:', code.length);
      } else {
        console.log('  ❌ 合约不存在于当前网络');
        console.log('  这可能是问题的根源！');
      }
    } catch (error) {
      console.log('  ❌ 合约检查失败:', error.message);
    }
    
    // 6. 测试简单的合约调用
    console.log('\n🔧 合约调用测试:');
    try {
      const projectCounterCall = {
        to: contractAddress,
        data: '0x4b9a4f0e' // projectCounter() 函数选择器
      };
      
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [projectCounterCall, 'latest']
      });
      
      const projectCount = parseInt(result, 16);
      console.log('  ✅ 项目计数器调用成功:', projectCount);
    } catch (error) {
      console.log('  ❌ 合约调用失败:', error.message);
    }
    
    // 7. 检查 RPC 连接
    console.log('\n📡 RPC 连接测试:');
    try {
      const blockNumber = await window.ethereum.request({
        method: 'eth_blockNumber'
      });
      console.log('  ✅ 当前区块号:', parseInt(blockNumber, 16));
    } catch (error) {
      console.log('  ❌ RPC 连接失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  }
}

// 运行调试
console.log('🚀 开始 MetaMask 调试...');
debugMetaMaskConnection();