/**
 * EastMoney API service — fetches real A-share market data from East Money public APIs.
 *
 * Each method fetches raw JSONP data and transforms it to the project's TypeScript types.
 * All endpoints use East Money's public push2 / datacenter APIs which return JSONP.
 *
 * @see https://push2.eastmoney.com/api/qt/ulist.np/get — batch quote
 * @see https://push2.eastmoney.com/api/qt/clist/get — ranked lists (sectors, flows, stocks)
 * @see https://push2his.eastmoney.com/api/qt/stock/kline/get — K-line history
 * @see https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get — capital flow detail
 * @see https://datacenter-web.eastmoney.com/api/data/v1/get — datacenter reports (LHB)
 * @see https://searchadapter.eastmoney.com/api/suggest/get — stock search
 */

import type {
  Stock,
  Index,
  KLineDataPoint,
  Sector,
  CapitalFlow,
  LHBRecord,
  LHBInstitution,
  LimitUpStock,
} from '@/types'

// ─── API Endpoints ──────────────────────────────────────────────────────────

const API = {
  QUOTE: 'https://push2.eastmoney.com/api/qt/ulist.np/get',
  CLIST: 'https://push2.eastmoney.com/api/qt/clist/get',
  KLINE: 'https://push2his.eastmoney.com/api/qt/stock/kline/get',
  FFLOW: 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get',
  DATACENTER: 'https://datacenter-web.eastmoney.com/api/data/v1/get',
  SEARCH: 'https://searchadapter.eastmoney.com/api/suggest/get',
} as const

const UT = 'b2884a393a59ad64002292a3e90d46a5'

const QUOTE_FIELDS =
  'f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f37,f38,f39,f40,f41,f45,f46,f48,f50,f57,f58,f60,f62,f115,f128,f140,f136,f152,f170'

const SECTOR_FIELDS =
  'f2,f3,f4,f12,f14,f15,f16,f17,f18,f20,f21,f24,f25,f62,f66,f69,f72,f75,f78,f81,f84,f87,f184,f204,f205,f124'

const CLIST_FIELDS =
  'f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f37,f38,f39,f40,f41,f45,f46,f48,f50,f57,f58,f60,f62,f115,f128,f140,f136,f152,f170,f100,f108,f115,f121,f122,f125,f161,f162,f167,f168,f169,f170'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Fetch a JSONP response and extract the JSON payload from the jQuery callback
 * wrapper: `jQuery183_xxx( { … } )`  or  `jQuery183_xxx( [ … ] )`.
 */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const text = await res.text()

  // Strip jQuery JSONP callback wrapper
  const match =
    text.match(/\(({[\s\S]+})\)\s*$/) || text.match(/\((\[[\s\S]+])\)\s*$/)
  const raw = match?.[1] || text
  return JSON.parse(raw) as T
}

/**
 * Convert a stock code to East Money secid format.
 * - 6xxxxx (SH)  → `1.xxxxxx`
 * - 0xxxxx / 3xxxxx (SZ)  → `0.xxxxxx`
 */
function codeToSecid(code: string): string {
  const market = code.startsWith('6') ? '1' : '0'
  return `${market}.${code}`
}

/**
 * Parse a raw East Money quote diff item into a Stock object.
 *
 * For batch endpoint (ulist.np/get):
 *  f2 price, f3 change%, f4 changeAmount, f5 vol(hands), f6 amount(yuan),
 *  f7 turnover%, f10 volumeRatio, f12 code, f14 name,
 *  f15 high, f16 low, f17 open, f18 prevClose, f37 amplitude%,
 *  f115 pe-ttm
 *
 * Note: batch API doesn't return outer/inner vol directly.
 * We approximate them from vol + change% (ratio scales with price movement).
 */
