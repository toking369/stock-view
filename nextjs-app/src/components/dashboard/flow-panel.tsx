'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { fetchCapitalFlowRanking } from '@/lib/api'
import { fmtNum } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = 'name' | 'price' | 'change' | 'net' | 'ratio'

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FlowPanel() {
  const [sortField, setSortField] = useState<SortField>('net')
  const [sortAsc, setSortAsc] = useState(false)

  const [flowData, setFlowData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCapitalFlowRanking(10)
      .then(data => { setFlowData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // --- Summary stats ---------------------------------------------------------
  const stats = useMemo(() => {
    const totalInflow = flowData.reduce((s, f) => s + f.inflow, 0)
    const totalOutflow = flowData.reduce((s, f) => s + f.outflow, 0)
    const totalNet = flowData.reduce((s, f) => s + f.net, 0)
    const positiveCount = flowData.filter((f) => f.net >= 0).length
    const negativeCount = flowData.length - positiveCount
    return { totalInflow, totalOutflow, totalNet, positiveCount, negativeCount }
  }, [flowData])

  // --- Bar items sorted by net descending ------------------------------------
  const barData = useMemo(() => {
    return [...flowData].sort((a, b) => b.net - a.net)
  }, [flowData])

  // --- Sorted table data -----------------------------------------------------
  const sortedData = useMemo(() => {
    return [...flowData].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'zh-CN')
          break
        case 'price':
          cmp = a.price - b.price
          break
        case 'change':
          cmp = a.change - b.change
          break
        case 'net':
          cmp = a.net - b.net
          break
        case 'ratio':
          cmp = a.ratio - b.ratio
          break
      }
      return sortAsc ? cmp : -cmp
    })
  }, [flowData, sortField, sortAsc])

  // --- Sort handler ----------------------------------------------------------
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortAsc((prev) => !prev)
      } else {
        setSortField(field)
        setSortAsc(false)
      }
    },
    [sortField],
  )

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span className="sort-icon">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ verticalAlign: 'middle' }}>
            <path d="M3 10L5 12.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            <path d="M7 4L5 1.5L3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
          </svg>
        </span>
      )
    }
    return (
      <span className="sort-icon">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ verticalAlign: 'middle' }}>
          {sortAsc ? (
            <path d="M7 10L5 12.5L3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M3 4L5 1.5L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </span>
    )
  }

  if (loading) return <div className="panel-loading" style={{ padding: 40, textAlign: 'center', color: '#888' }}>加载资金流向数据中...</div>

  return (
    <div>
      {/* ====== Panel Header ====== */}
      <div className="panel-header">
        <div>
          <div className="panel-title">资金流向</div>
          <div className="panel-subtitle">主力资金净流入排行 · 今日</div>
        </div>
      </div>

      <div className="flow-layout">
        {/* ====== Summary Cards ====== */}
        <div className="flow-summary">
          <div className="flow-stat-card">
            <div className="flow-stat-label">大盘主力净流入</div>
            <div
              className={`flow-stat-value ${stats.totalNet >= 0 ? 'text-rise' : 'text-fall'}`}
            >
              {stats.totalNet >= 0 ? '+' : ''}
              {fmtNum(stats.totalNet)}
            </div>
            <div className="flow-stat-desc">较昨日 +32.1%</div>
          </div>
          <div className="flow-stat-card">
            <div className="flow-stat-label">超大单净流入</div>
            <div className="flow-stat-value text-rise">
              {fmtNum(stats.totalInflow)}
            </div>
            <div className="flow-stat-desc">
              占主力{' '}
              {stats.totalNet !== 0
                ? ((stats.totalInflow / Math.abs(stats.totalNet)) * 100).toFixed(
                    1,
                  )
                : '0'}
              %
            </div>
          </div>
          <div className="flow-stat-card">
            <div className="flow-stat-label">大单净流入</div>
            <div className="flow-stat-value text-rise">
              {fmtNum(stats.totalOutflow)}
            </div>
            <div className="flow-stat-desc">
              占主力{' '}
              {stats.totalNet !== 0
                ? ((stats.totalOutflow / Math.abs(stats.totalNet)) * 100).toFixed(
                    1,
                  )
                : '0'}
              %
            </div>
          </div>
          <div className="flow-stat-card">
            <div className="flow-stat-label">主力净流入个股数</div>
            <div className="flow-stat-value" style={{ color: 'var(--fg)' }}>
              {stats.positiveCount.toLocaleString()}
            </div>
            <div className="flow-stat-desc">
              净流出 {stats.negativeCount.toLocaleString()} 只
            </div>
          </div>
        </div>

        {/* ====== Flow Content: Bars + Table ====== */}
        <div className="flow-content">
          {/* Bar Chart */}
          <div className="flow-chart-wrap">
            <div className="card-header">
              <span className="card-title">主力净流入 TOP 10</span>
            </div>
            <div>
              {barData.map((stock) => {
                const total = stock.inflow + stock.outflow
                const inPct = total > 0 ? ((stock.inflow / total) * 100).toFixed(0) : '50'
                const outPct = total > 0 ? ((stock.outflow / total) * 100).toFixed(0) : '50'
                return (
                  <div key={stock.code} className="flow-bar-item" style={{ display: 'flex', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                    <span className="flow-bar-name" style={{ width: 80, fontWeight: 500, color: 'var(--fg-secondary)', flexShrink: 0 }}>{stock.name}</span>
                    <div className="flow-bar-track" style={{ display: 'flex', height: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden', flex: 1, margin: '0 8px' }}>
                      <div className="flow-bar-in" style={{ width: `${inPct}%`, height: '100%', background: 'var(--rise)', borderRadius: '3px 0 0 3px' }} />
                      <div className="flow-bar-out" style={{ width: `${outPct}%`, height: '100%', background: 'var(--fall)', borderRadius: '0 3px 3px 0' }} />
                    </div>
                    <span className={`flow-bar-net ${stock.net >= 0 ? 'text-rise' : 'text-fall'}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, minWidth: 70, textAlign: 'right' }}>
                      {stock.net >= 0 ? '+' : ''}{fmtNum(stock.net)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail Table */}
          <div className="flow-table-wrap">
            <div className="card-header">
              <span className="card-title">资金流向明细</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    style={{ textAlign: 'left' }}
                    onClick={() => handleSort('name')}
                  >
                    股票
                    {renderSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('price')}>
                    现价
                    {renderSortIcon('price')}
                  </th>
                  <th onClick={() => handleSort('change')}>
                    涨跌幅
                    {renderSortIcon('change')}
                  </th>
                  <th onClick={() => handleSort('net')}>
                    主力净流入
                    {renderSortIcon('net')}
                  </th>
                  <th onClick={() => handleSort('ratio')}>
                    占比
                    {renderSortIcon('ratio')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((stock) => {
                  const changeCls =
                    stock.change > 0
                      ? 'rise'
                      : stock.change < 0
                        ? 'fall'
                        : ''
                  const changeSign = stock.change > 0 ? '+' : ''
                  const netCls = stock.net >= 0 ? 'text-rise' : 'text-fall'
                  const netSign = stock.net >= 0 ? '+' : ''
                  return (
                    <tr key={stock.code}>
                      <td>
                        <span className="stock-code">{stock.code}</span>
                        <span className="stock-name">{stock.name}</span>
                      </td>
                      <td className={`${changeCls} fw-600`}>
                        {stock.price.toFixed(2)}
                      </td>
                      <td className={`${changeCls} fw-600`}>
                        {changeSign}
                        {stock.change.toFixed(2)}%
                      </td>
                      <td className={`${netCls} fw-600`}>
                        {netSign}
                        {fmtNum(stock.net)}
                      </td>
                      <td>
                        {stock.ratio > 0 ? '+' : ''}
                        {stock.ratio.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
