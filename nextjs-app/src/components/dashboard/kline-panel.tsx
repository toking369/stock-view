'use client'

import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  calcMA,
  calcMACD,
  calcKDJ,
  calcRSI,
  calcBOLL,
  generateKlineData,
} from '@/lib/indicators'
import { fmtNum } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PeriodKey = 'daily' | 'weekly' | 'monthly' | '60min' | '30min' | '15min'
type IndicatorKey = 'macd' | 'kdj' | 'rsi' | 'boll'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'daily', label: '日K' },
  { key: 'weekly', label: '周K' },
  { key: 'monthly', label: '月K' },
  { key: '60min', label: '60分' },
  { key: '30min', label: '30分' },
  { key: '15min', label: '15分' },
]

const INDICATOR_BUTTONS: { key: IndicatorKey; label: string }[] = [
  { key: 'macd', label: 'MACD' },
  { key: 'kdj', label: 'KDJ' },
  { key: 'rsi', label: 'RSI' },
  { key: 'boll', label: 'BOLL' },
]

const MA_COLORS = ['#3b82f6', '#f59e0b', '#a78bfa', '#ec4899']
const RISE_COLOR = '#ef4444'
const FALL_COLOR = '#22c55e'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an OHLC tooltip row — returns raw HTML string for ECharts formatter */
function ohlcRow(label: string, value: number, ref?: number): string {
  const monoStyle = 'text-align:right;font-family:var(--font-mono)'
  if (ref === undefined) {
    return `<tr><td style="padding-right:8px">${label}</td><td style="${monoStyle}">${value.toFixed(2)}</td></tr>`
  }
  const dir = value > ref ? 'var(--rise)' : value < ref ? 'var(--fall)' : 'inherit'
  return `<tr><td style="padding-right:8px">${label}</td><td style="${monoStyle};color:${dir}">${value.toFixed(2)}</td></tr>`
}

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function CandlestickSvg() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" y1="5" x2="6" y2="19" />
      <line x1="10" y1="5" x2="10" y2="19" />
      <line x1="14" y1="3" x2="14" y2="21" />
      <line x1="18" y1="7" x2="18" y2="17" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function KlinePanel() {
  // ---------- State ----------
  const [indicator, setIndicator] = useState<IndicatorKey>('macd')
  const [klinePeriod, setKlinePeriod] = useState<PeriodKey>('daily')

  // ---------- Mock data ----------
  const klineData = useMemo(() => generateKlineData(120), [])

  // ---------- Indicator computations ----------
  const maValues = useMemo(
    () => ({
      ma5: calcMA(klineData, 5),
      ma10: calcMA(klineData, 10),
      ma20: calcMA(klineData, 20),
      ma60: calcMA(klineData, 60),
    }),
    [klineData],
  )

  const macdResult = useMemo(() => calcMACD(klineData), [klineData])
  const kdjResult = useMemo(() => calcKDJ(klineData), [klineData])
  const rsi6 = useMemo(() => calcRSI(klineData, 6), [klineData])
  const rsi12 = useMemo(() => calcRSI(klineData, 12), [klineData])
  const rsi24 = useMemo(() => calcRSI(klineData, 24), [klineData])
  const bollResult = useMemo(() => calcBOLL(klineData, 20), [klineData])

  // ---------- ECharts option ----------
  const option = useMemo(() => {
    const dates = klineData.map((d) => d.date)
    const ohlc = klineData.map((d) => [d.open, d.close, d.low, d.high])
    const volumes = klineData.map((d) => d.vol)

    // ---- Main grid series ----
    const mainSeries: Record<string, any>[] = [
      // Candlestick
      {
        type: 'candlestick',
        name: 'K线',
        data: ohlc,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: RISE_COLOR,
          color0: FALL_COLOR,
          borderColor: RISE_COLOR,
          borderColor0: FALL_COLOR,
        },
      },
      // MA lines
      {
        type: 'line',
        name: 'MA5',
        data: maValues.ma5,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.2, color: MA_COLORS[0] },
        emphasis: { lineStyle: { width: 2 } },
      },
      {
        type: 'line',
        name: 'MA10',
        data: maValues.ma10,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.2, color: MA_COLORS[1] },
        emphasis: { lineStyle: { width: 2 } },
      },
      {
        type: 'line',
        name: 'MA20',
        data: maValues.ma20,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.2, color: MA_COLORS[2] },
        emphasis: { lineStyle: { width: 2 } },
      },
      {
        type: 'line',
        name: 'MA60',
        data: maValues.ma60,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.2, color: MA_COLORS[3] },
        emphasis: { lineStyle: { width: 2 } },
      },
    ]

    // Add BOLL bands to main chart when selected
    if (indicator === 'boll') {
      mainSeries.push(
        {
          type: 'line',
          name: 'BOLL上轨',
          data: bollResult.upper,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, color: '#14b8a6', type: 'dashed' },
          emphasis: { lineStyle: { width: 1.5 } },
        },
        {
          type: 'line',
          name: 'BOLL中轨',
          data: bollResult.mid,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, color: '#14b8a6' },
          emphasis: { lineStyle: { width: 1.5 } },
        },
        {
          type: 'line',
          name: 'BOLL下轨',
          data: bollResult.lower,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, color: '#14b8a6', type: 'dashed' },
          emphasis: { lineStyle: { width: 1.5 } },
        },
      )
    }

    // ---- Sub grid series (volume + indicator) ----
    const subSeries: Record<string, any>[] = [
      // Volume bars
      {
        type: 'bar',
        name: '成交量',
        data: volumes.map((v, i) => ({
          value: v,
          itemStyle: {
            color:
              klineData[i].close >= klineData[i].open
                ? RISE_COLOR
                : FALL_COLOR,
          },
        })),
        xAxisIndex: 1,
        yAxisIndex: 1,
        barWidth: '60%',
      },
    ]

    // Add selected indicator to sub chart
    if (indicator === 'macd') {
      subSeries.push(
        {
          type: 'bar',
          name: 'MACD Hist',
          data: macdResult.hist.map((v) => ({
            value: v,
            itemStyle: {
              color: v >= 0 ? '#ef4444' : '#22c55e',
            },
          })),
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '50%',
        },
        {
          type: 'line',
          name: 'DIF',
          data: macdResult.dif,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#3b82f6' },
        },
        {
          type: 'line',
          name: 'DEA',
          data: macdResult.dea,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#f59e0b' },
        },
      )
    } else if (indicator === 'kdj') {
      subSeries.push(
        {
          type: 'line',
          name: 'K',
          data: kdjResult.k,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#3b82f6' },
        },
        {
          type: 'line',
          name: 'D',
          data: kdjResult.d,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#f59e0b' },
        },
        {
          type: 'line',
          name: 'J',
          data: kdjResult.j,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#ec4899' },
        },
      )
    } else if (indicator === 'rsi') {
      subSeries.push(
        {
          type: 'line',
          name: 'RSI6',
          data: rsi6,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#3b82f6' },
        },
        {
          type: 'line',
          name: 'RSI12',
          data: rsi12,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#f59e0b' },
        },
        {
          type: 'line',
          name: 'RSI24',
          data: rsi24,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.2, color: '#a78bfa' },
        },
      )
    }
    // indicator === 'boll' — no extra sub series (BOLL drawn on main grid)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderColor: '#1f2937',
        textStyle: { color: '#e5e7eb', fontSize: 12 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          const dp = params[0]
          const idx = dp.dataIndex
          const d = klineData[idx]
          if (!d) return ''

          const prevClose = idx > 0 ? klineData[idx - 1].close : d.open
          const changePct = (
            ((d.close - prevClose) / prevClose) *
            100
          ).toFixed(2)
          const changeColor =
            d.close >= prevClose ? 'var(--rise)' : 'var(--fall)'

          let html = `<div style="max-width:320px">`
          html += `<div style="font-weight:600;margin-bottom:4px">${d.date}</div>`
          html += `<table style="width:100%;font-size:12px">`
          html += ohlcRow('开盘', d.open, prevClose)
          html += ohlcRow('收盘', d.close, prevClose)
          html += ohlcRow('最高', d.high, prevClose)
          html += ohlcRow('最低', d.low, prevClose)
          html += `<tr><td style="padding-right:8px">涨跌幅</td><td style="text-align:right;font-family:var(--font-mono);color:${changeColor}">${changePct}%</td></tr>`
          html += `<tr><td style="padding-right:8px">成交量</td><td style="text-align:right;font-family:var(--font-mono)">${fmtNum(d.vol)}</td></tr>`

          // Indicator values
          if (indicator === 'macd' && macdResult.dif[idx] !== undefined) {
            html += `<tr><td colspan="2" style="padding-top:4px;border-top:1px solid #1f2937"></td></tr>`
            html += `<tr><td style="padding-right:8px">DIF</td><td style="text-align:right;font-family:var(--font-mono)">${macdResult.dif[idx].toFixed(4)}</td></tr>`
            html += `<tr><td style="padding-right:8px">DEA</td><td style="text-align:right;font-family:var(--font-mono)">${macdResult.dea[idx].toFixed(4)}</td></tr>`
            html += `<tr><td style="padding-right:8px">MACD</td><td style="text-align:right;font-family:var(--font-mono)">${macdResult.hist[idx].toFixed(4)}</td></tr>`
          } else if (indicator === 'kdj' && kdjResult.k[idx] !== undefined) {
            html += `<tr><td colspan="2" style="padding-top:4px;border-top:1px solid #1f2937"></td></tr>`
            html += `<tr><td style="padding-right:8px">K</td><td style="text-align:right;font-family:var(--font-mono)">${kdjResult.k[idx].toFixed(2)}</td></tr>`
            html += `<tr><td style="padding-right:8px">D</td><td style="text-align:right;font-family:var(--font-mono)">${kdjResult.d[idx].toFixed(2)}</td></tr>`
            html += `<tr><td style="padding-right:8px">J</td><td style="text-align:right;font-family:var(--font-mono)">${kdjResult.j[idx].toFixed(2)}</td></tr>`
          } else if (indicator === 'rsi' && rsi6[idx] !== null) {
            html += `<tr><td colspan="2" style="padding-top:4px;border-top:1px solid #1f2937"></td></tr>`
            html += `<tr><td style="padding-right:8px">RSI6</td><td style="text-align:right;font-family:var(--font-mono)">${Number(rsi6[idx]).toFixed(2)}</td></tr>`
            html += `<tr><td style="padding-right:8px">RSI12</td><td style="text-align:right;font-family:var(--font-mono)">${Number(rsi12[idx]).toFixed(2)}</td></tr>`
            html += `<tr><td style="padding-right:8px">RSI24</td><td style="text-align:right;font-family:var(--font-mono)">${Number(rsi24[idx]).toFixed(2)}</td></tr>`
          } else if (indicator === 'boll' && bollResult.mid[idx] !== null) {
            html += `<tr><td colspan="2" style="padding-top:4px;border-top:1px solid #1f2937"></td></tr>`
            html += `<tr><td style="padding-right:8px">上轨</td><td style="text-align:right;font-family:var(--font-mono)">${Number(bollResult.upper[idx]).toFixed(2)}</td></tr>`
            html += `<tr><td style="padding-right:8px">中轨</td><td style="text-align:right;font-family:var(--font-mono)">${Number(bollResult.mid[idx]).toFixed(2)}</td></tr>`
            html += `<tr><td style="padding-right:8px">下轨</td><td style="text-align:right;font-family:var(--font-mono)">${Number(bollResult.lower[idx]).toFixed(2)}</td></tr>`
          }

          html += `</table></div>`
          return html
        },
      },

      grid: [
        {
          id: 'main',
          left: '5%',
          right: '5%',
          top: '3%',
          height: '60%',
        },
        {
          id: 'sub',
          left: '5%',
          right: '5%',
          top: '66%',
          height: '27%',
        },
      ],

      xAxis: [
        {
          type: 'category',
          data: dates,
          gridIndex: 0,
          axisLine: { lineStyle: { color: '#1f2937' } },
          axisLabel: { color: '#6b7280', fontSize: 10, hideOverlap: true },
          splitLine: {
            show: true,
            lineStyle: { color: '#1f2937', type: 'dashed' },
          },
        },
        {
          type: 'category',
          data: dates,
          gridIndex: 1,
          axisLine: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
      ],

      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          scale: true,
          splitLine: {
            lineStyle: { color: '#1f2937', type: 'dashed' },
          },
          axisLabel: {
            color: '#6b7280',
            fontSize: 10,
          },
        },
        {
          type: 'value',
          gridIndex: 1,
          scale: true,
          splitLine: { show: false },
          axisLabel: {
            color: '#6b7280',
            fontSize: 10,
          },
        },
      ],

      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          start: 30,
          end: 100,
          bottom: 0,
          height: 14,
          borderColor: '#1f2937',
          backgroundColor: '#111827',
          fillerColor: 'rgba(59, 130, 246, 0.15)',
          handleStyle: { color: '#3b82f6' },
          textStyle: { color: '#6b7280', fontSize: 10 },
        },
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 30,
          end: 100,
        },
      ],

      series: [...mainSeries, ...subSeries],

      backgroundColor: 'transparent',
      animation: false,
    }
  }, [
    klineData,
    indicator,
    maValues,
    macdResult,
    kdjResult,
    rsi6,
    rsi12,
    rsi24,
    bollResult,
  ])

  // ---------- Render ----------
  return (
    <div>
      {/* ====== Panel Header ====== */}
      <div className="panel-header">
        <div>
          <div className="panel-title">K线技术分析</div>
          <div className="panel-subtitle">日K线 · 前复权</div>
        </div>
      </div>

      {/* ====== K-line Layout ====== */}
      <div className="kline-layout">
        {/* -------- Toolbar -------- */}
        <div className="kline-toolbar">
          <div className="kline-stock-selector">
            <input
              className="stock-select-input"
              value="600519 贵州茅台"
              readOnly
            />
            <div className="tab-group">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  className={`tab-btn${klinePeriod === p.key ? ' active' : ''}`}
                  onClick={() => setKlinePeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="kline-indicators">
            <span className="indicator-icon-wrap" style={{ display: 'none' }}>
              <CandlestickSvg />
            </span>
            {INDICATOR_BUTTONS.map((ib) => (
              <button
                key={ib.key}
                className={`indicator-btn${indicator === ib.key ? ' active' : ''}`}
                onClick={() => setIndicator(ib.key)}
              >
                {ib.label}
              </button>
            ))}
          </div>
        </div>

        {/* -------- Chart Area -------- */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Structural elements preserving required CSS classes */}
          <div className="kline-main-chart" style={{ flex: 1, minHeight: 0 }} />
          <div className="kline-sub-chart" />

          {/* Single ECharts instance covering both main and sub grids */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <ReactECharts
              option={option}
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge
            />
          </div>
        </div>
      </div>
    </div>
  )
}
