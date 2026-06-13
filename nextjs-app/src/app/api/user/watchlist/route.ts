import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function authenticate(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return (await db.getUsernameByToken(token)) ?? null
}

export async function GET(req: NextRequest) {
  const username = await authenticate(req)
  if (!username) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const watchlist = await db.getWatchlist(username)
  return NextResponse.json({ watchlist })
}

export async function POST(req: NextRequest) {
  const username = await authenticate(req)
  if (!username) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  try {
    const { code } = await req.json()
    if (!code) {
      return NextResponse.json({ error: '缺少股票代码' }, { status: 400 })
    }
    await db.addToWatchlist(username, code)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
