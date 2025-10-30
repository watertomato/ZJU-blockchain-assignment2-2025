import { ethers } from "hardhat";

async function main() {
  console.log("🔍 开始诊断 purchaseMultipleTickets 问题...\n");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log(`👤 测试账户: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`💰 账户余额: ${ethers.utils.formatEther(balance)} ETH\n`);
  
  // 合约地址（从.env文件中获取）
  const EASYBET_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const NOTARY_NFT_ADDRESS = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
  const TICKET_NFT_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
  
  console.log("📋 合约地址:");
  console.log(`   EasyBet: ${EASYBET_ADDRESS}`);
  console.log(`   NotaryNFT: ${NOTARY_NFT_ADDRESS}`);
  console.log(`   TicketNFT: ${TICKET_NFT_ADDRESS}\n`);
  
  try {
    // 1. 检查合约是否存在
    console.log("1️⃣ 检查合约部署状态...");
    const easyBetCode = await ethers.provider.getCode(EASYBET_ADDRESS);
    if (easyBetCode === "0x") {
      console.log("❌ EasyBet合约未部署或地址错误!");
      return;
    }
    console.log("✅ EasyBet合约已部署\n");
    
    // 2. 连接到合约
    console.log("2️⃣ 连接到合约...");
    const EasyBet = await ethers.getContractFactory("EasyBet");
    const easyBet = EasyBet.attach(EASYBET_ADDRESS);
    console.log("✅ 合约连接成功\n");
    
    // 3. 检查合约是否有purchaseMultipleTickets函数
    console.log("3️⃣ 检查purchaseMultipleTickets函数...");
    try {
      // 尝试调用函数签名
      const functionExists = easyBet.interface.getFunction("purchaseMultipleTickets");
      console.log("✅ purchaseMultipleTickets函数存在");
      console.log(`   函数签名: ${functionExists.format()}\n`);
    } catch (error) {
      console.log("❌ purchaseMultipleTickets函数不存在!");
      console.log("   可能需要重新部署合约\n");
      return;
    }
    
    // 4. 检查项目计数器
    console.log("4️⃣ 检查项目状态...");
    const projectCounter = await easyBet.projectCounter();
    console.log(`📊 当前项目数量: ${projectCounter.toString()}`);
    
    if (projectCounter.eq(0)) {
      console.log("⚠️  没有项目存在，无法测试购买功能\n");
      return;
    }
    
    // 5. 获取第一个项目的详情
    console.log("5️⃣ 获取项目详情...");
    const projectId = 1; // 测试第一个项目
    try {
      const project = await easyBet.getProject(projectId);
      console.log(`📋 项目 ${projectId} 详情:`);
      console.log(`   标题: ${project[1]}`);
      console.log(`   彩票价格: ${ethers.utils.formatEther(project[5])} ETH`);
      console.log(`   结束时间: ${new Date(project[6].toNumber() * 1000).toLocaleString()}`);
      console.log(`   是否活跃: ${project[8]}`);
      console.log(`   选项数量: ${project[3].length}\n`);
      
      if (!project[8]) {
        console.log("⚠️  项目不活跃，无法购买彩票\n");
        return;
      }
      
      // 6. 检查TicketNFT地址设置
      console.log("6️⃣ 检查TicketNFT配置...");
      const ticketNFTAddress = await easyBet.ticketNFTAddress();
      console.log(`🎫 TicketNFT地址: ${ticketNFTAddress}`);
      
      if (ticketNFTAddress === ethers.constants.AddressZero) {
        console.log("❌ TicketNFT地址未设置!");
        return;
      }
      console.log("✅ TicketNFT地址已设置\n");
      
      // 7. 测试不同数量的彩票购买
      console.log("7️⃣ 测试不同数量的彩票购买...");
      
      const ticketPrice = project[5]; // 彩票价格
      const optionIndex = 0; // 选择第一个选项
      const testQuantities = [1, 2, 3, 4, 5, 10,50]; // 测试不同数量
      
      for (const quantity of testQuantities) {
        console.log(`\n🧪 测试购买 ${quantity} 张彩票:`);
        try {
          const totalPrice = ticketPrice.mul(quantity);
          
          console.log(`📊 购买参数:`);
          console.log(`   项目ID: ${projectId}`);
          console.log(`   选项索引: ${optionIndex}`);
          console.log(`   数量: ${quantity}`);
          console.log(`   单价: ${ethers.utils.formatEther(ticketPrice)} ETH`);
          console.log(`   总价: ${ethers.utils.formatEther(totalPrice)} ETH`);
          
          // 检查账户余额是否足够
          if (balance.lt(totalPrice)) {
            console.log("❌ 账户余额不足!");
            continue;
          }
          
          // Gas估算
          console.log(`⛽ 正在估算Gas...`);
          const gasEstimate = await easyBet.estimateGas.purchaseMultipleTickets(
            projectId,
            optionIndex,
            quantity,
            { value: totalPrice }
          );
          console.log(`⛽ Gas估算成功: ${gasEstimate.toString()}`);
          
          // 检查Gas限制
          if (gasEstimate.gt(ethers.utils.parseUnits("30000000", "wei"))) {
            console.warn(`⚠️  Gas估算过高: ${gasEstimate.toString()}`);
          }
          
          // 执行交易
          console.log(`🚀 执行交易...`);
          const tx = await easyBet.purchaseMultipleTickets(
            projectId,
            optionIndex,
            quantity,
            { 
              value: totalPrice,
              gasLimit: gasEstimate.mul(150).div(100) // 增加50%的Gas缓冲
            }
          );
          
          console.log(`📝 交易哈希: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`✅ 购买 ${quantity} 张彩票成功！Gas使用: ${receipt.gasUsed.toString()}`);
          
          // 解析事件
          const events = receipt.events?.filter(e => e.event === 'TicketPurchased') || [];
          console.log(`🎟️  获得彩票数量: ${events.length}`);
          events.forEach((event, index) => {
            console.log(`   彩票${index + 1} ID: ${event.args?.ticketId.toString()}`);
          });
          
        } catch (error: any) {
          console.error(`❌ 购买 ${quantity} 张彩票失败:`, error.message);
          
          // 详细错误分析
          if (error.message.includes("revert")) {
            console.error("   这是一个合约revert错误");
            if (error.reason) {
              console.error("   Revert原因:", error.reason);
            }
          } else if (error.message.includes("gas")) {
            console.error("   这是一个Gas相关错误");
            console.error("   可能是Gas限制不足或Gas估算失败");
          } else if (error.message.includes("insufficient funds")) {
            console.error("   余额不足");
          } else {
            console.error("   其他错误类型");
          }
          
          // 如果是Gas估算失败，尝试分析原因
          if (error.message.includes("estimateGas")) {
            console.log("   🔍 Gas估算失败，可能的原因:");
            console.log("      - 合约中有require()检查失败");
            console.log("      - 数量超过了合约限制");
            console.log("      - 循环处理时Gas不足");
            console.log("      - 项目状态不允许购买");
          }
          
          // 继续测试下一个数量，但记录失败点
          console.log(`   ⏭️  继续测试下一个数量...`);
        }
        
        // 在每次测试之间稍作停顿
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log("\n📊 测试总结:");
      console.log("请查看上面的结果，找出从哪个数量开始失败");
      
    } catch (projectError: any) {
      console.log(`❌ 获取项目详情失败: ${projectError.message}`);
    }
    
  } catch (error: any) {
    console.error("❌ 诊断过程中发生错误:", error.message);
  }
}

main().catch((error) => {
  console.error("💥 脚本执行失败:", error);
  process.exitCode = 1;
});