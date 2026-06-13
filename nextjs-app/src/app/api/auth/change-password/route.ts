import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validatePassword } from '@/lib/validators'

export async function POST(req: NextRequest) {
  try {
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

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword) {
      return NextResponse.json({ error: '请输入当前密码' }, { status: 400 })
    }

    if (user.password !== currentPassword) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 403 })
    }

    const pwdErr = validatePassword(newPassword)
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr }, { status: 400 })
    }

    await db.updatePassword(username, newPassword)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
