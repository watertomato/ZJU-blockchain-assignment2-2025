import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Input, 
  Select, 
  Button, 
  List, 
  Tag, 
  Progress, 
  Space, 
  Typography,
  Badge,
  Empty,
  Spin,
  Statistic,
  Modal,
  Radio,
  message
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  TrophyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useWallet } from '../hooks/useWallet';
import { getActiveProjects, terminateProject } from '../utils/contract';
import { ethers } from 'ethers';
import { BettingProject } from '../types';
import PurchaseModal from '../components/PurchaseModal';

const { Title, Text } = Typography;
const { Option } = Select;

interface ProjectsPageProps {
  onCreateProject?: () => void;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ onCreateProject }) => {
  const { isNotary } = useWallet();
  const [projects, setProjects] = useState<BettingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<BettingProject | null>(null);
  
  // 终止项目相关状态
  const [terminateModalVisible, setTerminateModalVisible] = useState(false);
  const [projectToTerminate, setProjectToTerminate] = useState<BettingProject | null>(null);
  const [selectedWinningOption, setSelectedWinningOption] = useState<number | null>(null);
  const [terminating, setTerminating] = useState(false);

  // 加载项目数据
  const loadProjects = async () => {
    setLoading(true);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contractProjects = await getActiveProjects(provider);
    setProjects(contractProjects);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 处理购买彩票
  const handlePurchaseTicket = (project: BettingProject) => {
    setSelectedProject(project);
    setPurchaseModalVisible(true);
  };

  // 处理购买成功
  const handlePurchaseSuccess = () => {
    setPurchaseModalVisible(false);
    setSelectedProject(null);
    // 重新加载项目数据以更新统计信息
    loadProjects();
  };

  // 处理终止项目
  const handleTerminateProject = (project: BettingProject) => {
    setProjectToTerminate(project);
    setSelectedWinningOption(null);
    setTerminateModalVisible(true);
  };

  // 确认终止项目
  const confirmTerminateProject = async () => {
    if (!projectToTerminate || selectedWinningOption === null) {
      message.error('请选择获胜选项');
      return;
    }

    if (!window.ethereum) {
      message.error('请先连接钱包');
      return;
    }

    setTerminating(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // 调用合约终止项目的函数
      const result = await terminateProject(provider, projectToTerminate.id, selectedWinningOption);
      
      if (result.success) {
        message.success(`项目 "${projectToTerminate.title}" 已终止并完成奖金分配！获胜选项：${projectToTerminate.options[selectedWinningOption].name}`);
        
        // 重新加载项目数据
        loadProjects();
        
        // 关闭弹窗
        setTerminateModalVisible(false);
        setProjectToTerminate(null);
        setSelectedWinningOption(null);
      } else {
        throw new Error(result.error || '终止项目失败');
      }
    } catch (error: any) {
      console.error('终止项目失败:', error);
      message.error(error.message || '终止项目失败');
    } finally {
      setTerminating(false);
    }
  };

  // 筛选项目
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 获取分类列表
  const categories = ['all', ...Array.from(new Set(projects.map(p => p.category)))];

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN');
  };

  // 计算剩余时间
  const getTimeRemaining = (endTime: number) => {
    const now = Date.now();
    const remaining = endTime - now;
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}天`;
    } else if (remaining > 0) {
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      return `${hours}小时`;
    } else {
      return '已结束';
    }
  };

  // 项目卡片组件
  const ProjectCard: React.FC<{ project: BettingProject }> = ({ project }) => {
    // 计算已消耗的总金额（已售票数 * 票价）
    const consumedAmount = project.soldTickets * parseFloat(project.ticketPrice);
    // 计算最大票数（总奖池 / 票价）
    const maxTickets = Math.floor(parseFloat(project.totalPool) / parseFloat(project.ticketPrice));
    // 计算总金额（最大票数 * 票价）
    const totalAmount = maxTickets * parseFloat(project.ticketPrice);
    // 计算进度百分比（消耗金额/总金额）
    const progress = totalAmount > 0 ? (consumedAmount / totalAmount) * 100 : 0;
    const timeRemaining = getTimeRemaining(project.endTime);
    const isEnded = project.endTime < Date.now();

    const canTerminate = isNotary && project.status === 'active' && !isEnded;

    return (
      <Card
        hoverable
        style={{ height: '100%' }}
        actions={[
          <Button 
            type="primary" 
            disabled={isEnded}
            onClick={() => handlePurchaseTicket(project)}
          >
            {isEnded ? '已结束' : '参与竞猜'}
          </Button>,
          ...(canTerminate ? [
            <Button 
              danger
              icon={<StopOutlined />}
              onClick={() => handleTerminateProject(project)}
            >
              终止项目
            </Button>
          ] : [])
        ]}
      >
        <Card.Meta
          title={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text strong style={{ fontSize: 16 }}>{project.title}</Text>
                <Tag color={project.status === 'active' ? 'green' : 'red'}>
                  {project.status === 'active' ? '进行中' : '已结束'}
                </Tag>
              </div>
              <Tag color="blue">{project.category}</Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {project.description}
              </Text>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="奖池总额"
                    value={project.totalPool}
                    suffix="ETH"
                    valueStyle={{ fontSize: 14, color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="已消耗票数"
                    value={project.soldTickets}
                    valueStyle={{ fontSize: 14, color: '#52c41a' }}
                  />
                </Col>
              </Row>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12 }}>进度</Text>
                  <Text style={{ fontSize: 12 }}>{progress.toFixed(2)}%</Text>
                </div>
                <Progress percent={parseFloat(progress.toFixed(2))} size="small" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="small">
                  <ClockCircleOutlined style={{ color: isEnded ? '#ff4d4f' : '#faad14' }} />
                  <Text style={{ fontSize: 12, color: isEnded ? '#ff4d4f' : '#faad14' }}>
                    {isEnded ? '已结束' : `剩余 ${timeRemaining}`}
                  </Text>
                </Space>
                <Text style={{ fontSize: 12 }} type="secondary">
                  {project.ticketPrice} ETH/票
                </Text>
              </div>
            </Space>
          }
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            <TrophyOutlined style={{ marginRight: 8 }} />
            竞猜项目
          </Title>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadProjects}
              loading={loading}
            >
              刷新
            </Button>
            {isNotary && (
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={onCreateProject}>
                创建新项目
              </Button>
            )}
          </Space>
        </div>
        {/* 搜索和筛选 */}
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8}>
              <Input
                placeholder="搜索项目标题或描述"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} sm={4}>
              <Select
                placeholder="分类"
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: '100%' }}
              >
                <Option value="all">全部分类</Option>
                {categories.filter(c => c !== 'all').map(category => (
                  <Option key={category} value={category}>{category}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={4}>
              <Select
                placeholder="状态"
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
              >
                <Option value="all">全部状态</Option>
                <Option value="active">进行中</Option>
                <Option value="ended">已结束</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
              <Space>
                <Text type="secondary">
                  找到 {filteredProjects.length} 个项目
                </Text>
                <Button 
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setSearchText('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  }}
                >
                  清除筛选
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      {/* 项目列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>加载项目中...</Text>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Empty
          description="暂无符合条件的项目"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          {isNotary && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreateProject}>
              创建第一个项目
            </Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredProjects.map(project => (
            <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
              <ProjectCard project={project} />
            </Col>
          ))}
        </Row>
      )}

      {/* 购买彩票弹窗 */}
      {selectedProject && (
        <PurchaseModal
          visible={purchaseModalVisible}
          project={selectedProject}
          onCancel={() => {
            setPurchaseModalVisible(false);
            setSelectedProject(null);
          }}
          onSuccess={handlePurchaseSuccess}
        />
      )}

      {/* 终止项目弹窗 */}
      <Modal
        title="终止项目"
        open={terminateModalVisible}
        onOk={confirmTerminateProject}
        onCancel={() => {
          setTerminateModalVisible(false);
          setProjectToTerminate(null);
          setSelectedWinningOption(null);
        }}
        confirmLoading={terminating}
        okText="确认终止"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        {projectToTerminate && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>项目：</Text>
              <Text>{projectToTerminate.title}</Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                终止项目后，将根据您选择的获胜选项进行结算。所有选择获胜选项的玩家将平分奖池。
              </Text>
            </div>

            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                请选择获胜选项：
              </Text>
              <Radio.Group
                value={selectedWinningOption}
                onChange={(e) => setSelectedWinningOption(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                   {projectToTerminate.options.map((option, index) => (
                     <Radio key={index} value={index} style={{ width: '100%' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          width: '100%',
                          paddingLeft: '8px',
                          minHeight: '32px'
                        }}>
                          <span style={{ flex: 1, marginRight: '16px' }}>{option.name}</span>
                          <span style={{ 
                            color: '#666', 
                            fontSize: '12px',
                            textAlign: 'right',
                            minWidth: '100px',
                            flexShrink: 0
                          }}>
                            {option.ticketCount} 张彩票
                          </span>
                        </div>
                      </Radio>
                   ))}
                 </Space>
              </Radio.Group>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectsPage;