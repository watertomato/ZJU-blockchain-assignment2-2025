# ZJU区块链课程作业2 - 代码框架分析文档

## 项目概述

本项目是浙江大学区块链课程的第二次作业，旨在实现一个进阶的去中心化彩票系统。项目采用前后端分离的架构，包含智能合约开发和前端Web应用两个主要部分。

## 项目结构

```
ZJU-blockchain-assignment2-2025/
├── README.md                    # 项目主文档
├── contracts/                   # 智能合约相关文件
│   ├── contracts/
│   │   └── EasyBet.sol         # 主要智能合约文件
│   ├── scripts/
│   │   └── deploy.ts           # 合约部署脚本
│   ├── test/
│   │   └── testEasyBet.ts      # 合约测试文件
│   ├── hardhat.config.ts       # Hardhat配置文件
│   ├── package.json            # 后端依赖管理
│   ├── tsconfig.json           # TypeScript配置
│   └── README.md               # 合约模块说明
└── frontend/                    # 前端React应用
    ├── src/
    │   ├── App.tsx             # 主应用组件
    │   ├── App.css             # 应用样式
    │   ├── index.tsx           # 应用入口
    │   └── ...                 # 其他React标准文件
    ├── public/                 # 静态资源
    ├── package.json            # 前端依赖管理
    ├── tsconfig.json           # TypeScript配置
    └── README.md               # 前端模块说明
```

## 已完成的框架内容

### 1. 智能合约框架 (contracts/)

#### 1.1 基础合约结构
- **文件**: <mcfile name="EasyBet.sol" path="/home/water_tomato/ZJU-blockchain-assignment2-2025/contracts/contracts/EasyBet.sol"></mcfile>
- **状态**: 基础框架已搭建
- **完成内容**:
  - Solidity 0.8.20版本合约模板
  - 基础事件定义: `BetPlaced` 事件
  - 活动结构体: `Activity` struct，包含基础字段
  - 活动映射: `mapping(uint256 => Activity) public activities`
  - 示例函数: `helloworld()` 函数作为测试
  - OpenZeppelin依赖预配置（已注释，可直接使用ERC721和ERC20）

#### 1.2 开发环境配置
- **Hardhat框架**: 完整配置，支持编译、测试、部署
- **网络配置**: Ganache本地网络配置完成
- **依赖管理**: OpenZeppelin合约库已安装 (v5.0.0)
- **TypeScript支持**: 完整的TS配置和类型支持

#### 1.3 测试和部署
- **测试框架**: <mcfile name="testEasyBet.ts" path="/home/water_tomato/ZJU-blockchain-assignment2-2025/contracts/test/testEasyBet.ts"></mcfile>
  - 基础测试结构已搭建
  - 合约部署测试
  - 示例功能测试
- **部署脚本**: <mcfile name="deploy.ts" path="/home/water_tomato/ZJU-blockchain-assignment2-2025/contracts/scripts/deploy.ts"></mcfile>
  - 自动化部署逻辑
  - 支持本地Ganache网络部署

### 2. 前端应用框架 (frontend/)

#### 2.1 React应用基础
- **框架**: Create React App + TypeScript
- **版本**: React 19.2.0 (最新版本)
- **结构**: 标准CRA项目结构
- **状态**: 基础模板，未定制化

#### 2.2 开发环境
- **TypeScript配置**: 完整的TS支持
- **测试框架**: Jest + React Testing Library
- **构建工具**: React Scripts 5.0.1
- **开发服务器**: 支持热重载

#### 2.3 当前实现状态
- **主组件**: <mcfile name="App.tsx" path="/home/water_tomato/ZJU-blockchain-assignment2-2025/frontend/src/App.tsx"></mcfile> - 标准React模板
- **样式**: 基础CSS文件
- **功能**: 仅包含React默认示例内容

## 技术栈总结

### 后端/智能合约
- **区块链平台**: Ethereum
- **开发框架**: Hardhat 2.18.1
- **编程语言**: Solidity 0.8.20
- **测试框架**: Hardhat + Chai + Ethers.js
- **合约库**: OpenZeppelin Contracts 5.0.0
- **类型支持**: TypeScript

### 前端
- **框架**: React 19.2.0
- **语言**: TypeScript 4.9.5
- **构建工具**: Create React App
- **测试**: Jest + React Testing Library
- **样式**: CSS (可扩展)

### 开发工具
- **本地区块链**: Ganache (配置完成)
- **包管理**: npm
- **代码规范**: ESLint + TypeScript

## 待实现的核心功能

根据作业要求，以下功能需要在现有框架基础上实现：

### 智能合约功能
1. **竞猜项目管理**
   - 创建竞猜项目 (公证人功能)
   - 设置选项和奖池
   - 时间管理和截止机制

2. **彩票系统**
   - ERC721彩票凭证发行
   - 购买彩票功能
   - 彩票交易市场

3. **结算系统**
   - 结果输入和验证
   - 奖金分配逻辑
   - 胜利者奖励发放

4. **可选功能**
   - ERC20积分系统
   - 链上订单簿

### 前端功能
1. **用户界面**
   - 钱包连接 (MetaMask等)
   - 竞猜项目展示
   - 彩票购买界面

2. **交易功能**
   - 彩票交易市场
   - 订单管理
   - 交易历史

3. **管理功能**
   - 公证人管理面板
   - 项目创建和管理
   - 结果输入界面

## 开发建议

1. **优先级**: 建议先完善智能合约核心逻辑，再开发前端界面
2. **测试**: 每个功能模块都应编写对应的测试用例
3. **安全**: 注意智能合约的安全性，特别是资金管理部分
4. **用户体验**: 前端应提供清晰的交易状态反馈和错误处理

## 总结

当前代码框架已经提供了一个完整的开发环境和基础结构，包括：
- 完整的Hardhat智能合约开发环境
- 标准的React前端应用框架  
- 必要的依赖和配置文件
- 基础的测试和部署脚本

框架为后续的功能开发提供了良好的基础，开发者可以在此基础上专注于业务逻辑的实现，而无需从零搭建开发环境。