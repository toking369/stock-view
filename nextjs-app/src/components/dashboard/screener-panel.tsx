'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { fetchScreenerPool, fetchStrategies } from '@/lib/api'
import type { ScreenerStock, PresetStrategy, ScreenerFilters } from '@/types'

// ── Helpers ──────────────────────────────────────────

function hasActiveFilters(f: ScreenerFilters): boolean {
  return Object.values(f).some((v) => v !== undefined && v !== null && v !== '')
}

function filterStock(s: ScreenerStock, f: ScreenerFilters): boolean {
  if (f.priceMin !== undefined && s.price < f.priceMin) return false
  if (f.priceMax !== undefined && s.price > f.priceMax) return false
  if (f.changeMin !== undefined && s.change < f.changeMin) return false
  if (f.changeMax !== undefined && s.change > f.changeMax) return false
  if (f.turnoverMin !== undefined && s.turnover < f.turnoverMin) return false
  if (f.turnoverMax !== undefined && s.turnover > f.turnoverMax) return false
  if (f.peMin !== undefined && s.pe < f.peMin) return false
  if (f.peMax !== undefined && s.pe > f.peMax) return false
  if (f.pbMin !== undefined && s.pb < f.pbMin) return false
  if (f.pbMax !== undefined && s.pb > f.pbMax) return false
  if (f.capMin !== undefined && s.cap < f.capMin) return false
  if (f.capMax !== undefined && s.cap > f.capMax) return false
  if (f.roeMin !== undefined && s.roe < f.roeMin) return false
  if (f.roeMax !== undefined && s.roe > f.roeMax) return false

  if (f.macd === 'goldenCross' && s.macd < 0) return false
  if (f.macd === 'deadCross' && s.macd > 0) return false
  if (f.macd === 'positive' && s.macd <= 0) return false
  if (f.macd === 'negative' && s.macd >= 0) return false

  if (f.kdj === 'goldenCross' && (s.kdj > 50 || s.kdj < 20)) return false
  if (f.kdj === 'deadCross' && (s.kdj < 50 || s.kdj > 80)) return false
  if (f.kdj === 'overbought' && s.kdj < 80) return false
  if (f.kdj === 'oversold' && s.kdj > 20) return false

  if (f.ma === 'aboveAll' && s.ma < 0) return false
  if (f.ma === 'belowAll' && s.ma > 0) return false
  if (f.ma === 'support' && s.ma < -1) return false
  if (f.ma === 'pressure' && s.ma > 1) return false

  if (f.rsiMin !== undefined && s.rsi < f.rsiMin) return false
  if (f.rsiMax !== undefined && s.rsi > f.rsiMax) return false

  if (f.amplitudeMin !== undefined && s.amplitude < f.amplitudeMin) return false
  if (f.amplitudeMax !== undefined && s.amplitude > f.amplitudeMax) return false
  if (f.vratioMin !== undefined && s.volumeRatio < f.vratioMin) return false
  if (f.vratioMax !== undefined && s.volumeRatio > f.vratioMax) return false
  if (f.streakMin !== undefined && s.streak < f.streakMin) return false
  if (f.streakMax !== undefined && s.streak > f.streakMax) return false
  if (f.revGrowthMin !== undefined && s.revGrowth < f.revGrowthMin) return false
  if (f.revGrowthMax !== undefined && s.revGrowth > f.revGrowthMax) return false
  if (f.profitGrowthMin !== undefined && s.profitGrowth < f.profitGrowthMin) return false
  if (f.profitGrowthMax !== undefined && s.profitGrowth > f.profitGrowthMax) return false

  return true
}

function checkStrategyExtras(s: ScreenerStock, sf: Record<string, string>): boolean {
  for (const [key, val] of Object.entries(sf)) {
    const n = parseFloat(val)
    switch (key) {
      case 'vratioMin':
        if (s.volumeRatio < n) return false
        break
      case 'vratioMax':
        if (s.volumeRatio > n) return false
        break
      case 'boll':
        if (val === 'upper' && s.boll !== '上轨') return false
        if (val === 'lower' && s.boll !== '下轨') return false
        break
    }
  }
  return true
}

