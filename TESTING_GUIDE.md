# 竞猜项目创建功能测试指南

## 前置条件

1. **确保 Hardhat 节点运行**
   ```bash
   cd contracts
   npx hardhat node
   ```

2. **部署合约**
   ```bash
   # 在新的终端窗口中执行
   cd contracts
   npx hardhat run scripts/deploy.ts --network localhost
   ```

3. **启动前端应用**
   ```bash
   cd frontend
   npm start
   ```

4. **配置 MetaMask**
   - 网络名称: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - 链 ID: 31337
   - 货币符号: ETH

## 测试步骤

### 1. 连接钱包并获取公证员权限

1. 打开浏览器访问 `http://localhost:3000`
2. 点击右上角的"连接钱包"按钮
3. 在 MetaMask 中选择 Hardhat 网络上的账户
4. 确认连接

**验证公证员身份:**
- 如果你使用的是部署合约的账户，应该会自动获得公证员权限
- 页面顶部导航栏应该显示"公证管理"菜单
- 项目列表页面应该显示"创建新项目"按钮

### 2. 创建竞猜项目

1. 在项目列表页面，点击"创建新项目"按钮
2. 填写项目信息：
   - **项目标题**: 例如 "2024年欧洲杯冠军预测"
   - **项目描述**: 详细描述竞猜规则
   - **竞猜选项**: 添加 2-6 个选项，例如：
     - 法国
     - 德国
     - 西班牙
     - 意大利
   - **结束时间**: 选择未来的日期和时间
   - **奖金池**: 输入 ETH 数量，例如 1.0

3. 点击"下一步"进行预览
4. 确认信息无误后，点击"创建项目"
5. 在 MetaMask 中确认交易

### 3. 验证项目创建

**成功指标:**
- 收到"项目创建成功！"的提示消息
- 自动跳转回项目列表页面
- 新创建的项目出现在列表中
- 项目状态显示为"进行中"

**区块链验证:**
可以在浏览器控制台中运行以下代码验证：

```javascript
// 检查合约部署状态
async function checkContract() {
  if (!window.ethereum) {
    console.log('MetaMask 未安装');
    return;
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'; // EasyBet 合约地址
  
  try {
    const code = await provider.getCode(contractAddress);
    console.log('合约代码长度:', code.length);
    
    if (code === '0x') {
      console.log('❌ 合约未部署');
    } else {
      console.log('✅ 合约已部署');
      
      // 检查项目数量
      const contract = new ethers.Contract(
        contractAddress,
        ['function projectCounter() view returns (uint256)'],
        provider
      );
      
      const counter = await contract.projectCounter();
      console.log('项目总数:', counter.toString());
    }
  } catch (error) {
    console.error('检查失败:', error);
  }
}

checkContract();
```

## 常见问题排查

### 1. "请先连接钱包" 错误
- 确保 MetaMask 已安装并连接到正确的网络
- 检查网络配置是否正确 (链 ID: 31337)

### 2. "合约未部署" 警告
- 确保 Hardhat 节点正在运行
- 重新执行部署脚本
- 检查 `.env` 文件中的合约地址是否正确

### 3. 交易失败
- 确保账户有足够的 ETH 余额
- 检查 Gas 费用设置
- 确认网络连接稳定

### 4. 项目未显示
- 刷新页面重新加载数据
- 检查浏览器控制台是否有错误信息
- 确认交易已被确认

## 预期结果

成功完成测试后，你应该能够：

1. ✅ 以公证员身份连接钱包
2. ✅ 访问项目创建界面
3. ✅ 填写并提交项目信息
4. ✅ 成功创建区块链上的竞猜项目
5. ✅ 在项目列表中看到新创建的项目

## 下一步开发

项目创建功能完成后，可以继续开发：
- 用户投注功能
- 项目结果公布功能
- 奖金分配功能
- 项目详情页面优化