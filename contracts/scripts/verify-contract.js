const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  console.log("🔍 验证合约部署状态...\n");
  
  // 合约地址
  const EASYBET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const NOTARY_NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  try {
    // 检查合约代码
    console.log("1. 检查 EasyBet 合约代码...");
    const easyBetCode = await ethers.provider.getCode(EASYBET_ADDRESS);
    console.log(`   合约代码长度: ${easyBetCode.length}`);
    
    if (easyBetCode === "0x") {
      console.log("   ❌ EasyBet 合约未部署到此地址");
      return;
    } else {
      console.log("   ✅ EasyBet 合约已部署");
    }
    
    console.log("\n2. 检查 NotaryNFT 合约代码...");
    const notaryCode = await ethers.provider.getCode(NOTARY_NFT_ADDRESS);
    console.log(`   合约代码长度: ${notaryCode.length}`);
    
    if (notaryCode === "0x") {
      console.log("   ❌ NotaryNFT 合约未部署到此地址");
      return;
    } else {
      console.log("   ✅ NotaryNFT 合约已部署");
    }
    
    // 测试合约函数
    console.log("\n3. 测试 EasyBet 合约函数...");
    const EasyBet = await ethers.getContractFactory("EasyBet");
    const easyBet = EasyBet.attach(EASYBET_ADDRESS);
    
    // 测试只读函数
    try {
      const counter = await easyBet.projectCounter();
      console.log(`   ✅ projectCounter(): ${counter}`);
    } catch (error) {
      console.log(`   ❌ projectCounter() 失败: ${error.message}`);
    }
    
    // 检查 createProject 函数是否存在
    console.log("\n4. 检查 createProject 函数...");
    try {
      // 尝试获取函数签名
      const fragment = easyBet.interface.getFunction("createProject");
      console.log(`   ✅ createProject 函数存在`);
      console.log(`   函数签名: ${fragment.format()}`);
      
      // 详细检查函数参数
      console.log(`   参数数量: ${fragment.inputs.length}`);
      fragment.inputs.forEach((input, index) => {
        console.log(`   参数 ${index + 1}: ${input.name} (${input.type})`);
      });
      
    } catch (error) {
      console.log(`   ❌ createProject 函数不存在: ${error.message}`);
    }
    
    // 尝试实际调用 createProject 函数（模拟调用）
    console.log("\n5. 模拟 createProject 函数调用...");
    try {
      const [deployer] = await ethers.getSigners();
      
      // 准备测试参数
      const testTitle = "测试项目";
      const testDescription = "这是一个测试项目";
      const testOptions = ["选项1", "选项2"];
      const testEndTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后
      const testValue = ethers.utils.parseEther("0.1");
      
      console.log(`   测试参数:`);
      console.log(`     title: "${testTitle}"`);
      console.log(`     description: "${testDescription}"`);
      console.log(`     options: [${testOptions.map(o => `"${o}"`).join(', ')}]`);
      console.log(`     endTime: ${testEndTime}`);
      console.log(`     value: ${ethers.utils.formatEther(testValue)} ETH`);
      
      // 使用 callStatic 进行模拟调用（不会实际执行交易）
      try {
        const result = await easyBet.callStatic.createProject(
          testTitle,
          testDescription,
          testOptions,
          testEndTime,
          { value: testValue }
        );
        console.log(`   ✅ 模拟调用成功，返回值: ${result}`);
      } catch (staticError) {
        console.log(`   ❌ 模拟调用失败: ${staticError.message}`);
        
        // 检查是否是权限问题
        if (staticError.message.includes("Not a notary") || staticError.message.includes("Notary not activated")) {
          console.log(`   💡 这是权限问题：需要激活的公证人身份`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ 准备测试参数失败: ${error.message}`);
    }
    
    console.log("\n6. 检查 NotaryNFT 合约函数...");
    const NotaryNFT = await ethers.getContractFactory("NotaryNFT");
    const notaryNFT = NotaryNFT.attach(NOTARY_NFT_ADDRESS);
    
    try {
      const [deployer] = await ethers.getSigners();
      const balance = await notaryNFT.balanceOf(deployer.address);
      console.log(`   ✅ 部署者 NFT 余额: ${balance}`);
      
      if (balance > 0) {
        const isValidNotary = await notaryNFT.isValidNotary(deployer.address);
        console.log(`   公证人状态: ${isValidNotary ? '已激活' : '未激活'}`);
      }
    } catch (error) {
      console.log(`   ❌ NotaryNFT 检查失败: ${error.message}`);
    }
    
    // 测试前端调用方式
    console.log("\n7. 测试前端调用方式...");
    try {
      // 模拟前端的合约初始化方式
      const frontendABI = [
        'function createProject(string title, string description, string[] options, uint256 endTime) payable returns (uint256)'
      ];
      
      const frontendContract = new ethers.Contract(EASYBET_ADDRESS, frontendABI, ethers.provider);
      
      console.log(`   ✅ 前端 ABI 合约初始化成功`);
      
      // 检查函数是否存在
      try {
        const fragment = frontendContract.interface.getFunction("createProject");
        console.log(`   ✅ 前端 ABI 中 createProject 函数存在`);
        console.log(`   前端 ABI 函数签名: ${fragment.format()}`);
      } catch (error) {
        console.log(`   ❌ 前端 ABI 中 createProject 函数不存在: ${error.message}`);
      }
      
      // 尝试使用前端方式调用
      try {
        const [deployer] = await ethers.getSigners();
        const frontendContractWithSigner = frontendContract.connect(deployer);
        
        const testTitle = "前端测试项目";
        const testDescription = "前端测试描述";
        const testOptions = ["前端选项1", "前端选项2"];
        const testEndTime = Math.floor(Date.now() / 1000) + 3600;
        const testValue = ethers.utils.parseEther("0.1");
        
        console.log(`   尝试前端方式调用...`);
        const result = await frontendContractWithSigner.callStatic.createProject(
          testTitle,
          testDescription,
          testOptions,
          testEndTime,
          { value: testValue }
        );
        console.log(`   ✅ 前端方式模拟调用成功，返回值: ${result}`);
      } catch (frontendError) {
        console.log(`   ❌ 前端方式模拟调用失败: ${frontendError.message}`);
        
        // 分析错误类型
        if (frontendError.message.includes("Cannot read properties of undefined")) {
          console.log(`   💡 这是前端报告的同样错误！`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ 前端调用方式测试失败: ${error.message}`);
    }
    
    // 6. 深度诊断 createProject 函数
    console.log("\n6. 深度诊断 createProject 函数...");
    try {
      const [deployer] = await ethers.getSigners();
      
      // 测试参数
      const testTitle = "测试项目";
      const testDescription = "这是一个测试项目";
      const testOptions = ["选项1", "选项2"];
      const testEndTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后
      const testPrize = ethers.utils.parseEther("0.1");
      
      console.log(`   测试参数准备完成`);
      
      // 检查函数 ABI 详细信息
      const contractInterface = easyBet.interface;
      const createProjectFragment = contractInterface.getFunction("createProject");
      
      console.log(`   函数签名: ${createProjectFragment.format("full")}`);
      console.log(`   参数数量: ${createProjectFragment.inputs.length}`);
      
      createProjectFragment.inputs.forEach((input, index) => {
        console.log(`     参数 ${index}: ${input.name} (${input.type})`);
      });
      
      // 检查返回值定义
      if (createProjectFragment.outputs && createProjectFragment.outputs.length > 0) {
        console.log(`   返回值: ${createProjectFragment.outputs[0].type}`);
      } else {
        console.log(`   ⚠️  函数没有明确的返回值定义`);
      }
      
      // 尝试 populateTransaction（这是前端错误发生的地方）
      console.log(`\n   测试 populateTransaction...`);
      try {
        const populatedTx = await easyBet.populateTransaction.createProject(
          testTitle,
          testDescription,
          testOptions,
          testEndTime,
          { value: testPrize }
        );
        console.log(`   ✅ populateTransaction 成功`);
        console.log(`   交易数据: ${populatedTx.data.substring(0, 50)}...`);
      } catch (populateError) {
        console.log(`   ❌ populateTransaction 失败: ${populateError.message}`);
        console.log(`   错误堆栈: ${populateError.stack}`);
        
        // 检查是否是同样的 "Cannot read properties of undefined" 错误
        if (populateError.message.includes("Cannot read properties of undefined")) {
          console.log(`   🎯 这就是前端遇到的同样错误！`);
          console.log(`   问题可能在于合约 ABI 或参数处理`);
        }
      }
      
      // 尝试 callStatic
      console.log(`\n   测试 callStatic...`);
      try {
        const result = await easyBet.callStatic.createProject(
          testTitle,
          testDescription,
          testOptions,
          testEndTime,
          { value: testPrize }
        );
        console.log(`   ✅ callStatic 成功，返回值: ${result}`);
      } catch (staticError) {
        console.log(`   ❌ callStatic 失败: ${staticError.message}`);
        
        if (staticError.message.includes("Not a notary") || staticError.message.includes("Notary not activated")) {
          console.log(`   💡 这是权限问题，需要激活公证人身份`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ 深度诊断失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error("验证过程出错:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});