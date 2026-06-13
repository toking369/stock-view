/**
 * Data API layer — will be replaced with real API calls to backend
 * Currently returns mock data with simulated latency
 */

import {
  mockIndices,
  watchlistData,
  sectorData,
  capitalFlowData,
  lhbData,
  lhbInstData,
  limitUpList,
  screenerStockPool,
} from './mock-data'
import { generateKlineData } from './indicators'
import type { Index, Sector, CapitalFlow, LHBRecord, LHBInstitution, LimitUpStock, ScreenerStock } from '@/types'

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Fetch indices */
export async function fetchIndices(): Promise<Index[]> {
  await delay()
  return mockIndices
}

/** Fetch watchlist quotes */
export async function fetchQuotes(): Promise<typeof watchlistData> {
  await delay()
  return watchlistData
}

/** Fetch K-line data */
export async function fetchKline(_code: string, days: number = 120) {
  await delay(200)
  return generateKlineData(days)
}

/** Fetch sector data */
export async function fetchSectors(_count: number = 30): Promise<Sector[]> {
  await delay()
  return sectorData
}

/** Fetch capital flow */
export async function fetchCapitalFlow(_count: number = 10): Promise<CapitalFlow[]> {
  await delay()
  return capitalFlowData
}

/** Fetch LHB data */
export async function fetchLHB(): Promise<{ lhb: LHBRecord[], inst: LHBInstitution[], limitUp: LimitUpStock[] }> {
  await delay()
  return { lhb: lhbData, inst: lhbInstData, limitUp: limitUpList }
}

/** Fetch screener data */
export async function fetchScreenerPool(): Promise<ScreenerStock[]> {
  await delay(200)
  return screenerStockPool
}

/** Load all live data in parallel */
export async function loadLiveData() {
  await delay(100)
  return {
    indices: mockIndices,
    quotes: watchlistData,
    sectors: sectorData,
    flow: capitalFlowData,
  }
}
