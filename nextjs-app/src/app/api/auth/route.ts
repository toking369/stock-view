import { NextRequest, NextResponse } from 'next/server'

interface StoredUser {
  id: string
  phone: string
  password: string
  name?: string
  createdAt: number
  watchlist: string[]
}

// In-memory store (will be replaced by SQLite)
const users = new Map<string, StoredUser>()
users.set('13800138000', {
  id: 'demo-001',
  phone: '13800138000',
  password: '123456',
  name: 'Demo User',
  createdAt: Date.now(),
  watchlist: ['600519', '300750', '601318', '600036', '300059'],
})

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'login'

  try {
    const body = await req.json()

    if (action === 'login') {
      const { phone, password } = body
      if (!phone || !password) {
        return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
      }
      const user = users.get(phone)
      if (!user || user.password !== password) {
        return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
      }
      return NextResponse.json({
        token: `mock-token-${Date.now()}`,
        user: { phone: user.phone, name: user.name, watchlist: user.watchlist },
      })
    }

    if (action === 'register') {
      const { phone, password } = body
      if (!phone || !password) {
        return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
      }
      if (password.length < 6) {
        return NextResponse.json({ error: '密码长度不少于6位' }, { status: 400 })
      }
      if (users.has(phone)) {
        return NextResponse.json({ error: '该手机号已注册' }, { status: 409 })
      }
      const user: StoredUser = {
        id: `user-${Date.now()}`,
        phone, password,
        createdAt: Date.now(),
        watchlist: [],
      }
      users.set(phone, user)
      return NextResponse.json({
        token: `mock-token-${Date.now()}`,
        user: { phone: user.phone, name: user.name, watchlist: user.watchlist },
      }, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
