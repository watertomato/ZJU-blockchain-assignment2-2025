// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NotaryNFT
 * @dev NFT合约用于管理公证人身份
 * 只有持有激活状态的NotaryNFT的用户才能作为公证人创建竞猜项目
 */
contract NotaryNFT is ERC721, ERC721Enumerable, Ownable {
    
    // NFT状态枚举
    enum NFTStatus { Inactive, Active, Suspended }
    
    // NFT信息结构体
    struct NotaryInfo {
        NFTStatus status;           // NFT状态
        uint256 issuedTimestamp;   // 发行时间
        uint256 activatedTimestamp; // 激活时间
        string metadataURI;        // 元数据URI
    }
    
    // 存储每个tokenId的公证人信息
    mapping(uint256 => NotaryInfo) public notaryInfos;
    
    // 当前tokenId计数器
    uint256 private _currentTokenId = 0;
    
    // 最低ETH余额要求 (0.1 ETH)
    uint256 public constant MIN_ETH_BALANCE = 0.1 ether;
    
    // 事件定义
    event NotaryNFTMinted(address indexed to, uint256 indexed tokenId);
    event NotaryNFTActivated(uint256 indexed tokenId, address indexed owner);
    event NotaryNFTSuspended(uint256 indexed tokenId, address indexed owner);
    event NotaryNFTReactivated(uint256 indexed tokenId, address indexed owner);
    
    constructor() ERC721("NotaryNFT", "NOTARY") Ownable(msg.sender) {}
    
    /**
     * @dev 铸造新的公证人NFT
     * @param to 接收者地址
     * @param metadataURI 元数据URI
     */
    function mintNotaryNFT(address to, string memory metadataURI) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        
        _currentTokenId++;
        uint256 tokenId = _currentTokenId;
        
        // 铸造NFT
        _safeMint(to, tokenId);
        
        // 设置NFT信息 (默认为激活状态，方便测试)
        notaryInfos[tokenId] = NotaryInfo({
            status: NFTStatus.Active,  // 改为默认激活
            issuedTimestamp: block.timestamp,
            activatedTimestamp: block.timestamp,  // 设置激活时间为当前时间
            metadataURI: metadataURI
        });
        
        emit NotaryNFTMinted(to, tokenId);
    }
    
    /**
     * @dev 激活NotaryNFT (仅限NFT持有者)
     * @param tokenId 要激活的tokenId
     */
    function activateNFT(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        require(notaryInfos[tokenId].status == NFTStatus.Inactive, "NFT is not inactive");
        require(msg.sender.balance >= MIN_ETH_BALANCE, "Insufficient ETH balance");
        
        notaryInfos[tokenId].status = NFTStatus.Active;
        notaryInfos[tokenId].activatedTimestamp = block.timestamp;
        
        emit NotaryNFTActivated(tokenId, msg.sender);
    }
    
    /**
     * @dev 暂停NotaryNFT (仅限合约所有者)
     * @param tokenId 要暂停的tokenId
     */
    function suspendNFT(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "NFT does not exist");
        require(notaryInfos[tokenId].status == NFTStatus.Active, "NFT is not active");
        
        notaryInfos[tokenId].status = NFTStatus.Suspended;
        
        emit NotaryNFTSuspended(tokenId, _ownerOf(tokenId));
    }
    
    /**
     * @dev 重新激活NotaryNFT (仅限合约所有者)
     * @param tokenId 要重新激活的tokenId
     */
    function reactivateNFT(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "NFT does not exist");
        require(notaryInfos[tokenId].status == NFTStatus.Suspended, "NFT is not suspended");
        
        address owner = _ownerOf(tokenId);
        require(owner.balance >= MIN_ETH_BALANCE, "Owner has insufficient ETH balance");
        
        notaryInfos[tokenId].status = NFTStatus.Active;
        
        emit NotaryNFTReactivated(tokenId, owner);
    }
    
    /**
     * @dev 检查NFT是否处于激活状态
     * @param tokenId 要检查的tokenId
     * @return 是否激活
     */
    function isActive(uint256 tokenId) external view returns (bool) {
        return notaryInfos[tokenId].status == NFTStatus.Active;
    }
    
    /**
     * @dev 检查地址是否为有效公证人
     * @param account 要检查的地址
     * @return 是否为有效公证人
     */
    function isValidNotary(address account) external view returns (bool) {
        if (account.balance < MIN_ETH_BALANCE) {
            return false;
        }
        
        uint256 balance = balanceOf(account);
        if (balance == 0) {
            return false;
        }
        
        // 检查是否有至少一个激活的NFT
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(account, i);
            if (notaryInfos[tokenId].status == NFTStatus.Active) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev 获取NFT的元数据URI
     * @param tokenId tokenId
     * @return 元数据URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "NFT does not exist");
        return notaryInfos[tokenId].metadataURI;
    }
    
    /**
     * @dev 获取用户的所有激活NFT
     * @param owner 用户地址
     * @return 激活的tokenId数组
     */
    function getActiveNFTs(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory activeTokens = new uint256[](balance);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            if (notaryInfos[tokenId].status == NFTStatus.Active) {
                activeTokens[activeCount] = tokenId;
                activeCount++;
            }
        }
        
        // 创建正确大小的数组
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeTokens[i];
        }
        
        return result;
    }
    
    // 重写必要的函数以支持ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}