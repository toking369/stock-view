'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { fetchQuotes, fetchWatchlist, addWatchlist, removeWatchlist } from '@/lib/api'
import { fmtNum } from '@/lib/utils'
import ReactECharts from 'echarts-for-react'

/** Generate a realistic intraday curve matching original design */
function genIntraday(open: number, prevClose: number, code: string) {
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  let rng = seed
  const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280 }
  const pts: number[] = []
  let price = open
  for (let i = 0; i < 240; i++) {
    price += (rand() - 0.48) * 2
    pts.push(+price.toFixed(2))
  }
  return pts
}

const intradayTimes = Array.from({ length: 240 }, (_, i) => {
  const t = Math.floor(i / 60), m = i % 60
  const h = 9 + t + Math.floor((30 + m) / 60), mm = (30 + m) % 60
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`
})

const DEFAULT_WATCHLIST = ['600519', '300750', '601318', '600036', '300059', '000858', '002594', '000333', '603259', '600030']

function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('stockview_token')
}

function loadLocalWatchlist(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST
  try {
    const saved = localStorage.getItem('stockview_watchlist')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return DEFAULT_WATCHLIST
}

function saveLocalWatchlist(codes: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('stockview_watchlist', JSON.stringify(codes))
}

async function loadServerWatchlist(): Promise<string[] | null> {
  if (!isLoggedIn()) return null
  try {
    return await fetchWatchlist()
  } catch {
    return null // fallback to local
  }
}

export function WatchlistPanel() {
  const [search, setSearch] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [sortCol, setSortCol] = useState(-1)
  const [sortAsc, setSortAsc] = useState(true)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchlistCodes, setWatchlistCodes] = useState<string[]>(loadLocalWatchlist)

  const loadData = useCallback((codes: string[]) => {
    setLoading(true)
    fetchQuotes(codes)
      .then(data => { setQuotes(data); setLoading(false); setSelectedIdx(0) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // On mount: try server watchlist first, fallback to local
  useEffect(() => {
    loadServerWatchlist().then(serverCodes => {
      if (serverCodes !== null) {
        // Logged in — use server data (even if empty for new users)
        setWatchlistCodes(serverCodes)
        saveLocalWatchlist(serverCodes)
        if (serverCodes.length > 0) loadData(serverCodes)
        else { setQuotes([]); setLoading(false) }
      } else {
        // Not logged in or server error — use localStorage default
        loadData(loadLocalWatchlist())
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWatchlist = useCallback(async (code: string) => {
    let newCodes: string[]
    if (watchlistCodes.includes(code)) {
      newCodes = watchlistCodes.filter(c => c !== code)
      if (isLoggedIn()) await removeWatchlist(code).catch(() => {})
    } else {
      newCodes = [...watchlistCodes, code]
      if (isLoggedIn()) await addWatchlist(code).catch(() => {})
    }
    setWatchlistCodes(newCodes)
    saveLocalWatchlist(newCodes)
    loadData(newCodes)
  }, [watchlistCodes, loadData])

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

  const handleSort = (col: number) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(col === 3 ? false : true) }
  }
  const cols = ['名称', '代码', '最新价', '涨跌幅', '涨跌额', '成交量(手)', '成交额', '换手率', '外盘', '内盘', '量比']

  if (loading) return <div className="panel-loading" style={{ padding: 40, textAlign: 'center', color: '#888' }}>加载中...</div>
  if (error) return <div className="panel-error" style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>

  const selected = filtered[selectedIdx] || filtered[0]
  const isInWatchlist = selected && watchlistCodes.includes(selected.code)

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
          {filtered.length === 0 ? (
            <div className="panel-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: 14 }}>
              暂无数据
            </div>
          ) : (
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
                    <td className={s.outerVol > s.innerVol ? 'text-rise' : 'text-fall'}>{fmtNum(s.outerVol || 0)}</td>
                    <td className={s.innerVol > s.outerVol ? 'text-rise' : 'text-fall'}>{fmtNum(s.innerVol || 0)}</td>
                    <td className={s.volumeRatio > 4 ? 'text-rise' : ''}>{s.volumeRatio}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}
        </div>
        {selected && (
          <div className="watchlist-detail">
            <div className="detail-card">
              <div className="detail-stock-header">
                <span className="detail-stock-name">{selected.name}</span>
                <span className="detail-stock-code">{selected.code}</span>
                <button
                  onClick={() => toggleWatchlist(selected.code)}
                  style={{
                    marginLeft: 'auto',
                    padding: '3px 10px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: isInWatchlist ? '#ef4444' : '#3b82f6',
                    background: isInWatchlist ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                    color: isInWatchlist ? '#ef4444' : '#3b82f6',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isInWatchlist ? '删自选' : '加自选'}
                </button>
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
                  ['今开', selected.open.toFixed(2), ''],
                  ['最高', selected.high.toFixed(2), 'text-rise'],
                  ['昨收', selected.prevClose.toFixed(2), ''],
                  ['最低', selected.low.toFixed(2), 'text-fall'],
                  ['成交量', (selected.vol / 10000).toFixed(1) + '万', ''],
                  ['成交额', fmtNum(selected.amount), ''],
                  ['量比', selected.volumeRatio?.toFixed(2) || '-', selected.volumeRatio > 4 ? 'text-rise' : ''],
                  ['换手率', selected.turnover + '%', ''],
                  ['外盘', fmtNum(selected.outerVol || 0), selected.outerVol > selected.innerVol ? 'text-rise' : 'text-fall'],
                  ['内盘', fmtNum(selected.innerVol || 0), selected.innerVol > selected.outerVol ? 'text-rise' : 'text-fall'],
                  ['振幅', selected.amplitude?.toFixed(2) + '%' || '-', ''],
                  ['市盈率(TTM)', selected.pe?.toFixed(2) || '-', ''],
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
              <div className="mini-chart-wrap" style={{ height: 200 }}>
                <ReactECharts
                  option={{
                    grid: { left: 50, right: 12, top: 12, bottom: 24 },
                    xAxis: {
                      type: 'category',
                      data: intradayTimes,
                      axisLine: { lineStyle: { color: '#1f2937' } },
                      axisLabel: { color: '#6b7280', fontSize: 10 },
                      splitLine: { show: false },
                      boundaryGap: false,
                    },
                    yAxis: {
                      type: 'value', scale: true,
                      axisLine: { show: false },
                      axisLabel: { color: '#6b7280', fontSize: 10 },
                      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
                      splitNumber: 3,
                    },
                    series: [{
                      type: 'line',
                      data: genIntraday(selected.open, selected.prevClose, selected.code),
                      smooth: true,
                      symbol: 'none',
                      lineStyle: { width: 1.5, color: selected.change >= 0 ? 'var(--rise)' : 'var(--fall)' },
                      areaStyle: {
                        color: {
                          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                          colorStops: [
                            { offset: 0, color: selected.change >= 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' },
                            { offset: 1, color: 'rgba(0,0,0,0)' },
                          ],
                        },
                      },
                      markLine: {
                        silent: true, symbol: 'none',
                        lineStyle: { color: '#6b7280', type: 'dashed', width: 1 },
                        data: [{ yAxis: selected.prevClose, label: { formatter: selected.prevClose.toFixed(2), color: '#6b7280', fontSize: 10 } }],
                      },
                    }],
                    tooltip: { trigger: 'axis' },
                    backgroundColor: 'transparent',
                    animation: false,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
