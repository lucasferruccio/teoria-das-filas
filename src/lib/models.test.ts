import { describe, expect, it } from 'vitest'
import { PRESETS, prepare, run } from './calc'
import type { MetricKey } from './metrics'
import { MODEL_BY_ID, type ModelInput, type ModelResult } from './models'
import { erlangB, erlangC } from './queueing'
import { simulate } from './simulation'

const get = (r: ModelResult | null, k: MetricKey) => {
  const m = r?.metrics.find((x) => x.key === k)
  if (!m) throw new Error(`métrica ${k} ausente`)
  return m.value
}
const calc = (id: string, inp: ModelInput) => {
  const { result, error } = run(MODEL_BY_ID[id], inp)
  if (error) throw new Error(error)
  return result!
}

describe('M/M/1', () => {
  it('reproduz o exemplo do servidor Web (λ=10/s, μ=80/s)', () => {
    const r = calc('mm1', { v: { lambda: 10, mu: 80 } })
    expect(get(r, 'rho')).toBeCloseTo(0.125, 10)
    expect(get(r, 'W')).toBeCloseTo(1 / 70, 10) // 0,014 s
    expect(get(r, 'Wq')).toBeCloseTo(0.125 / 70, 10) // 0,0018 s
    expect(get(r, 'L')).toBeCloseTo(1 / 7, 10) // 0,14
    expect(get(r, 'Lq')).toBeCloseTo(0.015625 / 0.875, 10) // 0,018
  })
  it('reproduz o exemplo 31.1 de Jain (gateway: λ=125, μ=500 pacotes/s)', () => {
    const r = calc('mm1', { v: { lambda: 125, mu: 500 } })
    expect(get(r, 'rho')).toBeCloseTo(0.25, 10)
    expect(get(r, 'L')).toBeCloseTo(1 / 3, 10)
    expect(get(r, 'W')).toBeCloseTo(0.0026667, 6) // 2,67 ms
  })
  it('obedece a Lei de Little', () => {
    const r = calc('mm1', { v: { lambda: 3, mu: 5 } })
    expect(get(r, 'L')).toBeCloseTo(3 * get(r, 'W'), 10)
    expect(get(r, 'Lq')).toBeCloseTo(3 * get(r, 'Wq'), 10)
  })
  it('detecta instabilidade quando ρ ≥ 1', () => {
    expect(calc('mm1', { v: { lambda: 10, mu: 10 } }).stable).toBe(false)
  })
})

describe('Erlang B e C', () => {
  it('valores conhecidos', () => {
    expect(erlangB(2, 1)).toBeCloseTo(0.2, 12)
    expect(erlangC(2, 1)).toBeCloseTo(1 / 3, 12)
    // Tabela clássica: 10 Erlangs, 15 linhas -> B ≈ 0,0365
    expect(erlangB(15, 10)).toBeCloseTo(0.03650, 4)
  })
})

describe('M/M/c', () => {
  it('com c = 1 é igual à M/M/1', () => {
    const a = calc('mmc', { v: { lambda: 4, mu: 5, c: 1 } })
    const b = calc('mm1', { v: { lambda: 4, mu: 5 } })
    for (const k of ['L', 'Lq', 'W', 'Wq'] as MetricKey[]) expect(get(a, k)).toBeCloseTo(get(b, k), 10)
  })
  it('exemplo dos currículos (M/M/2, λ=10, μ=12 por min)', () => {
    const r = calc('mmc', { v: { lambda: 10, mu: 12, c: 2 } })
    expect(get(r, 'rho')).toBeCloseTo(10 / 24, 10)
    expect(get(r, 'P0')).toBeCloseTo(7 / 17, 10)
    expect(get(r, 'Wq')).toBeCloseTo(0.0175070, 6)
    expect(get(r, 'W')).toBeCloseTo(0.1008403, 6) // ≈ 6 s, não 0,14 min
  })
  it('é estável com números grandes (c = 400)', () => {
    const r = calc('mmc', { v: { lambda: 380, mu: 1, c: 400 } })
    expect(Number.isFinite(get(r, 'Wq'))).toBe(true)
    expect(get(r, 'Pwait')).toBeGreaterThan(0)
    expect(get(r, 'Pwait')).toBeLessThan(1)
  })
})

