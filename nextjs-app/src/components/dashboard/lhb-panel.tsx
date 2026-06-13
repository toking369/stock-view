'use client'

import { useMemo } from 'react'
import { lhbData, lhbInstData, limitUpList } from '@/lib/mock-data'
import { fmtNum } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LHBPanel() {
  // --- Summary stats ---------------------------------------------------------
  const stats = useMemo(() => {
    const limitUpCount = lhbData.filter((s) => s.change > 0).length
    const limitDownCount = lhbData.filter((s) => s.change < 0).length
    const avgSealRate =
      limitUpList.reduce((s, item) => s + item.sealRate, 0) /
      limitUpList.length
    return { limitUpCount, limitDownCount, avgSealRate }
  }, [])

  // --- Sorted limit-up list by consecutive days descending -------------------
  const sortedLimitUp = useMemo(
    () => [...limitUpList].sort((a, b) => b.days - a.days),
    [],
  )

  // --- Sorted LHB records by net descending ----------------------------------
  const sortedLhb = useMemo(
    () => [...lhbData].sort((a, b) => b.net - a.net),
    [],
  )

  // --- Sorted institutional records by netAmount descending -------------------
  const sortedInst = useMemo(
    () => [...lhbInstData].sort((a, b) => b.netAmount - a.netAmount),
    [],
  )

  return (
    <div>
      {/* ====== Panel Header ====== */}
      <div className="panel-header">
        <div>
          <div className="panel-title">龙虎榜与涨停分析</div>
          <div className="panel-subtitle">
            2026-06-11 龙虎榜上榜 · 涨停板复盘
          </div>
        </div>
      </div>

      <div className="lhb-layout">
        {/* ====== Panel 1: Limit Up Stats + Streak Board ====== */}
        <div className="lhb-panel">
          <div className="card-header mb-16">
            <span className="card-title">涨停板统计</span>
          </div>
          <div className="limit-up-stats">
            <div className="limit-stat-card">
              <div className="limit-stat-num text-rise">
                {stats.limitUpCount}
              </div>
              <div className="limit-stat-label">涨停家数</div>
              <div
                className="flow-stat-desc"
                style={{ marginTop: 6, color: 'var(--rise)' }}
              >
                较昨日 +8
              </div>
            </div>
            <div className="limit-stat-card">
              <div className="limit-stat-num text-fall">
                {stats.limitDownCount}
              </div>
              <div className="limit-stat-label">跌停家数</div>
              <div
                className="flow-stat-desc"
                style={{ marginTop: 6, color: 'var(--fall)' }}
              >
                较昨日 -3
              </div>
            </div>
            <div className="limit-stat-card">
              <div className="limit-stat-num" style={{ color: 'var(--warn)' }}>
                {(stats.avgSealRate * 100).toFixed(1)}%
              </div>
              <div className="limit-stat-label">封板成功率</div>
              <div
                className="flow-stat-desc"
                style={{ marginTop: 6, color: 'var(--warn)' }}
              >
                近5日均值 68.3%
              </div>
            </div>
          </div>

          <div className="card-header mb-8">
            <span className="card-title">连板梯队</span>
          </div>
          <div>
            {sortedLimitUp.map((stock) => {
              const dayColor =
                stock.days >= 4
                  ? 'var(--rise)'
                  : stock.days >= 2
                    ? 'var(--warn)'
                    : 'var(--fg-secondary)'
              return (
                <div key={stock.code} className="sector-rank-item">
                  <span
                    className="sector-rank-num"
                    style={{ color: dayColor, fontWeight: 700 }}
                  >
                    {stock.days}板
                  </span>
                  <span className="sector-rank-name">
                    {stock.name}
                    <span
                      style={{
                        color: 'var(--fg-dim)',
                        fontSize: 11,
                        marginLeft: 6,
                      }}
                    >
                      {stock.sector}
                    </span>
                  </span>
                  <span
                    style={{ fontSize: 11, color: 'var(--fg-muted)' }}
                  >
                    {stock.code}
                  </span>
                  <span
                    className="tag-badge tag-rise"
                    style={{ marginLeft: 8 }}
                  >
                    封板{stock.sealRate}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ====== Panel 2: LHB List ====== */}
        <div className="lhb-panel">
          <div className="card-header mb-16">
            <span className="card-title">龙虎榜上榜</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>股票</th>
                <th>收盘价</th>
                <th>涨跌幅</th>
                <th>买入(万)</th>
                <th>卖出(万)</th>
                <th>净买(万)</th>
              </tr>
            </thead>
            <tbody>
              {sortedLhb.map((stock) => {
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
                    <td className="text-rise">
                      {(stock.buy / 10000).toFixed(2)}亿
                    </td>
                    <td className="text-fall">
                      {(stock.sell / 10000).toFixed(2)}亿
                    </td>
                    <td className={`${netCls} fw-600`}>
                      {netSign}
                      {(stock.net / 10000).toFixed(2)}亿
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ====== Panel 3: Institutional Seats ====== */}
        <div className="lhb-full-panel">
          <div className="card-header mb-16">
            <span className="card-title">机构席位买卖详情</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>股票</th>
                <th>买入机构数</th>
                <th>机构买入(万)</th>
                <th>卖出机构数</th>
                <th>机构卖出(万)</th>
                <th>机构净买(万)</th>
                <th>上榜原因</th>
              </tr>
            </thead>
            <tbody>
              {sortedInst.map((stock) => {
                const netCls =
                  stock.netAmount >= 0 ? 'text-rise' : 'text-fall'
                const netSign = stock.netAmount >= 0 ? '+' : ''
                return (
                  <tr key={stock.code}>
                    <td>
                      <span className="stock-code">{stock.code}</span>
                      <span className="stock-name">{stock.name}</span>
                    </td>
                    <td>{stock.buyCount}</td>
                    <td className="text-rise fw-600">
                      {(stock.buyAmount / 10000).toFixed(2)}亿
                    </td>
                    <td>{stock.sellCount}</td>
                    <td className="text-fall fw-600">
                      {(stock.sellAmount / 10000).toFixed(2)}亿
                    </td>
                    <td className={`${netCls} fw-600`}>
                      {netSign}
                      {(stock.netAmount / 10000).toFixed(2)}亿
                    </td>
                    <td>
                      <span className="tag-badge tag-warn">
                        {stock.reason}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
