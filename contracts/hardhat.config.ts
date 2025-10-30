import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true // 启用 IR 编译器来解决 Stack too deep 问题
    }
  },
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // Ganache 默认测试账户私钥（这些账户通常预充值了 ETH）
      accounts: [
        '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d', // Account 0
        '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1', // Account 1
        '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c', // Account 2
        '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913', // Account 3
        '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743', // Account 4
      ]
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
};

export default config;
