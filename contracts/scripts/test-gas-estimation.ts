import { ethers } from "hardhat";

async function main() {
  console.log("🔍 测试不同数量购买的Gas估算...\n");
  
  const [deployer] = await ethers.getSigners();
  const EASYBET_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = EasyBet.attach(EASYBET_ADDRESS);
  
  // 获取项目信息
  const projectId = 1;
  const project = await easyBet.getProject(projectId);
  const ticketPrice = project[5];
  const optionIndex = 0;
  
  console.log(`📋 测试项目: ${projectId}`);
  console.log(`💰 彩票价格: ${ethers.utils.formatEther(ticketPrice)} ETH\n`);
  
  const testQuantities = [1, 2, 5, 10, 15, 20, 50, 100];
  const FRONTEND_GAS_LIMIT = 3000000; // 前端硬编码的3M gas
  
  console.log("📊 Gas估算结果:");
  console.log("数量 | Gas估算 | 前端限制 | 是否足够 | 推荐限制(+50%)");
  console.log("-----|---------|----------|----------|----------------");
  
  for (const quantity of testQuantities) {
    try {
      const totalPrice = ticketPrice.mul(quantity);
      
      const gasEstimate = await easyBet.estimateGas.purchaseMultipleTickets(
        projectId,
        optionIndex,
        quantity,
        { value: totalPrice }
      );
      
      const recommendedGas = gasEstimate.mul(150).div(100); // +50%缓冲
      const isEnough = gasEstimate.lte(FRONTEND_GAS_LIMIT);
      
      console.log(
        `${quantity.toString().padStart(4)} | ${gasEstimate.toString().padStart(7)} | ${FRONTEND_GAS_LIMIT.toString().padStart(8)} | ${isEnough ? '✅ 是' : '❌ 否'} | ${recommendedGas.toString()}`
      );
      
      if (!isEnough) {
        console.log(`     ⚠️  超出前端限制 ${gasEstimate.sub(FRONTEND_GAS_LIMIT).toString()} gas`);
      }
      
    } catch (error: any) {
      console.log(`${quantity.toString().padStart(4)} | 估算失败 | ${FRONTEND_GAS_LIMIT.toString().padStart(8)} | ❌ 否 | N/A`);
      console.log(`     💥 错误: ${error.message}`);
    }
  }
  
  console.log("\n🔍 分析结论:");
  console.log("如果某个数量的Gas估算超过3M，那就是前端gas限制不足的问题");
  console.log("解决方案：在前端使用动态gas估算而不是硬编码3M限制");
}

main().catch((error) => {
  console.error("💥 脚本执行失败:", error);
  process.exitCode = 1;
});