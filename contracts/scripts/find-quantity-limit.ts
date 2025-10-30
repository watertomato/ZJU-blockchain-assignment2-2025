import { ethers } from "hardhat";

async function findQuantityLimit() {
  console.log("🔍 寻找购买数量临界值");
  console.log("========================");

  // 获取合约实例
  const easyBetAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = EasyBet.attach(easyBetAddress);

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log("📝 使用账户:", signer.address);

  // 测试参数
  const projectId = 1;
  const optionIndex = 0;
  const ticketPrice = ethers.utils.parseEther("0.01");

  // 测试不同的数量
  const quantities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];

  for (const quantity of quantities) {
    console.log(`\n🎯 测试购买 ${quantity} 张票:`);
    
    try {
      const totalAmount = ticketPrice.mul(quantity);
      
      // 1. 先尝试估算Gas
      console.log("  ⛽ 估算Gas...");
      const gasEstimate = await easyBet.estimateGas.purchaseMultipleTickets(
        projectId,
        optionIndex,
        quantity,
        { value: totalAmount }
      );
      console.log(`  估算Gas: ${gasEstimate.toString()}`);

      // 2. 检查是否超过区块Gas限制
      const blockGasLimit = 30000000; // 30M
      if (gasEstimate.gt(blockGasLimit)) {
        console.log(`  ❌ Gas估算超过区块限制 (${gasEstimate.toString()} > ${blockGasLimit})`);
        continue;
      }

      // 3. 尝试静态调用
      console.log("  🔧 静态调用测试...");
      const staticResult = await easyBet.callStatic.purchaseMultipleTickets(
        projectId,
        optionIndex,
        quantity,
        { value: totalAmount }
      );
      console.log(`  静态调用成功，返回票ID数量: ${staticResult.length}`);

      // 4. 尝试实际交易（使用估算的Gas + 10%缓冲）
      console.log("  🚀 执行实际交易...");
      const gasLimit = gasEstimate.mul(110).div(100); // 增加10%缓冲
      
      const tx = await easyBet.purchaseMultipleTickets(
        projectId,
        optionIndex,
        quantity,
        { 
          value: totalAmount,
          gasLimit: gasLimit
        }
      );

      console.log(`  交易哈希: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✅ ${quantity}张票购买成功！`);
      console.log(`  实际Gas使用: ${receipt.gasUsed.toString()}`);
      console.log(`  Gas效率: ${receipt.gasUsed.mul(100).div(gasEstimate).toString()}%`);

    } catch (error: any) {
      console.log(`  ❌ ${quantity}张票购买失败:`);
      console.log(`  错误类型: ${error.code || 'Unknown'}`);
      console.log(`  错误信息: ${error.message}`);
      
      // 如果是Gas相关错误，显示更多信息
      if (error.message.includes('gas') || error.message.includes('Gas')) {
        console.log(`  🔥 这是Gas相关错误`);
      }
      
      // 如果是Internal JSON-RPC error，这就是我们要找的临界点
      if (error.message.includes('Internal JSON-RPC error')) {
        console.log(`  🎯 找到临界点！${quantity}张票触发Internal JSON-RPC error`);
        console.log(`  建议最大批量购买数量: ${quantity - 1}张`);
        break;
      }
    }

    // 添加延迟避免网络拥堵
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n📊 测试完成");
}

findQuantityLimit()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试过程中出错:", error);
    process.exit(1);
  });