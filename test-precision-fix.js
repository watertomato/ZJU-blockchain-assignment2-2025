const { ethers } = require('ethers');

console.log('🧪 测试浮点数精度修复');

// 模拟原来的错误计算方式
const ticketPrice = 0.05;
const quantity = 3;
const oldWayTotal = ticketPrice * quantity;
console.log('❌ 旧方式 (JavaScript 浮点数):', oldWayTotal);
console.log('   转换为字符串:', oldWayTotal.toString());

// 模拟新的正确计算方式
const ticketPriceWei = ethers.utils.parseEther('0.05');
const totalPriceWei = ticketPriceWei.mul(quantity);
const newWayTotal = ethers.utils.formatEther(totalPriceWei);
console.log('✅ 新方式 (ethers BigNumber):', newWayTotal);
console.log('   转换为字符串:', newWayTotal.toString());

// 验证合约期望的值
const contractExpected = ethers.utils.parseEther('0.05').mul(3);
const contractExpectedEth = ethers.utils.formatEther(contractExpected);
console.log('🔒 合约期望值:', contractExpectedEth);

// 比较结果
console.log('\n📊 比较结果:');
console.log('旧方式 === 合约期望:', oldWayTotal.toString() === contractExpectedEth);
console.log('新方式 === 合约期望:', newWayTotal === contractExpectedEth);