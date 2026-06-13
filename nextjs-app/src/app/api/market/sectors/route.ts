import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { sectorCache } from '@/lib/cache'
import type { Sector } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const type = (req.nextUrl.searchParams.get('type') || 'industry') as 'industry' | 'concept' | 'region'
    const count = parseInt(req.nextUrl.searchParams.get('count') || '30')

    // Validate type
    if (!['industry', 'concept', 'region'].includes(type)) {
      return NextResponse.json({ error: '无效的板块类型' }, { status: 400 })
    }

    const cacheKey = `sectors:${type}:${count}`
    const cached = sectorCache.get<Sector[]>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchSectors(type, count)
    sectorCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch sectors:', error)
    return NextResponse.json(
      { error: '获取板块数据失败，请稍后重试' },
      { status: 502 }
    )
  }
}
