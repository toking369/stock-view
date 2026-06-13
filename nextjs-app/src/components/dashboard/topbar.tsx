'use client'

import { useEffect, useState } from 'react'
import { fetchIndices } from '@/lib/api'
import type { Index } from '@/types'

export function TopBar() {
  const [indices, setIndices] = useState<Index[]>([])
  const [time, setTime] = useState('')

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
      </div>
    </header>
  )
}
