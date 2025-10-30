import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Card,
  Form,
  Input,
  Button,
  DatePicker,
  InputNumber,
  Space,
  Typography,
  Divider,
  message,
  Row,
  Col,
  Tag,
  Alert
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ethers } from 'ethers';
import { createBettingProject } from '../utils/contract';
import { addProject } from '../store/slices/projectsSlice';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FormData {
  title: string;
  description: string;
  options: string[];
  endTime: dayjs.Dayjs;
  prizePool: number;
  ticketPrice: number; // 新增：彩票单价
}

interface CreateProjectPageProps {
  onBack: () => void;
  onSuccess: (projectId: string) => void;
}

const CreateProjectPage: React.FC<CreateProjectPageProps> = ({ onBack, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);

  // 添加选项
  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  // 删除选项
  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  // 更新选项
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // 创建项目
  const handleSubmit = async (values: any) => {
    console.log('🚀 开始创建项目流程...');
    console.log('📋 表单数据:', values);
    console.log('📋 选项数据:', options);

    setLoading(true);

    try {
      // 验证选项
      const validOptions = options.filter(option => option && option.trim());
      console.log('✅ 有效选项:', validOptions);

      if (validOptions.length < 2) {
        message.error('至少需要2个有效选项');
        return;
      }

      if (validOptions.length > 6) {
        message.error('最多只能有6个选项');
        return;
      }

      // 检查选项是否重复
       const uniqueOptions = Array.from(new Set(validOptions));
       if (uniqueOptions.length !== validOptions.length) {
         message.error('选项不能重复');
         return;
       }

      // 检查 MetaMask
      if (!window.ethereum) {
        message.error('请安装 MetaMask 钱包');
        return;
      }

      console.log('🔗 创建 Web3Provider...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log('✅ Web3Provider 创建成功');

      // 准备项目数据
      const projectData = {
        title: values.title.trim(),
        description: values.description.trim(),
        options: validOptions,
        endTime: Math.floor(values.endTime.valueOf() / 1000), // 转换为秒
        totalPrize: values.prizePool.toString(),
        ticketPrice: values.ticketPrice.toString() // 新增：彩票单价
      };

      console.log('📋 准备调用合约，项目数据:', projectData);

      // 调用合约创建项目
      const result = await createBettingProject(provider, projectData);
      console.log('📋 合约调用结果:', result);

      if (result.success && result.projectId) {
         // 添加到 Redux store
         const newProject = {
           id: result.projectId,
           title: projectData.title,
           description: projectData.description,
           category: '竞猜', // 默认分类
           creator: await provider.getSigner().getAddress(),
           createdAt: Math.floor(Date.now() / 1000),
           endTime: projectData.endTime,
           totalPool: projectData.totalPrize,
           ticketPrice: projectData.ticketPrice, // 使用用户输入的实际票价
           soldTickets: 0,
           status: 'active' as const,
           options: projectData.options.map((name, index) => ({
             id: index,
             name,
             ticketCount: 0,
             odds: 1.0
           }))
         };

         dispatch(addProject(newProject));
          message.success('项目创建成功！');
          onSuccess(result.projectId);
       } else {
         message.error(result.error || '创建项目失败');
       }
    } catch (error) {
      console.error('💥 创建项目异常:', error);
      console.error('错误详情:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      message.error('创建项目失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
           <Button
             icon={<ArrowLeftOutlined />}
             onClick={onBack}
             style={{ marginBottom: '16px' }}
           >
             返回项目列表
           </Button>
          <Title level={2}>创建竞猜项目</Title>
          <Text type="secondary">
            填写项目信息，创建一个新的竞猜项目。所有字段都是必填的。
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            prizePool: 0.1,
            ticketPrice: 0.001, // 新增：默认彩票单价
            endTime: dayjs().add(7, 'day')
          }}
        >
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                label="项目标题"
                name="title"
                rules={[
                  { required: true, message: '请输入项目标题' },
                  { min: 2, message: '标题至少2个字符' },
                  { max: 100, message: '标题最多100个字符' }
                ]}
              >
                <Input
                  placeholder="输入项目标题，例如：2024年世界杯冠军竞猜"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                label="项目描述"
                name="description"
                rules={[
                  { required: true, message: '请输入项目描述' },
                  { min: 10, message: '描述至少10个字符' },
                  { max: 500, message: '描述最多500个字符' }
                ]}
              >
                <TextArea
                  placeholder="详细描述项目规则和背景信息..."
                  rows={4}
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div style={{ marginBottom: '24px' }}>
            <Title level={4}>竞猜选项</Title>
            <Text type="secondary">
              设置2-6个竞猜选项，参与者将从中选择一个进行投注
            </Text>
            
            <div style={{ marginTop: '16px' }}>
              {options.map((option, index) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder={`选项 ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      size="large"
                    />
                    {options.length > 2 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => removeOption(index)}
                        size="large"
                      />
                    )}
                  </Space.Compact>
                </div>
              ))}
              
              {options.length < 6 && (
                <Button
                  type="dashed"
                  onClick={addOption}
                  icon={<PlusOutlined />}
                  style={{ width: '100%', marginTop: '8px' }}
                  size="large"
                >
                  添加选项
                </Button>
              )}
            </div>
          </div>

          <Divider />

          <Row gutter={24}>
            <Col span={8}>
              <Form.Item
                label="结束时间"
                name="endTime"
                rules={[
                  { required: true, message: '请选择结束时间' },
                  {
                    validator: (_, value) => {
                      if (value && value.isBefore(dayjs())) {
                        return Promise.reject('结束时间必须在未来');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择结束时间"
                  style={{ width: '100%' }}
                  size="large"
                  disabledDate={(current) => current && current < dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="奖池金额 (ETH)"
                name="prizePool"
                rules={[
                  { required: true, message: '请输入奖池金额' },
                  { type: 'number', min: 0.001, message: '奖池金额至少0.001 ETH' },
                  { type: 'number', max: 100, message: '奖池金额最多100 ETH' }
                ]}
              >
                <InputNumber
                  placeholder="0.1"
                  style={{ width: '100%' }}
                  size="large"
                  step={0.01}
                  precision={3}
                  addonAfter="ETH"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="彩票单价 (ETH)"
                name="ticketPrice"
                rules={[
                  { required: true, message: '请输入彩票单价' },
                  { type: 'number', min: 0.0001, message: '彩票单价至少0.0001 ETH' },
                  { type: 'number', max: 1, message: '彩票单价最多1 ETH' }
                ]}
              >
                <InputNumber
                  placeholder="0.001"
                  style={{ width: '100%' }}
                  size="large"
                  step={0.001}
                  precision={4}
                  addonAfter="ETH"
                />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message="创建提示"
            description="创建项目需要支付设定的奖池金额，该金额将作为获胜者的奖励。彩票单价决定了用户购买每张彩票需要支付的ETH数量。请确保您的钱包有足够的余额。"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Form.Item>
            <Space size="large">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{ minWidth: '120px' }}
              >
                {loading ? '创建中...' : '创建项目'}
              </Button>
              <Button
                size="large"
                onClick={onBack}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateProjectPage;