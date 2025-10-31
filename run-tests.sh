#!/bin/bash

echo "🧪 运行批量购买修复测试..."

# 确保在正确的目录
cd "$(dirname "$0")"

# 检查Hardhat网络是否运行
echo "🔍 检查Hardhat网络状态..."
if ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
    echo "❌ Hardhat网络未运行，请先启动："
    echo "   cd contracts && npx hardhat node"
    exit 1
fi

echo "✅ Hardhat网络正在运行"

# 进入frontend目录运行测试
cd frontend

echo ""
echo "📋 运行错误分析测试..."
node test-batch-purchase-fix.js

echo ""
echo "🔧 运行实际批量购买逻辑测试..."
node test-batch-purchase-real.js

echo ""
echo "✨ 测试完成！"
echo "💡 如果测试显示有有效挂单，可以在前端界面尝试批量购买功能"