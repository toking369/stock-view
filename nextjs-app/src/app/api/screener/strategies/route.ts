import { NextResponse } from 'next/server'
import type { PresetStrategy } from '@/types'

const presetStrategies: PresetStrategy[] = [
  { id: 'strategy1', name: '放量突破', desc: '成交量放大 + 价格突破均线', filters: { ma: 'aboveAll', vratioMin: '1.5' }, tags: ['技术面', '短线'] },
  { id: 'strategy2', name: 'MACD金叉', desc: 'MACD DIF上穿DEA', filters: { macd: 'goldenCross' }, tags: ['技术面', '中线'] },
  { id: 'strategy3', name: '超跌反弹', desc: 'RSI超卖 + 跌幅过大', filters: { rsiMax: '30', changeMax: '-5' }, tags: ['技术面', '短线'] },
  { id: 'strategy4', name: 'KDJ超卖', desc: 'KDJ低于20', filters: { kdj: 'oversold' }, tags: ['技术面', '短线'] },
  { id: 'strategy5', name: '价值投资', desc: '低PE + 高ROE', filters: { peMax: '15', roeMin: '15' }, tags: ['基本面', '长线'] },
  { id: 'strategy6', name: '业绩增长', desc: '营收利润双增长', filters: { revGrowthMin: '10', profitGrowthMin: '20' }, tags: ['基本面', '中线'] },
  { id: 'strategy7', name: '小盘成长', desc: '小市值 + 高成长', filters: { capMax: '100', revGrowthMin: '20' }, tags: ['基本面', '短线'] },
  { id: 'strategy8', name: '布林带突破', desc: '价格突破布林带上轨', filters: { boll: 'up' }, tags: ['技术面', '短线'] },
]

export async function GET() {
  return NextResponse.json(presetStrategies)
}
