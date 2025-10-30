import { ethers } from "hardhat";

async function main() {
  console.log("🔍 前端网络配置诊断测试...\n");
  
  // 从.env文件读取配置
  const EASYBET_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const EXPECTED_CHAIN_ID = 31337;
  const EXPECTED_RPC_URL = "http://127.0.0.1:8545";
  
  console.log("📋 预期配置:");
  console.log(`   合约地址: ${EASYBET_ADDRESS}`);
  console.log(`   链ID: ${EXPECTED_CHAIN_ID}`);
  console.log(`   RPC URL: ${EXPECTED_RPC_URL}\n`);
  
  try {
    // 1. 检查当前网络
    console.log("1️⃣ 检查当前Hardhat网络状态...");
    const network = await ethers.provider.getNetwork();
    console.log(`✅ 当前网络链ID: ${network.chainId}`);
    console.log(`✅ 当前网络名称: ${network.name}\n`);
    
    // 2. 模拟前端连接方式
    console.log("2️⃣ 模拟前端Web3Provider连接...");
    
    // 创建JsonRpcProvider（模拟前端连接）
    const frontendProvider = new ethers.providers.JsonRpcProvider(EXPECTED_RPC_URL);
    
    try {
      const frontendNetwork = await frontendProvider.getNetwork();
      console.log(`✅ 前端Provider网络链ID: ${frontendNetwork.chainId}`);
      
      if (frontendNetwork.chainId !== EXPECTED_CHAIN_ID) {
        console.log(`❌ 网络链ID不匹配! 期望: ${EXPECTED_CHAIN_ID}, 实际: ${frontendNetwork.chainId}`);
      } else {
        console.log(`✅ 网络链ID匹配`);
      }
    } catch (providerError: any) {
      console.log(`❌ 前端Provider连接失败: ${providerError.message}`);
      console.log("   这可能是前端RPC连接问题的原因\n");
      return;
    }
    
    // 3. 测试合约连接
    console.log("3️⃣ 测试合约连接...");
    const EasyBet = await ethers.getContractFactory("EasyBet");
    
    // 使用Hardhat provider
    const hardhatContract = EasyBet.attach(EASYBET_ADDRESS);
    const hardhatProjectCounter = await hardhatContract.projectCounter();
    console.log(`✅ Hardhat连接 - 项目数量: ${hardhatProjectCounter.toString()}`);
    
    // 使用前端provider
    const frontendContract = new ethers.Contract(
      EASYBET_ADDRESS,
      EasyBet.interface,
      frontendProvider
    );
    
    try {
      const frontendProjectCounter = await frontendContract.projectCounter();
      console.log(`✅ 前端Provider连接 - 项目数量: ${frontendProjectCounter.toString()}`);
      
      if (!hardhatProjectCounter.eq(frontendProjectCounter)) {
        console.log("❌ 两个Provider返回的数据不一致!");
      } else {
        console.log("✅ 两个Provider返回的数据一致\n");
      }
    } catch (contractError: any) {
      console.log(`❌ 前端Provider合约调用失败: ${contractError.message}`);
      console.log("   这可能是MetaMask RPC错误的原因\n");
    }
    
    // 4. 测试purchaseMultipleTickets函数
    console.log("4️⃣ 测试purchaseMultipleTickets函数可用性...");
    
    try {
      // 检查函数是否存在
      const functionFragment = frontendContract.interface.getFunction("purchaseMultipleTickets");
      console.log(`✅ 函数存在: ${functionFragment.format()}`);
      
      // 尝试估算Gas（不实际执行）
      if (hardhatProjectCounter.gt(0)) {
        const projectId = 1;
        const optionIndex = 0;
        const ticketPrice = ethers.utils.parseEther("0.001");
        
        // 测试不同数量的Gas估算
        const testQuantities = [1, 2, 3, 4, 5, 10];
        console.log('\n🧪 测试不同数量的Gas估算:');
        
        for (const quantity of testQuantities) {
          try {
            const totalValue = ticketPrice.mul(quantity);
            
            const gasEstimate = await frontendContract.estimateGas.purchaseMultipleTickets(
              projectId,
              optionIndex,
              quantity,
              { value: totalValue }
            );
            
            console.log(`   数量 ${quantity}: Gas估算 ${gasEstimate.toString()} ✅`);
            
            // 检查Gas是否过高
            if (gasEstimate.gt(ethers.utils.parseUnits("30000000", "wei"))) {
              console.log(`   ⚠️  数量 ${quantity} 的Gas估算过高: ${gasEstimate.toString()}`);
            }
            
          } catch (gasError: any) {
            console.log(`   数量 ${quantity}: Gas估算失败 ❌`);
            console.log(`      错误: ${gasError.message}`);
            
            if (gasError.reason) {
              console.log(`      Revert原因: ${gasError.reason}`);
            }
            if (gasError.code) {
              console.log(`      错误代码: ${gasError.code}`);
            }
            
            if (gasError.message.includes('revert')) {
              console.log(`      这可能是合约逻辑错误，而不是Gas问题`);
            }
          }
        }
      }
      
    } catch (functionError: any) {
      console.log(`❌ 函数检查失败: ${functionError.message}`);
    }
    
    // 5. 检查账户和余额
    console.log("\n5️⃣ 检查账户状态...");
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Hardhat账户: ${deployer.address}`);
    
    const hardhatBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Hardhat余额: ${ethers.utils.formatEther(hardhatBalance)} ETH`);
    
    try {
      const frontendBalance = await frontendProvider.getBalance(deployer.address);
      console.log(`💰 前端Provider余额: ${ethers.utils.formatEther(frontendBalance)} ETH`);
      
      if (!hardhatBalance.eq(frontendBalance)) {
        console.log("❌ 两个Provider显示的余额不一致!");
        console.log("   这表明前端连接到了不同的网络");
      } else {
        console.log("✅ 余额一致，网络连接正常");
      }
    } catch (balanceError: any) {
      console.log(`❌ 前端Provider余额查询失败: ${balanceError.message}`);
    }
    
    // 6. 网络诊断总结
    console.log("\n📊 诊断总结:");
    console.log("================");
    
    // 检查是否是网络问题
    try {
      const frontendNetworkCheck = await frontendProvider.getNetwork();
      if (frontendNetworkCheck.chainId === EXPECTED_CHAIN_ID) {
        console.log("✅ 网络配置正确");
        console.log("❓ 问题可能在于:");
        console.log("   1. MetaMask连接到了错误的网络");
        console.log("   2. 前端代码中的provider创建方式");
        console.log("   3. 交易参数或Gas设置问题");
        console.log("   4. 合约状态或权限问题");
      } else {
        console.log("❌ 网络配置错误");
        console.log(`   前端尝试连接到链ID ${frontendNetworkCheck.chainId}`);
        console.log(`   但应该连接到链ID ${EXPECTED_CHAIN_ID}`);
      }
    } catch (finalError: any) {
      console.log("❌ 网络连接完全失败");
      console.log(`   错误: ${finalError.message}`);
      console.log("   建议检查Hardhat节点是否正在运行");
    }
    
  } catch (error: any) {
    console.error("💥 诊断过程中发生错误:", error.message);
  }
}

main().catch((error) => {
  console.error("💥 脚本执行失败:", error);
  process.exitCode = 1;
});