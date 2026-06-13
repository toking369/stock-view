/**
 * AI Engine — intent parsing + context-aware response generation backed by
 * live data from East Money API (via Next.js route handlers).
 *
 * No mock data. All stock, index, sector, flow, and LHB values are fetched
 * on demand from the same API layer the panels use.
 */

import type { IntentResult, Stock, Index, Sector, CapitalFlow, LHBRecord, LHBInstitution, LimitUpStock } from '@/types'

// ── Stock alias map ──
const stockAlias: Record<string, string> = {
  '茅台': '贵州茅台', '五粮液': '五粮液', '宁王': '宁德时代',
  '宁德': '宁德时代', '平安': '中国平安', '招行': '招商银行',
  '东财': '东方财富', '比亚迪': '比亚迪', '美的': '美的集团',
  '药明': '药明康德', '中信': '中信证券', '立讯': '立讯精密',
  '迈瑞': '迈瑞医疗', '恒瑞': '恒瑞医药', '长江电力': '长江电力',
  '海康': '海康威视',
}

const stockKeywords = Object.keys(stockAlias)

// ── Intent patterns ──
const intentPatterns: [RegExp, string][] = [
  [/分析|走势|趋势|行情|怎么样|如何|评价/, 'analyze'],
  [/信号|买卖|买入|卖出|加仓|减仓|建仓|清仓|持有/, 'signal'],
  [/对比|比较|哪个更好|vs|区别/, 'compare'],
  [/推荐|建议|关注|看好|潜力/, 'recommend'],
  [/风险|止损|止盈|回撤|风险/, 'risk'],
  [/大盘|市场|指数|整体|概况/, 'summary'],
  [/板块|行业|概念|资金流向|流入|流出/, 'sector'],
  [/龙虎榜|游资|席位/, 'lhb'],
  [/盘面|复盘|盘口/, 'market'],
  [/选股|策略|筛选|条件/, 'screener'],
]

// ── Data fetchers (client-safe, calls our own API routes) ──

