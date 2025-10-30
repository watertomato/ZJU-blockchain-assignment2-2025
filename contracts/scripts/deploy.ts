import { ethers } from "hardhat";

async function main() {
  console.log("开始部署合约...");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log(`部署者地址: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`部署者余额: ${ethers.utils.formatEther(balance)} ETH`);
  
  // 部署 NotaryNFT 合约
  console.log("\n部署 NotaryNFT 合约...");
  const NotaryNFT = await ethers.getContractFactory("NotaryNFT");
  const notaryNFT = await NotaryNFT.deploy();
  await notaryNFT.deployed();
  
  console.log(`NotaryNFT deployed to: ${notaryNFT.address}`);
  
  // 部署 TicketNFT 合约
  console.log("\n部署 TicketNFT 合约...");
  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy();
  await ticketNFT.deployed();
  
  console.log(`TicketNFT deployed to: ${ticketNFT.address}`);
  
  // 部署 EasyBet 合约
  console.log("\n部署 EasyBet 合约...");
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = await EasyBet.deploy(notaryNFT.address, ticketNFT.address);
  await easyBet.deployed();
  
  console.log(`EasyBet deployed to: ${easyBet.address}`);
  
  // 设置 TicketNFT 的授权铸造者为 EasyBet 合约
  console.log("\n设置 TicketNFT 的授权铸造者...");
  const setMinterTx = await ticketNFT.setAuthorizedMinter(easyBet.address);
  await setMinterTx.wait();
  console.log("✅ TicketNFT 授权铸造者设置完成");
  
  // 输出合约地址供前端使用
  console.log("\n=== 合约部署完成 ===");
  console.log(`NotaryNFT 合约地址: ${notaryNFT.address}`);
  console.log(`TicketNFT 合约地址: ${ticketNFT.address}`);
  console.log(`EasyBet 合约地址: ${easyBet.address}`);
  console.log("\n请将以下地址更新到前端 .env 文件中:");
  console.log(`REACT_APP_NOTARY_NFT_ADDRESS=${notaryNFT.address}`);
  console.log(`REACT_APP_TICKET_NFT_ADDRESS=${ticketNFT.address}`);
  console.log(`REACT_APP_EASYBET_CONTRACT_ADDRESS=${easyBet.address}`);
  
  // 为部署者铸造一个NotaryNFT用于测试
  console.log(`\n为部署者 ${deployer.address} 铸造NotaryNFT...`);
  
  const mintTx = await notaryNFT.mintNotaryNFT(
    deployer.address, 
    "https://example.com/notary-metadata.json"
  );
  await mintTx.wait();
  
  console.log("✅ NotaryNFT 铸造成功! TokenId: 1");
  console.log("\n🔧 接下来的步骤:");
  console.log("1. 更新前端 .env 文件中的合约地址");
  console.log("2. 重启前端应用");
  console.log("3. 连接钱包后，调用 activateNFT(1) 来激活您的公证人身份");
  console.log("4. 激活后即可创建竞猜项目和购买彩票");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});