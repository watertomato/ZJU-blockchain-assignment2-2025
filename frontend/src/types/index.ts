// 用户角色类型
export type UserRole = 'player' | 'notary' | 'unknown';

// 用户状态接口
export interface UserState {
  address: string | null;
  role: UserRole;
  balance: string;
  isConnected: boolean;
  notaryNFT: {
    hasNFT: boolean;
    tokenId: string | null;
  };
}

// 竞猜项目接口
export interface BettingProject {
  id: string;
  title: string;
  description: string;
  category: string;
  creator: string;
  createdAt: number;
  endTime: number;
  totalPool: string;
  ticketPrice: string;
  soldTickets: number;
  status: 'active' | 'ended' | 'settled';
  options: BettingOption[];
  winningOption?: number;
}

// 竞猜选项接口
export interface BettingOption {
  id: number;
  name: string;
  ticketCount: number;
}

// 彩票接口
export interface Ticket {
  id: string;
  projectId: string;
  projectTitle: string;
  owner: string;
  option: number;
  optionName: string;
  ticketCount: number;
  price: string;
  isWinning?: boolean;
  ticketIds?: string[]; // 可选字段，用于存储该组合下所有彩票的ID
}

// 交易订单接口
export interface TradeOrder {
  id: string;
  ticketId: string;
  seller: string;
  price: string;
  createdAt: number;
  status: 'active' | 'filled' | 'cancelled';
}

// 钱包连接状态
export interface WalletState {
  isConnecting: boolean;
  error: string | null;
}