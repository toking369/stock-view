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
    // Auto-logout on 401 (skip auth endpoints to avoid redirect loop on login page)
    if (res.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('stockview_token')
        localStorage.removeItem('stockview_user')
        localStorage.removeItem('stockview_watchlist')
        window.location.href = '/login'
      }
    }
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

/** Fetch capital flow ranking */
export async function fetchCapitalFlowRanking(count: number = 10): Promise<CapitalFlow[]> {
  return apiFetch<CapitalFlow[]>(`/api/market/flow?count=${count}`)
}

/** Fetch individual stock capital flow */
export async function fetchCapitalFlow(code: string): Promise<CapitalFlow> {
  return apiFetch<CapitalFlow>(`/api/market/flow?code=${code}`)
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
export async function login(username: string, password: string): Promise<{ token: string; user: any }> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

/** Register */
export async function register(username: string, password: string, name?: string): Promise<{ token: string; user: any }> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, name }),
  })
}

/** Get current user */
export async function fetchMe(): Promise<any> {
  return apiFetch('/api/auth/me')
}

/** Fetch watchlist from server */
export async function fetchWatchlist(): Promise<string[]> {
  const res = await apiFetch<{ watchlist: string[] }>('/api/user/watchlist')
  return res.watchlist
}

/** Add stock to watchlist on server */
export async function addWatchlist(code: string): Promise<void> {
  await apiFetch('/api/user/watchlist', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

/** Remove stock from watchlist on server */
export async function removeWatchlist(code: string): Promise<void> {
  await apiFetch(`/api/user/watchlist/${code}`, {
    method: 'DELETE',
  })
}

