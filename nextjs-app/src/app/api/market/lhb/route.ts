import { NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { lhbCache } from '@/lib/cache'

export async function GET() {
  try {
    const cached = lhbCache.get('lhb')
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchLHB()
    lhbCache.set('lhb', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch LHB:', error)
    return NextResponse.json({ error: '获取龙虎榜数据失败' }, { status: 502 })
  }
}
