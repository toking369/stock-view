'use client'

import { useEffect, useState } from 'react'

const indices = [
  { name: '上证指数', code: '000001', price: 3267.83, change: 1.24, cls: 'rise' },
  { name: '深证成指', code: '399001', price: 10458.21, change: 1.67, cls: 'rise' },
  { name: '创业板指', code: '399006', price: 2087.56, change: -0.32, cls: 'fall' },
  { name: '科创50', code: '000688', price: 982.43, change: 0.89, cls: 'rise' },
]

export function TopBar() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="top-bar" data-component="Index Ticker Bar">
      <div className="index-group">
        {indices.map(idx => (
          <div key={idx.code} className={`index-item ${idx.cls}`}>
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
        </div>
      </div>
    </header>
  )
}
