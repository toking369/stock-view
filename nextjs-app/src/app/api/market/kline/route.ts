import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { klineCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code') || '600519'
    const days = parseInt(req.nextUrl.searchParams.get('days') || '120')
    const period = req.nextUrl.searchParams.get('period') || 'day'
    const cacheKey = `kline:${code}:${days}:${period}`

    const cached = klineCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchKline(code, days, period)
    klineCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch kline:', error)
    return NextResponse.json({ error: '获取K线数据失败' }, { status: 502 })
  }
}
