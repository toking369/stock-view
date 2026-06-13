import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 })
    }
    const user = await db.findUserByUsername(username)
    if (!user || user.password !== password) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
    }
    const token = `stk-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db.saveToken(token, username)
    const watchlist = await db.getWatchlist(username)
    return NextResponse.json({
      token,
      user: { username: user.username, name: user.name, watchlist },
    })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
