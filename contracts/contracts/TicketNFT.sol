// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TicketNFT
 * @dev NFT合约用于管理彩票凭证
 * 每个NFT代表用户购买的一张彩票
 */
contract TicketNFT is ERC721, ERC721Enumerable, Ownable {
    
    // 彩票信息结构体
    struct TicketInfo {
        uint256 projectId;          // 项目ID
        uint256 optionIndex;        // 选择的选项索引
        uint256 betAmount;          // 投注金额
        address bettor;             // 投注者地址
        uint256 purchaseTimestamp;  // 购买时间
        string metadataURI;         // 元数据URI
    }
    
    // 存储每个tokenId的彩票信息
    mapping(uint256 => TicketInfo) public ticketInfos;
    
    // 当前tokenId计数器
    uint256 private _currentTokenId = 0;
    
    // 授权的铸造者（EasyBet合约地址）
    address public authorizedMinter;
    
    // 事件定义
    event TicketMinted(
        address indexed to, 
        uint256 indexed tokenId, 
        uint256 indexed projectId,
        uint256 optionIndex,
        uint256 betAmount
    );
    
    constructor() ERC721("TicketNFT", "TICKET") Ownable(msg.sender) {}
    
    /**
     * @dev 设置授权的铸造者（通常是EasyBet合约）
     * @param _minter 铸造者地址
     */
    function setAuthorizedMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        authorizedMinter = _minter;
    }
    
    /**
     * @dev 铸造新的彩票NFT（只能由授权的铸造者调用）
     * @param to 接收者地址
     * @param projectId 项目ID
     * @param optionIndex 选择的选项索引
     * @param betAmount 投注金额
     * @param metadataURI 元数据URI
     */
    function mintTicket(
        address to,
        uint256 projectId,
        uint256 optionIndex,
        uint256 betAmount,
        string memory metadataURI
    ) external returns (uint256) {
        require(msg.sender == authorizedMinter, "Only authorized minter can mint");
        require(to != address(0), "Cannot mint to zero address");
        
        _currentTokenId++;
        uint256 newTokenId = _currentTokenId;
        
        // 铸造NFT
        _safeMint(to, newTokenId);
        
        // 存储彩票信息
        ticketInfos[newTokenId] = TicketInfo({
            projectId: projectId,
            optionIndex: optionIndex,
            betAmount: betAmount,
            bettor: to,
            purchaseTimestamp: block.timestamp,
            metadataURI: metadataURI
        });
        
        emit TicketMinted(to, newTokenId, projectId, optionIndex, betAmount);
        
        return newTokenId;
    }
    
    /**
     * @dev 获取彩票信息
     * @param tokenId 彩票NFT的tokenId
     */
    function getTicketInfo(uint256 tokenId) external view returns (
        uint256 projectId,
        uint256 optionIndex,
        uint256 betAmount,
        address bettor,
        uint256 purchaseTimestamp,
        string memory metadataURI
    ) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        
        TicketInfo storage ticket = ticketInfos[tokenId];
        return (
            ticket.projectId,
            ticket.optionIndex,
            ticket.betAmount,
            ticket.bettor,
            ticket.purchaseTimestamp,
            ticket.metadataURI
        );
    }
    
    /**
     * @dev 获取用户拥有的所有彩票
     * @param owner 用户地址
     */
    function getTicketsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 获取特定项目的所有彩票
     * @param projectId 项目ID
     */
    function getTicketsByProject(uint256 projectId) external view returns (uint256[] memory) {
        uint256 totalSupply = totalSupply();
        uint256[] memory projectTickets = new uint256[](totalSupply);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _currentTokenId; i++) {
            if (_ownerOf(i) != address(0) && ticketInfos[i].projectId == projectId) {
                projectTickets[count] = i;
                count++;
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = projectTickets[i];
        }
        
        return result;
    }
    
    /**
     * @dev 重写tokenURI函数
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "URI query for nonexistent token");
        
        string memory baseURI = _baseURI();
        if (bytes(ticketInfos[tokenId].metadataURI).length > 0) {
            return ticketInfos[tokenId].metadataURI;
        }
        
        return bytes(baseURI).length > 0 ? 
            string(abi.encodePacked(baseURI, _toString(tokenId))) : "";
    }
    
    /**
     * @dev 将uint256转换为string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // 重写必需的函数
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