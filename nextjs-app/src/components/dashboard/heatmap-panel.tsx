'use client'

import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { sectorData } from '@/lib/mock-data'
import type { Sector } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'industry' | 'concept' | 'region'

interface TabItem {
  key: TabKey
  label: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
  { key: 'industry', label: '行业板块' },
  { key: 'concept', label: '概念板块' },
  { key: 'region', label: '地域板块' },
]

/** Clamp a value to [min, max] */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function RiseArrowSvg() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function FallArrowSvg() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** One row in the ranking list */
function SectorRankItem({
  rank,
  name,
  change,
}: {
  rank: number
  name: string
  change: number
}) {
  const isUp = change > 0
  const isDown = change < 0
  const changeClass = isUp ? 'rise' : isDown ? 'fall' : 'flat-color'

  return (
    <div className="sector-rank-item">
      <span className="sector-rank-num">{rank}</span>
      <span className="sector-rank-name">{name}</span>
      <span className={`sector-rank-change ${changeClass}`}>
        {isUp ? <RiseArrowSvg /> : isDown ? <FallArrowSvg /> : null}
        {change >= 0 ? '+' : ''}
        {change.toFixed(2)}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HeatmapPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('industry')

  // Use same data for all tabs (simplified — real app would filter by tab)
  const dataSource = sectorData

  // ---- Computed rank lists ----
  const { topGainers, topLosers } = useMemo(() => {
    const sorted = [...dataSource].sort((a, b) => b.change - a.change)
    const gainers = sorted.filter((s) => s.change > 0).slice(0, 10)
    const losers = sorted
      .filter((s) => s.change < 0)
      .reverse()
      .slice(0, 10)
    return { topGainers: gainers, topLosers: losers }
  }, [dataSource])

  // ---- Treemap option ----
  const chartOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderColor: '#1f2937',
        textStyle: { color: '#e5e7eb', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.data) return ''
          const change = params.data.change as number
          const dir = change >= 0 ? 'var(--rise)' : 'var(--fall)'
          const sign = change >= 0 ? '+' : ''
          return `<strong>${params.name}</strong><br/>
                  涨跌幅：<span style="color:${dir}">${sign}${change.toFixed(2)}%</span><br/>
                  成交额：${(params.data.rawValue as number).toFixed(0)}亿`
        },
      },

      visualMap: {
        min: -5,
        max: 5,
        inRange: {
          color: [
            '#14532d',
            '#1a3a2e',
            '#1f2937',
            '#3b1a1a',
            '#7f1d1d',
            '#dc2626',
            '#ef4444',
          ],
        },
        dimension: 1,
        calculable: false,
        show: false,
      },

      series: [
        {
          type: 'treemap',
          data: dataSource.map((s: Sector) => ({
            name: s.name,
            value: [s.volume, s.change],
            change: s.change,
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
              const change = params.data.change as number
              const sign = change >= 0 ? '+' : ''
              return `${name}\n${sign}${change.toFixed(2)}%`
            },
            color: '#e5e7eb',
            fontSize: 11,
            fontWeight: 500,
            textShadowColor: 'rgba(0,0,0,0.6)',
            textShadowBlur: 3,
          },

          upperLabel: {
            show: false,
          },

          itemStyle: {
            borderColor: '#1f2937',
            borderWidth: 1.5,
            borderRadius: 2,
          },

          levels: [
            {
              colorMappingBy: 'value',
              visualDimension: 1,
            },
          ],

          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6',
              borderWidth: 2,
              shadowBlur: 6,
              shadowColor: 'rgba(59, 130, 246, 0.3)',
            },
            label: {
              fontSize: 13,
              fontWeight: 600,
            },
          },
        },
      ],

      backgroundColor: 'transparent',
      animation: false,
    }
  }, [dataSource])

  // ---- Current tab label ----
  const activeLabel = TABS.find((t) => t.key === activeTab)?.label ?? '行业板块'

  return (
    <div>
      {/* ====== Panel Header ====== */}
      <div className="panel-header">
        <div>
          <div className="panel-title">板块热力图</div>
          <div className="panel-subtitle">行业板块涨跌分布 · 面积代表成交额占比</div>
        </div>
        <div className="tab-group">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ====== Heatmap Layout ====== */}
      <div className="heatmap-layout">
        {/* -------- Left: Treemap -------- */}
        <div className="heatmap-chart-wrap">
          <ReactECharts
            option={chartOption}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge
          />
        </div>

        {/* -------- Right: Rank list -------- */}
        <div className="sector-rank-panel">
          {/* Top gainers card */}
          <div className="sector-rank-card">
            <div className="card-title" style={{ color: 'var(--rise)', marginBottom: 10 }}>
              {activeLabel}涨幅前10
            </div>
            <div id="sectorTopList">
              {topGainers.length === 0 && (
                <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center' }}>
                  暂无上涨板块
                </div>
              )}
              {topGainers.map((s, i) => (
                <SectorRankItem
                  key={s.name}
                  rank={i + 1}
                  name={s.name}
                  change={s.change}
                />
              ))}
            </div>
          </div>

          {/* Bottom losers card */}
          <div className="sector-rank-card">
            <div className="card-title" style={{ color: 'var(--fall)', marginBottom: 10 }}>
              {activeLabel}跌幅前10
            </div>
            <div id="sectorBottomList">
              {topLosers.length === 0 && (
                <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center' }}>
                  暂无下跌板块
                </div>
              )}
              {topLosers.map((s, i) => (
                <SectorRankItem
                  key={s.name}
                  rank={i + 1}
                  name={s.name}
                  change={s.change}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
