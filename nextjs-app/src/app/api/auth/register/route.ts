import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, password, name } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度不少于6位' }, { status: 400 })
    }
    const existing = db.findUserByPhone(phone)
    if (existing) {
      return NextResponse.json({ error: '该手机号已注册' }, { status: 409 })
    }
    const user = db.createUser(phone, password, name)
    const token = `stk-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    db.saveToken(token, phone)
    return NextResponse.json({
      token,
      user: { phone: user.phone, name: user.name, watchlist: user.watchlist },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
