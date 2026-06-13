import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const phone = db.getPhoneByToken(token)
  if (!phone) {
    return NextResponse.json({ error: 'Token 无效或已过期' }, { status: 401 })
  }
  const user = db.findUserByPhone(phone)
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 })
  }
  return NextResponse.json({
    phone: user.phone,
    name: user.name,
    watchlist: user.watchlist,
  })
}