function parseQuote(item: Record<string, unknown>): Stock {
  const change = Number(item.f3 ?? 0)
  const vol = Number(item.f5 ?? 0)
  // Approximate outer/inner vol: stronger price move → bigger imbalance
  const imbalanceFactor = Math.min(Math.abs(change), 10) * 0.03
  const outerRatio = change >= 0 ? 0.5 + imbalanceFactor : 0.5 - imbalanceFactor
  return {
    code: String(item.f12 ?? ''),
    name: String(item.f14 ?? ''),
    price: Number(item.f2 ?? 0),
    change,
    changeAmount: Number(item.f4 ?? 0),
    vol,
    amount: Math.round((Number(item.f6 ?? 0) / 10000)),
    turnover: Number(item.f7 ?? 0),
    pe: Number(item.f115 ?? 0),           // f115 = PE (TTM)
    amplitude: Number(item.f37 ?? 0),
    open: Number(item.f17 ?? 0),
    high: Number(item.f15 ?? 0),
    low: Number(item.f16 ?? 0),
    prevClose: Number(item.f18 ?? 0),
    volumeRatio: Number(item.f10 ?? 0),
    outerVol: Math.round(vol * outerRatio),
    innerVol: Math.round(vol * (1 - outerRatio)),
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

export class EastMoneyService {
  /** Fetch real-time quotes for one or more stock codes. */
  async fetchQuotes(codes: string[]): Promise<Stock[]> {
    if (!codes.length) return []
    const secids = codes.map(codeToSecid).join(',')
    const url = `${API.QUOTE}?fltt=2&fields=${QUOTE_FIELDS}&secids=${secids}&ut=${UT}`
    const data = await fetchJSON<{ data?: { diff?: Record<string, unknown>[] } }>(url)
    const items = data?.data?.diff ?? []
    return items.filter(Boolean).map(parseQuote)
  }

  /** Fetch the four major A-share indices (上证, 深证, 创业板, 科创). */
  async fetchIndices(): Promise<Index[]> {
    const codes = ['1.000001', '0.399001', '0.399006', '1.000688']
    const url = `${API.QUOTE}?fltt=2&fields=f2,f3,f4,f12,f14&secids=${codes.join(',')}&ut=${UT}`
    const data = await fetchJSON<{ data?: { diff?: Record<string, unknown>[] } }>(url)
    const items = data?.data?.diff ?? []
    return items.filter(Boolean).map((item) => ({
      code: String(item.f12 ?? ''),
      name: String(item.f14 ?? ''),
      price: Number(item.f2 ?? 0),
      change: Number(item.f3 ?? 0),
      changeAmount: Number(item.f4 ?? 0),
    }))
  }

  /**
   * Fetch K-line data for a stock.
   *
   * @param code    Stock code (e.g. "600519")
   * @param days    Number of data points to return (default 120)
   * @param period  K-line period: "day" | "week" | "month" | "60" | "30" | "15"
   */
  async fetchKline(
    code: string,
    days: number = 120,
    period: string = 'day',
  ): Promise<KLineDataPoint[]> {
    const secid = codeToSecid(code)
    const periodMap: Record<string, string> = {
      day: '101',
      week: '102',
      month: '103',
      '60': '60',
      '30': '30',
      '15': '15',
    }
    const klt = periodMap[period] || '101'
    const url = `${API.KLINE}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&lmt=${days}&ut=${UT}`
    const data = await fetchJSON<{ data?: { klines?: string[] } }>(url)
    const klines = data?.data?.klines ?? []
    return klines.map((line: string) => {
      const parts = line.split(',')
      return {
        date: parts[0] || '',
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        vol: parseInt(parts[5], 10) || 0,
      }
    })
  }

  /**
   * Fetch sector (板块) performance rankings.
   *
   * @param type  "industry" (行业) or "concept" (概念)
   * @param count Max sectors to return (default 30)
   */
  async fetchSectors(
    type: 'industry' | 'concept' = 'industry',
    count: number = 30,
  ): Promise<Sector[]> {
    const typeMap = { industry: 'm:90+t:2', concept: 'm:90+t:3' }
    const url = `${API.CLIST}?pn=1&pz=${count}&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${typeMap[type]}&fields=${SECTOR_FIELDS}&ut=${UT}`
    const data = await fetchJSON<{ data?: { diff?: Record<string, unknown>[] } }>(url)
    const items = data?.data?.diff ?? []
    return items
      .filter(Boolean)
      .slice(0, count)
      .map((item) => ({
        name: String(item.f14 ?? ''),
        change: Number(item.f3 ?? 0),
        volume: Math.round(Number(item.f6 ?? 0) / 100000000),
      }))
  }

  /** Fetch sector-level capital flow ranking. */
  async fetchCapitalFlowRanking(count: number = 10): Promise<CapitalFlow[]> {
    const url = `${API.CLIST}?pn=1&pz=${count}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75&ut=${UT}`
    const data = await fetchJSON<{ data?: { diff?: Record<string, unknown>[] } }>(url)
    const items = data?.data?.diff ?? []
    return items
      .filter(Boolean)
      .slice(0, count)
      .map((item) => {
        const inflow = Math.abs(Number(item.f62 ?? 0))
        const net = Number(item.f62 ?? 0)
        return {
          code: String(item.f12 ?? ''),
          name: String(item.f14 ?? ''),
          price: Number(item.f2 ?? 0),
          change: Number(item.f3 ?? 0),
          inflow: Math.round(inflow / 10000),
          outflow: Math.round(Math.max(0, inflow - net) / 10000),
          net: Math.round(net / 10000),
          ratio: Number(item.f184 ?? 0),
        }
      })
  }

  /** Fetch capital flow detail for a single stock. */
  async fetchCapitalFlow(code: string): Promise<CapitalFlow | null> {
    const secid = codeToSecid(code)
    const url = `${API.FFLOW}?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63&lmt=1&klt=101&ut=${UT}`
    const data = await fetchJSON<{ data?: { klines?: string[]; f3?: string } }>(url)
    const klines = data?.data?.klines ?? []
    if (!klines.length) return null

    const parts = klines[0].split(',')
    const mainForce = parseFloat(parts[1]) || 0
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
   * Fetch 龙虎榜 (LHB / Dragon & Tiger Board) data for the past 7 days.
   *
   * Returns up to 20 LHB records and synthesises a limited set of limit-up
   * stocks from entries that moved >= 9.8%.
   */
  async fetchLHB(): Promise<{
    lhb: LHBRecord[]
    institutions: LHBInstitution[]
    limitUp: LimitUpStock[]
  }> {
    const today = new Date().toISOString().slice(0, 10)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const filter = `(TRADE_DATE>='${sevenDaysAgo}')(TRADE_DATE<='${today}')`
    const url = `${API.DATACENTER}?sortColumns=TRADE_DATE&sortTypes=-1&pageSize=50&pageNumber=1&reportName=RPT_BILLBOARD_STATISTICS&columns=ALL&source=WEB&client=WEB&filter=${filter}`
    const data = await fetchJSON<{ result?: { data?: Record<string, unknown>[] } }>(url)
    const list = data?.result?.data ?? []

    const lhb: LHBRecord[] = []
    const limitUpMap = new Map<
      string,
      { days: number; sealRate: number; sector: string }
    >()

    for (const item of list) {
      const code = String(item.SECURITY_CODE ?? '')
      const name = String(item.SECURITY_NAME_ABBR ?? '')
      lhb.push({
        code,
        name,
        price: Number(item.CLOSE_PRICE ?? 0),
        change: Number(item.CHANGE_RATE ?? 0),
        buy: Math.round((Number(item.BUY_AMT ?? 0) / 10000)),
        sell: Math.round((Number(item.SELL_AMT ?? 0) / 10000)),
        net: Math.round((Number(item.NET_BUY_AMT ?? 0) / 10000)),
      })

      // Synthesize limit-up entries from stocks with >= 9.8% change
      if (Number(item.CHANGE_RATE ?? 0) >= 9.8 && !limitUpMap.has(code)) {
        limitUpMap.set(code, { days: 1, sealRate: 0.8, sector: '' })
      }
    }

    return {
      lhb: lhb.slice(0, 20),
      institutions: [],
      limitUp: Array.from(limitUpMap.entries())
        .slice(0, 10)
        .map(([code, v]) => ({
          name: lhb.find((r) => r.code === code)?.name ?? '',
          code,
          ...v,
        })),
    }
  }

  /** Search stocks by keyword (code or name). */
  async searchStocks(query: string): Promise<Pick<Stock, 'code' | 'name'>[]> {
    if (!query.trim()) return []
    const url = `${API.SEARCH}?input=${encodeURIComponent(query)}&count=10&type=14`
    const data = await fetchJSON<{
      QuotationCodeTable?: {
        Data?: { Code?: string; Name?: string }[]
      }
    }>(url)
    const items = data?.QuotationCodeTable?.Data ?? []
    return items.slice(0, 10).map((item) => ({
      code: String(item.Code ?? ''),
      name: String(item.Name ?? ''),
    }))
  }

  /** Fetch a ranked list of all stocks (used by the screener). */
  async fetchAllStocks(count: number = 500): Promise<Stock[]> {
    const url = `${API.CLIST}?pn=1&pz=${count}&po=0&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:1+t:2&fields=${CLIST_FIELDS}&ut=${UT}`
    const data = await fetchJSON<{ data?: { diff?: Record<string, unknown>[] } }>(url)
    const items = data?.data?.diff ?? []
    return items.filter(Boolean).slice(0, count).map(parseQuote)
  }
}

export const eastMoney = new EastMoneyService()
