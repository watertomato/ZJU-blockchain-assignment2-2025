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
        uint256 unitPrice;
        uint256 quantity;
        uint256 remainingQuantity;
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
     * @dev 挂单出售彩票
     * @param _ticketId 彩票NFT的tokenId
     * @param _unitPrice 单价（wei）
     * @param _quantity 出售数量
     */
    function listTicketForSale(
        uint256 _ticketId,
        uint256 _unitPrice,
        uint256 _quantity
    ) external returns (uint256) {
        require(ticketNFTAddress != address(0), "TicketNFT address not set");
        require(_unitPrice > 0, "Unit price must be greater than 0");
        require(_quantity > 0, "Quantity must be greater than 0");
        
        // 验证调用者是彩票的拥有者
        ITicketNFT ticketNFT = ITicketNFT(ticketNFTAddress);
        require(ticketNFT.ownerOf(_ticketId) == msg.sender, "Not the owner of this ticket");
        
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
            unitPrice: _unitPrice,
            quantity: _quantity,
            remainingQuantity: _quantity,
            isActive: true,
            listTime: block.timestamp
        });
        
        // 更新映射
        userListings[msg.sender].push(listingId);
        projectListings[projectId].push(listingId);
        
        // 发出事件
        emit MarketplaceAction(
            listingId,
            projectId,
            _ticketId,
            msg.sender,
            address(0), // 挂单时没有买家
            _unitPrice,
            _quantity,
            "LISTED"
        );
        
        return listingId;
    }

    /**
     * @dev 购买挂单的彩票
     * @param _listingId 挂单ID
     * @param _quantity 购买数量
     */
    function buyListedTicket(uint256 _listingId, uint256 _quantity) external payable {
        require(_listingId > 0 && _listingId <= listingCounter, "Invalid listing ID");
        
        TicketListing storage listing = listings[_listingId];
        require(listing.isActive, "Listing is not active");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_quantity <= listing.remainingQuantity, "Not enough tickets available");
        require(msg.sender != listing.seller, "Cannot buy your own listing");
        
        uint256 totalPrice = listing.unitPrice * _quantity;
        require(msg.value == totalPrice, "Incorrect payment amount");
        
        // 更新挂单状态
        listing.remainingQuantity -= _quantity;
        if (listing.remainingQuantity == 0) {
            listing.isActive = false;
        }
        
        // 转账给卖家
        payable(listing.seller).transfer(totalPrice);
        
        // 转移NFT所有权（这里简化处理，实际应该根据具体需求实现）
        // 注意：这里需要根据实际的NFT分割逻辑来实现
        
        // 发出事件
        emit MarketplaceAction(
            _listingId,
            listing.projectId,
            listing.ticketId,
            listing.seller,
            msg.sender,
            listing.unitPrice,
            _quantity,
            "SOLD"
        );
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
            listing.unitPrice,
            listing.remainingQuantity,
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
            if (listings[i].isActive && listings[i].remainingQuantity > 0) {
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
        uint256 unitPrice,
        uint256 quantity,
        uint256 remainingQuantity,
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
            listing.unitPrice,
            listing.quantity,
            listing.remainingQuantity,
            listing.isActive,
            listing.listTime
        );
    }
}