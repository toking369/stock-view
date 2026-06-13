import { NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { indexCache } from '@/lib/cache'

export async function GET() {
  try {
    const cached = indexCache.get('indices')
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchIndices()
    indexCache.set('indices', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch indices:', error)
    return NextResponse.json({ error: '获取指数数据失败' }, { status: 502 })
  }
}
