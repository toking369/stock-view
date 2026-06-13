import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const username = await db.getUsernameByToken(token)
  if (!username) {
    return NextResponse.json({ error: 'Token 无效或已过期' }, { status: 401 })
  }
  const user = await db.findUserByUsername(username)
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 })
  }
  const watchlist = await db.getWatchlist(username)
  return NextResponse.json({
    username: user.username,
    name: user.name,
    watchlist,
  })
}
