'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchSectors } from '@/lib/api'
import type { Sector } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'concept' | 'industry' | 'index'

interface TabItem {
  key: TabKey
  label: string
  apiType: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
  { key: 'concept',  label: '概念板块', apiType: 'concept' },
  { key: 'industry', label: '行业板块', apiType: 'industry' },
  { key: 'index',    label: '指数板块', apiType: 'index' },
]

// Refined color palette — warm reds for up, cool greens for down
const RISE_COLORS = [
  '#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171',
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
]
const FALL_COLORS = [
  '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80',
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
]

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function formatChange(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
}

function ChangeArrow({ value }: { value: number }) {
  if (value === 0) return null
  return (
    <svg
      width="10" height="10" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }}
    >
      {value > 0 ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  )
}

function SectorRankItem({ rank, name, change, leadStock, price }: {
  rank: number
  name: string
  change: number
  leadStock?: string
  price?: number
}) {
  const isUp = change > 0
  const isDown = change < 0
  const cls = isUp ? 'rise' : isDown ? 'fall' : 'flat-color'

  return (
    <div className="sector-rank-item">
      <span className="sector-rank-num">{rank}</span>
      <span className="sector-rank-name">
        {name}
        {leadStock && (
          <span className="rank-item-sub">{leadStock}</span>
        )}
        {price !== undefined && price > 0 && (
          <span className="rank-item-price">{price.toFixed(2)}</span>
        )}
      </span>
      <span className={`sector-rank-change ${cls}`}>
        {isUp || isDown ? <ChangeArrow value={change} /> : null}
        {formatChange(change)}
      </span>
    </div>
  )
}

