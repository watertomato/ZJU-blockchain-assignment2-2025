import { ethers } from "hardhat";

async function debugTransactionFailure() {
  console.log("🔍 开始调试交易失败问题...");
  
  try {
    // 获取合约实例
    const easyBetAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
    const ticketNFTAddress = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
    
    const EasyBet = await ethers.getContractFactory("EasyBet");
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    
    const easyBet = EasyBet.attach(easyBetAddress);
    const ticketNFT = TicketNFT.attach(ticketNFTAddress);
    
    // 获取签名者
    const [signer] = await ethers.getSigners();
    console.log("📝 使用账户:", signer.address);
    console.log("💰 账户余额:", ethers.utils.formatEther(await signer.getBalance()), "ETH");
    
    // 检查项目状态
    const projectId = 1;
    const project = await easyBet.projects(projectId);
    console.log("\n📋 项目信息:");
    console.log("  - ID:", projectId);
    console.log("  - 标题:", project.title);
    console.log("  - 票价:", ethers.utils.formatEther(project.ticketPrice), "ETH");
    console.log("  - 是否激活:", project.isActive);
    console.log("  - 是否完成:", project.isFinalized);
    console.log("  - 总奖池:", ethers.utils.formatEther(project.totalPrize), "ETH");
    console.log("  - 总投注额:", ethers.utils.formatEther(project.totalBetsAmount), "ETH");
    console.log("  - 结束时间:", new Date(project.endTime.toNumber() * 1000).toLocaleString());
    
    // 检查选项
    const optionIndex = 1;
    console.log("\n🎯 选项信息:");
    console.log("  - 选项索引:", optionIndex);
    console.log("  - 注意: 选项详情需要通过其他方式获取");
    
    // 检查TicketNFT状态
    console.log("\n🎫 TicketNFT状态:");
    console.log("  - 合约地址:", ticketNFTAddress);
    console.log("  - 总供应量:", (await ticketNFT.totalSupply()).toString());
    console.log("  - 授权铸造者:", await ticketNFT.authorizedMinter());
    console.log("  - EasyBet地址:", easyBetAddress);
    console.log("  - 权限匹配:", (await ticketNFT.authorizedMinter()) === easyBetAddress);
    
    // 尝试模拟交易（不实际执行）
    console.log("\n🧪 模拟交易测试:");
    
    // 测试1: 单张票
    try {
      console.log("📝 测试1: 模拟购买1张票...");
      const ticketPrice = project.ticketPrice;
      const calldata = easyBet.interface.encodeFunctionData("purchaseMultipleTickets", [
        projectId,
        optionIndex,
        1
      ]);
      
      const tx = {
        to: easyBetAddress,
        data: calldata,
        value: ticketPrice,
        from: signer.address
      };
      
      const gasEstimate = await signer.estimateGas(tx);
      console.log("  ✅ 1张票Gas估算:", gasEstimate.toString());
      
      // 尝试静态调用
      const result = await signer.call(tx);
      console.log("  ✅ 1张票静态调用成功");
      
    } catch (error: any) {
      console.log("  ❌ 1张票测试失败:", error.message);
      if (error.data) {
        console.log("  📊 错误数据:", error.data);
      }
    }
    
    // 测试2: 10张票
    try {
      console.log("📝 测试2: 模拟购买10张票...");
      const ticketPrice = project.ticketPrice.mul(10);
      const calldata = easyBet.interface.encodeFunctionData("purchaseMultipleTickets", [
        projectId,
        optionIndex,
        10
      ]);
      
      const tx = {
        to: easyBetAddress,
        data: calldata,
        value: ticketPrice,
        from: signer.address
      };
      
      const gasEstimate = await signer.estimateGas(tx);
      console.log("  ✅ 10张票Gas估算:", gasEstimate.toString());
      
    } catch (error: any) {
      console.log("  ❌ 10张票测试失败:", error.message);
      if (error.data) {
        console.log("  📊 错误数据:", error.data);
      }
    }
    
    // 测试3: 50张票
    try {
      console.log("📝 测试3: 模拟购买50张票...");
      const ticketPrice = project.ticketPrice.mul(50);
      const calldata = easyBet.interface.encodeFunctionData("purchaseMultipleTickets", [
        projectId,
        optionIndex,
        50
      ]);
      
      const tx = {
        to: easyBetAddress,
        data: calldata,
        value: ticketPrice,
        from: signer.address
      };
      
      const gasEstimate = await signer.estimateGas(tx);
      console.log("  ✅ 50张票Gas估算:", gasEstimate.toString());
      
    } catch (error: any) {
      console.log("  ❌ 50张票测试失败:", error.message);
      if (error.data) {
        console.log("  📊 错误数据:", error.data);
        // 尝试解码错误
        try {
          const decoded = easyBet.interface.parseError(error.data);
          console.log("  🔍 解码错误:", decoded);
        } catch (decodeError) {
          console.log("  ⚠️ 无法解码错误数据");
        }
      }
    }
    
    // 检查合约状态
    console.log("\n🔧 合约状态检查:");
    
    // 检查是否有足够的余额
    const balance = await signer.getBalance();
    const requiredAmount = project.ticketPrice.mul(50);
    console.log("  - 账户余额:", ethers.utils.formatEther(balance), "ETH");
    console.log("  - 需要金额:", ethers.utils.formatEther(requiredAmount), "ETH");
    console.log("  - 余额充足:", balance.gte(requiredAmount));
    
    // 检查合约状态 - EasyBet合约没有暂停功能
    console.log("  - 合约暂停状态: 不适用（合约无暂停功能）");
    
    // 实际尝试购买1张票
    console.log("\n🚀 实际购买测试:");
    try {
      console.log("📝 尝试实际购买1张票...");
      const tx = await easyBet.purchaseMultipleTickets(projectId, optionIndex, 1, {
        value: project.ticketPrice,
        gasLimit: 500000
      });
      
      console.log("  ✅ 交易已发送:", tx.hash);
      const receipt = await tx.wait();
      console.log("  ✅ 交易已确认，Gas使用:", receipt.gasUsed.toString());
      
    } catch (error: any) {
      console.log("  ❌ 实际购买失败:", error.message);
      if (error.data) {
        console.log("  📊 错误数据:", error.data);
      }
      if (error.transaction) {
        console.log("  📝 交易详情:", error.transaction);
      }
    }
    
  } catch (error: any) {
    console.error("❌ 调试脚本执行失败:", error.message);
  }
}

debugTransactionFailure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });