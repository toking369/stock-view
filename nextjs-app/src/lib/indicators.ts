import type { KLineDataPoint } from '@/types'
import { seededRandom } from './utils'

/** Calculate Moving Average */
export function calcMA(data: KLineDataPoint[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j].close
      }
      result.push(+(sum / period).toFixed(2))
    }
  }
  return result
}

/** Calculate MACD */
export function calcMACD(data: KLineDataPoint[]) {
  const closePrices = data.map(d => d.close)
  const ema12: number[] = []
  const ema26: number[] = []
  const dif: number[] = []
  const dea: number[] = []
  const hist: number[] = []

  for (let i = 0; i < closePrices.length; i++) {
    if (i === 0) {
      ema12.push(closePrices[i])
      ema26.push(closePrices[i])
    } else {
      ema12.push(+(closePrices[i] * 2 / 13 + ema12[i - 1] * 11 / 13).toFixed(4))
      ema26.push(+(closePrices[i] * 2 / 27 + ema26[i - 1] * 25 / 27).toFixed(4))
    }
    dif.push(+((ema12[i] - ema26[i])).toFixed(4))
    if (i === 0) {
      dea.push(dif[i])
    } else {
      dea.push(+(dif[i] * 2 / 10 + dea[i - 1] * 8 / 10).toFixed(4))
    }
    hist.push(+((dif[i] - dea[i]) * 2).toFixed(4))
  }
  return { dif, dea, hist }
}

/** Calculate KDJ */
export function calcKDJ(data: KLineDataPoint[]) {
  const k: number[] = []
  const d: number[] = []
  const j: number[] = []

  for (let i = 0; i < data.length; i++) {
    const high = data.slice(Math.max(0, i - 8), i + 1).reduce((h, v) => Math.max(h, v.high), -Infinity)
    const low = data.slice(Math.max(0, i - 8), i + 1).reduce((l, v) => Math.min(l, v.low), Infinity)
    const rsv = high === low ? 50 : ((data[i].close - low) / (high - low)) * 100

    if (i === 0) {
      k.push(50)
      d.push(50)
    } else {
      k.push(+(2 / 3 * k[i - 1] + 1 / 3 * rsv).toFixed(2))
      d.push(+(2 / 3 * d[i - 1] + 1 / 3 * k[i]).toFixed(2))
    }
    j.push(+((3 * k[i] - 2 * d[i])).toFixed(2))
  }
  return { k, d, j }
}

/** Calculate RSI */
export function calcRSI(data: KLineDataPoint[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = []
  if (data.length < 2) return data.map(() => null)

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null)
    } else {
      let gains = 0, losses = 0
      for (let j = i - period + 1; j <= i; j++) {
        const diff = data[j].close - data[j - 1].close
        if (diff > 0) gains += diff
        else losses -= diff
      }
      const rs = losses === 0 ? 100 : gains / losses
      result.push(+(100 - 100 / (1 + rs)).toFixed(2))
    }
  }
  return result
}

/** Calculate BOLL */
export function calcBOLL(data: KLineDataPoint[], period: number = 20) {
  const upper: (number | null)[] = []
  const mid: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null)
      mid.push(null)
      lower.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close
      const ma = sum / period
      let sqSum = 0
      for (let j = i - period + 1; j <= i; j++) sqSum += (data[j].close - ma) ** 2
      const md = Math.sqrt(sqSum / period)
      mid.push(+(ma).toFixed(2))
      upper.push(+(ma + 2 * md).toFixed(2))
      lower.push(+(ma - 2 * md).toFixed(2))
    }
  }
  return { upper, mid, lower }
}

/** Generate deterministic K-line data */
export function generateKlineData(days: number): KLineDataPoint[] {
  const data: KLineDataPoint[] = []
  let price = 50 + seededRandom() * 100
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    if (d.getDay() === 0 || d.getDay() === 6) continue

    const change = (seededRandom() - 0.48) * 4
    const open = price
    const close = +(open * (1 + change / 100)).toFixed(2)
    const high = +(Math.max(open, close) * (1 + seededRandom() * 0.02)).toFixed(2)
    const low = +(Math.min(open, close) * (1 - seededRandom() * 0.02)).toFixed(2)
    const vol = Math.round(seededRandom() * 100000 + 10000)
    price = close

    data.push({
      date: d.toISOString().slice(0, 10),
      open, close, high, low, vol
    })
  }
  return data
}
