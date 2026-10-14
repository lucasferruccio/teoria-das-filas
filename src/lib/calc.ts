// Ponte entre o que o usuário digita (com unidades) e o motor de cálculo.

import type { ModelDef, ModelInput, ModelResult, PriorityClass } from './models'
import { convertRate, type TimeUnit } from './units'

export interface RawInput {
  values: Record<string, number>
  /** Unidade de cada parâmetro do tipo taxa ("por s", "por min", "por h"). */
  units: Record<string, TimeUnit>
  classes: (PriorityClass & { unit: TimeUnit })[]
  preemptive: boolean
  /** Unidade de tempo dos resultados. */
  out: TimeUnit
}

export interface Conversion {
  symbol: string
  from: number
  fromUnit: TimeUnit
  to: number
}

/** Converte as taxas para a unidade de saída e devolve também a lista de conversões feitas. */
export function prepare(model: ModelDef, raw: RawInput): { input: ModelInput; conversions: Conversion[] } {
  const conversions: Conversion[] = []
  const v: Record<string, number> = {}
  for (const p of model.params) {
    const x = raw.values[p.key]
    if (p.kind === 'rate') {
      const unit = raw.units[p.key] ?? raw.out
      const y = convertRate(x, unit, raw.out)
      if (unit !== raw.out) conversions.push({ symbol: p.symbol, from: x, fromUnit: unit, to: y })
      v[p.key] = y
    } else v[p.key] = x
  }
  const classes = raw.classes.map((c, i) => {
    const lambda = convertRate(c.lambda, c.unit, raw.out)
    const mu = convertRate(c.mu, c.unit, raw.out)
    if (c.unit !== raw.out) {
      conversions.push({ symbol: `\\lambda_${i + 1}`, from: c.lambda, fromUnit: c.unit, to: lambda })
      conversions.push({ symbol: `\\mu_${i + 1}`, from: c.mu, fromUnit: c.unit, to: mu })
    }
    return { lambda, mu }
  })
  return { input: { v, classes: model.hasClasses ? classes : undefined, preemptive: raw.preemptive }, conversions }
}

export function run(model: ModelDef, input: ModelInput): { result: ModelResult | null; error: string | null } {
  const error = model.validate?.(input) ?? null
  if (error) return { result: null, error }
  return { result: model.compute(input), error: null }
}

// ---------------------------------------------------------------- sensibilidade

export interface SensRow {
  x: number
  result: ModelResult | null
  error: string | null
}

/**
 * Varia o parâmetro `key` de `from` até `to` com passo `step`.
 * Os valores de taxa variados ficam na mesma unidade que o usuário usou para aquele parâmetro.
 */
export function sensitivity(
  model: ModelDef,
  raw: RawInput,
  key: string,
  from: number,
  to: number,
  step: number,
  maxRows = 200,
): SensRow[] {
  const p = model.params.find((q) => q.key === key)
  if (!p || !(step > 0) || !(to >= from)) return []
  const rows: SensRow[] = []
  const n = Math.min(maxRows, Math.floor((to - from) / step + 1e-9) + 1)
  for (let i = 0; i < n; i++) {
    let x = from + i * step
    x = p.kind === 'int' ? Math.round(x) : Number(x.toPrecision(12))
    if (rows.length && rows.at(-1)!.x === x) continue
    const { input } = prepare(model, { ...raw, values: { ...raw.values, [key]: x } })
    const r = run(model, input)
    rows.push({ x, ...r })
  }
  return rows
}

// ---------------------------------------------------------------- exemplos prontos

export interface Preset {
  id: string
  title: string
  desc: string
  model: string
  values: Record<string, number>
  units: Record<string, TimeUnit>
  out: TimeUnit
  classes?: (PriorityClass & { unit: TimeUnit })[]
  preemptive?: boolean
  sim?: { initial: number; customers: number }
  source: string
}

export const PRESETS: Preset[] = [
  {
    id: 'web', title: 'Servidor Web', model: 'mm1', source: 'Exemplo clássico de M/M/1',
    desc: '600 requisições por minuto; capacidade de 80 requisições por segundo.',
    values: { lambda: 600, mu: 80 }, units: { lambda: 'min', mu: 's' }, out: 's',
  },
  {
    id: 'curriculos', title: 'Currículos de RH', model: 'mmc', source: 'Exemplo clássico de M/M/2',
    desc: '10 currículos por minuto; 2 instâncias processando 12 por minuto cada.',
    values: { lambda: 10, mu: 12, c: 2 }, units: { lambda: 'min', mu: 'min' }, out: 'min',
  },
  {
    id: 'secretaria', title: 'Secretaria acadêmica', model: 'dd1', source: 'Fila determinística',
    desc: 'Chega 1 aluno a cada 8 min, atendimento de 5 min, e 5 alunos já esperando na abertura.',
    values: { lambda: 0.125, mu: 0.2 }, units: { lambda: 'min', mu: 'min' }, out: 'min', sim: { initial: 5, customers: 6 },
  },
  {
    id: 'gateway', title: 'Gateway de rede', model: 'mm1', source: 'Jain (1991), exemplo 31.1',
    desc: '125 pacotes por segundo chegando; o gateway processa 500 por segundo.',
    values: { lambda: 125, mu: 500 }, units: { lambda: 's', mu: 's' }, out: 's',
  },
  {
    id: 'banco', title: 'Fila de banco', model: 'mmc', source: 'Dimensionamento de caixas',
    desc: '40 clientes por hora; cada caixa atende 15 por hora; 3 caixas.',
    values: { lambda: 40, mu: 15, c: 3 }, units: { lambda: 'h', mu: 'h' }, out: 'min',
  },
  {
    id: 'lanhouse', title: 'Lan house', model: 'mmck', source: 'Capacidade limitada',
    desc: '12 pessoas por hora; uso médio de 40 min (1,5 por hora); 8 computadores e espaço para 15 pessoas.',
    values: { lambda: 12, mu: 1.5, c: 8, K: 15 }, units: { lambda: 'h', mu: 'h' }, out: 'min',
  },
  {
    id: 'pa', title: 'Pronto atendimento', model: 'prio', source: 'Atendimento com prioridade',
    desc: 'Casos urgentes (2/h) passam na frente dos casos comuns (3/h); cada atendimento leva 10 min em média.',
    values: {}, units: {}, out: 'min', preemptive: false,
    classes: [{ lambda: 2, mu: 6, unit: 'h' }, { lambda: 3, mu: 6, unit: 'h' }],
  },
  {
    id: 'aeroporto', title: 'Check-in no aeroporto', model: 'ggc', source: 'Caso geral com aproximação',
    desc: '120 passageiros por hora, 6 balcões atendendo 25 por hora cada, chegadas e atendimentos pouco variáveis.',
    values: { lambda: 120, mu: 25, c: 6, ca: 0.8, cs: 0.6 }, units: { lambda: 'h', mu: 'h' }, out: 'min',
  },
  {
    id: 'maquinas', title: 'Manutenção de máquinas', model: 'finite', source: 'Hillier e Lieberman (população finita)',
    desc: '5 máquinas; cada uma quebra em média a cada 10 h; 1 técnico conserta em 2 h, em média.',
    values: { lambda: 0.1, mu: 0.5, c: 1, N: 5 }, units: { lambda: 'h', mu: 'h' }, out: 'h',
  },
]