describe('M/M/1/K e M/M/c/K', () => {
  it('λ = μ com K = 4: P_n uniforme, L = 2', () => {
    const r = calc('mm1k', { v: { lambda: 3, mu: 3, K: 4 } })
    expect(get(r, 'Pblock')).toBeCloseTo(0.2, 10)
    expect(get(r, 'L')).toBeCloseTo(2, 10)
  })
  it('K muito grande se aproxima da M/M/1', () => {
    const r = calc('mm1k', { v: { lambda: 2, mu: 5, K: 400 } })
    expect(get(r, 'W')).toBeCloseTo(1 / 3, 8)
  })
  it('fórmula fechada da M/M/1/K bate com a solução numérica da M/M/c/K com c = 1', () => {
    const a = calc('mm1k', { v: { lambda: 7, mu: 5, K: 6 } })
    const b = calc('mmck', { v: { lambda: 7, mu: 5, c: 1, K: 6 } })
    for (const k of ['L', 'Lq', 'W', 'Wq', 'Pblock'] as MetricKey[]) expect(get(b, k)).toBeCloseTo(get(a, k), 10)
  })
  it('M/M/c/c dá o mesmo bloqueio que Erlang B', () => {
    const a = calc('mmck', { v: { lambda: 10, mu: 1, c: 15, K: 15 } })
    const b = calc('mmcc', { v: { lambda: 10, mu: 1, c: 15 } })
    expect(get(a, 'Pblock')).toBeCloseTo(get(b, 'Pblock'), 10)
  })
  it('rejeita K < c', () => {
    expect(run(MODEL_BY_ID.mmck, { v: { lambda: 1, mu: 1, c: 3, K: 2 } }).error).toBeTruthy()
  })
})

describe('M/G/1 e casos particulares', () => {
  it('Cₛ = 1 é igual à M/M/1', () => {
    const a = calc('mg1', { v: { lambda: 4, mu: 5, cs: 1 } })
    const b = calc('mm1', { v: { lambda: 4, mu: 5 } })
    expect(get(a, 'Wq')).toBeCloseTo(get(b, 'Wq'), 10)
  })
  it('M/D/1 espera metade da M/M/1', () => {
    const a = calc('md1', { v: { lambda: 4, mu: 5 } })
    const b = calc('mm1', { v: { lambda: 4, mu: 5 } })
    expect(get(a, 'Wq')).toBeCloseTo(get(b, 'Wq') / 2, 10)
  })
  it('M/E₂/1 equivale à M/G/1 com Cₛ² = 1/2', () => {
    const a = calc('mek1', { v: { lambda: 4, mu: 5, k: 2 } })
    const b = calc('mg1', { v: { lambda: 4, mu: 5, cs: Math.SQRT1_2 } })
    expect(get(a, 'Lq')).toBeCloseTo(get(b, 'Lq'), 10)
  })
})

describe('População finita', () => {
  it('N = 1: P0 = μ/(λ+μ)', () => {
    const r = calc('finite', { v: { lambda: 2, mu: 3, c: 1, N: 1 } })
    expect(get(r, 'P0')).toBeCloseTo(3 / 5, 10)
  })
  it('N grande com λ pequeno se aproxima da M/M/1 com λ·N', () => {
    const r = calc('finite', { v: { lambda: 0.0001, mu: 1, c: 1, N: 5000 } })
    const b = calc('mm1', { v: { lambda: 0.5, mu: 1 } })
    expect(get(r, 'W')).toBeCloseTo(get(b, 'W'), 2)
  })
  it('exemplo das 5 máquinas: L = N − (μ/λ)(1−P0)', () => {
    const r = calc('finite', { v: { lambda: 0.1, mu: 0.5, c: 1, N: 5 } })
    expect(get(r, 'L')).toBeCloseTo(5 - 5 * (1 - get(r, 'P0')), 10)
  })
})

describe('Prioridades', () => {
  it('uma classe só é igual à M/M/1', () => {
    const r = calc('prio', { v: {}, classes: [{ lambda: 4, mu: 5 }] })
    expect(get(r, 'W')).toBeCloseTo(1, 10)
  })
  it('lei de conservação: com μ iguais, a espera média ponderada é a da M/M/1 FCFS', () => {
    const r = calc('prio', { v: {}, classes: [{ lambda: 1, mu: 5 }, { lambda: 2, mu: 5 }] })
    const b = calc('mm1', { v: { lambda: 3, mu: 5 } })
    expect(get(r, 'Wq')).toBeCloseTo(get(b, 'Wq'), 10)
    expect(r.perClass![0].Wq).toBeLessThan(r.perClass![1].Wq)
  })
  it('preemptivo: a classe 1 não enxerga as outras', () => {
    const r = calc('prio', { v: {}, classes: [{ lambda: 1, mu: 5 }, { lambda: 2, mu: 5 }], preemptive: true })
    expect(r.perClass![0].W).toBeCloseTo(1 / (5 - 1), 10)
  })
})