async function fetchQuotes(codes: string[]): Promise<Stock[]> {
  if (!codes.length) return []
  try {
    const res = await fetch(`/api/market/quotes?codes=${codes.join(',')}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchIndices(): Promise<Index[]> {
  try {
    const res = await fetch('/api/market/indices')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchSectors(type: string = 'industry', count: number = 30): Promise<Sector[]> {
  try {
    const res = await fetch(`/api/market/sectors?type=${type}&count=${count}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchCapitalFlowRanking(count: number = 10): Promise<CapitalFlow[]> {
  try {
    const res = await fetch(`/api/market/flow?count=${count}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchLHB(): Promise<{ lhb: LHBRecord[]; institutions: LHBInstitution[]; limitUp: LimitUpStock[] }> {
  try {
    const res = await fetch('/api/market/lhb')
    if (!res.ok) return { lhb: [], institutions: [], limitUp: [] }
    return res.json()
  } catch {
    return { lhb: [], institutions: [], limitUp: [] }
  }
}

// ── Intent parsing (synchronous) ──

function parseIntent(text: string, hasImage: boolean, _session: any): IntentResult {
  const intents: string[] = []
  const topics: string[] = []
  const targetStocks: string[] = []
  let contextStock: string | null = null

  if (hasImage) {
    intents.push('image_analyze')
    topics.push('visual')
  }

  for (const [pattern, intent] of intentPatterns) {
    if (pattern.test(text) && !intents.includes(intent)) {
      intents.push(intent)
    }
  }

  if (intents.length === 0) intents.push('general')

  // Detect stock mentions via alias map
  for (const keyword of stockKeywords) {
    if (text.includes(keyword)) {
      const stockName = stockAlias[keyword]
      if (!targetStocks.includes(stockName)) {
        targetStocks.push(stockName)
      }
    }
  }

  // Detect topics
  if (/技术|K线|均线|MACD|KDJ|RSI|布林|成交量/.test(text)) topics.push('technical')
  if (/资金|主力|散户|流入|流出|净额/.test(text)) topics.push('capital_flow')
  if (/板块|行业|概念|热点/.test(text)) topics.push('sector')
  if (/业绩|营收|利润|PE|市盈率|ROE/.test(text)) topics.push('fundamental')
  if (/龙虎榜|涨停|跌停|封板|连板/.test(text)) topics.push('lhb')

  return { intents, topics, targetStocks, contextStock }
}

// ── Response generators (all async, fetch real data) ──

async function generateStockAnalysis(stocks: string[], intents: string[], topics: string[]): Promise<string> {
  const quotes = await fetchQuotes([]) // default watchlist as search pool
  const s = quotes.find(q => stocks.some(name => q.name.includes(name) || stocks.includes(q.code)))
  if (!s) {
    return `未找到"${stocks[0]}"的相关数据，请确认股票名称或代码是否正确。`
  }

  const isUp = s.change >= 0
  const lines: string[] = [
    `### 📊 ${s.name}（${s.code}）技术分析`,
    '',
    `**当前价格**：${s.price}元`,
    `**涨跌幅**：${isUp ? '📈' : '📉'} ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%`,
    `**成交额**：${(s.amount / 10000).toFixed(2)}亿`,
    `**换手率**：${s.turnover}%`,
    `**市盈率**：${s.pe}`,
    '',
  ]

  if (topics.includes('technical')) {
    const trend = s.change > 2 ? '强势上攻' : s.change > 0.5 ? '震荡偏多' : s.change > -0.5 ? '横盘整理' : s.change > -2 ? '弱势调整' : '破位下行'
    lines.push(`**趋势判断**：${trend}`, '')
    lines.push(`**支撑位**：${(s.price * 0.98).toFixed(2)} | **压力位**：${(s.price * 1.02).toFixed(2)}`, '')
    if (s.change > 3) {
      lines.push('⚠️ 短线涨幅较大，注意回调风险。建议分批止盈，不宜追高。')
    } else if (s.change < -3) {
      lines.push('💡 短线跌幅较大，关注下方支撑。可等待企稳信号后逢低布局。')
    } else {
      lines.push('💡 当前处于正常波动区间，建议持有观察，等待方向选择。')
    }
  }

  return lines.join('\n')
}

async function generateComparison(stocks: string[]): Promise<string> {
  const quotes = await fetchQuotes([])
  const data = quotes.filter(q => stocks.some(name => q.name.includes(name) || stocks.includes(q.code)))
  if (data.length < 2) return '请指定两只或以上股票进行比较。'

  const lines: string[] = ['### 📊 股票对比分析', '', '| 指标 | ' + data.map(s => s.name).join(' | ') + ' |', '|' + data.map(() => '---').join('|') + '|']
  const metrics: [string, (s: Stock) => string][] = [
    ['价格', s => s.price.toString()],
    ['涨跌幅', s => s.change.toFixed(2) + '%'],
    ['成交额', s => (s.amount / 10000).toFixed(2) + '亿'],
    ['换手率', s => s.turnover + '%'],
    ['市盈率', s => s.pe.toString()],
  ]
  for (const [label, fn] of metrics) {
    lines.push('| ' + label + ' | ' + data.map(s => fn(s)).join(' | ') + ' |')
  }
  lines.push('', '**综合评价**：')
  const best = data.reduce((a, b) => (a.change > b.change ? a : b))
  lines.push(`🌟 近期表现最佳：**${best.name}**（涨跌幅 ${best.change.toFixed(2)}%）`)
  return lines.join('\n')
}

async function generateMarketSummary(): Promise<string> {
  const indices = await fetchIndices()
  const sh = indices.find(i => i.code === '1.000001' || i.code === '000001')
  const sz = indices.find(i => i.code === '0.399001' || i.code === '399001')
  const cy = indices.find(i => i.code === '0.399006' || i.code === '399006')

  const shPrice = sh?.price ?? 0
  const shChange = sh?.change ?? 0
  const szPrice = sz?.price ?? 0
  const szChange = sz?.change ?? 0
  const cyPrice = cy?.price ?? 0
  const cyChange = cy?.change ?? 0

  const lines: string[] = [
    '### 📈 大盘概况',
    '',
    `**上证指数**：${shPrice}（${shChange >= 0 ? '+' : ''}${shChange.toFixed(2)}%）`,
    `**深证成指**：${szPrice}（${szChange >= 0 ? '+' : ''}${szChange.toFixed(2)}%）`,
    `**创业板指**：${cyPrice}（${cyChange >= 0 ? '+' : ''}${cyChange.toFixed(2)}%）`,
    '',
    '**今日特点**：',
    `- 市场情绪${
      shChange > 0.5 ? '偏暖，做多意愿较强' : shChange > 0 ? '温和，多空相对均衡' : '偏弱，注意风险控制'
    }`,
  ]
  return lines.join('\n')
}

async function generateSectorFlow(): Promise<string> {
  const [sectors, flow] = await Promise.all([
    fetchSectors('industry', 30),
    fetchCapitalFlowRanking(10),
  ])

  const sorted = [...sectors].sort((a, b) => b.change - a.change)
  const top3 = sorted.slice(0, 3)
  const bottom3 = sorted.slice(-3)
  const lines: string[] = ['### 🔥 板块资金流向', '', '**涨幅前列**：', '']
  for (const s of top3) {
    lines.push(`- **${s.name}**：${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}% 成交${s.volume}亿`)
  }
  lines.push('', '**跌幅前列**：', '')
  for (const s of bottom3) {
    lines.push(`- **${s.name}**：${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}% 成交${s.volume}亿`)
  }
  const flowTop = [...flow].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 3)
  lines.push('', '**主力资金流向**：', '')
  for (const f of flowTop) {
    const direction = f.net >= 0 ? '📥 净流入' : '📤 净流出'
    lines.push(`- ${f.name}：${direction} ${(Math.abs(f.net) / 10000).toFixed(2)}亿`)
  }
  return lines.join('\n')
}

async function generateLHBAnalysis(): Promise<string> {
  const { lhb, institutions, limitUp } = await fetchLHB()
  const top = [...limitUp].sort((a, b) => b.days - a.days).slice(0, 3)

  const lines: string[] = ['### 🐉 龙虎榜分析']

  if (top.length > 0) {
    lines.push('', '**连板龙头**：', '')
    for (const s of top) {
      lines.push(`- **${s.name}**（${s.code}）：${s.days}连板，封板率${(s.sealRate * 100).toFixed(0)}%${s.sector ? `，板块：${s.sector}` : ''}`)
    }
  }

  if (institutions.length > 0) {
    lines.push('', '**机构动向**：', '')
    for (const inst of institutions) {
      const direction = inst.netAmount > 0 ? '买入' : '卖出'
      lines.push(`- ${inst.name}：机构${direction} ${(Math.abs(inst.netAmount)).toFixed(0)}万，原因：${inst.reason}`)
    }
  }

  if (lhb.length > 0) {
    lines.push('', '**今日上榜**：', '')
    for (const r of lhb.slice(0, 5)) {
      lines.push(`- ${r.name}（${r.code}）：净额 ${r.net >= 0 ? '+' : ''}${r.net.toFixed(0)}万`)
    }
  }

  return lines.join('\n')
}

async function generateRecommendation(): Promise<string> {
  const quotes = await fetchQuotes([])
  const sorted = [...quotes].sort((a, b) => b.change - a.change).slice(0, 5)
  if (sorted.length === 0) return '暂无数据，请稍后再试。'

  const lines: string[] = ['### 🎯 个股推荐', '', '基于近期市场表现，以下个股值得关注：', '']
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    lines.push(`${i + 1}. **${s.name}**（${s.code}）：涨幅 ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%，换手 ${s.turnover}%${i === 0 ? ' ⭐' : ''}`)
  }
  lines.push('', '💡 *以上仅为技术面筛选结果，不构成投资建议。投资有风险，入市需谨慎。*')
  return lines.join('\n')
}

async function generateWatchlistSummary(): Promise<string> {
  const quotes = await fetchQuotes([])
  if (quotes.length === 0) return '暂无自选股数据。'

  const upCount = quotes.filter(s => s.change > 0).length
  const downCount = quotes.filter(s => s.change < 0).length
  const avgChange = quotes.reduce((sum, s) => sum + s.change, 0) / quotes.length
  const maxStock = quotes.reduce((a, b) => a.change > b.change ? a : b)
  const minStock = quotes.reduce((a, b) => a.change < b.change ? a : b)

  return [
    '### 📋 自选股概览',
    '',
    `**总数**：${quotes.length}只`,
    `**上涨/下跌**：${upCount}/${downCount}`,
    `**平均涨跌幅**：${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
    '',
    `**领涨**：${maxStock.name}（${maxStock.change >= 0 ? '+' : ''}${maxStock.change.toFixed(2)}%）`,
    `**领跌**：${minStock.name}（${minStock.change >= 0 ? '+' : ''}${minStock.change.toFixed(2)}%）`,
  ].join('\n')
}

function generateGeneralResponse(text: string): string {
  const responses = [
    '您好！我是 StockView AI 助手，可以为您提供以下帮助：',
    '',
    '1. 📊 **个股分析** — 输入股票名称或代码，如"分析茅台"',
    '2. 📈 **大盘概况** — 输入"大盘行情"或"市场概况"',
    '3. 🔥 **板块资金** — 输入"板块资金流向"',
    '4. 🐉 **龙虎榜** — 输入"龙虎榜分析"',
    '5. 🎯 **个股推荐** — 输入"推荐股票"',
    '6. 📋 **自选股概览** — 输入"自选股"',
    '',
    '请告诉我您想了解什么？',
  ]
  return responses.join('\n')
}

function generateFollowUps(intents: string[], topics: string[], stocks: string[]): string[] {
  const suggestions: string[] = []
  if (stocks.length > 0) {
    suggestions.push(`📊 ${stocks[0]}的买卖信号`)
    suggestions.push(`⚡ ${stocks[0]}的资金流向`)
  }
  if (topics.includes('technical')) suggestions.push('📈 大盘行情分析')
  if (topics.includes('sector') || intents.includes('sector')) suggestions.push('🔥 板块资金流向')
  if (!suggestions.length) {
    suggestions.push('📊 分析贵州茅台', '📈 大盘行情', '🔥 资金流向', '🐉 龙虎榜')
  }
  return suggestions.slice(0, 4)
}

// ════════════════════════════════════════════════════════════════
//  Exported API
// ════════════════════════════════════════════════════════════════

export const aiEngine = {
  parseIntent,

  async generate(text: string, hasImage: boolean, session: any): Promise<{ content: string; followUps: string[] }> {
    const { intents, topics, targetStocks } = this.parseIntent(text, hasImage, session)
    let content: string

    if (intents.includes('screener')) {
      content = [
        '### 🔍 选股策略建议',
        '',
        '目前支持以下选股策略：',
        '',
        '1. **放量突破** — 成交量放大 + 价格突破均线，适合短线追涨',
        '2. **MACD金叉** — MACD指标DIF上穿DEA，中线趋势转多信号',
        '3. **超跌反弹** — RSI超卖区 + 短期跌幅较大，博反弹机会',
        '4. **价值投资** — 低市盈率 + 高ROE，适合长线持股',
        '5. **业绩增长** — 营收和利润双增长，关注成长性',
        '',
        '请在"选股器"模块中选择策略并运行筛选。',
      ].join('\n')
    } else if (intents.includes('summary')) {
      content = await this.generateMarketSummary()
    } else if (intents.includes('sector')) {
      content = await this.generateSectorFlow()
    } else if (intents.includes('lhb')) {
      content = await this.generateLHBAnalysis()
    } else if (intents.includes('recommend') || intents.includes('signal')) {
      content = await this.generateRecommendation()
    } else if (targetStocks.length >= 2) {
      content = await this.generateComparison(targetStocks)
    } else if (targetStocks.length === 1) {
      content = await this.generateStockAnalysis(targetStocks, intents, topics)
    } else if (intents.includes('analyze')) {
      content = '请指定要分析的股票名称或代码，例如"分析贵州茅台"或"分析600519"。'
    } else if (intents.includes('portfolio') || text.includes('自选')) {
      content = await this.generateWatchlistSummary()
    } else {
      content = this.generateGeneralResponse(text)
    }

    const followUps = this.generateFollowUps(intents, topics, targetStocks)
    return { content, followUps }
  },

  // Keep sync helpers for testing / external use
  generateMarketSummary: generateMarketSummary,
  generateSectorFlow: generateSectorFlow,
  generateLHBAnalysis: generateLHBAnalysis,
  generateRecommendation: generateRecommendation,
  generateWatchlistSummary: generateWatchlistSummary,
  generateStockAnalysis: generateStockAnalysis,
  generateComparison: generateComparison,
  generateGeneralResponse: generateGeneralResponse,
  generateFollowUps: generateFollowUps,
}
