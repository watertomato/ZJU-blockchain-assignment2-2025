const { ethers } = require("ethers");

// 错误数据
const errorData = "0x177e802f0000000000000000000000009fe46736679d2d9a65f0992f2272de9f3c7fa6e00000000000000000000000000000000000000000000000000000000000000005";

console.log("🔍 解码自定义错误...");
console.log("错误数据:", errorData);

// 提取错误选择器
const errorSelector = errorData.slice(0, 10);
console.log("错误选择器:", errorSelector);

// 提取参数数据
const paramData = errorData.slice(10);
console.log("参数数据:", paramData);

// 尝试解码参数（假设是address和uint256）
try {
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ["address", "uint256"], 
    "0x" + paramData
  );
  
  console.log("解码结果:");
  console.log("  地址:", decoded[0]);
  console.log("  数值:", decoded[1].toString());
} catch (error) {
  console.log("解码失败:", error.message);
}

// 常见的ERC721错误选择器
const commonErrors = {
  "0x177e802f": "ERC721IncorrectOwner(address owner, uint256 tokenId)",
  "0xce3f0005": "ERC721InsufficientApproval(address operator, uint256 tokenId)",
  "0x7e273289": "ERC721NonexistentToken(uint256 tokenId)",
  "0x64a0ae92": "ERC721InvalidOwner(address owner)",
  "0x5b08ba18": "ERC721InvalidApprover(address approver)",
  "0x4b6e7f18": "ERC721InvalidOperator(address operator)",
  "0x23c2a4e6": "ERC721InvalidSender(address sender)",
  "0x617ba037": "ERC721InvalidReceiver(address receiver)"
};

if (commonErrors[errorSelector]) {
  console.log("\n✅ 匹配的错误类型:", commonErrors[errorSelector]);
} else {
  console.log("\n❓ 未知的错误选择器");
}