#!/bin/bash

echo "🔍 检查 Hardhat 网络状态"
echo "=========================="

cd contracts

echo ""
echo "📡 网络连接测试:"
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545 2>/dev/null | jq '.' || echo "❌ 无法连接到 Hardhat 网络"

echo ""
echo "📋 合约状态检查:"
echo "EasyBet 合约地址: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"

# 检查合约代码
echo ""
echo "🔧 检查合约是否部署:"
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0","latest"],"id":1}' \
  http://127.0.0.1:8545 2>/dev/null | jq '.result' | grep -q "0x" && echo "✅ 合约已部署" || echo "❌ 合约未部署"

echo ""
echo "💰 检查账户余额:"
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
  http://127.0.0.1:8545 2>/dev/null | jq -r '.result[0]' | while read account; do
  if [ "$account" != "null" ] && [ "$account" != "" ]; then
    echo "账户: $account"
    balance=$(curl -X POST -H "Content-Type: application/json" \
      --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$account\",\"latest\"],\"id\":1}" \
      http://127.0.0.1:8545 2>/dev/null | jq -r '.result')
    echo "余额: $balance"
  fi
done

echo ""
echo "🎯 项目计数器检查:"
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0","data":"0x4b9a4f0e"},"latest"],"id":1}' \
  http://127.0.0.1:8545 2>/dev/null | jq -r '.result' | while read result; do
  if [ "$result" != "null" ] && [ "$result" != "" ]; then
    count=$((16#${result#0x}))
    echo "项目总数: $count"
  else
    echo "❌ 无法获取项目计数"
  fi
done