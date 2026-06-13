import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { screenerCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const count = parseInt(req.nextUrl.searchParams.get('count') || '500')
    const cacheKey = `screener-pool:${count}`
    const cached = screenerCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchAllStocks(count)
    screenerCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch screener pool:', error)
    return NextResponse.json({ error: '获取选股数据失败' }, { status: 502 })
  }
}
