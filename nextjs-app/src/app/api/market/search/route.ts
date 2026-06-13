import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || ''
    if (!q.trim()) return NextResponse.json([])

    const data = await eastMoney.searchStocks(q)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to search stocks:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 502 })
  }
}
