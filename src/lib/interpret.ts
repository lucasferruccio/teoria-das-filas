// Tradução dos resultados para linguagem simples.

import { fmt, pct } from './format'
import { METRICS, type MetricKey } from './metrics'
import type { ModelResult } from './models'
import { UNIT_NAME, UNIT_PLURAL, convertTime, type TimeUnit } from './units'

const SMALLER: Partial<Record<TimeUnit, TimeUnit>> = { h: 'min', min: 's' }

/** "0,1008 min (≈ 6,05 s)": acrescenta uma unidade menor quando o número é pequeno. */
export function fmtTime(x: number, unit: TimeUnit): string {
  if (!Number.isFinite(x)) return fmt(x)
  const base = `${fmt(x)} ${unit}`
  const lower = SMALLER[unit]
  if (lower && x > 0 && x < 1) {
    const y = convertTime(x, unit, lower)
    if (y >= 0.1) return `${base} (≈ ${fmt(y, 3)} ${lower})`
  }
  return base
}

export function fmtMetric(key: MetricKey, x: number, unit: TimeUnit): string {
  switch (METRICS[key].kind) {
    case 'time':
      return fmtTime(x, unit)
    case 'prob':
      return `${fmt(x)} (${pct(x)})`
    case 'rate':
      return `${fmt(x)} por ${UNIT_NAME[unit]}`
    case 'erlang':
      return `${fmt(x)} Erlangs`
    default:
      return fmt(x)
  }
}

export function metricUnit(key: MetricKey, unit: TimeUnit): string {
  switch (METRICS[key].kind) {
    case 'time':
      return unit
    case 'rate':
      return `/${unit}`
    case 'erlang':
      return 'Erl'
    case 'prob':
      return ''
    default:
      return 'clientes'
  }
}

/** Frases de interpretação para o usuário leigo. */
export function interpret(r: ModelResult, unit: TimeUnit): string[] {
  const g = (k: MetricKey) => r.metrics.find((m) => m.key === k)?.value
  const out: string[] = []
  if (!r.stable) {
    out.push(r.stability.msg)
    out.push('Na prática, a fila só para de crescer quando a demanda cai (por exemplo, no fim do expediente). As médias "a longo prazo" não existem nesse caso.')
    return out
  }
  const rho = g('rho')
  if (rho !== undefined) {
    out.push(`Os servidores ficam ocupados ${pct(rho)} do tempo e ociosos ${pct(1 - rho)} do tempo.`)
    if (rho > 0.85) out.push('A utilização está acima de 85%: nessa faixa, pequenos aumentos na demanda causam grandes aumentos na espera. Vale considerar folga na capacidade.')
    else if (rho < 0.3) out.push('A utilização está baixa: há bastante capacidade sobrando. Talvez dê para atender a mesma demanda com menos recursos.')
  }
  const W = g('W')
  const Wq = g('Wq')
  if (W !== undefined && Wq !== undefined && W > 0) {
    const sv = W - Wq
    out.push(
      `Cada cliente passa, em média, ${fmtTime(W, unit)} no sistema: ${fmtTime(Wq, unit)} esperando na fila e ${fmtTime(sv, unit)} sendo atendido. ` +
        `Ou seja, ${pct(Wq / W)} do tempo é espera.`,
    )
  }
  const L = g('L')
  const Lq = g('Lq')
  if (L !== undefined && Lq !== undefined) {
    out.push(`Em um instante qualquer, há em média ${fmt(L)} clientes no sistema, dos quais ${fmt(Lq)} estão apenas esperando.`)
  }
  const Pw = g('Pwait')
  if (Pw !== undefined) out.push(`${pct(Pw)} dos clientes precisam esperar na fila; os outros ${pct(1 - Pw)} são atendidos assim que chegam.`)
  const Pb = g('Pblock')
  if (Pb !== undefined) out.push(`${pct(Pb)} dos clientes que chegam encontram o sistema cheio e são recusados (perdidos).`)
  const lef = g('lambdaEff')
  if (lef !== undefined) out.push(`Efetivamente entram ${fmt(lef)} clientes por ${UNIT_NAME[unit]}.`)
  return out
}

export const unitPlural = (u: TimeUnit) => UNIT_PLURAL[u]
