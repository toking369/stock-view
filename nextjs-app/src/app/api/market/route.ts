import { NextRequest, NextResponse } from 'next/server'
import { marketCache, klineCache } from '@/lib/cache'

function generateIndices() {
  return [
    { code: '000001', name: '上证指数', price: 3156.78, change: 0.68, changeAmount: 21.35 },
    { code: '399001', name: '深证成指', price: 10673.45, change: 1.12, changeAmount: 118.56 },
    { code: '399006', name: '创业板指', price: 2156.32, change: 1.85, changeAmount: 39.21 },
    { code: '000688', name: '科创50', price: 968.45, change: -0.32, changeAmount: -3.11 },
    { code: '899050', name: '北证50', price: 856.12, change: 0.45, changeAmount: 3.84 },
  ]
}

function generateKline(days: number) {
  const data: any[] = []
  let price = 50 + Math.random() * 100
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  for (let i = 0; i < days * 1.4; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const change = (Math.random() - 0.48) * 4
    const open = price
    const close = +(open * (1 + change / 100)).toFixed(2)
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.02)).toFixed(2)
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.02)).toFixed(2)
    const vol = Math.round(Math.random() * 100000 + 10000)
    price = close
    data.push({ date: d.toISOString().slice(0, 10), open, close, high, low, vol })
  }
  return data
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'indices'

  switch (type) {
    case 'indices': {
      const cached = marketCache.get('indices')
      if (cached) return NextResponse.json(cached)
      const data = generateIndices()
      marketCache.set('indices', data)
      return NextResponse.json(data)
    }

    case 'kline': {
      const code = searchParams.get('code') || '600519'
      const days = parseInt(searchParams.get('days') || '120')
      const cacheKey = `kline:${code}:${days}`
      const cached = klineCache.get(cacheKey)
      if (cached) return NextResponse.json(cached)
      const data = generateKline(days)
      klineCache.set(cacheKey, data)
      return NextResponse.json(data)
    }

    case 'sectors': {
      const count = parseInt(searchParams.get('count') || '30')
      const cacheKey = `sectors:${count}`
      const cached = marketCache.get(cacheKey)
      if (cached) return NextResponse.json(cached)
      const sectors = [
        '半导体', '新能源车', '人工智能', '光伏', '白酒', '医药', '军工',
        '证券', '银行', '房地产', '消费电子', '通信', '计算机', '有色金属',
        '煤炭', '电力', '化工', '汽车零部件', '机器人', '大数据',
      ]
      const data = sectors.slice(0, count).map(name => ({
        name,
        change: +(Math.random() * 10 - 5).toFixed(2),
        volume: Math.round(Math.random() * 500 + 50),
      }))
      marketCache.set(cacheKey, data)
      return NextResponse.json(data)
    }

    case 'flow': {
      const count = parseInt(searchParams.get('count') || '10')
      const names = ['贵州茅台', '宁德时代', '中国平安', '招商银行', '东方财富', '五粮液', '比亚迪', '美的集团', '药明康德', '中信证券']
      const codes = ['600519', '300750', '601318', '600036', '300059', '000858', '002594', '000333', '603259', '600030']
      const data = Array.from({ length: count }, (_, i) => ({
        code: codes[i], name: names[i],
        price: +(100 + Math.random() * 1000).toFixed(2),
        change: +(Math.random() * 10 - 5).toFixed(2),
        inflow: Math.round(Math.random() * 200000 + 10000),
        outflow: Math.round(Math.random() * 150000 + 5000),
        net: Math.round((Math.random() - 0.5) * 100000),
        ratio: +(Math.random() * 30 - 15).toFixed(2),
      }))
      return NextResponse.json(data)
    }

    case 'lhb':
      return NextResponse.json({
        lhb: [
          { code: '002952', name: '亚世光电', price: 28.56, change: 10.01, buy: 15680, sell: 5230, net: 10450 },
          { code: '603005', name: '晶方科技', price: 22.35, change: 9.99, buy: 28900, sell: 12450, net: 16450 },
        ],
        inst: [{ code: '002952', name: '亚世光电', buyCount: 3, buyAmount: 8900, sellCount: 0, sellAmount: 0, netAmount: 8900, reason: '连续3日涨幅偏离值累计达20%' }],
        limitUp: [{ name: '亚世光电', code: '002952', days: 4, sealRate: 0.85, sector: '电子' }],
      })

    case 'search': {
      const q = searchParams.get('q') || ''
      const pool = [
        { code: '600519', name: '贵州茅台' }, { code: '300750', name: '宁德时代' },
        { code: '601318', name: '中国平安' }, { code: '600036', name: '招商银行' },
        { code: '300059', name: '东方财富' }, { code: '000858', name: '五粮液' },
        { code: '002594', name: '比亚迪' }, { code: '000333', name: '美的集团' },
      ]
      return NextResponse.json(pool.filter(s => s.name.includes(q) || s.code.includes(q)))
    }

    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }
}
