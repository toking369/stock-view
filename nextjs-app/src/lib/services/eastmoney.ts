/**
 * EastMoney API service — proxy layer for fetching market data.
 * Will be enhanced in Phase 1 migration.
 */

export interface EMQuote {
  code: string
  name: string
  price: number
  change: number
  changeAmount: number
  vol: number
  amount: number
  turnover: number
  pe: number
  amplitude: number
  open: number
  high: number
  low: number
  prevClose: number
  volumeRatio: number
  outerVol: number
  innerVol: number
}

export class EastMoneyService {
  private baseUrl = 'https://push2.eastmoney.com/api/qt/ulist.np/get'

  /**
   * Fetch batch quotes from EastMoney.
   * Currently returns mock data.
   * TODO: Phase 1 - Implement real HTTP request via fetch/axios
   */
  async fetchQuotes(_codes: string[]): Promise<EMQuote[]> {
    // Placeholder for real API call
    return []
  }

  /**
   * Fetch K-line data.
   * secid format: market.code (e.g., 1.600519)
   */
  async fetchKline(_secid: string, _days: number = 120) {
    return []
  }

  /**
   * Build secid from stock code
   * 6xxxxx → 1.xxxxxx (SH), 0xxxxx/3xxxxx → 0.xxxxxx (SZ)
   */
  static codeToSecid(code: string): string {
    const market = code.startsWith('6') ? '1' : '0'
    return `${market}.${code}`
  }
}
