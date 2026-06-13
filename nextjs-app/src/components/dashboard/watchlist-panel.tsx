'use client'

import { useState, useMemo, useEffect } from 'react'
import { fetchQuotes } from '@/lib/api'
import { fmtNum } from '@/lib/utils'

export function WatchlistPanel() {
  const [search, setSearch] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [sortCol, setSortCol] = useState(-1)
  const [sortAsc, setSortAsc] = useState(true)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuotes()
      .then(data => { setQuotes(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    let list = [...quotes]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.includes(q) || s.code.includes(q))
    }
    if (sortCol >= 0) {
      const keys = ['name', 'code', 'price', 'change', 'changeAmount', 'vol', 'amount', 'turnover', 'outerVol', 'innerVol', 'volumeRatio']
      const key = keys[sortCol]
      list.sort((a, b) => {
        const va = (a as any)[key]; const vb = (b as any)[key]
        return sortAsc ? va - vb : vb - va
      })
    }
    return list
  }, [search, sortCol, sortAsc, quotes])

  const selected = filtered[selectedIdx] || filtered[0]
  const handleSort = (col: number) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(col === 3 ? false : true) }
  }
  const cols = ['名称', '代码', '最新价', '涨跌幅', '涨跌额', '成交量(手)', '成交额', '换手率', '外盘', '内盘', '量比']

  if (loading) return <div className="panel-loading" style={{ padding: 40, textAlign: 'center', color: '#888' }}>加载中...</div>
  if (error) return <div className="panel-error" style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">自选股看板</div>
          <div className="panel-subtitle">已添加 {filtered.length} 只自选股</div>
        </div>
        <input className="stock-select-input" placeholder="搜索股票代码/名称..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
      </div>
      <div className="watchlist-layout">
        <div className="watchlist-table-wrap">
          <table className="data-table">
            <thead><tr>
              {cols.map((c, i) => (
                <th key={i} onClick={() => handleSort(i)}>
                  {c}{sortCol === i ? <span className="sort-icon">{sortAsc ? '↑' : '↓'}</span> : ''}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((s, idx) => {
                const up = s.change > 0; const dn = s.change < 0
                return (
                  <tr key={s.code} className={idx === selectedIdx ? 'selected' : ''} onClick={() => setSelectedIdx(idx)}>
                    <td><span className="stock-name">{s.name}</span></td>
                    <td><span className="stock-code">{s.code}</span></td>
                    <td className={up ? 'text-rise' : dn ? 'text-fall' : ''}>{s.price.toFixed(2)}</td>
                    <td className={up ? 'text-rise' : dn ? 'text-fall' : ''}>{s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%</td>
                    <td className={up ? 'text-rise' : dn ? 'text-fall' : ''}>{s.changeAmount >= 0 ? '+' : ''}{s.changeAmount.toFixed(2)}</td>
                    <td>{s.vol.toLocaleString()}</td>
                    <td>{fmtNum(s.amount)}</td>
                    <td>{s.turnover}%</td>
                    <td>{s.outerVol?.toLocaleString() || '0'}</td>
                    <td>{s.innerVol?.toLocaleString() || '0'}</td>
                    <td>{s.volumeRatio}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="watchlist-detail">
            <div className="detail-card">
              <div className="detail-stock-header">
                <span className="detail-stock-name">{selected.name}</span>
                <span className="detail-stock-code">{selected.code}</span>
              </div>
              <div className="detail-price-row">
                <span className="detail-price" style={{ color: selected.change >= 0 ? 'var(--rise)' : 'var(--fall)' }}>
                  {selected.price.toFixed(2)}
                </span>
                <span className={`detail-change ${selected.change >= 0 ? 'tag-rise' : 'tag-fall'}`}>
                  {selected.change >= 0 ? '+' : ''}{selected.change.toFixed(2)}%
                </span>
              </div>
              <div className="detail-stats">
                {[
                  ['最高', selected.high.toFixed(2), 'text-rise'],
                  ['最低', selected.low.toFixed(2), 'text-fall'],
                  ['开盘', selected.open.toFixed(2), ''], ['昨收', selected.prevClose.toFixed(2), ''],
                  ['成交量', (selected.vol / 10000).toFixed(1) + '万手', ''],
                  ['成交额', fmtNum(selected.amount), ''],
                  ['换手率', selected.turnover + '%', ''], ['振幅', selected.amplitude + '%', ''],
                ].map(([l, v, c]) => (
                  <div key={String(l)} className="detail-stat">
                    <span className="detail-stat-label">{String(l)}</span>
                    <span className={`detail-stat-value ${c}`}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-card">
              <div className="card-header"><span className="card-title">分时走势</span></div>
              <div className="mini-chart-wrap" style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-muted">ECharts 分时图</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