/** Loading skeleton */
function LoadingSkeleton() {
  return (
    <div className="heatmap-layout">
      <div className="heatmap-chart-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" />
          <div style={{ fontSize: 13, color: 'var(--fg-dim)', marginTop: 12 }}>
            加载板块数据中...
          </div>
        </div>
      </div>
      <div className="sector-rank-panel">
        {[1, 2].map(i => (
          <div key={i} className="sector-rank-card" style={{ flex: 'none', height: '50%' }}>
            <div className="skeleton-bar" style={{ width: '60%', height: 16, marginBottom: 14 }} />
            {[1, 2, 3, 4, 5].map(j => (
              <div key={j} className="skeleton-row">
                <div className="skeleton-bar" style={{ width: `${40 + j * 8}%`, height: 12 }} />
                <div className="skeleton-bar" style={{ width: 50, height: 12 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HeatmapPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('concept')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataDate, setDataDate] = useState<string>('')

  const currentTab = TABS.find(t => t.key === activeTab)!

  // ---- Compute data date label ----
  const formatDataDate = useCallback((serverTs: number): string => {
    const now = serverTs ? new Date(serverTs) : new Date()
    const day = now.getDay()
    let targetDate: Date
    if (day === 6) {
      targetDate = new Date(now); targetDate.setDate(now.getDate() - 1)
    } else if (day === 0) {
      targetDate = new Date(now); targetDate.setDate(now.getDate() - 2)
    } else {
      targetDate = now
    }
    const month = targetDate.getMonth() + 1
    const date = targetDate.getDate()
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return `${month}月${date}日 星期${weekdays[targetDate.getDay()]}`
  }, [])

  // ---- Fetch data on tab change ----
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSectors(currentTab.apiType, 50)
      setSectors(res.sectors)
      setDataDate(formatDataDate(res.fetchedAt))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentTab.apiType, formatDataDate])

  useEffect(() => { loadData() }, [loadData])

  // ---- Computed rank lists ----
  // Always show top/bottom 10 by change%.
  // On all-green days "losers" = least-gaining (relative underperformers).
  const { topGainers, topLosers } = useMemo(() => {
    if (!sectors.length) return { topGainers: [], topLosers: [] }
    const sorted = [...sectors].sort((a, b) => b.change - a.change)
    return {
      topGainers: sorted.slice(0, 10),
      topLosers: sorted.slice(-10).reverse(),
    }
  }, [sectors])

  // ---- Stats summary ----
  const stats = useMemo(() => {
    if (!sectors.length) return { up: 0, down: 0, flat: 0, avgChange: 0 }
    const up = sectors.filter(s => s.change > 0).length
    const down = sectors.filter(s => s.change < 0).length
    const flat = sectors.length - up - down
    const avg = sectors.reduce((sum, s) => sum + s.change, 0) / sectors.length
    return { up, down, flat, avgChange: avg }
  }, [sectors])

  // ---- Dynamic visualMap range ----
  const { vMin, vMax } = useMemo(() => {
    if (sectors.length === 0) return { vMin: -5, vMax: 5 }
    const changes = sectors.map(s => s.change)
    const absMax = Math.max(Math.abs(Math.min(...changes)), Math.abs(Math.max(...changes)), 1)
    return { vMin: -absMax, vMax: absMax }
  }, [sectors])

  // ---- Treemap option ----
  const chartOption = useMemo(() => {
    // Build a continuous palette: deep green → neutral → deep red
    const palette = [
      ...FALL_COLORS.slice().reverse(),
      '#1e293b',
      ...RISE_COLORS,
    ]

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 21, 32, 0.96)',
        borderColor: 'rgba(148, 163, 184, 0.15)',
        borderWidth: 1,
        textStyle: { color: '#e5e7eb', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.data) return ''
          const change = Number(params.data.change ?? 0)
          const dir = change >= 0 ? 'var(--rise)' : 'var(--fall)'
          const sign = change >= 0 ? '+' : ''
          const rawValue = Number((params.data as any).rawValue ?? 0)
          const lead = (params.data as any).leadStock
          const net = (params.data as any).netMf
          const price = Number((params.data as any).price ?? 0)

          let html = `<div style="font-size:14px;font-weight:600;margin-bottom:4px">${params.name}</div>`
          if (price > 0) {
            html += `<div style="color:#94a3b8;font-size:11px;margin-bottom:2px">${price.toFixed(2)} 点</div>`
          }
          html += `<div style="margin:4px 0">
                    涨跌幅 <span style="color:${dir};font-weight:600;font-size:14px">${sign}${change.toFixed(2)}%</span>
                   </div>`
          html += `<div style="color:#94a3b8;font-size:12px">成交额 ${rawValue.toFixed(0)}亿</div>`
          if (lead) html += `<div style="color:#94a3b8;font-size:12px">领涨 ${lead}</div>`
          if (net !== undefined && net !== 0) {
            html += `<div style="color:#94a3b8;font-size:12px">主力净流入 <span style="color:${net > 0 ? 'var(--rise)' : 'var(--fall)'};font-weight:500">${net > 0 ? '+' : ''}${(net / 10000).toFixed(2)}亿</span></div>`
          }
          return html
        },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.6); border-radius: 8px; padding: 8px;',
      },
      visualMap: {
        min: vMin,
        max: vMax,
        inRange: { color: palette },
        dimension: 1,
        calculable: false,
        show: false,
      },
      series: [{
        type: 'treemap',
        data: sectors.map((s: Sector) => ({
          name: s.name,
          value: [s.volume, s.change],
          change: s.change,
          rawValue: s.volume,
          leadStock: s.leadStock,
          netMf: s.netMf,
          price: s.price,
        })),
        visualDimension: 1,
        roam: false,
        nodeClick: false,
        width: '100%',
        height: '100%',
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            const name = params.name as string
            const change = Number(params.data?.change ?? 0)
            const sign = change >= 0 ? '+' : ''
            return `${name}\n${sign}${change.toFixed(2)}%`
          },
          color: '#f1f5f9',
          fontSize: 11,
          fontWeight: 500,
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowBlur: 3,
        },
        upperLabel: { show: false },
        itemStyle: {
          borderColor: 'rgba(15, 23, 42, 0.6)',
          borderWidth: 0.5,
          borderRadius: 2,
        },
        levels: [{ colorMappingBy: 'value', visualDimension: 1 }],
        emphasis: {
          itemStyle: {
            borderColor: 'rgba(148, 163, 184, 0.4)',
            borderWidth: 1.5,
            shadowBlur: 12,
            shadowColor: 'rgba(148, 163, 184, 0.15)',
          },
          label: { fontSize: 13, fontWeight: 600 },
        },
        animationDuration: 600,
        animationEasing: 'cubicOut',
      }],
      backgroundColor: 'transparent',
    }
  }, [sectors, vMin, vMax])

  // ---- Render ----
  if (loading) {
    return (
      <div>
        <PanelHeader dataDate="" stats={stats} activeTab={activeTab} onTabChange={setActiveTab} />
        <LoadingSkeleton />
        <GlobalStyles />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PanelHeader dataDate="" stats={stats} activeTab={activeTab} onTabChange={setActiveTab} />
        <ErrorState message={error} onRetry={loadData} />
        <GlobalStyles />
      </div>
    )
  }

  return (
    <div>
      <PanelHeader dataDate={dataDate} stats={stats} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="heatmap-layout">
        {/* Treemap */}
        <div className="heatmap-chart-wrap">
          {sectors.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-dim)', fontSize: 13 }}>
              暂无板块数据
            </div>
          ) : (
            <ReactECharts
              option={chartOption}
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge
            />
          )}
        </div>

        {/* Rank panels */}
        <div className="sector-rank-panel">
          <MiniStatsBar up={stats.up} down={stats.down} total={sectors.length} />
          <RankCard title="涨幅前10" color="var(--rise)" icon="up" data={topGainers} activeTab={activeTab} />
          <RankCard
            title={
              topLosers.some(s => s.change < 0)
                ? '跌幅前10'
                : '相对弱势'
            }
            color={topLosers.some(s => s.change < 0) ? 'var(--fall)' : 'var(--flat)'}
            icon="down"
            data={topLosers}
            activeTab={activeTab}
          />
        </div>
      </div>
      <GlobalStyles />
    </div>
  )
}

