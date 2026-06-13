import { seededRandom } from './utils'
import type {
  Stock, Sector, CapitalFlow, LHBRecord,
  LHBInstitution, LimitUpStock, ScreenerStock, PresetStrategy, Index
} from '@/types'

// ========== Indices ==========
export const mockIndices: Index[] = [
  { code: '000001', name: '上证指数', price: 3156.78, change: 0.68, changeAmount: 21.35 },
  { code: '399001', name: '深证成指', price: 10673.45, change: 1.12, changeAmount: 118.56 },
  { code: '399006', name: '创业板指', price: 2156.32, change: 1.85, changeAmount: 39.21 },
  { code: '000688', name: '科创50', price: 968.45, change: -0.32, changeAmount: -3.11 },
  { code: '899050', name: '北证50', price: 856.12, change: 0.45, changeAmount: 3.84 },
]

// ========== Watchlist ==========
const watchlistNames = [
  '贵州茅台', '宁德时代', '中国平安', '招商银行', '东方财富',
  '五粮液', '比亚迪', '美的集团', '药明康德', '中信证券',
  '立讯精密', '迈瑞医疗', '恒瑞医药', '长江电力', '海康威视'
]

export const watchlistData: Stock[] = watchlistNames.map((name, i) => {
  const basePrice = [1789, 218, 52, 36, 15, 168, 268, 66, 58, 22, 34, 298, 42, 25, 38][i]
  const change = (seededRandom() * 8 - 4 + (seededRandom() * 2 - 1) * 0.5)
  const changeAmount = basePrice * change / 100
  return {
    code: ['600519', '300750', '601318', '600036', '300059', '000858', '002594', '000333', '603259', '600030', '002475', '300760', '600276', '600900', '002415'][i],
    name,
    price: +(basePrice + changeAmount).toFixed(2),
    change: +change.toFixed(2),
    changeAmount: +changeAmount.toFixed(2),
    vol: Math.round(seededRandom() * 50000 + 5000),
    amount: Math.round(seededRandom() * 200000 + 10000),
    turnover: +(seededRandom() * 5 + 0.5).toFixed(2),
    pe: +(seededRandom() * 40 + 10).toFixed(2),
    amplitude: +(seededRandom() * 6 + 1).toFixed(2),
    open: +(basePrice * (1 + (seededRandom() - 0.5) * 0.02)).toFixed(2),
    high: +(basePrice * (1 + seededRandom() * 0.04)).toFixed(2),
    low: +(basePrice * (1 - seededRandom() * 0.04)).toFixed(2),
    prevClose: basePrice,
    volumeRatio: +(seededRandom() * 3 + 0.5).toFixed(2),
    outerVol: Math.round(seededRandom() * 30000 + 2000),
    innerVol: Math.round(seededRandom() * 25000 + 2000),
  }
})

// ========== Sector Data ==========
const sectorNames = [
  '半导体', '新能源车', '人工智能', '光伏', '白酒',
  '医药', '军工', '证券', '银行', '房地产',
  '消费电子', '通信', '计算机', '有色金属', '煤炭',
  '电力', '化工', '汽车零部件', '机器人', '大数据',
  '云计算', '芯片设计', '创新药', '医疗器械', '储能',
  '风电', '核电', '数字货币', '元宇宙', '预制菜'
]

export const sectorData: Sector[] = sectorNames.map(name => ({
  name,
  change: +(seededRandom() * 10 - 5).toFixed(2),
  volume: Math.round(seededRandom() * 500 + 50),
}))

// ========== Capital Flow ==========
export const capitalFlowData: CapitalFlow[] = watchlistData.slice(0, 10).map(s => ({
  code: s.code,
  name: s.name,
  price: s.price,
  change: s.change,
  inflow: Math.round(seededRandom() * 200000 + 10000),
  outflow: Math.round(seededRandom() * 150000 + 5000),
  net: Math.round((seededRandom() - 0.5) * 100000),
  ratio: +(seededRandom() * 30 - 15).toFixed(2),
}))

// ========== LHB Data ==========
export const lhbData: LHBRecord[] = [
  { code: '002952', name: '亚世光电', price: 28.56, change: 10.01, buy: 15680, sell: 5230, net: 10450 },
  { code: '603005', name: '晶方科技', price: 22.35, change: 9.99, buy: 28900, sell: 12450, net: 16450 },
  { code: '300046', name: '台基股份', price: 18.72, change: 10.01, buy: 12340, sell: 4560, net: 7780 },
  { code: '000628', name: '高新发展', price: 45.80, change: 10.00, buy: 34500, sell: 18900, net: 15600 },
  { code: '603259', name: '药明康德', price: 58.23, change: -7.85, buy: 45200, sell: 67800, net: -22600 },
  { code: '300750', name: '宁德时代', price: 218.50, change: 5.62, buy: 89100, sell: 56700, net: 32400 },
]

