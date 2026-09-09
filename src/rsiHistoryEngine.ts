export type RsiThreshold = 30 | 25 | 20
export type ForwardHorizonDays = 30 | 90 | 180 | 365

export interface PricePoint { date: string; close: number }
export interface RsiObservation extends PricePoint { rsi: number }
export interface ForwardReturnStats {
  horizonDays: ForwardHorizonDays
  observations: number
  averageReturnPct: number | null
  medianReturnPct: number | null
  positivePct: number | null
  bestReturnPct: number | null
  worstReturnPct: number | null
}
export interface RsiThresholdStats { threshold: RsiThreshold; eventCount: number; forward: ForwardReturnStats[] }
export interface RsiHistorySummary { period: number; latestRsi: number | null; latestPercentile: number | null; thresholds: RsiThresholdStats[] }

const HORIZONS: ForwardHorizonDays[] = [30, 90, 180, 365]
const THRESHOLDS: RsiThreshold[] = [30, 25, 20]
const round2 = (value: number) => Math.round(value * 100) / 100

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function calculateRsiSeries(points: PricePoint[], period = 14): RsiObservation[] {
  const clean = [...points].filter((p) => Number.isFinite(p.close) && p.close > 0 && !Number.isNaN(Date.parse(p.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  if (period <= 0 || clean.length <= period) return []
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i += 1) {
    const delta = clean[i].close - clean[i - 1].close
    if (delta >= 0) gains += delta
    else losses += -delta
  }
  let avgGain = gains / period, avgLoss = losses / period
  const out: RsiObservation[] = []
  const compute = () => avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  out.push({ ...clean[period], rsi: round2(compute()) })
  for (let i = period + 1; i < clean.length; i += 1) {
    const delta = clean[i].close - clean[i - 1].close
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period
    out.push({ ...clean[i], rsi: round2(compute()) })
  }
  return out
}

function findFirstPointAtOrAfter(points: PricePoint[], targetTime: number): PricePoint | undefined {
  let lo = 0, hi = points.length - 1, answer: PricePoint | undefined
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (Date.parse(points[mid].date) >= targetTime) { answer = points[mid]; hi = mid - 1 } else lo = mid + 1
  }
  return answer
}

function summarizeForwardReturns(events: RsiObservation[], prices: PricePoint[], horizonDays: ForwardHorizonDays): ForwardReturnStats {
  const returns: number[] = []
  for (const event of events) {
    const future = findFirstPointAtOrAfter(prices, Date.parse(event.date) + horizonDays * 86400000)
    if (future) returns.push(((future.close / event.close) - 1) * 100)
  }
  return {
    horizonDays,
    observations: returns.length,
    averageReturnPct: returns.length ? round2(returns.reduce((a, b) => a + b, 0) / returns.length) : null,
    medianReturnPct: returns.length ? round2(median(returns)!) : null,
    positivePct: returns.length ? round2((returns.filter((r) => r > 0).length / returns.length) * 100) : null,
    bestReturnPct: returns.length ? round2(Math.max(...returns)) : null,
    worstReturnPct: returns.length ? round2(Math.min(...returns)) : null,
  }
}

export function analyzeHistoricalRsi(points: PricePoint[], period = 14): RsiHistorySummary {
  const prices = [...points].filter((p) => Number.isFinite(p.close) && p.close > 0 && !Number.isNaN(Date.parse(p.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const rsiSeries = calculateRsiSeries(prices, period)
  const latestRsi = rsiSeries.length ? rsiSeries[rsiSeries.length - 1].rsi : null
  const latestPercentile = latestRsi == null || !rsiSeries.length ? null : round2((rsiSeries.filter((p) => p.rsi <= latestRsi).length / rsiSeries.length) * 100)
  return { period, latestRsi, latestPercentile, thresholds: THRESHOLDS.map((threshold) => {
    const events = rsiSeries.filter((p) => p.rsi <= threshold)
    return { threshold, eventCount: events.length, forward: HORIZONS.map((horizon) => summarizeForwardReturns(events, prices, horizon)) }
  }) }
}
