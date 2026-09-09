import { useMemo, useState } from 'react'
import { analyzeHistoricalRsi, type PricePoint } from './rsiHistoryEngine'

function parseCsv(text: string): PricePoint[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const comma = line.indexOf(',')
    const semicolon = line.indexOf(';')
    const tab = line.indexOf('\t')
    const separators = [comma, semicolon, tab].filter((i) => i >= 0)
    if (!separators.length) return null
    const splitAt = Math.min(...separators)
    const date = line.slice(0, splitAt).trim()
    const closeRaw = line.slice(splitAt + 1).trim().replace(',', '.')
    const close = Number(closeRaw)
    return !Number.isNaN(Date.parse(date)) && Number.isFinite(close) && close > 0 ? { date, close } : null
  }).filter((point): point is PricePoint => point !== null)
}

const fmt = (value: number | null, suffix = '') => value == null ? '—' : `${value.toFixed(2)}${suffix}`

export default function App() {
  const [ticker, setTicker] = useState('')
  const [raw, setRaw] = useState('')
  const [points, setPoints] = useState<PricePoint[]>([])
  const result = useMemo(() => points.length ? analyzeHistoricalRsi(points) : null, [points])
  const rows = result?.thresholds ?? [30, 25, 20].map((threshold) => ({ threshold, eventCount: null, forward: [30, 90, 180, 365].map((horizonDays) => ({ horizonDays, averageReturnPct: null, medianReturnPct: null, positivePct: null, bestReturnPct: null, worstReturnPct: null })) }))

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">M</span><div><strong>MacroScore</strong><small>PREVIEW VISUAL ISOLADO</small></div></div><div className="status"><span></span> ORIGINAL PROTEGIDO</div></header>
    <main>
      <section className="hero"><div className="badges"><b>NOVA CAMADA</b><b>SEM NÚMEROS INVENTADOS</b></div><h1>RSI Histórico & Retornos Futuros</h1><p>Estatística histórica por ativo. O módulo só apresenta resultados quando recebe uma série real de preços.</p><div className="method">RSI Wilder 14 · thresholds 30 / 25 / 20 · 30d / 90d / 180d / 365d</div></section>
      <section className="panel"><h2>Carregar série real</h2><div className="input-row"><input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="Ticker" /><span>Cole duas colunas: <code>data, fechamento</code>. Não há dados fictícios embutidos.</span></div><textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'AAAA-MM-DD, fechamento\nAAAA-MM-DD, fechamento'} /><div className="actions"><small>Os campos permanecem vazios até uma série válida ser carregada.</small><button onClick={() => setPoints(parseCsv(raw))}>Analisar série</button></div></section>
      <section className="cards"><article><span>RSI atual</span><strong>{fmt(result?.latestRsi ?? null)}</strong></article><article><span>Percentil histórico</span><strong>{fmt(result?.latestPercentile ?? null, '%')}</strong></article><article><span>Série carregada</span><strong>{points.length || '—'}</strong><small>{ticker || 'ativo não informado'}</small></article></section>
      <section className="panel table-panel"><h2>Eventos de sobrevenda e desempenho posterior</h2><div className="table-wrap"><table><thead><tr><th>RSI</th><th>Eventos</th><th>Horizonte</th><th>Média</th><th>Mediana</th><th>% positivo</th><th>Melhor</th><th>Pior</th></tr></thead><tbody>{rows.flatMap((bucket) => bucket.forward.map((row, index) => <tr key={`${bucket.threshold}-${row.horizonDays}`}><td>{index === 0 ? `≤ ${bucket.threshold}` : ''}</td><td>{index === 0 ? (bucket.eventCount ?? '—') : ''}</td><td>{row.horizonDays}d</td><td>{fmt(row.averageReturnPct, '%')}</td><td>{fmt(row.medianReturnPct, '%')}</td><td>{fmt(row.positivePct, '%')}</td><td>{fmt(row.bestReturnPct, '%')}</td><td>{fmt(row.worstReturnPct, '%')}</td></tr>))}</tbody></table></div>{!result && <p className="waiting">Aguardando dados reais. Os campos ficam em branco até uma série válida ser carregada.</p>}</section>
    </main>
  </div>
}