describe('Aproximações G/G', () => {
  it('Kingman com Cₐ = Cₛ = 1 é igual à M/M/1', () => {
    const a = calc('gg1', { v: { lambda: 4, mu: 5, ca: 1, cs: 1 } })
    const b = calc('mm1', { v: { lambda: 4, mu: 5 } })
    expect(get(a, 'Wq')).toBeCloseTo(get(b, 'Wq'), 10)
  })
  it('Allen-Cunneen com Cₐ = Cₛ = 1 é igual à M/M/c', () => {
    const a = calc('ggc', { v: { lambda: 10, mu: 4, c: 3, ca: 1, cs: 1 } })
    const b = calc('mmc', { v: { lambda: 10, mu: 4, c: 3 } })
    expect(get(a, 'Wq')).toBeCloseTo(get(b, 'Wq'), 10)
  })
})

describe('Conversão de unidades', () => {
  it('600/min e 80/s viram 10/s e 80/s', () => {
    const preset = PRESETS.find((p) => p.id === 'web')!
    const { input, conversions } = prepare(MODEL_BY_ID.mm1, { values: preset.values, units: preset.units, classes: [], preemptive: false, out: 's' })
    expect(input.v.lambda).toBeCloseTo(10, 12)
    expect(input.v.mu).toBe(80)
    expect(conversions).toHaveLength(1)
  })
})

describe('Simulação', () => {
  it('reproduz a tabela da secretaria acadêmica (D/D/1 com 5 alunos esperando)', () => {
    const spec = MODEL_BY_ID.dd1.sim!({ v: { lambda: 1 / 8, mu: 1 / 5 } })
    const r = simulate(spec, { customers: 6, seed: 1, initial: 5 })
    const at = (time: number) => r.events.filter((e) => e.t <= time + 1e-9).at(-1)!
    expect([at(5).served, at(5).arrivals - 5, at(5).nSystem]).toEqual([1, 0, 4])
    expect([at(8).served, at(8).arrivals - 5, at(8).nSystem]).toEqual([1, 1, 5])
    expect([at(30).served, at(30).arrivals - 5, at(30).nSystem]).toEqual([6, 3, 2])
    expect([at(55).served, at(55).arrivals - 5, at(55).nSystem]).toEqual([11, 6, 0])
  })
  it('M/M/1 simulada se aproxima da fórmula', () => {
    const spec = MODEL_BY_ID.mm1.sim!({ v: { lambda: 5, mu: 10 } })
    const r = simulate(spec, { customers: 40000, seed: 42, initial: 0 })
    expect(r.stats.W).toBeGreaterThan(0.2 * 0.93)
    expect(r.stats.W).toBeLessThan(0.2 * 1.07)
    expect(r.stats.rho).toBeCloseTo(0.5, 1)
  })
  it('M/M/1/K simulada reproduz a probabilidade de bloqueio', () => {
    const spec = MODEL_BY_ID.mm1k.sim!({ v: { lambda: 3, mu: 3, K: 4 } })
    const r = simulate(spec, { customers: 40000, seed: 7, initial: 0 })
    expect(r.stats.Pblock).toBeCloseTo(0.2, 1)
  })
  it('a mesma semente gera o mesmo resultado', () => {
    const spec = MODEL_BY_ID.mmc.sim!({ v: { lambda: 10, mu: 6, c: 2 } })
    const a = simulate(spec, { customers: 500, seed: 3, initial: 0 })
    const b = simulate(spec, { customers: 500, seed: 3, initial: 0 })
    expect(a.stats.W).toBe(b.stats.W)
  })
  it('prioridade: a simulação segue o modo escolhido (preemptivo ou não)', () => {
    const classes = [{ lambda: 1, mu: 5 }, { lambda: 2, mu: 5 }]
    const W1 = (preemptive: boolean) => {
      const spec = MODEL_BY_ID.prio.sim!({ v: {}, classes, preemptive })
      const r = simulate(spec, { customers: 60000, seed: 11, initial: 0 })
      const c1 = r.customers.filter((c) => c.cls === 0)
      return c1.reduce((s, c) => s + c.system, 0) / c1.length
    }
    for (const preemptive of [false, true]) {
      const theory = calc('prio', { v: {}, classes, preemptive }).perClass![0].W
      expect(Math.abs(W1(preemptive) - theory) / theory).toBeLessThan(0.05)
    }
  })
  it('prioridade preemptiva: E[w] = tempo no sistema − atendimento, e a média geral bate com a fórmula', () => {
    const classes = [{ lambda: 1, mu: 5 }, { lambda: 2, mu: 5 }]
    const spec = MODEL_BY_ID.prio.sim!({ v: {}, classes, preemptive: true })
    const r = simulate(spec, { customers: 60000, seed: 5, initial: 0 })
    expect(r.customers.some((c) => c.preemptions > 0)).toBe(true)
    for (const c of r.customers) expect(c.wait).toBeCloseTo(c.system - c.service, 9)
    const theory = calc('prio', { v: {}, classes, preemptive: true })
    expect(Math.abs(r.stats.W - get(theory, 'W')) / get(theory, 'W')).toBeLessThan(0.05)
  })
})
