#!/bin/bash
cd /home/water_tomato/ZJU-blockchain-assignment2-2025/contracts
echo "🔍 运行交易失败调试脚本..."
npx hardhat run scripts/debug-transaction-failure.ts --network localhost