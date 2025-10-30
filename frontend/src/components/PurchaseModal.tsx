import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Button,
  Space,
  Typography,
  InputNumber,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Alert,
  Spin,
  message,
  Divider,
  Progress
} from 'antd';
import {
  ShoppingCartOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { purchaseTicket, purchaseMultipleTickets } from '../utils/contract';
import { BettingProject, BettingOption } from '../types';

const { Title, Text } = Typography;
const { Step } = Steps;

interface PurchaseModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (tickets: any[]) => void;
  project: BettingProject;
  selectedOption?: BettingOption;
}

interface PurchaseStep {
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  project,
  selectedOption
}) => {
  const { address, balance, connect, isConnected } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketAmount, setTicketAmount] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [internalSelectedOption, setInternalSelectedOption] = useState<BettingOption | null>(selectedOption || null);

  // 使用传入的selectedOption或内部状态
  const currentSelectedOption = selectedOption || internalSelectedOption;

  // 购买步骤
  const [steps, setSteps] = useState<PurchaseStep[]>([
    {
      title: '确认购买',
      description: '选择购买数量和确认信息',
      status: 'process'
    },
    {
      title: '连接钱包',
      description: '确保钱包已连接',
      status: 'wait'
    },
    {
      title: '支付确认',
      description: '在钱包中确认交易',
      status: 'wait'
    },
    {
      title: '交易处理',
      description: '等待区块链确认',
      status: 'wait'
    },
    {
      title: '购买完成',
      description: '彩票已成功购买',
      status: 'wait'
    }
  ]);

  // 计算总价
  const totalPrice = ticketAmount * parseFloat(project.ticketPrice);

  // 检查余额是否足够
  const hasEnoughBalance = parseFloat(balance) >= totalPrice;

  // 计算基于余额的最大购买数量
  const maxAffordableTickets = Math.floor(parseFloat(balance) / parseFloat(project.ticketPrice));
  // 计算最大可购买票数（总奖池 / 票价 - 已售票数）
  const maxAvailableTickets = Math.floor(parseFloat(project.totalPool) / parseFloat(project.ticketPrice)) - project.soldTickets;
  const maxPurchaseAmount = Math.min(maxAffordableTickets, maxAvailableTickets);

  // 重置状态
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setTicketAmount(1);
      setProcessing(false);
      setTransactionHash(null);
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index === 0 ? 'process' : 'wait'
      })));
    }
  }, [visible]);

  // 更新步骤状态
  const updateStepStatus = (stepIndex: number, status: 'wait' | 'process' | 'finish' | 'error') => {
    setSteps(prev => prev.map((step, index) => ({
      ...step,
      status: index === stepIndex ? status : 
              index < stepIndex ? 'finish' : 'wait'
    })));
  };

  // 处理购买流程
  const handlePurchase = async () => {
    try {
      setProcessing(true);

      // 步骤1: 确认购买信息
      updateStepStatus(0, 'finish');
      setCurrentStep(1);

      // 步骤2: 检查钱包连接
      updateStepStatus(1, 'process');
      if (!isConnected) {
        await connect();
      }
      updateStepStatus(1, 'finish');
      setCurrentStep(2);

      // 步骤3: 支付确认
      updateStepStatus(2, 'process');
      
      // 创建provider
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包');
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // 调用合约购买函数
      let result;
      let ticketIds: string[] = [];
      
      if (ticketAmount === 1) {
        // 单张票购买
        result = await purchaseTicket(
          provider,
          project.id,
          currentSelectedOption!.id,
          project.ticketPrice
        );
        if (result.success && result.ticketId) {
          ticketIds = [result.ticketId];
        }
      } else {
        // 批量购买
        result = await purchaseMultipleTickets(
          provider,
          project.id,
          currentSelectedOption!.id,
          ticketAmount,
          (totalPrice).toString()
        );
        if (result.success && result.ticketIds) {
          ticketIds = result.ticketIds;
        }
      }
      
      if (!result.success) {
        throw new Error(result.error || '购买失败');
      }
      
      setTransactionHash(ticketIds.join(', '));
      
      updateStepStatus(2, 'finish');
      setCurrentStep(3);

      // 步骤4: 交易处理
      updateStepStatus(3, 'process');
      // 真实的区块链交易已经在purchaseTicket中处理完成
      await new Promise(resolve => setTimeout(resolve, 1000)); // 短暂延迟以显示进度
      
      updateStepStatus(3, 'finish');
      setCurrentStep(4);

      // 步骤5: 购买完成
      updateStepStatus(4, 'finish');
      
      // 生成购买的彩票信息
      const newTickets = ticketIds.map((ticketId, index) => ({
        id: `${ticketId}_${index}`,
        projectId: project.id,
        option: currentSelectedOption!.id,
        owner: address,
        purchaseTime: Date.now(),
        price: project.ticketPrice,
        ticketId: ticketId
      }));

      message.success(`成功购买 ${ticketAmount} 张彩票！彩票ID: ${ticketIds.join(', ')}`);
      onSuccess(newTickets);
      
      // 延迟关闭模态框
      setTimeout(() => {
        onCancel();
      }, 2000);

    } catch (error: any) {
      console.error('Purchase failed:', error);
      message.error('购买失败: ' + (error.message || '未知错误'));
      updateStepStatus(currentStep, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 渲染选项选择内容
  const renderOptionSelection = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small">
        <Row gutter={16}>
          <Col span={24}>
            <Text strong>项目名称:</Text>
            <br />
            <Text>{project.title}</Text>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="选择竞猜选项">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {project.options.map((option) => (
            <Card
              key={option.id}
              size="small"
              hoverable
              onClick={() => setInternalSelectedOption(option)}
              style={{
                border: internalSelectedOption?.id === option.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                cursor: 'pointer'
              }}
            >
              <Row gutter={16} align="middle">
                 <Col span={24}>
                   <Text strong>{option.name}</Text>
                   <br />
                   <Text type="secondary">票数: {option.ticketCount}</Text>
                 </Col>

              </Row>
            </Card>
          ))}
        </Space>
      </Card>
    </Space>
  );

  // 渲染购买确认内容
  const renderPurchaseConfirmation = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>项目名称:</Text>
            <br />
            <Text>{project.title}</Text>
          </Col>
          <Col span={12}>
            <Text strong>选择选项:</Text>
            <br />
            <Tag color="blue">{currentSelectedOption?.name}</Tag>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="购买详情">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text strong>购买数量:</Text>
            </Col>
            <Col span={16}>
              <InputNumber
                min={1}
                max={Math.max(1, maxPurchaseAmount)}
                value={ticketAmount}
                onChange={(value) => setTicketAmount(value || 1)}
                style={{ width: '100%' }}
                disabled={processing}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="单价"
                value={project.ticketPrice}
                suffix="ETH"
                precision={3}
              />
            </Col>

          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Statistic
                title="总计"
                value={totalPrice}
                suffix="ETH"
                precision={3}
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
              />
            </Col>
          </Row>

          <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong style={{ color: '#389e0d' }}>应付金额:</Text>
                <br />
                <Text strong style={{ fontSize: 18, color: '#389e0d' }}>
                  {totalPrice.toFixed(4)} ETH
                </Text>
              </Col>
              <Col span={12}>
                <Text strong>钱包余额:</Text>
                <br />
                <Text style={{ color: hasEnoughBalance ? '#52c41a' : '#ff4d4f' }}>
                  {parseFloat(balance).toFixed(4)} ETH
                </Text>
              </Col>
            </Row>
          </Card>

          {!hasEnoughBalance && (
            <Alert
              message="余额不足"
              description="您的钱包余额不足以完成此次购买，请先充值。"
              type="error"
              showIcon
            />
          )}
        </Space>
      </Card>
    </Space>
  );

  // 渲染处理中的内容
  const renderProcessingContent = () => (
    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
      <Steps current={currentStep} direction="vertical" size="small">
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            description={step.description}
            status={step.status}
            icon={
              step.status === 'process' ? <LoadingOutlined /> :
              step.status === 'finish' ? <CheckCircleOutlined /> :
              undefined
            }
          />
        ))}
      </Steps>

      {transactionHash && (
        <Card size="small">
          <Text strong>彩票ID:</Text>
          <br />
          <Text code copyable style={{ fontSize: 12 }}>
            {transactionHash}
          </Text>
        </Card>
      )}

      {currentStep === 3 && (
        <div>
          <Progress percent={66} status="active" />
          <Text style={{ marginTop: 8, display: 'block' }}>
            正在等待区块链确认...
          </Text>
        </div>
      )}
    </Space>
  );

  return (
    <Modal
      title={
        <Space>
          <ShoppingCartOutlined />
          购买彩票
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={
        processing ? null : [
          <Button key="cancel" onClick={onCancel}>
            取消
          </Button>,
          !currentSelectedOption ? (
            <Button
              key="select"
              type="primary"
              disabled={!internalSelectedOption}
              onClick={() => {
                // 这里不需要做任何事，因为选项已经通过点击设置了
              }}
            >
              请选择选项
            </Button>
          ) : (
            <Button
              key="purchase"
              type="primary"
              onClick={handlePurchase}
              disabled={!hasEnoughBalance || !isConnected}
              loading={processing}
              icon={<WalletOutlined />}
            >
              {!isConnected ? '请先连接钱包' : 
               !hasEnoughBalance ? '余额不足' : 
               '确认购买'}
            </Button>
          )
        ]
      }
      maskClosable={!processing}
      closable={!processing}
    >
      {processing ? renderProcessingContent() : 
       !currentSelectedOption ? renderOptionSelection() : 
       renderPurchaseConfirmation()}
    </Modal>
  );
};

export default PurchaseModal;