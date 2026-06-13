import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { quoteCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const codes = (req.nextUrl.searchParams.get('codes') || '').split(',').filter(Boolean)
    if (!codes.length) return NextResponse.json({ error: '缺少 codes 参数' }, { status: 400 })

    const cacheKey = `quotes:${codes.sort().join(',')}`
    const cached = quoteCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchQuotes(codes)
    quoteCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch quotes:', error)
    return NextResponse.json({ error: '获取行情数据失败' }, { status: 502 })
  }
}
