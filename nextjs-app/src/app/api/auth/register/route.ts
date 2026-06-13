import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateUsername, validatePassword } from '@/lib/validators'

export async function POST(req: NextRequest) {
  try {
    const { username, password, name } = await req.json()

    const userErr = validateUsername(username)
    if (userErr) {
      return NextResponse.json({ error: userErr }, { status: 400 })
    }
    const pwdErr = validatePassword(password)
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr }, { status: 400 })
    }

    const existing = await db.findUserByUsername(username)
    if (existing) {
      return NextResponse.json({ error: '该账号已注册' }, { status: 409 })
    }
    const user = await db.createUser(username, password, name)
    const token = `stk-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db.saveToken(token, username)
    return NextResponse.json({
      token,
      user: { username: user.username, name: user.name, watchlist: [] },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