function applyStrategyFilters(strategy: PresetStrategy): ScreenerFilters {
  const f: ScreenerFilters = {}
  for (const [key, val] of Object.entries(strategy.filters)) {
    const n = parseFloat(val)
    switch (key) {
      case 'priceMin': f.priceMin = n; break
      case 'priceMax': f.priceMax = n; break
      case 'changeMin': f.changeMin = n; break
      case 'changeMax': f.changeMax = n; break
      case 'turnoverMin': f.turnoverMin = n; break
      case 'turnoverMax': f.turnoverMax = n; break
      case 'peMin': f.peMin = n; break
      case 'peMax': f.peMax = n; break
      case 'pbMin': f.pbMin = n; break
      case 'pbMax': f.pbMax = n; break
      case 'capMin': f.capMin = n; break
      case 'capMax': f.capMax = n; break
      case 'roeMin': f.roeMin = n; break
      case 'roeMax': f.roeMax = n; break
      case 'macd': f.macd = val as ScreenerFilters['macd']; break
      case 'kdj': f.kdj = val as ScreenerFilters['kdj']; break
      case 'ma': f.ma = val as ScreenerFilters['ma']; break
      case 'rsiMin': f.rsiMin = n; break
      case 'rsiMax': f.rsiMax = n; break
      case 'amplitudeMin': f.amplitudeMin = n; break
      case 'amplitudeMax': f.amplitudeMax = n; break
      case 'vratioMin': f.vratioMin = n; break
      case 'vratioMax': f.vratioMax = n; break
      case 'streakMin': f.streakMin = n; break
      case 'streakMax': f.streakMax = n; break
      case 'revGrowthMin': f.revGrowthMin = n; break
      case 'revGrowthMax': f.revGrowthMax = n; break
      case 'profitGrowthMin': f.profitGrowthMin = n; break
      case 'profitGrowthMax': f.profitGrowthMax = n; break
    }
  }
  return f
}

// ── Utility ──────────────────────────────────────────

function fmtNum(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)}亿`
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)}万`
  return n.toFixed(2)
}

// ── Star SVG ─────────────────────────────────────────

function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      width="16"
      height="16"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Main Component ──────────────────────────────────

