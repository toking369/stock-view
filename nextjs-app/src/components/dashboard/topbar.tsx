'use client'

import { useEffect, useState } from 'react'
import { fetchIndices } from '@/lib/api'
import type { Index } from '@/types'

export function TopBar() {
  const [indices, setIndices] = useState<Index[]>([])
  const [time, setTime] = useState('')
  const [logoutHover, setLogoutHover] = useState(false)

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchIndices()
      .then(setIndices)
      .catch(() => setIndices([]))
    // Refresh every 30s
    const timer = setInterval(() => {
      fetchIndices().then(setIndices).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="top-bar" data-component="Index Ticker Bar">
      <div className="index-group">
        {indices.map(idx => (
          <div key={idx.code} className={`index-item ${idx.change >= 0 ? 'rise' : 'fall'}`}>
            <span className="index-name">{idx.name}</span>
            <span className="index-value">{idx.price.toLocaleString()}</span>
            <span className="index-change">{idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}%</span>
          </div>
        ))}
      </div>
      <div className="top-bar-right">
        <div className="market-status">
          <span className="dot"></span>
          <span>交易中</span>
        </div>
        <span className="top-time">{time}</span>
        <div className="user-section">
          <div className="user-avatar">U</div>
          <span className="user-name">用户</span>
          <button
            onClick={() => { localStorage.removeItem('stockview_token'); localStorage.removeItem('stockview_user'); window.location.href = '/login' }}
            title="退出登录"
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: logoutHover ? 'rgba(239,68,68,0.15)' : 'none',
              border: 'none', borderRadius: 4,
              color: logoutHover ? '#dc2626' : 'var(--fg-secondary)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'color 0.2s, background 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
