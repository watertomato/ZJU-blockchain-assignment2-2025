// 调试前端合约地址配置
require('dotenv').config();

console.log('🔍 前端合约地址配置检查:');
console.log('');

console.log('📋 环境变量:');
console.log('  REACT_APP_EASYBET_CONTRACT_ADDRESS:', process.env.REACT_APP_EASYBET_CONTRACT_ADDRESS);
console.log('  REACT_APP_TICKET_NFT_ADDRESS:', process.env.REACT_APP_TICKET_NFT_ADDRESS);
console.log('  REACT_APP_NOTARY_NFT_ADDRESS:', process.env.REACT_APP_NOTARY_NFT_ADDRESS);
console.log('');

console.log('🎯 预期地址 (来自调试脚本):');
console.log('  EasyBet: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0');
console.log('  TicketNFT: 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e');
console.log('');

console.log('✅ 地址匹配检查:');
const expectedEasyBet = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
const expectedTicketNFT = '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e';

const actualEasyBet = process.env.REACT_APP_EASYBET_CONTRACT_ADDRESS;
const actualTicketNFT = process.env.REACT_APP_TICKET_NFT_ADDRESS;

console.log('  EasyBet匹配:', actualEasyBet === expectedEasyBet ? '✅' : '❌');
console.log('  TicketNFT匹配:', actualTicketNFT === expectedTicketNFT ? '✅' : '❌');

if (actualEasyBet !== expectedEasyBet) {
  console.log('');
  console.log('❌ EasyBet地址不匹配!');
  console.log('  实际:', actualEasyBet);
  console.log('  预期:', expectedEasyBet);
}

if (actualTicketNFT !== expectedTicketNFT) {
  console.log('');
  console.log('❌ TicketNFT地址不匹配!');
  console.log('  实际:', actualTicketNFT);
  console.log('  预期:', expectedTicketNFT);
}