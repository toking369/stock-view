// ========== A股 StockView 类型定义 ==========

/** 股票基本信息 */
export interface Stock {
  code: string
  name: string
  price: number
  change: number      // 涨跌幅 %
  changeAmount: number // 涨跌额
  vol: number         // 成交量（手）
  amount: number      // 成交额（万）
  turnover: number    // 换手率 %
  pe: number          // 市盈率
  amplitude: number   // 振幅 %
  open: number
  high: number
  low: number
  prevClose: number
  volumeRatio: number  // 量比
  outerVol: number     // 外盘
  innerVol: number     // 内盘
}

/** 指数信息 */
export interface Index {
  code: string
  name: string
  price: number
  change: number
  changeAmount: number
}

/** K线数据点 */
export interface KLineDataPoint {
  date: string
  open: number
  close: number
  high: number
  low: number
  vol: number
}

/** 板块数据 */
export interface Sector {
  name: string
  change: number
  volume: number
}

/** 资金流向 */
export interface CapitalFlow {
  code: string
  name: string
  price: number
  change: number
  inflow: number   // 主力流入
  outflow: number  // 主力流出
  net: number      // 净额
  ratio: number    // 净占比 %
}

/** 龙虎榜上榜 */
export interface LHBRecord {
  code: string
  name: string
  price: number
  change: number
  buy: number
  sell: number
  net: number
}

/** 龙虎榜机构席位 */
export interface LHBInstitution {
  code: string
  name: string
  buyCount: number
  buyAmount: number
  sellCount: number
  sellAmount: number
  netAmount: number
  reason: string
}

/** 涨停板 */
export interface LimitUpStock {
  name: string
  code: string
  days: number       // 连板天数
  sealRate: number   // 封板率
  sector: string
}

/** 筛选器股票（扩展 Stock） */
export interface ScreenerStock extends Stock {
  pb: number
  cap: number
  revGrowth: number
  roe: number
  profitGrowth: number
  streak: number
  macd: number
  kdj: number
  ma: number
  rsi: number
  boll: string
}

/** 预设策略 */
export interface PresetStrategy {
  id: string
  name: string
  desc: string
  filters: Record<string, string>
  tags: string[]
}

/** AI 聊天会话 */
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/** AI 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  timestamp: number
}

/** AI 意图解析结果 */
export interface IntentResult {
  intents: string[]
  topics: string[]
  targetStocks: string[]
  contextStock: string | null
}

/** 筛选过滤条件 */
export interface ScreenerFilters {
  priceMin?: number
  priceMax?: number
  changeMin?: number
  changeMax?: number
  turnoverMin?: number
  turnoverMax?: number
  peMin?: number
  peMax?: number
  pbMin?: number
  pbMax?: number
  capMin?: number
  capMax?: number
  roeMin?: number
  roeMax?: number
  macd?: 'goldenCross' | 'deadCross' | 'positive' | 'negative'
  kdj?: 'goldenCross' | 'deadCross' | 'overbought' | 'oversold'
  ma?: 'aboveAll' | 'belowAll' | 'support' | 'pressure'
  rsiMin?: number
  rsiMax?: number
  amplitudeMin?: number
  amplitudeMax?: number
  vratioMin?: number
  vratioMax?: number
  streak?: string
  streakMin?: number
  streakMax?: number
  vol?: string
  revGrowthMin?: number
  revGrowthMax?: number
  profitGrowthMin?: number
  profitGrowthMax?: number
  boll?: string
}

/** 用户信息 */
export interface UserInfo {
  phone: string
  password: string
  name?: string
  avatar?: string
  createdAt: number
}