export function ScreenerPanel() {
  const [activeStrategy, setActiveStrategy] = useState<string | null>(null)
  const [filters, setFilters] = useState<ScreenerFilters>({})
  const [starredStocks, setStarredStocks] = useState<Set<string>>(new Set())
  const [activeFilterTab, setActiveFilterTab] = useState<'tech' | 'fund' | 'market'>('tech')
  const [hasRun, setHasRun] = useState(false)
  const [stockPool, setStockPool] = useState<ScreenerStock[]>([])
  const [strategies, setStrategies] = useState<PresetStrategy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchScreenerPool(),
      fetchStrategies(),
    ]).then(([pool, strats]) => {
      setStockPool(pool as ScreenerStock[])
      setStrategies(strats)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── Update a single filter key ─────────────────────
  const updFilter = useCallback(
    <K extends keyof ScreenerFilters>(key: K, val: ScreenerFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: val }))
      if (activeStrategy) setActiveStrategy(null)
    },
    [activeStrategy],
  )

  const updRange = useCallback(
    (keyMin: keyof ScreenerFilters, keyMax: keyof ScreenerFilters) =>
      (min: number | undefined, max: number | undefined) => {
        setFilters((prev) => ({ ...prev, [keyMin]: min, [keyMax]: max }))
        if (activeStrategy) setActiveStrategy(null)
      },
    [activeStrategy],
  )

  // ── Computed results ───────────────────────────────
  const results = useMemo(() => {
    const strategy = activeStrategy
      ? strategies.find((s) => s.id === activeStrategy)
      : null

    if (!hasActiveFilters(filters) && !strategy) {
      return []
    }

    return stockPool.filter((s) => {
      if (!filterStock(s, filters)) return false
      if (strategy && !checkStrategyExtras(s, strategy.filters)) return false
      return true
    })
  }, [filters, activeStrategy])

  // ── Active filter tags ────────────────────────────
  const activeTags = useMemo(() => {
    const tags: string[] = []
    if (filters.macd) tags.push(`MACD ${filters.macd}`)
    if (filters.kdj) tags.push(`KDJ ${filters.kdj}`)
    if (filters.ma) tags.push(`MA ${filters.ma}`)
    if (filters.rsiMin !== undefined) tags.push(`RSI≥${filters.rsiMin}`)
    if (filters.rsiMax !== undefined) tags.push(`RSI≤${filters.rsiMax}`)
    if (filters.peMin !== undefined) tags.push(`PE≥${filters.peMin}`)
    if (filters.peMax !== undefined) tags.push(`PE≤${filters.peMax}`)
    if (filters.pbMin !== undefined) tags.push(`PB≥${filters.pbMin}`)
    if (filters.pbMax !== undefined) tags.push(`PB≤${filters.pbMax}`)
    if (filters.roeMin !== undefined) tags.push(`ROE≥${filters.roeMin}%`)
    if (filters.priceMin !== undefined) tags.push(`价格≥${filters.priceMin}`)
    if (filters.priceMax !== undefined) tags.push(`价格≤${filters.priceMax}`)
    if (filters.changeMin !== undefined) tags.push(`涨幅≥${filters.changeMin}%`)
    if (filters.changeMax !== undefined) tags.push(`涨幅≤${filters.changeMax}%`)
    if (filters.turnoverMin !== undefined) tags.push(`换手≥${filters.turnoverMin}%`)
    if (filters.turnoverMax !== undefined) tags.push(`换手≤${filters.turnoverMax}%`)
    if (filters.capMin !== undefined) tags.push(`市值≥${filters.capMin}亿`)
    if (filters.capMax !== undefined) tags.push(`市值≤${filters.capMax}亿`)
    if (filters.amplitudeMin !== undefined) tags.push(`振幅≥${filters.amplitudeMin}%`)
    if (filters.amplitudeMax !== undefined) tags.push(`振幅≤${filters.amplitudeMax}%`)
    if (filters.vratioMin !== undefined) tags.push(`量比≥${filters.vratioMin}`)
    if (filters.vratioMax !== undefined) tags.push(`量比≤${filters.vratioMax}`)
    if (filters.streakMin !== undefined) tags.push(`连涨≥${filters.streakMin}天`)
    if (filters.streakMax !== undefined) tags.push(`连涨≤${filters.streakMax}天`)
    if (filters.revGrowthMin !== undefined) tags.push(`营收增速≥${filters.revGrowthMin}%`)
    if (filters.revGrowthMax !== undefined) tags.push(`营收增速≤${filters.revGrowthMax}%`)
    if (filters.profitGrowthMin !== undefined) tags.push(`净利润增速≥${filters.profitGrowthMin}%`)
    if (filters.profitGrowthMax !== undefined) tags.push(`净利润增速≤${filters.profitGrowthMax}%`)
    return tags
  }, [filters])

  // ── Actions ───────────────────────────────────────
  function handleApplyStrategy(strategy: PresetStrategy) {
    setActiveStrategy(strategy.id)
    setFilters(applyStrategyFilters(strategy))
    setHasRun(true)
  }

  function handleApply() {
    setHasRun(true)
  }

  function handleReset() {
    setActiveStrategy(null)
    setFilters({})
    setHasRun(false)
  }

  function toggleStar(code: string) {
    setStarredStocks((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  // ── Determine displayed stocks ───────────────────
  const displayedStocks = useMemo(() => {
    if (!hasRun || (!hasActiveFilters(filters) && !activeStrategy)) {
      return []
    }
    return results
  }, [results, hasRun, filters, activeStrategy])

  // ── Loading ──────────────────────────────────────
  if (loading) return <div className="panel-loading" style={{ padding: 40, textAlign: 'center', color: '#888' }}>加载选股数据中...</div>

  // ── Render ───────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ====== Panel Header ====== */}
      <div className="panel-header">
        <div>
          <div className="panel-title">选股器</div>
          <div className="panel-subtitle">综合条件筛选 · 技术面 + 基本面 + 行情特征</div>
        </div>
      </div>

      <div className="screener-layout">
        {/* ====== Strategy Bar ====== */}
        <div className="strategy-bar">
          <span className="strategy-bar-label">快捷策略</span>
          {strategies.map((s) => (
            <div
              key={s.id}
              className={'strategy-chip' + (activeStrategy === s.id ? ' active' : '')}
              onClick={() => handleApplyStrategy(s)}
              title={s.desc}
            >
              {s.name}
            </div>
          ))}
        </div>

        {/* ====== Screener Body ====== */}
        <div className="screener-body">
          {/* ── Filter Panel ── */}
          <div className="filter-panel">
            <div className="filter-panel-header">
              <div className="tab-group">
                <button
                  className={'tab-btn' + (activeFilterTab === 'tech' ? ' active' : '')}
                  onClick={() => setActiveFilterTab('tech')}
                >
                  技术指标
                </button>
                <button
                  className={'tab-btn' + (activeFilterTab === 'fund' ? ' active' : '')}
                  onClick={() => setActiveFilterTab('fund')}
                >
                  基本面
                </button>
                <button
                  className={'tab-btn' + (activeFilterTab === 'market' ? ' active' : '')}
                  onClick={() => setActiveFilterTab('market')}
                >
                  行情特征
                </button>
              </div>
            </div>

            <div className="filter-panel-body">
              {/* ── Tab 1: 技术指标 ── */}
              <div className={'filter-tab-content' + (activeFilterTab === 'tech' ? ' active' : '')}>
                {/* MACD */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>MACD 状态</span>
                    <span className="filter-value">
                      {filters.macd
                        ? ({ goldenCross: '金叉', deadCross: '死叉', positive: '正值', negative: '负值' } as Record<string, string>)[filters.macd] ?? '不限'
                        : '不限'}
                    </span>
                  </div>
                  <select
                    className="filter-select"
                    value={filters.macd ?? ''}
                    onChange={(e) => updFilter('macd', (e.target.value || undefined) as ScreenerFilters['macd'])}
                  >
                    <option value="">不限</option>
                    <option value="goldenCross">金叉（DIF上穿DEA）</option>
                    <option value="deadCross">死叉（DIF下穿DEA）</option>
                    <option value="positive">正值（DIF&gt;0）</option>
                    <option value="negative">负值（DIF&lt;0）</option>
                  </select>
                </div>

                {/* KDJ */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>KDJ 状态</span>
                    <span className="filter-value">
                      {filters.kdj
                        ? ({ goldenCross: '金叉', deadCross: '死叉', overbought: '超买', oversold: '超卖' } as Record<string, string>)[filters.kdj] ?? '不限'
                        : '不限'}
                    </span>
                  </div>
                  <select
                    className="filter-select"
                    value={filters.kdj ?? ''}
                    onChange={(e) => updFilter('kdj', (e.target.value || undefined) as ScreenerFilters['kdj'])}
                  >
                    <option value="">不限</option>
                    <option value="goldenCross">金叉</option>
                    <option value="deadCross">死叉</option>
                    <option value="overbought">超买（K&gt;80）</option>
                    <option value="oversold">超卖（K&lt;20）</option>
                  </select>
                </div>

                {/* MA */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>MA 均线状态</span>
                    <span className="filter-value">
                      {filters.ma
                        ? ({ aboveAll: '站上所有均线', belowAll: '跌破所有均线', support: '获支撑', pressure: '受压' } as Record<string, string>)[filters.ma] ?? '不限'
                        : '不限'}
                    </span>
                  </div>
                  <select
                    className="filter-select"
                    value={filters.ma ?? ''}
                    onChange={(e) => updFilter('ma', (e.target.value || undefined) as ScreenerFilters['ma'])}
                  >
                    <option value="">不限</option>
                    <option value="aboveAll">站上所有均线</option>
                    <option value="belowAll">跌破所有均线</option>
                    <option value="support">获均线支撑</option>
                    <option value="pressure">受均线压制</option>
                  </select>
                </div>

                {/* RSI Range */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>RSI 范围</span>
                    <span className="filter-value">
                      {filters.rsiMin !== undefined || filters.rsiMax !== undefined
                        ? `${filters.rsiMin ?? '0'} - ${filters.rsiMax ?? '100'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最小值"
                      value={filters.rsiMin ?? ''}
                      onChange={(e) => updFilter('rsiMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最大值"
                      value={filters.rsiMax ?? ''}
                      onChange={(e) => updFilter('rsiMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* Volume Ratio (量比) */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>量比</span>
                    <span className="filter-value">
                      {filters.vratioMin !== undefined || filters.vratioMax !== undefined
                        ? `${filters.vratioMin ?? '0'} - ${filters.vratioMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.vratioMin ?? ''}
                      onChange={(e) => updFilter('vratioMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.vratioMax ?? ''}
                      onChange={(e) => updFilter('vratioMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* BOLL */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>布林带</span>
                    <span className="filter-value">不限</span>
                  </div>
                  <select
                    className="filter-select"
                    value=""
                    disabled
                  >
                    <option value="">不限</option>
                    <option value="upper">突破上轨</option>
                    <option value="lower">跌破下轨</option>
                  </select>
                </div>
              </div>

              {/* ── Tab 2: 基本面 ── */}
              <div className={'filter-tab-content' + (activeFilterTab === 'fund' ? ' active' : '')}>
                {/* PE */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>市盈率 (PE)</span>
                    <span className="filter-value">
                      {filters.peMin !== undefined || filters.peMax !== undefined
                        ? `${filters.peMin ?? '0'} - ${filters.peMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      value={filters.peMin ?? ''}
                      onChange={(e) => updFilter('peMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      value={filters.peMax ?? ''}
                      onChange={(e) => updFilter('peMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* PB */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>市净率 (PB)</span>
                    <span className="filter-value">
                      {filters.pbMin !== undefined || filters.pbMax !== undefined
                        ? `${filters.pbMin ?? '0'} - ${filters.pbMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.pbMin ?? ''}
                      onChange={(e) => updFilter('pbMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.pbMax ?? ''}
                      onChange={(e) => updFilter('pbMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 总市值 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>总市值 (亿)</span>
                    <span className="filter-value">
                      {filters.capMin !== undefined || filters.capMax !== undefined
                        ? `${filters.capMin ?? '0'} - ${filters.capMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      value={filters.capMin ?? ''}
                      onChange={(e) => updFilter('capMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      value={filters.capMax ?? ''}
                      onChange={(e) => updFilter('capMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 营收增速 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>营收增速 (%)</span>
                    <span className="filter-value">
                      {filters.revGrowthMin !== undefined || filters.revGrowthMax !== undefined
                        ? `${filters.revGrowthMin ?? '不限'} - ${filters.revGrowthMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.revGrowthMin ?? ''}
                      onChange={(e) => updFilter('revGrowthMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.revGrowthMax ?? ''}
                      onChange={(e) => updFilter('revGrowthMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* ROE */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>ROE (%)</span>
                    <span className="filter-value">
                      {filters.roeMin !== undefined || filters.roeMax !== undefined
                        ? `${filters.roeMin ?? '0'} - ${filters.roeMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.roeMin ?? ''}
                      onChange={(e) => updFilter('roeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.roeMax ?? ''}
                      onChange={(e) => updFilter('roeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 净利润增速 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>净利润增速 (%)</span>
                    <span className="filter-value">
                      {filters.profitGrowthMin !== undefined || filters.profitGrowthMax !== undefined
                        ? `${filters.profitGrowthMin ?? '不限'} - ${filters.profitGrowthMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.profitGrowthMin ?? ''}
                      onChange={(e) => updFilter('profitGrowthMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.profitGrowthMax ?? ''}
                      onChange={(e) => updFilter('profitGrowthMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>

              {/* ── Tab 3: 行情特征 ── */}
              <div className={'filter-tab-content' + (activeFilterTab === 'market' ? ' active' : '')}>
                {/* 涨跌幅 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>涨跌幅 (%)</span>
                    <span className="filter-value">
                      {filters.changeMin !== undefined || filters.changeMax !== undefined
                        ? `${filters.changeMin ?? '不限'} - ${filters.changeMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.changeMin ?? ''}
                      onChange={(e) => updFilter('changeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.changeMax ?? ''}
                      onChange={(e) => updFilter('changeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 换手率 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>换手率 (%)</span>
                    <span className="filter-value">
                      {filters.turnoverMin !== undefined || filters.turnoverMax !== undefined
                        ? `${filters.turnoverMin ?? '0'} - ${filters.turnoverMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.turnoverMin ?? ''}
                      onChange={(e) => updFilter('turnoverMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.turnoverMax ?? ''}
                      onChange={(e) => updFilter('turnoverMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 振幅 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>振幅 (%)</span>
                    <span className="filter-value">
                      {filters.amplitudeMin !== undefined || filters.amplitudeMax !== undefined
                        ? `${filters.amplitudeMin ?? '0'} - ${filters.amplitudeMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.1"
                      value={filters.amplitudeMin ?? ''}
                      onChange={(e) => updFilter('amplitudeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.1"
                      value={filters.amplitudeMax ?? ''}
                      onChange={(e) => updFilter('amplitudeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 连涨天数 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>连涨天数</span>
                    <span className="filter-value">
                      {filters.streakMin !== undefined || filters.streakMax !== undefined
                        ? `${filters.streakMin ?? '0'} - ${filters.streakMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      value={filters.streakMin ?? ''}
                      onChange={(e) => updFilter('streakMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      value={filters.streakMax ?? ''}
                      onChange={(e) => updFilter('streakMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* 价格 */}
                <div className="filter-group">
                  <div className="filter-label">
                    <span>价格 (元)</span>
                    <span className="filter-value">
                      {filters.priceMin !== undefined || filters.priceMax !== undefined
                        ? `${filters.priceMin ?? '0'} - ${filters.priceMax ?? '不限'}`
                        : '不限'}
                    </span>
                  </div>
                  <div className="filter-range-row">
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最低"
                      step="0.01"
                      value={filters.priceMin ?? ''}
                      onChange={(e) => updFilter('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="filter-range-sep">~</span>
                    <input
                      className="filter-range-input"
                      type="number"
                      placeholder="最高"
                      step="0.01"
                      value={filters.priceMax ?? ''}
                      onChange={(e) => updFilter('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-footer">
              <button className="filter-reset-btn" onClick={handleReset}>
                重置条件
              </button>
              <button className="filter-apply-btn" onClick={handleApply}>
                开始筛选
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <div className="screener-results">
            <div className="results-header">
              <span className="results-count">
                {hasRun && (hasActiveFilters(filters) || activeStrategy)
                  ? <>筛选结果: <em>{displayedStocks.length}</em> 只符合条件的股票</>
                  : '请选择筛选条件后点击「开始筛选」'}
              </span>
              <div className="results-tags">
                {activeStrategy && (
                  <span className="result-tag">
                    策略: {strategies.find((s) => s.id === activeStrategy)?.name}
                  </span>
                )}
                {activeTags.slice(0, 6).map((tag) => (
                  <span key={tag} className="result-tag">{tag}</span>
                ))}
                {activeTags.length > 6 && (
                  <span className="result-tag">+{activeTags.length - 6}</span>
                )}
              </div>
            </div>

            <div className="results-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: 32 }}></th>
                    <th style={{ textAlign: 'left' }}>股票</th>
                    <th>现价</th>
                    <th>涨跌幅</th>
                    <th>市值(亿)</th>
                    <th>市盈率</th>
                    <th>换手率</th>
                    <th>匹配条件</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStocks.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--fg-muted)' }}>
                        {hasRun && (hasActiveFilters(filters) || activeStrategy)
                          ? '没有符合筛选条件的股票'
                          : '请设置筛选条件后点击「开始筛选」'}
                      </td>
                    </tr>
                  ) : (
                    displayedStocks.map((stock) => {
                      const isUp = stock.change > 0
                      const isDown = stock.change < 0
                      const changeClass = isUp ? 'text-rise' : isDown ? 'text-fall' : 'text-flat'

                      // Count matching conditions
                      let matchCount = 0
                      if (filters.macd) matchCount++
                      if (filters.kdj) matchCount++
                      if (filters.ma) matchCount++
                      if (filters.rsiMin !== undefined || filters.rsiMax !== undefined) matchCount++
                      if (filters.peMin !== undefined || filters.peMax !== undefined) matchCount++
                      if (filters.pbMin !== undefined || filters.pbMax !== undefined) matchCount++
                      if (filters.roeMin !== undefined || filters.roeMax !== undefined) matchCount++
                      if (filters.priceMin !== undefined || filters.priceMax !== undefined) matchCount++
                      if (filters.changeMin !== undefined || filters.changeMax !== undefined) matchCount++
                      if (filters.turnoverMin !== undefined || filters.turnoverMax !== undefined) matchCount++
                      if (filters.capMin !== undefined || filters.capMax !== undefined) matchCount++

                      return (
                        <tr key={stock.code}>
                          <td>
                            <button
                              className={'star-btn' + (starredStocks.has(stock.code) ? ' starred' : '')}
                              onClick={() => toggleStar(stock.code)}
                            >
                              <StarSvg filled={starredStocks.has(stock.code)} />
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{stock.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-dim)' }}>{stock.code}</span>
                            </div>
                          </td>
                          <td className="text-mono">{stock.price.toFixed(2)}</td>
                          <td className={'text-mono ' + changeClass}>
                            {isUp ? '+' : ''}{stock.change.toFixed(2)}%
                          </td>
                          <td className="text-mono text-muted">{fmtNum(stock.cap * 10000)}</td>
                          <td className="text-mono text-muted">{stock.pe.toFixed(1)}</td>
                          <td className="text-mono text-muted">{stock.turnover}%</td>
                          <td className="text-mono text-muted">
                            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{matchCount}</span> 项
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
