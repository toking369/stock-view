# Real Data API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data with real East Money API data, connecting 7 dashboard panels + auth through Next.js API routes.

**Architecture:** Panel → `lib/api.ts` (fetch) → Next.js API Route (server-side) → `EastMoneyService` → East Money public API. Server-side caching via LRU MemoryCache with per-type TTL (10s/30s/60s). Simple token auth for login.

**Tech Stack:** Next.js 16 Route Handlers, Node.js built-in fetch, MemoryCache LRU

---

### Task 1: Implement EastMoneyService

**Files:**
- Rewrite: `src/lib/services/eastmoney.ts`

Core service that wraps East Money public APIs. Each method fetches raw data and transforms it to our TypeScript types.

```typescript
/**
 * EastMoney API service — real HTTP implementation
 */
import type { Stock, Index, KLineDataPoint, Sector, CapitalFlow, LHBRecord, LHBInstitution, LimitUpStock } from '@/types'

// ========== API Endpoints ==========
const API = {
  QUOTE: 'https://push2.eastmoney.com/api/qt/ulist.np/get',
  CLIST: 'https://push2.eastmoney.com/api/qt/clist/get',
  KLINE: 'https://push2his.eastmoney.com/api/qt/stock/kline/get',
  FFLOW: 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get',
  DATACENTER: 'https://datacenter-web.eastmoney.com/api/data/v1/get',
  SEARCH: 'https://searchadapter.eastmoney.com/api/suggest/get',
} as const

const UT = 'b2884a393a59ad64002292a3e90d46a5'
const QUOTE_FIELDS = 'f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f37,f38,f39,f40,f41,f45,f46,f48,f50,f57,f58,f60,f62,f115,f128,f140,f136,f152,f170'
const SECTOR_FIELDS = 'f2,f3,f4,f12,f14,f15,f16,f17,f18,f20,f21,f24,f25,f62,f66,f69,f72,f75,f78,f81,f84,f87,f184,f204,f205,f124'
const CLIST_FIELDS = 'f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f37,f38,f39,f40,f41,f45,f46,f48,f50,f57,f58,f60,f62,f115,f128,f140,f152,f170,f100,f108,f115,f121,f122,f125,f161,f162,f167,f168,f169,f170'

/**
 * Fetch JSONP from East Money and extract JSON
 * East Money wraps responses in jQuery callback: jQuery183(...)({...})
 */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const text = await res.text()
  // Handle JSONP: jQuery183...( { ... } )
  const match = text.match(/\(({.+})\)\s*$/s) || text.match(/\((\[.+])\)\s*$/s)
  const raw = match?.[1] || text
  return JSON.parse(raw)
}

/** Build secid: 6xxxxx → 1.xxxxxx, 0xxxxx/3xxxxx → 0.xxxxxx */
function codeToSecid(code: string): string {
  const market = code.startsWith('6') ? '1' : '0'
  return `${market}.${code}`
}

/** Parse quote fields from EastMoney diff item into partial Stock */
function parseQuote(item: Record<string, any>): Stock {
  const open = item.f17 ?? 0
  const close = item.f2 ?? 0
  const high = item.f15 ?? 0
  const low = item.f16 ?? 0
  const prevClose = item.f18 ?? 0
  const change = item.f3 ?? 0
  const changeAmount = item.f4 ?? 0
  return {
    code: String(item.f12 ?? ''),
    name: String(item.f14 ?? ''),
    price: close,
    change,
    changeAmount: +(changeAmount ?? 0),
    vol: item.f5 ?? 0,
    amount: Math.round((item.f6 ?? 0) / 10000),
    turnover: item.f7 ?? 0,
    pe: item.f8 ?? 0,
    amplitude: item.f37 ?? 0,
    open,
    high,
    low,
    prevClose,
    volumeRatio: item.f10 ?? 0,
    outerVol: item.f39 ?? 0,
    innerVol: item.f40 ?? 0,
  }
}

export class EastMoneyService {
  /**
   * Fetch batch quotes by stock codes
   */
  async fetchQuotes(codes: string[]): Promise<Stock[]> {
    if (!codes.length) return []
    const secids = codes.map(codeToSecid).join(',')
    const url = `${API.QUOTE}?fltt=2&fields=${QUOTE_FIELDS}&secids=${secids}&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const items: any[] = data?.data?.diff ?? []
    return items.filter(Boolean).map(parseQuote)
  }

  /**
   * Fetch index quotes (上证, 深证, 创业板, 科创50)
   */
  async fetchIndices(): Promise<Index[]> {
    const codes = ['1.000001', '0.399001', '0.399006', '1.000688']
    const url = `${API.QUOTE}?fltt=2&fields=f2,f3,f4,f12,f14&secids=${codes.join(',')}&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const items: any[] = data?.data?.diff ?? []
    return items.filter(Boolean).map((item: any) => ({
      code: String(item.f12 ?? ''),
      name: String(item.f14 ?? ''),
      price: item.f2 ?? 0,
      change: item.f3 ?? 0,
      changeAmount: item.f4 ?? 0,
    }))
  }

  /**
   * Fetch K-line data
   * period: day → klt=101, week → 102, month → 103
   */
  async fetchKline(code: string, days: number = 120, period: string = 'day'): Promise<KLineDataPoint[]> {
    const secid = codeToSecid(code)
    const periodMap: Record<string, string> = { day: '101', week: '102', month: '103', '60': '60', '30': '30', '15': '15' }
    const klt = periodMap[period] || '101'
    const url = `${API.KLINE}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&lmt=${days}&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const klines: string[] = data?.data?.klines ?? []
    return klines.map((line: string) => {
      const parts = line.split(',')
      return {
        date: parts[0] || '',
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        vol: parseInt(parts[5]) || 0,
      }
    })
  }

  /**
   * Fetch sector (板块) data
   * type: 'industry' (行业) or 'concept' (概念)
   */
  async fetchSectors(type: 'industry' | 'concept' = 'industry', count: number = 30): Promise<Sector[]> {
    const typeMap = { industry: 'm:90+t:2', concept: 'm:90+t:3' }
    const url = `${API.CLIST}?pn=1&pz=${count}&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${typeMap[type]}&fields=${SECTOR_FIELDS}&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const items: any[] = data?.data?.diff ?? []
    return items.filter(Boolean).slice(0, count).map((item: any) => ({
      name: String(item.f14 ?? ''),
      change: item.f3 ?? 0,
      volume: Math.round((item.f6 ?? 0) / 100000000), // 成交额(亿)
    }))
  }

  /**
   * Fetch fund flow ranking (资金流向排行)
   */
  async fetchCapitalFlowRanking(count: number = 10): Promise<CapitalFlow[]> {
    const url = `${API.CLIST}?pn=1&pz=${count}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const items: any[] = data?.data?.diff ?? []
    return items.filter(Boolean).slice(0, count).map((item: any) => {
      const inflow = Math.abs(item.f62 ?? 0)
      const net = item.f62 ?? 0
      return {
        code: String(item.f12 ?? ''),
        name: String(item.f14 ?? ''),
        price: item.f2 ?? 0,
        change: item.f3 ?? 0,
        inflow: Math.round(inflow / 10000),
        outflow: Math.round(Math.max(0, inflow - net) / 10000),
        net: Math.round(net / 10000),
        ratio: item.f184 ?? 0,
      }
    })
  }

  /**
   * Fetch individual stock fund flow (个股资金流向)
   */
  async fetchCapitalFlow(code: string): Promise<CapitalFlow | null> {
    const secid = codeToSecid(code)
    const url = `${API.FFLOW}?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63&lmt=1&klt=101&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const klines: string[] = data?.data?.klines ?? []
    if (!klines.length) return null
    const parts = klines[0].split(',')
    const mainForce = parseFloat(parts[1]) || 0 // 主力净流入
    return {
      code,
      name: data?.data?.f3 ?? '',
      price: parseFloat(parts[11]) || 0,
      change: parseFloat(parts[12]) || 0,
      inflow: Math.round(Math.max(0, mainForce) / 10000),
      outflow: Math.round(Math.max(0, -mainForce) / 10000),
      net: Math.round(mainForce / 10000),
      ratio: parseFloat(parts[6]) || 0,
    }
  }

  /**
   * Fetch LHB (龙虎榜) data from datacenter
   */
  async fetchLHB(): Promise<{ lhb: LHBRecord[]; institutions: LHBInstitution[]; limitUp: LimitUpStock[] }> {
    const today = new Date().toISOString().slice(0, 10)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const filter = encodeURIComponent(`(TRADE_DATE>='${sevenDaysAgo}')(TRADE_DATE<='${today}')`)

    // Fetch billboard (龙虎榜上榜)
    const url = `${API.DATACENTER}?sortColumns=TRADE_DATE&sortTypes=-1&pageSize=50&pageNumber=1&reportName=RPT_BILLBOARD_STATISTICS&columns=ALL&source=WEB&client=WEB&filter=${filter}`
    const data = await fetchJSON<any>(url)
    const list: any[] = data?.result?.data ?? []

    const lhb: LHBRecord[] = []
    const limitUpMap = new Map<string, { days: number; sealRate: number; sector: string }>()

    for (const item of list) {
      const code = String(item.SECURITY_CODE ?? '')
      const name = String(item.SECURITY_NAME_ABBR ?? '')
      const buy = Math.round((item.BUY_AMT ?? 0) / 10000)
      const sell = Math.round((item.SELL_AMT ?? 0) / 10000)
      lhb.push({
        code, name,
        price: item.CLOSE_PRICE ?? 0,
        change: item.CHANGE_RATE ?? 0,
        buy, sell,
        net: Math.round((item.NET_BUY_AMT ?? 0) / 10000),
      })
      // Track limit-up stocks
      if ((item.CHANGE_RATE ?? 0) >= 9.8 && !limitUpMap.has(code)) {
        limitUpMap.set(code, { days: 1, sealRate: 0.8, sector: '' })
      }
    }

    return {
      lhb: lhb.slice(0, 20),
      institutions: [],
      limitUp: Array.from(limitUpMap.entries()).slice(0, 10).map(([code, v]) => ({
        name: lhb.find(r => r.code === code)?.name ?? '',
        code, ...v,
      })),
    }
  }

  /**
   * Search stocks by keyword
   */
  async searchStocks(query: string): Promise<Pick<Stock, 'code' | 'name'>[]> {
    if (!query.trim()) return []
    const url = `${API.SEARCH}?type=3&keyword=${encodeURIComponent(query)}`
    const data = await fetchJSON<any>(url)
    const items: any[] = data?.data ?? []
    return items.filter((i: any) => i.Type === '3').slice(0, 10).map((item: any) => ({
      code: String(item.Code ?? ''),
      name: String(item.Name ?? ''),
    }))
  }

  /**
   * Fetch all A-share stocks for screener
   */
  async fetchAllStocks(count: number = 500): Promise<any[]> {
    const url = `${API.CLIST}?pn=1&pz=${count}&po=0&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:1+t:2&fields=${CLIST_FIELDS}&ut=${UT}`
    const data = await fetchJSON<any>(url)
    const items: any[] = data?.data?.diff ?? []
    return items.filter(Boolean).slice(0, count).map(parseQuote)
  }
}

export const eastMoney = new EastMoneyService()
```

- [ ] **Step 1: Write the complete EastMoneyService** as shown above

- [ ] **Step 2: Verify it compiles**

Run: `cd nextjs-app && npx tsc --noEmit src/lib/services/eastmoney.ts`
Expected: No type errors (may need to adjust strict typing)

- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/lib/services/eastmoney.ts
git commit -m "feat: implement EastMoneyService with real API integration"
```

---

### Task 2: Add Cache Instances

**Files:**
- Modify: `src/lib/cache/index.ts`

Add additional cache instances for different TTLs used by API routes.

```typescript
// Add at the end of cache/index.ts:
export const indexCache = new MemoryCache(100, 10_000)    // 10s TTL for indices
export const quoteCache = new MemoryCache(500, 10_000)    // 10s TTL for quotes
export const sectorCache = new MemoryCache(200, 30_000)   // 30s TTL for sectors
export const flowCache = new MemoryCache(200, 30_000)     // 30s TTL for capital flow
export const lhbCache = new MemoryCache(100, 60_000)      // 60s TTL for LHB
export const screenerCache = new MemoryCache(100, 60_000) // 60s TTL for screener
```

- [ ] **Step 1: Add cache instances** to `src/lib/cache/index.ts`

- [ ] **Step 2: Commit**

```bash
git add nextjs-app/src/lib/cache/index.ts
git commit -m "feat: add cache instances for different data types"
```

---

### Task 3: Create API Routes — Indices & Quotes

**Files:**
- Create: `src/app/api/market/indices/route.ts`
- Create: `src/app/api/market/quotes/route.ts`

**`src/app/api/market/indices/route.ts`:**

```typescript
import { NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { indexCache } from '@/lib/cache'

export async function GET() {
  try {
    const cached = indexCache.get('indices')
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchIndices()
    indexCache.set('indices', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch indices:', error)
    return NextResponse.json({ error: '获取指数数据失败' }, { status: 502 })
  }
}
```

**`src/app/api/market/quotes/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { quoteCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const codes = (req.nextUrl.searchParams.get('codes') || '').split(',').filter(Boolean)
    if (!codes.length) return NextResponse.json({ error: '缺少 codes 参数' }, { status: 400 })

    const cacheKey = `quotes:${codes.sort().join(',')}`
    const cached = quoteCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchQuotes(codes)
    quoteCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch quotes:', error)
    return NextResponse.json({ error: '获取行情数据失败' }, { status: 502 })
  }
}
```

- [ ] **Step 1: Create** `src/app/api/market/indices/route.ts`
- [ ] **Step 2: Create** `src/app/api/market/quotes/route.ts`
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/app/api/market/indices/route.ts nextjs-app/src/app/api/market/quotes/route.ts
git commit -m "feat: add indices and quotes API routes"
```

---

### Task 4: Create API Routes — Kline & Sectors

**Files:**
- Create: `src/app/api/market/kline/route.ts`
- Create: `src/app/api/market/sectors/route.ts`

**`src/app/api/market/kline/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { klineCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code') || '600519'
    const days = parseInt(req.nextUrl.searchParams.get('days') || '120')
    const period = req.nextUrl.searchParams.get('period') || 'day'
    const cacheKey = `kline:${code}:${days}:${period}`
    
    const cached = klineCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchKline(code, days, period)
    klineCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch kline:', error)
    return NextResponse.json({ error: '获取K线数据失败' }, { status: 502 })
  }
}
```

**`src/app/api/market/sectors/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { sectorCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const type = (req.nextUrl.searchParams.get('type') || 'industry') as 'industry' | 'concept'
    const count = parseInt(req.nextUrl.searchParams.get('count') || '30')
    const cacheKey = `sectors:${type}:${count}`

    const cached = sectorCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchSectors(type, count)
    sectorCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch sectors:', error)
    return NextResponse.json({ error: '获取板块数据失败' }, { status: 502 })
  }
}
```

- [ ] **Step 1: Create** `src/app/api/market/kline/route.ts`
- [ ] **Step 2: Create** `src/app/api/market/sectors/route.ts`
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/app/api/market/kline/route.ts nextjs-app/src/app/api/market/sectors/route.ts
git commit -m "feat: add kline and sectors API routes"
```

---

### Task 5: Create API Routes — Flow & LHB

**Files:**
- Create: `src/app/api/market/flow/route.ts`
- Create: `src/app/api/market/lhb/route.ts`

**`src/app/api/market/flow/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { flowCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (code) {
      // Individual stock flow
      const data = await eastMoney.fetchCapitalFlow(code)
      if (!data) return NextResponse.json({ error: '未找到资金流向数据' }, { status: 404 })
      return NextResponse.json(data)
    }
    // Ranking by default
    const count = parseInt(req.nextUrl.searchParams.get('count') || '10')
    const cacheKey = `flow-ranking:${count}`
    const cached = flowCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchCapitalFlowRanking(count)
    flowCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch capital flow:', error)
    return NextResponse.json({ error: '获取资金流向数据失败' }, { status: 502 })
  }
}
```

**`src/app/api/market/lhb/route.ts`:**

```typescript
import { NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { lhbCache } from '@/lib/cache'

export async function GET() {
  try {
    const cached = lhbCache.get('lhb')
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchLHB()
    lhbCache.set('lhb', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch LHB:', error)
    return NextResponse.json({ error: '获取龙虎榜数据失败' }, { status: 502 })
  }
}
```

- [ ] **Step 1: Create** `src/app/api/market/flow/route.ts`
- [ ] **Step 2: Create** `src/app/api/market/lhb/route.ts`
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/app/api/market/flow/route.ts nextjs-app/src/app/api/market/lhb/route.ts
git commit -m "feat: add capital flow and LHB API routes"
```

---

### Task 6: Create API Routes — Search, Screener & Strategies

**Files:**
- Create: `src/app/api/market/search/route.ts`
- Create: `src/app/api/screener/pool/route.ts`
- Create: `src/app/api/screener/strategies/route.ts`

**`src/app/api/market/search/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || ''
    if (!q.trim()) return NextResponse.json([])

    const data = await eastMoney.searchStocks(q)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to search stocks:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 502 })
  }
}
```

**`src/app/api/screener/pool/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eastMoney } from '@/lib/services/eastmoney'
import { screenerCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const count = parseInt(req.nextUrl.searchParams.get('count') || '500')
    const cacheKey = `screener-pool:${count}`
    const cached = screenerCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await eastMoney.fetchAllStocks(count)
    screenerCache.set(cacheKey, data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch screener pool:', error)
    return NextResponse.json({ error: '获取选股数据失败' }, { status: 502 })
  }
}
```

**`src/app/api/screener/strategies/route.ts`:**

```typescript
import { NextResponse } from 'next/server'
import type { PresetStrategy } from '@/types'

const presetStrategies: PresetStrategy[] = [
  { id: 'strategy1', name: '放量突破', desc: '成交量放大 + 价格突破均线', filters: { ma: 'aboveAll', vratioMin: '1.5' }, tags: ['技术面', '短线'] },
  { id: 'strategy2', name: 'MACD金叉', desc: 'MACD DIF上穿DEA', filters: { macd: 'goldenCross' }, tags: ['技术面', '中线'] },
  { id: 'strategy3', name: '超跌反弹', desc: 'RSI超卖 + 跌幅过大', filters: { rsiMax: '30', changeMax: '-5' }, tags: ['技术面', '短线'] },
  { id: 'strategy4', name: 'KDJ超卖', desc: 'KDJ低于20', filters: { kdj: 'oversold' }, tags: ['技术面', '短线'] },
  { id: 'strategy5', name: '价值投资', desc: '低PE + 高ROE', filters: { peMax: '15', roeMin: '15' }, tags: ['基本面', '长线'] },
  { id: 'strategy6', name: '业绩增长', desc: '营收利润双增长', filters: { revGrowthMin: '10', profitGrowthMin: '20' }, tags: ['基本面', '中线'] },
  { id: 'strategy7', name: '小盘成长', desc: '小市值 + 高成长', filters: { capMax: '100', revGrowthMin: '20' }, tags: ['基本面', '短线'] },
  { id: 'strategy8', name: '布林带突破', desc: '价格突破布林带上轨', filters: { boll: 'up' }, tags: ['技术面', '短线'] },
]

export async function GET() {
  return NextResponse.json(presetStrategies)
}
```

- [ ] **Step 1: Create** `src/app/api/market/search/route.ts`
- [ ] **Step 2: Create** `src/app/api/screener/pool/route.ts`
- [ ] **Step 3: Create** `src/app/api/screener/strategies/route.ts`
- [ ] **Step 4: Create** `src/app/api/screener/` directory (mkdir if needed)
- [ ] **Step 5: Commit**

```bash
git add nextjs-app/src/app/api/market/search/route.ts nextjs-app/src/app/api/screener/
git commit -m "feat: add search, screener pool and strategies API routes"
```

---

### Task 7: Create Auth API Routes

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Delete: `src/app/api/auth/route.ts`

**`src/app/api/auth/login/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
    }
    const user = db.findUserByPhone(phone)
    if (!user || user.password !== password) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
    }
    const token = `stk-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    // Store token-to-user mapping in a simple Map (on db or in-memory)
    // For demo, we use a simple approach: token is stored in db module
    return NextResponse.json({
      token,
      user: { phone: user.phone, name: user.name, watchlist: user.watchlist },
    })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
```

**`src/app/api/auth/register/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, password, name } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度不少于6位' }, { status: 400 })
    }
    const existing = db.findUserByPhone(phone)
    if (existing) {
      return NextResponse.json({ error: '该手机号已注册' }, { status: 409 })
    }
    const user = db.createUser(phone, password, name)
    const token = `stk-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return NextResponse.json({
      token,
      user: { phone: user.phone, name: user.name, watchlist: user.watchlist },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
```

**`src/app/api/auth/me/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const phone = db.getPhoneByToken(token)
  if (!phone) {
    return NextResponse.json({ error: 'Token 无效或已过期' }, { status: 401 })
  }
  const user = db.findUserByPhone(phone)
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 })
  }
  return NextResponse.json({
    phone: user.phone,
    name: user.name,
    watchlist: user.watchlist,
  })
}
```

Also need to update `src/lib/db/index.ts` to add token support:

```typescript
// Add to db/index.ts — token store
const tokens = new Map<string, string>() // token → phone

export const db = {
  // ... existing methods ...
  
  createUser(phone: string, password: string, name?: string): StoredUser {
    const user: StoredUser = {
      id: `user-${Date.now()}`,
      phone, password,
      name: name || phone.slice(0, 3) + '***',
      createdAt: Date.now(),
      watchlist: [],
    }
    users.set(phone, user)
    return user
  },
  
  saveToken(token: string, phone: string): void {
    tokens.set(token, phone)
  },
  
  getPhoneByToken(token: string): string | undefined {
    return tokens.get(token)
  },
  
  // ... existing getWatchlist, updateWatchlist ...
}
```

- [ ] **Step 1: Update** `src/lib/db/index.ts` — add token support and `createUser` with `name` param
- [ ] **Step 2: Create** `src/app/api/auth/login/route.ts`
- [ ] **Step 3: Create** `src/app/api/auth/register/route.ts`
- [ ] **Step 4: Create** `src/app/api/auth/me/route.ts`
- [ ] **Step 5: Delete** `src/app/api/auth/route.ts` (old combined auth route)
- [ ] **Step 6: Commit**

```bash
git add nextjs-app/src/lib/db/index.ts nextjs-app/src/app/api/auth/
git rm nextjs-app/src/app/api/auth/route.ts
git commit -m "feat: split auth into login/register/me routes with token support"
```

---

### Task 8: Refactor lib/api.ts — Real Fetch Calls

**Files:**
- Modify: `src/lib/api.ts`

Replace all mock-returning functions with real `fetch` calls to the API routes.

```typescript
/**
 * Data API layer — fetches from backend API routes
 */
import type { Stock, Index, KLineDataPoint, Sector, CapitalFlow, LHBRecord, LHBInstitution, LimitUpStock, ScreenerStock, PresetStrategy } from '@/types'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('stockview_token')
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `请求失败 (${res.status})`)
  }
  return res.json()
}

/** Fetch indices */
export async function fetchIndices(): Promise<Index[]> {
  return apiFetch<Index[]>('/api/market/indices')
}

/** Fetch quotes */
export async function fetchQuotes(codes?: string[]): Promise<Stock[]> {
  const params = codes?.length ? `?codes=${codes.join(',')}` : ''
  return apiFetch<Stock[]>(`/api/market/quotes${params}`)
}

/** Fetch K-line */
export async function fetchKline(code: string, days: number = 120, period: string = 'day'): Promise<KLineDataPoint[]> {
  return apiFetch<KLineDataPoint[]>(`/api/market/kline?code=${code}&days=${days}&period=${period}`)
}

/** Fetch sectors */
export async function fetchSectors(type: string = 'industry', count: number = 30): Promise<Sector[]> {
  return apiFetch<Sector[]>(`/api/market/sectors?type=${type}&count=${count}`)
}

/** Fetch capital flow (ranking or individual) */
export async function fetchCapitalFlow(code?: string, count: number = 10): Promise<CapitalFlow | CapitalFlow[]> {
  if (code) {
    return apiFetch<CapitalFlow>(`/api/market/flow?code=${code}`)
  }
  return apiFetch<CapitalFlow[]>(`/api/market/flow?count=${count}`)
}

/** Fetch capital flow ranking */
export async function fetchCapitalFlowRanking(count: number = 10): Promise<CapitalFlow[]> {
  return apiFetch<CapitalFlow[]>(`/api/market/flow?count=${count}`)
}

/** Fetch LHB data */
export async function fetchLHB(): Promise<{ lhb: LHBRecord[]; institutions: LHBInstitution[]; limitUp: LimitUpStock[] }> {
  return apiFetch('/api/market/lhb')
}

/** Search stocks */
export async function searchStocks(q: string): Promise<Pick<Stock, 'code' | 'name'>[]> {
  return apiFetch(`/api/market/search?q=${encodeURIComponent(q)}`)
}

/** Fetch screener pool */
export async function fetchScreenerPool(): Promise<ScreenerStock[]> {
  return apiFetch<ScreenerStock[]>('/api/screener/pool')
}

/** Fetch preset strategies */
export async function fetchStrategies(): Promise<PresetStrategy[]> {
  return apiFetch<PresetStrategy[]>('/api/screener/strategies')
}

/** Login */
export async function login(phone: string, password: string): Promise<{ token: string; user: any }> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

/** Register */
export async function register(phone: string, password: string, name?: string): Promise<{ token: string; user: any }> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, password, name }),
  })
}

/** Get current user */
export async function fetchMe(): Promise<any> {
  return apiFetch('/api/auth/me')
}
```

- [ ] **Step 1: Rewrite** `src/lib/api.ts` with the complete code above
- [ ] **Step 2: Verify build**

Run: `cd nextjs-app && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/lib/api.ts
git commit -m "feat: refactor api.ts to use real fetch calls"
```

---

### Task 9: Connect Login Page to API

**Files:**
- Modify: `src/app/login/page.tsx`

Replace localStorage-based auth with API calls.

Key changes:
- `handleLogin` calls `login()` from `lib/api.ts`
- `handleRegister` calls `register()` from `lib/api.ts`
- Store token from API response in localStorage
- Add loading states and error display for login/register
- On mount, check existing token via `/api/auth/me`

```tsx
// In handleLogin:
const res = await login(phone, password)
localStorage.setItem('stockview_token', res.token)
localStorage.setItem('stockview_user', JSON.stringify(res.user))
router.push('/dashboard')

// In handleRegister:
const res = await register(phone, password, name)
localStorage.setItem('stockview_token', res.token)
localStorage.setItem('stockview_user', JSON.stringify(res.user))
router.push('/dashboard')
```

- [ ] **Step 1: Read** `src/app/login/page.tsx`
- [ ] **Step 2: Modify** — replace localStorage auth with API calls, add loading/error states
- [ ] **Step 3: Verify build**
- [ ] **Step 4: Commit**

```bash
git add nextjs-app/src/app/login/page.tsx
git commit -m "feat: connect login page to auth API"
```

---

### Task 10: Connect TopBar to Real Index Data

**Files:**
- Modify: `src/components/dashboard/topbar.tsx`

Replace hardcoded index data with API call.

```tsx
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
    fetchIndices()
      .then(setIndices)
      .catch(() => {
        // Fallback: show empty, don't crash the topbar
        setIndices([])
      })
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
        <div className="user-section">
          <div className="user-avatar">U</div>
          <span className="user-name">用户</span>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 1: Rewrite** `src/components/dashboard/topbar.tsx`
- [ ] **Step 2: Commit**

```bash
git add nextjs-app/src/components/dashboard/topbar.tsx
git commit -m "feat: connect TopBar to real index data API"
```

---

### Task 11: Connect WatchlistPanel to API

**Files:**
- Modify: `src/components/dashboard/watchlist-panel.tsx`

Replace direct `watchlistData` import with `fetchQuotes()` API call. Add loading and error states.

- [ ] **Step 1: Read** current `watchlist-panel.tsx`
- [ ] **Step 2: Modify** — add `useEffect` + `fetchQuotes`, loading/error state, remove direct mock import
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/components/dashboard/watchlist-panel.tsx
git commit -m "feat: connect WatchlistPanel to quotes API"
```

---

### Task 12: Connect KlinePanel to API

**Files:**
- Modify: `src/components/dashboard/kline-panel.tsx`

Replace `generateKlineData()` direct import with `fetchKline()` API call. Pass stock code and period parameters.

- [ ] **Step 1: Read** current `kline-panel.tsx`
- [ ] **Step 2: Modify** — replace `generateKlineData(120)` with `fetchKline(code, days, period)`, add loading/error state
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/components/dashboard/kline-panel.tsx
git commit -m "feat: connect KlinePanel to kline API"
```

---

### Task 13: Connect HeatmapPanel to API

**Files:**
- Modify: `src/components/dashboard/heatmap-panel.tsx`

Replace `sectorData` direct import with `fetchSectors()` API call.

- [ ] **Step 1: Read** current `heatmap-panel.tsx`
- [ ] **Step 2: Modify** — add `useEffect` + `fetchSectors`, loading/error state, remove direct mock import
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/components/dashboard/heatmap-panel.tsx
git commit -m "feat: connect HeatmapPanel to sectors API"
```

---

### Task 14: Connect FlowPanel to API

**Files:**
- Modify: `src/components/dashboard/flow-panel.tsx`

Replace `capitalFlowData` direct import with `fetchCapitalFlowRanking()` API call.

- [ ] **Step 1: Read** current `flow-panel.tsx`
- [ ] **Step 2: Modify** — add `useEffect` + `fetchCapitalFlowRanking`, loading/error state, remove direct mock import
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/components/dashboard/flow-panel.tsx
git commit -m "feat: connect FlowPanel to capital flow API"
```

---

### Task 15: Connect LHBPanel to API

**Files:**
- Modify: `src/components/dashboard/lhb-panel.tsx`

Replace `lhbData`, `lhbInstData`, `limitUpList` direct imports with `fetchLHB()` API call.

- [ ] **Step 1: Read** current `lhb-panel.tsx`
- [ ] **Step 2: Modify** — add `useEffect` + `fetchLHB`, loading/error state, remove direct mock imports
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/components/dashboard/lhb-panel.tsx
git commit -m "feat: connect LHBPanel to LHB API"
```

---

### Task 16: Connect ScreenerPanel to API

**Files:**
- Modify: `src/components/dashboard/screener-panel.tsx`

Replace `screenerStockPool` and `presetStrategies` direct imports with `fetchScreenerPool()` and `fetchStrategies()` API calls.

- [ ] **Step 1: Read** current `screener-panel.tsx`
- [ ] **Step 2: Modify** — add `useEffect` for both data sources, loading/error state, remove direct mock imports
- [ ] **Step 3: Commit**

```bash
git add nextjs-app/src/components/dashboard/screener-panel.tsx
git commit -m "feat: connect ScreenerPanel to screener API"
```

---

### Task 17: Connect AIChatPanel (keep current logic)

**Files:**
- Modify: `src/components/dashboard/aichat-panel.tsx`

AI Chat currently uses `ai-engine.ts` directly (local rule-based engine). This is fine for Step 1 — no API changes needed. Just ensure it still works with the refactored code.

- [ ] **Step 1: Verify** `aichat-panel.tsx` doesn't import from `mock-data.ts` (it shouldn't — it uses `ai-engine.ts`)
- [ ] **Step 2: Commit** if any minor fixes needed

```bash
git add -A
git commit -m "chore: ensure AI chat panel works with refactored API layer"
```

---

### Task 18: Cleanup Old Routes

**Files:**
- Delete: `src/app/api/market/route.ts` (old combined route — logic moved to individual routes)

- [ ] **Step 1: Delete** `src/app/api/market/route.ts`
- [ ] **Step 2: Verify build**

Run: `cd nextjs-app && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Full build test**

Run: `cd nextjs-app && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git rm nextjs-app/src/app/api/market/route.ts
git commit -m "chore: remove old combined market route, split into individual routes"
```