// ===== Split-out sub-components =====

function PanelHeader({ dataDate, stats, activeTab, onTabChange }: {
  dataDate: string
  stats: { up: number; down: number; flat: number; avgChange: number }
  activeTab: TabKey
  onTabChange: (k: TabKey) => void
}) {
  return (
    <div className="panel-header">
      <div>
        <div className="panel-title">板块热力图</div>
        <div className="panel-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--fg-muted)' }}>{dataDate || '加载中...'}</span>
          <span style={{ color: 'var(--fg-dim)' }}>/</span>
          <span style={{ color: 'var(--rise)', fontWeight: 600 }}>{stats.up}</span>
          <span style={{ color: 'var(--fg-muted)' }}>涨</span>
          <span style={{ color: 'var(--fall)', fontWeight: 600 }}>{stats.down}</span>
          <span style={{ color: 'var(--fg-muted)' }}>跌</span>
          <span style={{ color: 'var(--flat)', fontWeight: 500 }}>{stats.flat}</span>
          <span style={{ color: 'var(--fg-muted)', marginLeft: 4 }}>平</span>
          <span style={{ color: 'var(--fg-dim)', marginLeft: 4 }}>/</span>
          <span style={{
            color: stats.avgChange >= 0 ? 'var(--rise)' : 'var(--fall)',
            fontWeight: 500,
          }}>
            均{formatChange(stats.avgChange)}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="heatmap-tabs">
        <div className="heatmap-tabs-track">
          <div
            className="heatmap-tabs-indicator"
            style={{
              width: `${100 / TABS.length}%`,
              left: `${TABS.findIndex(t => t.key === activeTab) * 100 / TABS.length}%`,
            }}
          />
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`heatmap-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStatsBar({ up, down, total }: { up: number; down: number; total: number }) {
  const upPct = total > 0 ? (up / total * 100).toFixed(1) : '0'
  const downPct = total > 0 ? (down / total * 100).toFixed(1) : '0'

  return (
    <div className="stats-mini-bar">
      <div className="stats-mini-item">
        <div className="stats-mini-label">上涨</div>
        <div className="stats-mini-value" style={{ color: 'var(--rise)' }}>{up}</div>
        <div className="stats-mini-pct">{upPct}%</div>
      </div>
      <div className="stats-mini-divider" />
      <div className="stats-mini-item">
        <div className="stats-mini-label">下跌</div>
        <div className="stats-mini-value" style={{ color: 'var(--fall)' }}>{down}</div>
        <div className="stats-mini-pct">{downPct}%</div>
      </div>
      <div className="stats-mini-divider" />
      <div className="stats-mini-item">
        <div className="stats-mini-label">共计</div>
        <div className="stats-mini-value" style={{ color: 'var(--fg-secondary)' }}>{total}</div>
        <div className="stats-mini-pct">板块</div>
      </div>
    </div>
  )
}

function RankCard({ title, color, icon, data, activeTab }: {
  title: string
  color: string
  icon: 'up' | 'down'
  data: Sector[]
  activeTab: TabKey
}) {
  return (
    <div className="sector-rank-card">
      <div className="card-title" style={{
        color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon === 'up' ? (
            <polyline points="18 15 12 9 6 15" />
          ) : (
            <polyline points="6 9 12 15 18 9" />
          )}
        </svg>
        {title}
      </div>
      <div>
        {data.length === 0 ? (
          <div className="rank-empty">暂无数据</div>
        ) : (
          data.map((s, i) => (
            <SectorRankItem
              key={`${icon}-${i}`}
              rank={i + 1}
              name={s.name}
              change={s.change}
              leadStock={s.leadStock}
              price={activeTab === 'index' ? s.price : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="heatmap-layout">
      <div className="heatmap-chart-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⚠️</div>
          <div style={{ fontSize: 14, color: '#ef4444', marginBottom: 6, fontWeight: 500 }}>数据加载失败</div>
          <div style={{ fontSize: 12, color: 'var(--fg-dim)', maxWidth: 360, lineHeight: 1.6 }}>{message}</div>
          <button className="retry-btn" onClick={onRetry}>重新加载</button>
        </div>
      </div>
      <div className="sector-rank-panel" />
    </div>
  )
}

function GlobalStyles() {
  return <style>{`
    /* ---- Heatmap tabs ---- */
    .heatmap-tabs { position: relative; }
    .heatmap-tabs-track {
      position: relative;
      display: flex;
      gap: 2px;
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
      padding: 2px;
    }
    .heatmap-tabs-indicator {
      position: absolute;
      top: 2px; bottom: 2px;
      background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08));
      border-radius: 4px;
      transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 0;
      border: 1px solid rgba(59,130,246,0.15);
    }
    .heatmap-tab {
      position: relative;
      z-index: 1;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 500;
      color: var(--fg-muted);
      border: none;
      background: none;
      border-radius: 4px;
      cursor: pointer;
      transition: color 0.2s ease;
      white-space: nowrap;
    }
    .heatmap-tab:hover { color: var(--fg-secondary); }
    .heatmap-tab.active { color: #e5e7eb; font-weight: 600; }

    /* ---- Stats mini bar ---- */
    .stats-mini-bar {
      display: flex;
      align-items: center;
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 8px;
      padding: 10px 4px;
    }
    .stats-mini-item {
      flex: 1;
      text-align: center;
      padding: 0 8px;
    }
    .stats-mini-label {
      font-size: 11px;
      color: var(--fg-dim);
      margin-bottom: 3px;
    }
    .stats-mini-value {
      font-size: 20px;
      font-weight: 700;
      font-family: var(--font-mono);
      line-height: 1.2;
    }
    .stats-mini-pct {
      font-size: 10px;
      color: var(--fg-dim);
      font-family: var(--font-mono);
      margin-top: 2px;
    }
    .stats-mini-divider {
      width: 1px;
      height: 36px;
      background: var(--border-subtle);
      flex-shrink: 0;
    }

    /* ---- Rank items ---- */
    .rank-empty {
      padding: 20px 0;
      font-size: 12px;
      color: var(--fg-muted);
      text-align: center;
    }
    .rank-item-sub {
      font-size: 11px;
      color: var(--fg-dim);
      margin-left: 6px;
      font-weight: 400;
    }
    .rank-item-price {
      font-size: 11px;
      color: var(--fg-dim);
      margin-left: 6px;
      font-weight: 400;
      font-family: var(--font-mono);
    }

    /* ---- Loading ---- */
    .loading-spinner {
      width: 36px; height: 36px;
      margin: 0 auto;
      border: 2.5px solid rgba(255,255,255,0.06);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .skeleton-bar {
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    .skeleton-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .retry-btn {
      margin-top: 16px;
      padding: 6px 20px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--fg);
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .retry-btn:hover { background: rgba(255,255,255,0.08); }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}</style>
}

// Re-export for module consistency
export { formatChange }