export const lhbInstData: LHBInstitution[] = [
  { code: '002952', name: '亚世光电', buyCount: 3, buyAmount: 8900, sellCount: 0, sellAmount: 0, netAmount: 8900, reason: '连续3日涨幅偏离值累计达20%' },
  { code: '603005', name: '晶方科技', buyCount: 2, buyAmount: 12300, sellCount: 1, sellAmount: 3400, netAmount: 8900, reason: '日涨幅偏离值达7%' },
  { code: '300046', name: '台基股份', buyCount: 4, buyAmount: 5600, sellCount: 0, sellAmount: 0, netAmount: 5600, reason: '日换手率达20%' },
  { code: '000628', name: '高新发展', buyCount: 3, buyAmount: 15500, sellCount: 2, sellAmount: 7200, netAmount: 8300, reason: '连续3日涨幅偏离值累计达20%' },
  { code: '603259', name: '药明康德', buyCount: 1, buyAmount: 3200, sellCount: 4, sellAmount: 15600, netAmount: -12400, reason: '日跌幅偏离值达7%' },
]

export const limitUpList: LimitUpStock[] = [
  { name: '亚世光电', code: '002952', days: 4, sealRate: 0.85, sector: '电子' },
  { name: '晶方科技', code: '603005', days: 3, sealRate: 0.92, sector: '半导体' },
  { name: '台基股份', code: '300046', days: 2, sealRate: 0.78, sector: '半导体' },
  { name: '高新发展', code: '000628', days: 5, sealRate: 0.95, sector: '基建' },
  { name: '深圳华强', code: '000062', days: 2, sealRate: 0.71, sector: '电子' },
  { name: '上海贝岭', code: '600171', days: 3, sealRate: 0.88, sector: '半导体' },
  { name: '中晶科技', code: '003026', days: 2, sealRate: 0.65, sector: '电子' },
  { name: '好上好', code: '001298', days: 2, sealRate: 0.73, sector: '消费电子' },
  { name: '华锋股份', code: '002806', days: 3, sealRate: 0.82, sector: '汽车零部件' },
  { name: '航天科技', code: '000901', days: 2, sealRate: 0.69, sector: '军工' },
]

// ========== Screener Stock Pool ==========
export const screenerStockPool: ScreenerStock[] = watchlistData.map(s => ({
  ...s,
  pb: +(seededRandom() * 10 + 0.5).toFixed(2),
  cap: Math.round(seededRandom() * 50000 + 1000),
  revGrowth: +(seededRandom() * 60 - 20).toFixed(1),
  roe: +(seededRandom() * 25 + 2).toFixed(1),
  profitGrowth: +(seededRandom() * 80 - 30).toFixed(1),
  streak: Math.round(seededRandom() * 4 + 1),
  macd: +(seededRandom() * 4 - 2).toFixed(3),
  kdj: +(seededRandom() * 100).toFixed(1),
  ma: +(seededRandom() * 10 - 5).toFixed(2),
  rsi: +(seededRandom() * 100).toFixed(1),
  boll: ['上轨', '中轨', '下轨'][Math.floor(seededRandom() * 3)],
}))

// ========== Preset Strategies ==========
export const presetStrategies: PresetStrategy[] = [
  { id: 'strategy1', name: '放量突破', desc: '成交量放大 + 价格突破均线', filters: { ma: 'aboveAll', vratioMin: '1.5' }, tags: ['技术面', '短线'] },
  { id: 'strategy2', name: 'MACD金叉', desc: 'MACD DIF上穿DEA', filters: { macd: 'goldenCross' }, tags: ['技术面', '中线'] },
  { id: 'strategy3', name: '超跌反弹', desc: 'RSI超卖 + 跌幅过大', filters: { rsiMax: '30', changeMax: '-5' }, tags: ['技术面', '短线'] },
  { id: 'strategy4', name: 'KDJ超卖', desc: 'KDJ低于20', filters: { kdj: 'oversold' }, tags: ['技术面', '短线'] },
  { id: 'strategy5', name: '价值投资', desc: '低PE + 高ROE', filters: { peMax: '15', roeMin: '15' }, tags: ['基本面', '长线'] },
  { id: 'strategy6', name: '业绩增长', desc: '营收利润双增长', filters: { revGrowthMin: '10', profitGrowthMin: '20' }, tags: ['基本面', '中线'] },
  { id: 'strategy7', name: '小盘成长', desc: '小市值 + 高成长', filters: { capMax: '100', revGrowthMin: '20' }, tags: ['基本面', '短线'] },
  { id: 'strategy8', name: '布林带突破', desc: '价格突破布林带上轨', filters: { boll: 'upper' }, tags: ['技术面', '短线'] },
]
