import { ethers } from "hardhat";

async function main() {
  console.log("🔧 开始合约调试...");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log(`📋 使用账户: ${deployer.address}`);
  
  // 从环境变量或默认值获取合约地址
  const EASYBET_ADDRESS = process.env.EASYBET_CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  console.log(`📋 合约地址: ${EASYBET_ADDRESS}`);
  
  try {
    // 1. 检查合约是否存在
    const contractCode = await ethers.provider.getCode(EASYBET_ADDRESS);
    console.log(`📋 合约代码长度: ${contractCode.length}`);
    
    if (contractCode === '0x') {
      console.error('❌ 合约不存在于此地址');
      return;
    }
    
    // 2. 获取合约实例
    const EasyBet = await ethers.getContractFactory("EasyBet");
    const easyBet = EasyBet.attach(EASYBET_ADDRESS);
    
    // 3. 测试基本方法
    console.log("\n📊 测试基本合约方法...");
    
    const projectCounter = await easyBet.projectCounter();
    console.log(`项目计数器: ${projectCounter}`);
    
    if (projectCounter.toNumber() === 0) {
      console.log('⚠️ 没有项目存在，无法测试getProject');
      return;
    }
    
    // 4. 测试getProject方法
    console.log(`\n🔍 测试getProject方法，项目ID: 1`);
    
    try {
      const project = await easyBet.getProject(1);
      console.log('✅ getProject调用成功！');
      console.log('📋 项目详情:');
      console.log(`  ID: ${project.id}`);
      console.log(`  标题: ${project.title}`);
      console.log(`  描述: ${project.description}`);
      console.log(`  选项: ${project.options}`);
      console.log(`  总奖金: ${ethers.utils.formatEther(project.totalPrize)} ETH`);
      console.log(`  结束时间: ${new Date(project.endTime.toNumber() * 1000).toLocaleString()}`);
      console.log(`  创建者: ${project.creator}`);
      console.log(`  是否活跃: ${project.isActive}`);
      console.log(`  是否已结束: ${project.isFinalized}`);
      console.log(`  获胜选项: ${project.winningOption}`);
      console.log(`  总投注金额: ${ethers.utils.formatEther(project.totalBetsAmount)} ETH`);
      
      // 5. 验证数据类型
      console.log('\n🔍 验证返回数据类型:');
      console.log(`  project.id 类型: ${typeof project.id}, 值: ${project.id.toString()}`);
      console.log(`  project.title 类型: ${typeof project.title}`);
      console.log(`  project.description 类型: ${typeof project.description}`);
      console.log(`  project.options 类型: ${typeof project.options}, 是否为数组: ${Array.isArray(project.options)}`);
      console.log(`  project.totalPrize 类型: ${typeof project.totalPrize}, 值: ${project.totalPrize.toString()}`);
      console.log(`  project.endTime 类型: ${typeof project.endTime}, 值: ${project.endTime.toString()}`);
      console.log(`  project.creator 类型: ${typeof project.creator}`);
      console.log(`  project.isActive 类型: ${typeof project.isActive}`);
      console.log(`  project.isFinalized 类型: ${typeof project.isFinalized}`);
      console.log(`  project.winningOption 类型: ${typeof project.winningOption}, 值: ${project.winningOption.toString()}`);
      console.log(`  project.totalBetsAmount 类型: ${typeof project.totalBetsAmount}, 值: ${project.totalBetsAmount.toString()}`);
      
    } catch (error: any) {
      console.error('❌ getProject调用失败:');
      console.error(`  错误名称: ${error.name}`);
      console.error(`  错误消息: ${error.message}`);
      console.error(`  错误代码: ${error.code}`);
      if (error.reason) console.error(`  错误原因: ${error.reason}`);
      if (error.data) console.error(`  错误数据: ${error.data}`);
      console.error(`  完整错误:`, error);
    }
    
    // 6. 测试其他相关方法
    console.log('\n🔍 测试其他合约方法...');
    
    try {
      const activeProjects = await easyBet.getActiveProjects();
      console.log(`✅ getActiveProjects成功: ${activeProjects}`);
    } catch (error: any) {
      console.error(`❌ getActiveProjects失败: ${error.message}`);
    }
    
    try {
      const userProjects = await easyBet.getUserProjects(deployer.address);
      console.log(`✅ getUserProjects成功: ${userProjects}`);
    } catch (error: any) {
      console.error(`❌ getUserProjects失败: ${error.message}`);
    }
    
    // 7. 获取正确的函数选择器
    console.log('\n🔧 获取正确的函数选择器...');
    
    const contractInterface = easyBet.interface;
    const getProjectFunction = contractInterface.getFunction("getProject");
    const correctSelector = contractInterface.getSighash(getProjectFunction);
    const oldSelector = "0x6b0f4871"; // 我们之前使用的错误选择器
    const projectId = 1;
    
    console.log(`📋 正确的getProject函数选择器: ${correctSelector}`);
    console.log(`📋 我们之前使用的选择器: ${oldSelector}`);
    
    // 使用正确的选择器重新测试
    const correctCallData = correctSelector + ethers.utils.defaultAbiCoder.encode(['uint256'], [projectId]).slice(2);
    console.log(`📤 使用正确选择器的调用数据: ${correctCallData}`);
    
    try {
      const correctResult = await ethers.provider.call({
        to: EASYBET_ADDRESS,
        data: correctCallData
      });
      
      console.log(`📥 使用正确选择器的返回数据: ${correctResult}`);
      console.log(`📏 返回数据长度: ${correctResult.length}`);
      
      if (correctResult !== '0x') {
        // 尝试手动解码
        try {
          const decoded = ethers.utils.defaultAbiCoder.decode(
            ['uint256', 'string', 'string', 'string[]', 'uint256', 'uint256', 'address', 'bool', 'bool', 'uint256', 'uint256'],
            correctResult
          );
          console.log('✅ 使用正确选择器手动解码成功:');
          decoded.forEach((value: any, index: number) => {
            console.log(`  [${index}]: ${value} (类型: ${typeof value})`);
          });
        } catch (decodeError: any) {
          console.error(`❌ 使用正确选择器手动解码失败: ${decodeError.message}`);
        }
      }
      
    } catch (callError: any) {
      console.error(`❌ 使用正确选择器的低级调用失败: ${callError.message}`);
    }
    
    // 8. 输出完整的ABI信息供前端使用
    console.log('\n📋 完整的getProject ABI信息:');
    console.log('函数签名:', getProjectFunction.format());
    console.log('函数选择器:', correctSelector);
    console.log('输入类型:', getProjectFunction.inputs.map(input => `${input.type} ${input.name}`));
    console.log('输出类型:', getProjectFunction.outputs?.map(output => `${output.type} ${output.name || ''}`));
    
  } catch (error: any) {
    console.error('💥 调试过程中发生错误:', error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});