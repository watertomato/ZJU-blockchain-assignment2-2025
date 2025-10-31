# 🧹 数据清理指南 / Data Cleanup Guide

当你遇到以下问题时，请按照本指南进行数据清理：
- 重启 Hardhat 节点后，旧数据仍然存在
- 前端显示过期的合约数据
- MetaMask 交易失败或显示错误的 nonce
- 页面显示缓存的旧信息

## 🚀 一键完全重置（推荐）

```bash
# 停止所有服务并完全重置环境
./stop-services.sh
./reset-environment.sh
```

## 📋 手动清理步骤

### 1. 停止所有服务
```bash
./stop-services.sh
# 或手动停止
pkill -f "hardhat node"
pkill -f "npm start"
```

### 2. 清理 Hardhat 缓存
```bash
cd contracts
rm -rf cache/
rm -rf artifacts/
rm -rf node_modules/.cache/
npx hardhat clean
```

### 3. 清理前端缓存
```bash
cd frontend
rm -rf node_modules/.cache/
rm -rf build/
rm -rf .cache/
```

### 4. 清理浏览器缓存

#### Chrome/Edge:
1. 按 F12 打开开发者工具
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"

#### Firefox:
1. 按 F12 打开开发者工具
2. 点击 "网络" 标签
3. 点击设置图标 → "清空缓存"

#### 或者使用快捷键:
- **Ctrl + Shift + R** (强制刷新)
- **Ctrl + F5** (清除缓存刷新)

### 5. 重置 MetaMask 账户

1. 打开 MetaMask
2. 点击右上角头像 → 设置
3. 高级 → 重置账户
4. 确认重置

⚠️ **注意**: 这会清除所有交易历史，但不会影响你的钱包余额

### 6. 清理系统临时文件
```bash
# 清理系统临时文件
rm -rf /tmp/hardhat-*
rm -rf ~/.cache/hardhat-nodejs/

# 清理 npm 缓存
npm cache clean --force
```

## 🔄 重新启动环境

完成清理后，重新启动环境：

```bash
./reset-environment.sh
```

## 🛠️ 常见问题解决

### Q: 合约地址变了，前端连接失败
**A**: 重新部署合约后，地址会改变。确保：
1. 前端代码中的合约地址已更新
2. 清理浏览器缓存
3. 重新连接 MetaMask

### Q: MetaMask 显示 "nonce too high" 错误
**A**: 重置 MetaMask 账户：
```
MetaMask → 设置 → 高级 → 重置账户
```

### Q: 前端显示旧的项目数据
**A**: 按顺序执行：
1. 清理浏览器缓存
2. 重置 MetaMask 账户
3. 强制刷新页面 (Ctrl+Shift+R)

### Q: Hardhat 节点启动失败
**A**: 检查端口占用：
```bash
# 查看端口占用
lsof -i :8545
# 杀死占用进程
kill -9 <PID>
```

## 📝 预防措施

为了减少数据缓存问题：

1. **每次重启开发环境时**，使用 `./reset-environment.sh`
2. **部署新合约后**，清理浏览器缓存
3. **遇到异常时**，先尝试重置 MetaMask 账户
4. **定期清理**，避免缓存积累

## 🔗 相关文档

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 完整测试指南
- [README.md](./README.md) - 项目运行说明