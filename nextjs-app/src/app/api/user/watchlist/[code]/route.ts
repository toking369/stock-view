import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function authenticate(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return (await db.getUsernameByToken(token)) ?? null
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const username = await authenticate(req)
  if (!username) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { code } = await params
  if (!code) {
    return NextResponse.json({ error: '缺少股票代码' }, { status: 400 })
  }
  await db.removeFromWatchlist(username, code)
  return NextResponse.json({ success: true })
}
