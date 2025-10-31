// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Import NotaryNFT interface for verification
interface INotaryNFT {
    function balanceOf(address owner) external view returns (uint256);
    function isValidNotary(address owner) external view returns (bool);
}

// Import TicketNFT interface for minting tickets
interface ITicketNFT {
    function mintTicket(
        address to,
        uint256 projectId,
        uint256 optionIndex,
        uint256 betAmount,
        string memory metadataURI
    ) external returns (uint256);
    
    function ownerOf(uint256 tokenId) external view returns (address);
    
    function getTicketInfo(uint256 tokenId) external view returns (
        uint256 projectId,
        uint256 optionIndex,
        uint256 betAmount,
        address bettor,
        uint256 purchaseTimestamp,
        string memory metadataURI
    );
    
    function transferFrom(address from, address to, uint256 tokenId) external;
}

contract EasyBet {
    
    // NotaryNFT contract address
    address public notaryNFTAddress;
    
    // TicketNFT contract address
    address public ticketNFTAddress;
    
    // Project counter for unique IDs
    uint256 public projectCounter;
    
    // Events
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed creator,
        string title,
        string[] options,
        uint256 totalPrize,
        uint256 endTime
    );
    
    event BetPlaced(
        uint256 indexed projectId,
        address indexed bettor,
        uint256 optionIndex,
        uint256 amount
    );
    
    event TicketPurchased(
        uint256 indexed projectId,
        address indexed buyer,
        uint256 indexed ticketId,
        uint256 optionIndex,
        uint256 amount
    );
    
    event ProjectFinalized(
        uint256 indexed projectId,
        uint256 winningOption,
        uint256 totalPayout
    );

    event MarketplaceAction(
        uint256 indexed listingId,
        uint256 indexed projectId,
        uint256 indexed ticketId,
        address seller,
        address buyer,
        uint256 unitPrice,
        uint256 quantity,
        string action // "LISTED", "SOLD", "CANCELLED"
    );

    // Project structure
    struct BettingProject {
        uint256 id;
        string title;
        string description;
        string[] options;
        uint256 totalPrize;
        uint256 ticketPrice;
        uint256 endTime;
        address creator;
        bool isActive;
        bool isFinalized;
        uint256 winningOption;
        uint256 totalBetsAmount;
    }

    // Ticket listing structure for marketplace
    struct TicketListing {
        uint256 id;
        uint256 projectId;
        uint256 ticketId;
        address seller;
        uint256 price;        // 整张彩票的价格
        bool isActive;
        uint256 listTime;
    }

    // Mappings
    mapping(uint256 => BettingProject) public projects;
    mapping(uint256 => mapping(uint256 => uint256)) public optionBets; // projectId => optionIndex => totalAmount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userBets; // projectId => user => optionIndex => amount
    mapping(address => uint256[]) public userProjects; // creator => projectIds

    // Marketplace mappings
    mapping(uint256 => TicketListing) public listings; // listingId => TicketListing
    mapping(address => uint256[]) public userListings; // seller => listingIds
    mapping(uint256 => uint256[]) public projectListings; // projectId => listingIds
    mapping(uint256 => uint256) public ticketToListing; // ticketId => listingId (防止重复挂单)
    uint256 public listingCounter;

    // Modifiers
    modifier onlyNotary() {
        require(notaryNFTAddress != address(0), "NotaryNFT address not set");
        INotaryNFT notaryNFT = INotaryNFT(notaryNFTAddress);
        require(notaryNFT.balanceOf(msg.sender) > 0, "Not a notary");
        require(notaryNFT.isValidNotary(msg.sender), "Notary not activated");
        _;
    }

    modifier projectExists(uint256 _projectId) {
        require(_projectId > 0 && _projectId <= projectCounter, "Project does not exist");
        _;
    }

    modifier projectActive(uint256 _projectId) {
        require(projects[_projectId].isActive, "Project is not active");
        require(block.timestamp < projects[_projectId].endTime, "Project has ended");
        require(!projects[_projectId].isFinalized, "Project is finalized");
        _;
    }

    constructor(address _notaryNFTAddress, address _ticketNFTAddress) {
        notaryNFTAddress = _notaryNFTAddress;
        ticketNFTAddress = _ticketNFTAddress;
        projectCounter = 0;
        listingCounter = 0;
    }

    // Create a new betting project
    function createProject(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _ticketPrice,
        uint256 _endTime
    ) external payable onlyNotary returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_options.length >= 2, "Must have at least 2 options");
        require(_ticketPrice > 0, "Ticket price must be greater than 0");
        require(_endTime > block.timestamp, "End time must be in the future");
        require(msg.value > 0, "Prize pool must be greater than 0");

        // Validate options
        for (uint256 i = 0; i < _options.length; i++) {
            require(bytes(_options[i]).length > 0, "Option cannot be empty");
        }

        projectCounter++;
        
        BettingProject storage newProject = projects[projectCounter];
        newProject.id = projectCounter;
        newProject.title = _title;
        newProject.description = _description;
        newProject.options = _options;
        newProject.totalPrize = msg.value;
        newProject.ticketPrice = _ticketPrice;
        newProject.endTime = _endTime;
        newProject.creator = msg.sender;
        newProject.isActive = true;
        newProject.isFinalized = false;
        newProject.totalBetsAmount = 0;

        // Add to creator's projects
        userProjects[msg.sender].push(projectCounter);

        emit ProjectCreated(
            projectCounter,
            msg.sender,
            _title,
            _options,
            msg.value,
            _endTime
        );
        
        return projectCounter;
    }

    // Get project details
    function getProject(uint256 _projectId) external view projectExists(_projectId) returns (
        uint256 id,
        string memory title,
        string memory description,
        string[] memory options,
        uint256 totalPrize,
        uint256 ticketPrice,
        uint256 endTime,
        address creator,
        bool isActive,
        bool isFinalized,
        uint256 winningOption,
        uint256 totalBetsAmount
    ) {
        BettingProject storage project = projects[_projectId];
        return (
            project.id,
            project.title,
            project.description,
            project.options,
            project.totalPrize,
            project.ticketPrice,
            project.endTime,
            project.creator,
            project.isActive,
            project.isFinalized,
            project.winningOption,
            project.totalBetsAmount
        );
    }

    // Get all projects created by a user
    function getUserProjects(address _user) external view returns (uint256[] memory) {
        return userProjects[_user];
    }

    // Get all active projects
    function getActiveProjects() external view returns (uint256[] memory) {
        uint256[] memory activeProjectIds = new uint256[](projectCounter);
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= projectCounter; i++) {
            if (projects[i].isActive && !projects[i].isFinalized && block.timestamp < projects[i].endTime) {
                activeProjectIds[activeCount] = i;
                activeCount++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeProjectIds[i];
        }

        return result;
    }

    // Get option betting details for a project
    function getOptionBets(uint256 _projectId) external view projectExists(_projectId) returns (uint256[] memory) {
        uint256[] memory bets = new uint256[](projects[_projectId].options.length);
        for (uint256 i = 0; i < projects[_projectId].options.length; i++) {
            bets[i] = optionBets[_projectId][i];
        }
        return bets;
    }

    // Get user's bets for a project
    function getUserBets(uint256 _projectId, address _user) external view projectExists(_projectId) returns (uint256[] memory) {
        uint256[] memory bets = new uint256[](projects[_projectId].options.length);
        for (uint256 i = 0; i < projects[_projectId].options.length; i++) {
            bets[i] = userBets[_projectId][_user][i];
        }
        return bets;
    }

    // Update NotaryNFT address (only for testing/deployment)
    function setNotaryNFTAddress(address _notaryNFTAddress) external {
        require(notaryNFTAddress == address(0), "NotaryNFT address already set");
        notaryNFTAddress = _notaryNFTAddress;
    }

    // Update TicketNFT address (only for testing/deployment)
    function setTicketNFTAddress(address _ticketNFTAddress) external {
        require(ticketNFTAddress == address(0), "TicketNFT address already set");
        ticketNFTAddress = _ticketNFTAddress;
    }

    // Purchase a ticket for a specific option
    function purchaseTicket(uint256 _projectId, uint256 _optionIndex) 
        external 
        payable 
        projectExists(_projectId) 
        projectActive(_projectId) 
        returns (uint256) 
    {
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(msg.value == projects[_projectId].ticketPrice, "Incorrect ticket price");
        require(_optionIndex < projects[_projectId].options.length, "Invalid option index");
        require(ticketNFTAddress != address(0), "TicketNFT address not set");
        
        // 检查票池资金是否足够
        require(projects[_projectId].totalBetsAmount + msg.value <= projects[_projectId].totalPrize, "Insufficient funds in prize pool");

        // Update betting data
        optionBets[_projectId][_optionIndex] += msg.value;
        userBets[_projectId][msg.sender][_optionIndex] += msg.value;
        projects[_projectId].totalBetsAmount += msg.value;

        // Create metadata URI for the ticket
        string memory metadataURI = string(abi.encodePacked(
            "https://easybet.com/ticket/",
            _toString(_projectId),
            "/",
            _toString(_optionIndex),
            "/",
            _toString(block.timestamp)
        ));

        // Mint ticket NFT
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        uint256 ticketId = ticketNFT.mintTicket(
            msg.sender,
            _projectId,
            _optionIndex,
            msg.value,
            metadataURI
        );

        // Emit events
        emit BetPlaced(_projectId, msg.sender, _optionIndex, msg.value);
        emit TicketPurchased(_projectId, msg.sender, ticketId, _optionIndex, msg.value);

        return ticketId;
    }

    // Purchase multiple tickets for a specific option
    function purchaseMultipleTickets(uint256 _projectId, uint256 _optionIndex, uint256 _quantity) 
        external 
        payable 
        projectExists(_projectId) 
        projectActive(_projectId) 
        returns (uint256[] memory) 
    {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_quantity <= 100, "Cannot purchase more than 100 tickets at once"); // 防止Gas超限
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(msg.value == projects[_projectId].ticketPrice * _quantity, "Incorrect total payment");
        require(_optionIndex < projects[_projectId].options.length, "Invalid option index");
        require(ticketNFTAddress != address(0), "TicketNFT address not set");
        
        // 检查票池资金是否足够
        uint256 totalAmount = projects[_projectId].ticketPrice * _quantity;
        require(projects[_projectId].totalBetsAmount + totalAmount <= projects[_projectId].totalPrize, "Insufficient funds in prize pool");

        // Update betting data
        optionBets[_projectId][_optionIndex] += totalAmount;
        userBets[_projectId][msg.sender][_optionIndex] += totalAmount;
        projects[_projectId].totalBetsAmount += totalAmount;

        // Mint multiple ticket NFTs
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        uint256[] memory ticketIds = new uint256[](_quantity);
        
        for (uint256 i = 0; i < _quantity; i++) {
            // Create metadata URI for each ticket
            string memory metadataURI = string(abi.encodePacked(
                "https://easybet.com/ticket/",
                _toString(_projectId),
                "/",
                _toString(_optionIndex),
                "/",
                _toString(block.timestamp),
                "/",
                _toString(i)
            ));

            // Mint ticket NFT
            uint256 ticketId = ticketNFT.mintTicket(
                msg.sender,
                _projectId,
                _optionIndex,
                projects[_projectId].ticketPrice,
                metadataURI
            );
            
            ticketIds[i] = ticketId;

            // Emit events for each ticket
            emit BetPlaced(_projectId, msg.sender, _optionIndex, projects[_projectId].ticketPrice);
            emit TicketPurchased(_projectId, msg.sender, ticketId, _optionIndex, projects[_projectId].ticketPrice);
        }

        return ticketIds;
    }

    // Helper function to convert uint256 to string
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

    function helloworld() pure external returns(string memory) {
        return "hello world";
    }

    // ==================== MARKETPLACE FUNCTIONS ====================

    /**
     * @dev 挂单出售单张彩票
     * @param _ticketId 彩票NFT的tokenId
     * @param _price 彩票价格（wei）
     */
    function listTicketForSale(
        uint256 _ticketId,
        uint256 _price
    ) external returns (uint256) {
        require(ticketNFTAddress != address(0), "TicketNFT address not set");
        require(_price > 0, "Price must be greater than 0");
        
        // 验证调用者是彩票的拥有者
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        require(ticketNFT.ownerOf(_ticketId) == msg.sender, "Not the owner of this ticket");
        
        // 检查是否已有活跃挂单
        uint256 existingListingId = ticketToListing[_ticketId];
        if (existingListingId != 0 && listings[existingListingId].isActive) {
            revert("Ticket already listed");
        }
        
        // 获取彩票信息
        (uint256 projectId, , , , , ) = ticketNFT.getTicketInfo(_ticketId);
        
        // 验证项目存在
        require(projectId > 0 && projectId <= projectCounter, "Invalid project");
        
        // 创建挂单
        listingCounter++;
        uint256 listingId = listingCounter;
        
        listings[listingId] = TicketListing({
            id: listingId,
            projectId: projectId,
            ticketId: _ticketId,
            seller: msg.sender,
            price: _price,
            isActive: true,
            listTime: block.timestamp
        });
        
        // 更新映射
        userListings[msg.sender].push(listingId);
        projectListings[projectId].push(listingId);
        ticketToListing[_ticketId] = listingId; // 记录彩票到挂单的映射
        
        // 发出事件
        emit MarketplaceAction(
            listingId,
            projectId,
            _ticketId,
            msg.sender,
            address(0), // 挂单时没有买家
            _price,
            1, // 单张彩票
            "LISTED"
        );
        
        return listingId;
    }

    /**
     * @dev 批量挂单出售多张彩票
     * @param _ticketIds 彩票NFT的tokenId数组
     * @param _prices 对应的彩票价格数组（wei）
     */
    function listMultipleTicketsForSale(
        uint256[] memory _ticketIds,
        uint256[] memory _prices
    ) external returns (uint256[] memory) {
        require(ticketNFTAddress != address(0), "TicketNFT address not set");
        require(_ticketIds.length > 0, "No tickets provided");
        require(_ticketIds.length == _prices.length, "Arrays length mismatch");
        require(_ticketIds.length <= 50, "Too many tickets at once"); // 限制批量数量
        
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        uint256[] memory listingIds = new uint256[](_ticketIds.length);
        
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 ticketId = _ticketIds[i];
            uint256 price = _prices[i];
            
            require(price > 0, "Price must be greater than 0");
            
            // 验证调用者是彩票的拥有者
            require(ticketNFT.ownerOf(ticketId) == msg.sender, "Not the owner of this ticket");
            
            // 检查是否已有活跃挂单
            uint256 existingListingId = ticketToListing[ticketId];
            if (existingListingId != 0 && listings[existingListingId].isActive) {
                revert("Ticket already listed");
            }
            
            // 获取彩票信息
            (uint256 projectId, , , , , ) = ticketNFT.getTicketInfo(ticketId);
            
            // 验证项目存在
            require(projectId > 0 && projectId <= projectCounter, "Invalid project");
            
            // 创建挂单
            listingCounter++;
            uint256 listingId = listingCounter;
            
            listings[listingId] = TicketListing({
                id: listingId,
                projectId: projectId,
                ticketId: ticketId,
                seller: msg.sender,
                price: price,
                isActive: true,
                listTime: block.timestamp
            });
            
            // 更新映射
            userListings[msg.sender].push(listingId);
            projectListings[projectId].push(listingId);
            ticketToListing[ticketId] = listingId; // 记录彩票到挂单的映射
            
            // 发出事件
            emit MarketplaceAction(
                listingId,
                projectId,
                ticketId,
                msg.sender,
                address(0), // 挂单时没有买家
                price,
                1, // 单张彩票
                "LISTED"
            );
            
            listingIds[i] = listingId;
        }
        
        return listingIds;
    }

    /**
     * @dev 购买挂单的彩票（单张彩票购买）
     * @param _listingId 挂单ID
     */
    function buyListedTicket(uint256 _listingId) external payable {
        require(_listingId > 0 && _listingId <= listingCounter, "Invalid listing ID");
        
        TicketListing storage listing = listings[_listingId];
        require(listing.isActive, "Listing is not active");
        require(msg.sender != listing.seller, "Cannot buy your own listing");
        
        require(msg.value == listing.price, "Incorrect payment amount");
        
        // 验证卖家仍然拥有这张彩票
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        require(ticketNFT.ownerOf(listing.ticketId) == listing.seller, "Seller no longer owns this ticket");
        
        // 更新挂单状态
        listing.isActive = false;
        
        // 清理彩票到挂单的映射
        delete ticketToListing[listing.ticketId];
        
        // 转移NFT所有权从卖家到买家
        ticketNFT.transferFrom(listing.seller, msg.sender, listing.ticketId);
        
        // 转账给卖家
        payable(listing.seller).transfer(listing.price);
        
        // 发出事件
        emit MarketplaceAction(
            _listingId,
            listing.projectId,
            listing.ticketId,
            listing.seller,
            msg.sender,
            listing.price,
            1, // 单张彩票
            "SOLD"
        );
    }

    /**
     * @dev 批量购买挂单的彩票（从最低价开始购买指定数量）
     * @param _projectId 项目ID
     * @param _optionIndex 选项索引
     * @param _quantity 购买数量
     */
    function buyMultipleListedTickets(
        uint256 _projectId, 
        uint256 _optionIndex, 
        uint256 _quantity
    ) external payable returns (uint256[] memory) {
        require(_projectId > 0 && _projectId <= projectCounter, "Invalid project ID");
        require(_quantity > 0, "Quantity must be greater than 0");
        
        // 获取该项目和选项的所有活跃挂单，按价格排序
        uint256[] memory sortedListingIds = _getSortedListingsByPrice(_projectId, _optionIndex);
        require(sortedListingIds.length > 0, "No active listings for this project and option");
        
        // 计算需要购买的挂单和总价格
        uint256[] memory listingsToBuy = new uint256[](_quantity);
        uint256 totalPrice = 0;
        uint256 purchasedCount = 0;
        
        for (uint256 i = 0; i < sortedListingIds.length && purchasedCount < _quantity; i++) {
            uint256 listingId = sortedListingIds[i];
            TicketListing storage listing = listings[listingId];
            
            if (listing.isActive && listing.seller != msg.sender) {
                // 验证卖家仍然拥有这张彩票
                ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
                if (ticketNFT.ownerOf(listing.ticketId) == listing.seller) {
                    listingsToBuy[purchasedCount] = listingId;
                    totalPrice += listing.price;
                    purchasedCount++;
                }
            }
        }
        
        require(purchasedCount == _quantity, "Not enough tickets available for purchase");
        require(msg.value == totalPrice, "Incorrect payment amount");
        
        // 执行批量购买
        uint256[] memory purchasedTicketIds = new uint256[](_quantity);
        
        for (uint256 i = 0; i < _quantity; i++) {
            uint256 listingId = listingsToBuy[i];
            TicketListing storage listing = listings[listingId];
            
            // 更新挂单状态
            listing.isActive = false;
            
            // 清理彩票到挂单的映射
            delete ticketToListing[listing.ticketId];
            
            // 转移NFT所有权从卖家到买家
            ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
            ticketNFT.transferFrom(listing.seller, msg.sender, listing.ticketId);
            
            // 转账给卖家
            payable(listing.seller).transfer(listing.price);
            
            // 记录购买的彩票ID
            purchasedTicketIds[i] = listing.ticketId;
            
            // 发出事件
            emit MarketplaceAction(
                listingId,
                listing.projectId,
                listing.ticketId,
                listing.seller,
                msg.sender,
                listing.price,
                1, // 单张彩票
                "SOLD"
            );
        }
        
        return purchasedTicketIds;
    }

    /**
     * @dev 获取指定项目和选项的挂单，按价格从低到高排序
     * @param _projectId 项目ID
     * @param _optionIndex 选项索引
     */
    function _getSortedListingsByPrice(
        uint256 _projectId, 
        uint256 _optionIndex
    ) internal view returns (uint256[] memory) {
        // 首先收集所有匹配的挂单
        uint256[] memory matchingListings = new uint256[](listingCounter);
        uint256 matchingCount = 0;
        
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        
        for (uint256 i = 1; i <= listingCounter; i++) {
            TicketListing storage listing = listings[i];
            if (listing.isActive && listing.projectId == _projectId) {
                // 检查彩票的选项是否匹配
                (uint256 projectId, uint256 optionIndex, , , , ) = ticketNFT.getTicketInfo(listing.ticketId);
                if (projectId == _projectId && optionIndex == _optionIndex) {
                    matchingListings[matchingCount] = i;
                    matchingCount++;
                }
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](matchingCount);
        for (uint256 i = 0; i < matchingCount; i++) {
            result[i] = matchingListings[i];
        }
        
        // 简单的冒泡排序，按价格从低到高排序
        for (uint256 i = 0; i < result.length; i++) {
            for (uint256 j = i + 1; j < result.length; j++) {
                if (listings[result[i]].price > listings[result[j]].price) {
                    uint256 temp = result[i];
                    result[i] = result[j];
                    result[j] = temp;
                }
            }
        }
        
        return result;
    }

    /**
     * @dev 取消挂单
     * @param _listingId 挂单ID
     */
    function cancelListing(uint256 _listingId) external {
        require(_listingId > 0 && _listingId <= listingCounter, "Invalid listing ID");
        
        TicketListing storage listing = listings[_listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.isActive, "Listing is not active");
        
        // 取消挂单
        listing.isActive = false;
        
        // 发出事件
        emit MarketplaceAction(
            _listingId,
            listing.projectId,
            listing.ticketId,
            listing.seller,
            address(0),
            listing.price,
            1, // 单张彩票
            "CANCELLED"
        );
    }

    /**
     * @dev 获取所有活跃的挂单
     */
    function getActiveListings() external view returns (uint256[] memory) {
        uint256[] memory activeListingIds = new uint256[](listingCounter);
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].isActive) {
                activeListingIds[activeCount] = i;
                activeCount++;
            }
        }

        // 调整数组大小
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeListingIds[i];
        }

        return result;
    }

    /**
     * @dev 获取用户的挂单
     * @param _user 用户地址
     */
    function getUserListings(address _user) external view returns (uint256[] memory) {
        return userListings[_user];
    }

    /**
     * @dev 获取项目的挂单
     * @param _projectId 项目ID
     */
    function getProjectListings(uint256 _projectId) external view returns (uint256[] memory) {
        return projectListings[_projectId];
    }

    /**
     * @dev 获取挂单详情
     * @param _listingId 挂单ID
     */
    function getListingDetails(uint256 _listingId) external view returns (
        uint256 id,
        uint256 projectId,
        uint256 ticketId,
        address seller,
        uint256 price,
        bool isActive,
        uint256 listTime
    ) {
        require(_listingId > 0 && _listingId <= listingCounter, "Invalid listing ID");
        
        TicketListing storage listing = listings[_listingId];
        return (
            listing.id,
            listing.projectId,
            listing.ticketId,
            listing.seller,
            listing.price,
            listing.isActive,
            listing.listTime
        );
    }

    /**
     * @dev 检查彩票是否已挂单
     * @param _ticketId 彩票ID
     * @return isListed 是否已挂单
     * @return listingId 挂单ID（如果已挂单）
     */
    function isTicketListed(uint256 _ticketId) external view returns (bool isListed, uint256 listingId) {
        listingId = ticketToListing[_ticketId];
        if (listingId > 0 && listings[listingId].isActive) {
            return (true, listingId);
        }
        return (false, 0);
    }

    /**
     * @dev 终止项目并进行结算
     * @param _projectId 项目ID
     * @param _winningOption 获胜选项索引
     */
    function terminateProject(uint256 _projectId, uint256 _winningOption) 
        external 
        onlyNotary 
        projectExists(_projectId) 
    {
        BettingProject storage project = projects[_projectId];
        
        // 验证项目状态
        require(project.isActive, "Project is not active");
        require(!project.isFinalized, "Project already finalized");
        require(_winningOption < project.options.length, "Invalid winning option");
        
        // 更新项目状态
        project.isFinalized = true;
        project.isActive = false;
        project.winningOption = _winningOption;
        
        // 计算奖池总金额：仅使用初始奖池
        uint256 totalPrizePool = project.totalPrize;
        
        // 计算获胜选项的总投注金额
        uint256 winningBetAmount = optionBets[_projectId][_winningOption];
        
        if (winningBetAmount > 0) {
            // 有获胜者，记录项目已终止，等待分配奖金
            emit ProjectFinalized(_projectId, _winningOption, totalPrizePool);
        } else {
            // 如果没有获胜者，奖池退还给项目创建者
            payable(project.creator).transfer(totalPrizePool);
            emit ProjectFinalized(_projectId, _winningOption, 0);
        }
    }

    /**
     * @dev 为获胜彩票分配奖金（需要传入彩票ID列表）
     * @param _projectId 项目ID
     * @param _ticketIds 获胜彩票ID列表
     */
    function distributeRewardsToTickets(
        uint256 _projectId, 
        uint256[] calldata _ticketIds
    ) external onlyNotary projectExists(_projectId) {
        BettingProject storage project = projects[_projectId];
        
        require(project.isFinalized, "Project not finalized");
        require(_ticketIds.length > 0, "No tickets provided");
        
        // 计算奖池总金额：仅使用初始奖池
        uint256 totalPrizePool = project.totalPrize;
        
        // 验证彩票并计算总的获胜彩票数
        uint256 validTicketCount = 0;
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            (uint256 projectId, uint256 optionIndex, , , , ) = ticketNFT.getTicketInfo(_ticketIds[i]);
            
            if (projectId == _projectId && optionIndex == project.winningOption) {
                validTicketCount++;
            }
        }
        
        require(validTicketCount > 0, "No valid winning tickets");
        
        // 计算每张彩票的奖金
        uint256 rewardPerTicket = totalPrizePool / validTicketCount;
        
        // 分配奖金
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            (uint256 projectId, uint256 optionIndex, , , , ) = ticketNFT.getTicketInfo(_ticketIds[i]);
            
            if (projectId == _projectId && optionIndex == project.winningOption) {
                address ticketOwner = ticketNFT.ownerOf(_ticketIds[i]);
                payable(ticketOwner).transfer(rewardPerTicket);
            }
        }
    }
}