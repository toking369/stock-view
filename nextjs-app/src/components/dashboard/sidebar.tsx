'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard', label: '自选股', viewBox: '0 0 24 24', path: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
  { href: '/dashboard/kline', label: 'K线分析', viewBox: '0 0 24 24', path: 'M18 20V10M12 20V4M6 20v-6' },
  { href: '/dashboard/heatmap', label: '板块热力图', viewBox: '0 0 24 24', path: 'M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zM3 14h7v7H3z' },
  { href: '/dashboard/flow', label: '资金流向', viewBox: '0 0 24 24', path: 'M23 6l-9.5 9.5-5-5L1 18' },
  { href: '/dashboard/lhb', label: '龙虎榜', viewBox: '0 0 24 24', path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
  { href: '/dashboard/screener', label: '选股器', viewBox: '0 0 24 24', path: 'M22 3H2l8 9.46V19l4 2v-7.54L22 3z' },
  { href: '/dashboard/aichat', label: 'AI 问答', viewBox: '0 0 24 24', path: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('stockview_user')
      if (raw) {
        const user = JSON.parse(raw)
        setUsername(user.username || '')
        setDisplayName(user.name || user.username || '用户')
      }
    } catch { setDisplayName('用户') }
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <span className="brand-text">StockView</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`nav-item${isActive ? ' active' : ''}`}>
              <svg viewBox={item.viewBox} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.path} />
                {item.label === 'K线分析' && (
                  <>
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </>
                )}
              </svg>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        {/* User info */}
        <Link href="/dashboard/settings" className="sidebar-user" style={{ textDecoration: 'none' }}>
          <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username || displayName}
          </div>
        </Link>
        {/* Logout button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="nav-item"
          style={{ color: 'var(--fg-secondary)', border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          title="退出登录"
          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-secondary)'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>退出</span>
        </button>

        {/* Logout confirm dialog */}
        {showLogoutConfirm && (
          <div
            onClick={() => setShowLogoutConfirm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border)',
                borderRadius: 12, width: 320, maxWidth: '90vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                animation: 'slideUp 0.2s ease',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
                {/* Warning icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>

                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                  确认退出登录？
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                  退出后需要重新登录才能访问工作台
                </div>
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex', gap: 0,
                borderTop: '1px solid var(--border)',
              }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1, padding: '12px 0', border: 'none',
                    background: 'transparent', color: 'var(--fg-secondary)',
                    fontSize: 13, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--fg)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-secondary)' }}
                >
                  取消
                </button>
                <button
                  onClick={() => { localStorage.removeItem('stockview_token'); localStorage.removeItem('stockview_user'); window.location.href = '/login' }}
                  style={{
                    flex: 1, padding: '12px 0', border: 'none', borderLeft: '1px solid var(--border)',
                    background: 'transparent', color: '#dc2626',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
