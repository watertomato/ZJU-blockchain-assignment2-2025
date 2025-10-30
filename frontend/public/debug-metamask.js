// MetaMask 连接诊断脚本
// 在浏览器控制台中运行此脚本来诊断问题

async function debugMetaMaskConnection() {
    console.log('🔍 开始MetaMask连接诊断...');
    
    try {
        // 1. 检查MetaMask是否可用
        if (typeof window.ethereum === 'undefined') {
            console.error('❌ MetaMask未安装或不可用');
            return;
        }
        console.log('✅ MetaMask已检测到');
        
        // 2. 检查当前网络
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log(`📡 当前MetaMask网络链ID: ${chainId} (${parseInt(chainId, 16)})`);
        
        if (parseInt(chainId, 16) !== 31337) {
            console.warn('⚠️  MetaMask未连接到本地网络 (31337)');
            console.log('请在MetaMask中切换到 Localhost 8545 网络');
        } else {
            console.log('✅ MetaMask已连接到正确的本地网络');
        }
        
        // 3. 检查账户连接
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            console.warn('⚠️  没有连接的账户');
            console.log('请在MetaMask中连接账户');
            return;
        }
        console.log(`👤 当前账户: ${accounts[0]}`);
        
        // 4. 创建provider并测试
        const { ethers } = window;
        if (typeof ethers === 'undefined') {
            console.error('❌ ethers库未加载');
            return;
        }
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // 5. 检查余额
        const balance = await provider.getBalance(accounts[0]);
        console.log(`💰 账户余额: ${ethers.utils.formatEther(balance)} ETH`);
        
        // 6. 测试合约连接
        const contractAddress = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
        
        // EasyBet合约ABI (简化版，只包含需要的函数)
        const contractABI = [
            "function purchaseMultipleTickets(uint256 projectId, uint256 optionIndex, uint256 quantity) external payable",
            "function getProjectsCount() external view returns (uint256)",
            "function projects(uint256) external view returns (tuple(uint256 id, string title, string description, address creator, uint256 totalAmount, uint256 endTime, bool isActive, bool isResolved, uint256 winningOption))"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        try {
            const projectCount = await contract.getProjectsCount();
            console.log(`📊 项目数量: ${projectCount.toString()}`);
            
            if (projectCount.gt(0)) {
                const project = await contract.projects(0);
                console.log(`📋 项目0详情:`, {
                    id: project.id.toString(),
                    title: project.title,
                    isActive: project.isActive,
                    endTime: new Date(project.endTime.toNumber() * 1000).toLocaleString()
                });
            }
        } catch (error) {
            console.error('❌ 合约连接失败:', error);
            return;
        }
        
        // 7. 测试Gas估算
        try {
            console.log('🔧 测试Gas估算...');
            const contractWithSigner = contract.connect(signer);
            
            // 测试参数
            const projectId = 0;
            const optionIndex = 0;
            const quantity = 2;
            const totalAmount = ethers.utils.parseEther('0.002'); // 0.001 ETH per ticket
            
            const gasEstimate = await contractWithSigner.estimateGas.purchaseMultipleTickets(
                projectId,
                optionIndex,
                quantity,
                { value: totalAmount }
            );
            
            console.log(`⛽ Gas估算成功: ${gasEstimate.toString()}`);
            
            // 8. 尝试实际交易（但不发送）
            console.log('🧪 构建交易...');
            const tx = await contractWithSigner.populateTransaction.purchaseMultipleTickets(
                projectId,
                optionIndex,
                quantity,
                { 
                    value: totalAmount,
                    gasLimit: gasEstimate.mul(120).div(100) // 增加20%的Gas
                }
            );
            
            console.log('📝 交易详情:', {
                to: tx.to,
                value: ethers.utils.formatEther(tx.value),
                gasLimit: tx.gasLimit?.toString(),
                data: tx.data?.substring(0, 50) + '...'
            });
            
            console.log('✅ 所有检查通过！问题可能在于实际发送交易时的参数或状态');
            
        } catch (gasError) {
            console.error('❌ Gas估算失败:', gasError);
            
            // 详细分析错误
            if (gasError.message.includes('revert')) {
                console.log('💡 这是一个合约revert错误，可能的原因:');
                console.log('   - 项目不存在或已结束');
                console.log('   - 选项索引无效');
                console.log('   - 支付金额不正确');
                console.log('   - 数量超过限制');
            } else if (gasError.message.includes('insufficient funds')) {
                console.log('💡 余额不足');
            } else {
                console.log('💡 其他错误，请检查合约状态和参数');
            }
        }
        
    } catch (error) {
        console.error('❌ 诊断过程中发生错误:', error);
    }
}

// 运行诊断
console.log('请确保已经加载了ethers库，然后运行: debugMetaMaskConnection()');
console.log('或者直接运行以下命令:');
console.log('debugMetaMaskConnection();');