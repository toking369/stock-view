import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { flowCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (code) {
      // Individual stock flow
      const data = await eastMoney.fetchCapitalFlow(code)
      if (!data) return NextResponse.json({ error: '未找到资金流向数据' }, { status: 404 })
      return NextResponse.json(data)
    }
    // Ranking by default
    const count = parseInt(req.nextUrl.searchParams.get('count') || '10')
    const cacheKey = `flow-ranking:${count}`
    const cached = flowCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchCapitalFlowRanking(count)
    flowCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch capital flow:', error)
    return NextResponse.json({ error: '获取资金流向数据失败' }, { status: 502 })
  }
}
