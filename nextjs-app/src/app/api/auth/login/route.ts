import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
    }
    const user = db.findUserByPhone(phone)
    if (!user || user.password !== password) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
    }
    const token = `stk-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    db.saveToken(token, phone)
    return NextResponse.json({
      token,
      user: { phone: user.phone, name: user.name, watchlist: user.watchlist },
    })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
