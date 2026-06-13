import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { sectorCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const type = (req.nextUrl.searchParams.get('type') || 'industry') as 'industry' | 'concept'
    const count = parseInt(req.nextUrl.searchParams.get('count') || '30')
    const cacheKey = `sectors:${type}:${count}`

    const cached = sectorCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchSectors(type, count)
    sectorCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch sectors:', error)
    return NextResponse.json({ error: '获取板块数据失败' }, { status: 502 })
  }
}
