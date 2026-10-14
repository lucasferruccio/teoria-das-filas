// Catálogo de modelos de filas: parâmetros, fórmulas (em KaTeX), cálculo e configuração de simulação.
// Convenção: todas as taxas chegam aqui já convertidas para a MESMA unidade de tempo
// (a unidade escolhida para os resultados). Tempos saem nessa mesma unidade.

import { fmt, tex as t } from './format'
import type { MetricKey } from './metrics'
import {
  erlangB,
  erlangC,
  finitePopProbs,
  mmcP0,
  mmckProbs,
  sum,
} from './queueing'
import type { Dist, SimSpec } from './simulation'

const R = String.raw

export type ParamKind = 'rate' | 'int' | 'cv'

export interface ParamDef {
  key: string
  label: string
  symbol: string
  kind: ParamKind
  def: number
  min: number
  max?: number
  step?: number
  gloss: string
  help: string
}

export interface PriorityClass {
  lambda: number
  mu: number
}

export interface ModelInput {
  v: Record<string, number>
  classes?: PriorityClass[]
  preemptive?: boolean
}

export interface MetricOut {
  key: MetricKey
  value: number
  /** Fórmula simbólica (lado esquerdo = expressão). */
  tex: string
  /** Substituição numérica (opcional). */
  sub?: string
  approx?: boolean
  note?: string
}

export interface ClassOut {
  name: string
  lambda: number
  mu: number
  rho: number
  Wq: number
  W: number
  Lq: number
  L: number
}

export interface ModelResult {
  stable: boolean
  stability: { tex: string; sub: string; msg: string }
  metrics: MetricOut[]
  perClass?: ClassOut[]
  notes: string[]
}

export interface ModelDef {
  id: string
  kendall: (v: Record<string, number>) => string
  name: string
  level: 1 | 2
  short: string
  when: string
  assumptions: string[]
  exact: boolean
  refs: string[]
  params: ParamDef[]
  hasClasses?: boolean
  /** Âncora da seção da aba Aprender. */
  anchor: string
  validate?: (inp: ModelInput) => string | null
  compute: (inp: ModelInput) => ModelResult
  sim?: (inp: ModelInput) => SimSpec
}

// ---------------------------------------------------------------- parâmetros comuns

const P_LAMBDA: ParamDef = {
  key: 'lambda', label: 'Taxa de chegada', symbol: '\\lambda', kind: 'rate', def: 10, min: 0,
  gloss: 'lambda', help: 'Quantos clientes chegam, em média, por unidade de tempo.',
}
const P_MU: ParamDef = {
  key: 'mu', label: 'Taxa de atendimento (por servidor)', symbol: '\\mu', kind: 'rate', def: 12, min: 0,
  gloss: 'mu', help: 'Quantos clientes UM servidor atende, em média, por unidade de tempo (1 / tempo médio de atendimento).',
}
const P_C: ParamDef = {
  key: 'c', label: 'Número de servidores', symbol: 'c', kind: 'int', def: 2, min: 1, max: 500, step: 1,
  gloss: 'c', help: 'Quantos atendentes trabalham em paralelo, com uma fila única.',
}
const P_K: ParamDef = {
  key: 'K', label: 'Capacidade do sistema', symbol: 'K', kind: 'int', def: 5, min: 1, max: 2000, step: 1,
  gloss: 'K', help: 'Máximo de clientes no sistema (na fila + em atendimento). Quem chega com o sistema cheio é recusado.',
}
const P_CS: ParamDef = {
  key: 'cs', label: 'Variabilidade do atendimento', symbol: 'C_s', kind: 'cv', def: 0.5, min: 0, max: 10, step: 0.1,
  gloss: 'cs', help: 'Coeficiente de variação do tempo de atendimento (desvio padrão ÷ média). 0 = constante, 1 = exponencial.',
}
const P_CA: ParamDef = {
  key: 'ca', label: 'Variabilidade das chegadas', symbol: 'C_a', kind: 'cv', def: 1, min: 0, max: 10, step: 0.1,
  gloss: 'ca', help: 'Coeficiente de variação do intervalo entre chegadas. 1 = Poisson, 0 = intervalos fixos.',
}

// ---------------------------------------------------------------- utilidades

const INF = Infinity

function stableMsg(rho: number, cap = false): string {
  if (cap) return 'Sistemas com capacidade ou população finita são sempre estáveis: o excesso de clientes é recusado ou deixa de chegar.'
  return rho < 1
    ? `O sistema é estável: os servidores dão conta da demanda e ficam ocupados ${(rho * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do tempo.`
    : 'O sistema é instável: chegam mais clientes do que é possível atender, então a fila cresce sem limite. Aumente μ, aumente o número de servidores ou reduza λ.'
}

export function dist(mean: number, cv: number): Dist {
  if (cv <= 1e-12) return { kind: 'det', mean }
  if (Math.abs(cv - 1) < 1e-12) return { kind: 'exp', mean }
  return { kind: 'gamma', mean, shape: 1 / (cv * cv) }
}

const expD = (rate: number): Dist => ({ kind: 'exp', mean: 1 / rate })

function unstable(rho: number, stabTex: string, stabSub: string, extra: MetricOut[] = []): ModelResult {
  return {
    stable: false,
    stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
    metrics: extra,
    notes: [],
  }
}

function positive(...vals: [string, number][]): string | null {
  for (const [name, x] of vals) {
    if (!Number.isFinite(x) || x <= 0) return `${name} precisa ser um número maior que zero.`
  }
  return null
}

// ---------------------------------------------------------------- M/M/1

const mm1: ModelDef = {
  id: 'mm1',
  kendall: () => 'M/M/1',
  name: 'Um servidor, chegadas e atendimentos aleatórios',
  level: 1,
  short: 'O sistema clássico: chegadas de Poisson, atendimento exponencial, um servidor.',
  when: 'Um único atendente (um caixa, um servidor web, uma impressora) com chegadas aleatórias e tempos de atendimento bem variáveis.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Tempo de atendimento exponencial com taxa μ', '1 servidor, fila FCFS', 'Capacidade e população ilimitadas'],
  exact: true,
  refs: ['jain', 'gross'],
  params: [P_LAMBDA, { ...P_MU, def: 80 }],
  anchor: 'mod-mm1',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu]),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const rho = l / m
    const stabTex = R`\rho = \dfrac{\lambda}{\mu} < 1`
    const stabSub = R`\rho = \dfrac{${t(l)}}{${t(m)}} = ${t(rho)}`
    const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` }
    if (rho >= 1) return unstable(rho, stabTex, stabSub, [rhoM])
    const Wq = rho / (m * (1 - rho))
    const W = 1 / (m * (1 - rho))
    return {
      stable: true,
      stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
      notes: [],
      metrics: [
        rhoM,
        { key: 'Es', value: 1 / m, tex: R`E[s] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
        { key: 'P0', value: 1 - rho, tex: R`P_0 = 1 - \rho`, sub: R`1 - ${t(rho)}` },
        { key: 'Pwait', value: rho, tex: R`P(\text{espera}) = \rho`, sub: t(rho) },
        { key: 'L', value: rho / (1 - rho), tex: R`E[n] = \dfrac{\rho}{1-\rho}`, sub: R`\dfrac{${t(rho)}}{1-${t(rho)}}` },
        { key: 'Lq', value: (rho * rho) / (1 - rho), tex: R`E[n_w] = \dfrac{\rho^2}{1-\rho}`, sub: R`\dfrac{${t(rho)}^2}{1-${t(rho)}}` },
        { key: 'W', value: W, tex: R`E[r] = \dfrac{1}{\mu\,(1-\rho)}`, sub: R`\dfrac{1}{${t(m)}\times(1-${t(rho)})}` },
        { key: 'Wq', value: Wq, tex: R`E[w] = \dfrac{\rho}{\mu\,(1-\rho)}`, sub: R`\dfrac{${t(rho)}}{${t(m)}\times(1-${t(rho)})}` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: 1, K: INF }),
}

// ---------------------------------------------------------------- M/M/c

function mmcCompute(l: number, m: number, c: number): ModelResult {
  const a = l / m
  const rho = a / c
  const stabTex = R`\rho = \dfrac{\lambda}{c\,\mu} < 1`
  const stabSub = R`\rho = \dfrac{${t(l)}}{${c}\times ${t(m)}} = ${t(rho)}`
  const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \dfrac{\lambda}{c\,\mu}`, sub: R`\dfrac{${t(l)}}{${c}\times ${t(m)}}` }
  const aM: MetricOut = { key: 'a', value: a, tex: R`a = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` }
  if (rho >= 1) return unstable(rho, stabTex, stabSub, [rhoM, aM])
  const P0 = mmcP0(c, a)
  const C = erlangC(c, a)
  const Lq = (C * rho) / (1 - rho)
  const Wq = C / (c * m - l)
  const W = Wq + 1 / m
  const L = l * W
  return {
    stable: true,
    stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
    notes: [],
    metrics: [
      rhoM,
      aM,
      { key: 'Es', value: 1 / m, tex: R`E[s] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
      {
        key: 'P0', value: P0,
        tex: R`P_0 = \left[\sum_{n=0}^{c-1}\dfrac{a^n}{n!} + \dfrac{a^c}{c!\,(1-\rho)}\right]^{-1}`,
        sub: R`\left[\sum_{n=0}^{${c - 1}}\dfrac{${t(a)}^n}{n!} + \dfrac{${t(a)}^{${c}}}{${c}!\,(1-${t(rho)})}\right]^{-1}`,
      },
      {
        key: 'Pwait', value: C,
        tex: R`C(c,a) = \dfrac{a^c}{c!\,(1-\rho)}\,P_0`,
        sub: R`\dfrac{${t(a)}^{${c}}}{${c}!\,(1-${t(rho)})}\times ${t(P0)}`,
        note: 'Fórmula de Erlang C: probabilidade de todos os servidores estarem ocupados quando o cliente chega.',
      },
      { key: 'Lq', value: Lq, tex: R`E[n_w] = C(c,a)\,\dfrac{\rho}{1-\rho}`, sub: R`${t(C)}\times\dfrac{${t(rho)}}{1-${t(rho)}}` },
      { key: 'Ls', value: a, tex: R`E[n_s] = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` },
      { key: 'L', value: L, tex: R`E[n] = \lambda\,E[r]`, sub: R`${t(l)}\times ${t(W)}`, note: 'Lei de Little.' },
      { key: 'Wq', value: Wq, tex: R`E[w] = \dfrac{C(c,a)}{c\,\mu - \lambda}`, sub: R`\dfrac{${t(C)}}{${c}\times ${t(m)} - ${t(l)}}` },
      { key: 'W', value: W, tex: R`E[r] = E[w] + \dfrac{1}{\mu}`, sub: R`${t(Wq)} + \dfrac{1}{${t(m)}}` },
    ],
  }
}

const mmc: ModelDef = {
  id: 'mmc',
  kendall: (v) => `M/M/${v.c ?? 'c'}`,
  name: 'Vários servidores com fila única',
  level: 1,
  short: 'Chegadas de Poisson, atendimento exponencial e c servidores em paralelo (fórmula de Erlang C).',
  when: 'Bancos, call centers, guichês com fila única e várias instâncias de um servidor de software.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento exponencial, taxa μ por servidor', 'c servidores idênticos, uma fila FCFS', 'Capacidade e população ilimitadas'],
  exact: true,
  refs: ['gross', 'jain', 'erlang17'],
  params: [P_LAMBDA, P_MU, P_C],
  anchor: 'mod-mmc',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu], ['c', v.c]),
  compute: ({ v }) => mmcCompute(v.lambda, v.mu, Math.round(v.c)),
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: Math.round(v.c), K: INF }),
}

// ---------------------------------------------------------------- M/M/1/K

const mm1k: ModelDef = {
  id: 'mm1k',
  kendall: (v) => `M/M/1/${v.K ?? 'K'}`,
  name: 'Um servidor com capacidade limitada',
  level: 1,
  short: 'Como a M/M/1, mas cabem no máximo K clientes no sistema; quem chega com ele cheio é recusado.',
  when: 'Sala de espera com cadeiras limitadas, buffer de roteador, fila de mensagens com tamanho máximo.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento exponencial com taxa μ', '1 servidor, fila FCFS', 'No máximo K clientes no sistema (incluindo o que está em atendimento)'],
  exact: true,
  refs: ['gross', 'jain'],
  params: [P_LAMBDA, P_MU, P_K],
  anchor: 'mod-mm1k',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu], ['K', v.K]),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const K = Math.round(v.K)
    const r = l / m
    const one = Math.abs(r - 1) < 1e-9
    const P0 = one ? 1 / (K + 1) : (1 - r) / (1 - r ** (K + 1))
    const PK = one ? 1 / (K + 1) : r ** K * P0
    const lef = l * (1 - PK)
    const L = one ? K / 2 : r / (1 - r) - ((K + 1) * r ** (K + 1)) / (1 - r ** (K + 1))
    const Lq = L - (1 - P0)
    const W = L / lef
    const Wq = Lq / lef
    const Pwait = (1 - P0 - PK) / (1 - PK)
    return {
      stable: true,
      stability: {
        tex: R`K = ${K} < \infty`,
        sub: R`\dfrac{\lambda}{\mu} = ${t(r)}`,
        msg: stableMsg(r, true) + (r >= 1 ? ' Aqui λ/μ ≥ 1, então o sistema vive cheio e recusa muitos clientes.' : ''),
      },
      notes: [],
      metrics: [
        { key: 'a', value: r, tex: R`a = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}`, note: 'Aqui pode passar de 1, porque o excesso é recusado.' },
        one
          ? { key: 'P0', value: P0, tex: R`P_0 = \dfrac{1}{K+1}`, sub: R`\dfrac{1}{${K}+1}` }
          : { key: 'P0', value: P0, tex: R`P_0 = \dfrac{1-a}{1-a^{K+1}}`, sub: R`\dfrac{1-${t(r)}}{1-${t(r)}^{${K + 1}}}` },
        { key: 'Pblock', value: PK, tex: R`P_K = a^K\,P_0`, sub: R`${t(r)}^{${K}}\times ${t(P0)}`, note: 'Fração dos clientes que chegam e são recusados.' },
        { key: 'lambdaEff', value: lef, tex: R`\lambda_{ef} = \lambda\,(1-P_K)`, sub: R`${t(l)}\times(1-${t(PK)})` },
        { key: 'rho', value: 1 - P0, tex: R`\rho = 1-P_0 = \dfrac{\lambda_{ef}}{\mu}`, sub: R`1-${t(P0)}`, note: 'Utilização real do servidor.' },
        { key: 'Pwait', value: Pwait, tex: R`P(\text{espera}) = \dfrac{1-P_0-P_K}{1-P_K}`, sub: R`\dfrac{1-${t(P0)}-${t(PK)}}{1-${t(PK)}}`, note: 'Entre os clientes aceitos.' },
        one
          ? { key: 'L', value: L, tex: R`E[n] = \dfrac{K}{2}`, sub: R`\dfrac{${K}}{2}` }
          : { key: 'L', value: L, tex: R`E[n] = \dfrac{a}{1-a} - \dfrac{(K+1)\,a^{K+1}}{1-a^{K+1}}`, sub: R`\dfrac{${t(r)}}{1-${t(r)}} - \dfrac{${K + 1}\times ${t(r)}^{${K + 1}}}{1-${t(r)}^{${K + 1}}}` },
        { key: 'Lq', value: Lq, tex: R`E[n_w] = E[n] - (1-P_0)`, sub: R`${t(L)} - (1-${t(P0)})` },
        { key: 'W', value: W, tex: R`E[r] = \dfrac{E[n]}{\lambda_{ef}}`, sub: R`\dfrac{${t(L)}}{${t(lef)}}`, note: 'Lei de Little com a taxa efetiva.' },
        { key: 'Wq', value: Wq, tex: R`E[w] = \dfrac{E[n_w]}{\lambda_{ef}}`, sub: R`\dfrac{${t(Lq)}}{${t(lef)}}` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: 1, K: Math.round(v.K) }),
}

// ---------------------------------------------------------------- M/M/c/K

const mmck: ModelDef = {
  id: 'mmck',
  kendall: (v) => `M/M/${v.c ?? 'c'}/${v.K ?? 'K'}`,
  name: 'Vários servidores com capacidade limitada',
  level: 1,
  short: 'c servidores e no máximo K clientes no sistema. Generaliza a M/M/1/K.',
  when: 'Consultório com poucos médicos e sala de espera pequena, pool de conexões com fila limitada.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento exponencial, taxa μ por servidor', 'c servidores, fila FCFS', 'No máximo K ≥ c clientes no sistema'],
  exact: true,
  refs: ['gross', 'hillier'],
  params: [P_LAMBDA, P_MU, P_C, { ...P_K, def: 6 }],
  anchor: 'mod-mmck',
  validate: ({ v }) =>
    positive(['λ', v.lambda], ['μ', v.mu], ['c', v.c], ['K', v.K]) ??
    (Math.round(v.K) < Math.round(v.c) ? 'A capacidade K precisa ser maior ou igual ao número de servidores c.' : null),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const c = Math.round(v.c)
    const K = Math.round(v.K)
    const a = l / m
    const P = mmckProbs(l, m, c, K)
    const P0 = P[0]
    const PK = P[K]
    const lef = l * (1 - PK)
    const Lq = sum(P, (p, n) => (n > c ? (n - c) * p : 0))
    const Ls = lef / m
    const L = Lq + Ls
    const Pwait = sum(P, (p, n) => (n >= c && n < K ? p : 0)) / (1 - PK)
    return {
      stable: true,
      stability: { tex: R`K = ${K} < \infty`, sub: R`\dfrac{\lambda}{c\,\mu} = ${t(a / c)}`, msg: stableMsg(a / c, true) },
      notes: ['As probabilidades P_n são calculadas exatamente pelas equações de equilíbrio do processo de nascimento e morte.'],
      metrics: [
        { key: 'a', value: a, tex: R`a = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` },
        {
          key: 'P0', value: P0,
          tex: R`P_0 = \left[\sum_{n=0}^{c}\dfrac{a^n}{n!} + \dfrac{a^c}{c!}\sum_{n=c+1}^{K}\left(\dfrac{a}{c}\right)^{n-c}\right]^{-1}`,
          sub: R`\left[\sum_{n=0}^{${c}}\dfrac{${t(a)}^n}{n!} + \dfrac{${t(a)}^{${c}}}{${c}!}\sum_{n=${c + 1}}^{${K}}\left(\dfrac{${t(a)}}{${c}}\right)^{n-${c}}\right]^{-1}`,
        },
        { key: 'Pblock', value: PK, tex: R`P_K = \dfrac{a^K}{c!\,c^{K-c}}\,P_0`, sub: R`\dfrac{${t(a)}^{${K}}}{${c}!\times ${c}^{${K - c}}}\times ${t(P0)}` },
        { key: 'lambdaEff', value: lef, tex: R`\lambda_{ef} = \lambda\,(1-P_K)`, sub: R`${t(l)}\times(1-${t(PK)})` },
        { key: 'rho', value: lef / (c * m), tex: R`\rho = \dfrac{\lambda_{ef}}{c\,\mu}`, sub: R`\dfrac{${t(lef)}}{${c}\times ${t(m)}}` },
        { key: 'Pwait', value: Pwait, tex: R`P(\text{espera}) = \dfrac{\sum_{n=c}^{K-1} P_n}{1-P_K}`, note: 'Entre os clientes aceitos.' },
        { key: 'Lq', value: Lq, tex: R`E[n_w] = \sum_{n=c+1}^{K}(n-c)\,P_n` },
        { key: 'Ls', value: Ls, tex: R`E[n_s] = \dfrac{\lambda_{ef}}{\mu}`, sub: R`\dfrac{${t(lef)}}{${t(m)}}` },
        { key: 'L', value: L, tex: R`E[n] = E[n_w] + E[n_s]`, sub: R`${t(Lq)} + ${t(Ls)}` },
        { key: 'W', value: L / lef, tex: R`E[r] = \dfrac{E[n]}{\lambda_{ef}}`, sub: R`\dfrac{${t(L)}}{${t(lef)}}` },
        { key: 'Wq', value: Lq / lef, tex: R`E[w] = \dfrac{E[n_w]}{\lambda_{ef}}`, sub: R`\dfrac{${t(Lq)}}{${t(lef)}}` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: Math.round(v.c), K: Math.round(v.K) }),
}

// ---------------------------------------------------------------- M/M/c/c (Erlang B)

const mmcc: ModelDef = {
  id: 'mmcc',
  kendall: (v) => `M/M/${v.c ?? 'c'}/${v.c ?? 'c'}`,
  name: 'Sistema de perda, sem fila (Erlang B)',
  level: 1,
  short: 'c servidores e nenhum lugar de espera: se todos estão ocupados, o cliente é perdido.',
  when: 'Linhas telefônicas, vagas de estacionamento, leitos de UTI, licenças de software simultâneas.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento exponencial, taxa μ por servidor (o resultado vale para qualquer distribuição)', 'c servidores e capacidade K = c'],
  exact: true,
  refs: ['erlang17', 'gross'],
  params: [P_LAMBDA, P_MU, { ...P_C, def: 3 }],
  anchor: 'mod-mmcc',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu], ['c', v.c]),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const c = Math.round(v.c)
    const a = l / m
    const B = erlangB(c, a)
    const lef = l * (1 - B)
    const Ls = a * (1 - B)
    return {
      stable: true,
      stability: { tex: R`K = c = ${c}`, sub: R`a = ${t(a)}`, msg: stableMsg(a / c, true) },
      notes: ['Não há fila: o tempo de espera é zero para quem entra.'],
      metrics: [
        { key: 'a', value: a, tex: R`a = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` },
        {
          key: 'Pblock', value: B,
          tex: R`B(c,a) = \dfrac{a^c/c!}{\sum_{k=0}^{c} a^k/k!}`,
          sub: R`\dfrac{${t(a)}^{${c}}/${c}!}{\sum_{k=0}^{${c}} ${t(a)}^k/k!}`,
          note: 'Fórmula de Erlang B.',
        },
        { key: 'lambdaEff', value: lef, tex: R`\lambda_{ef} = \lambda\,(1-B)`, sub: R`${t(l)}\times(1-${t(B)})` },
        { key: 'rho', value: Ls / c, tex: R`\rho = \dfrac{a\,(1-B)}{c}`, sub: R`\dfrac{${t(a)}\times(1-${t(B)})}{${c}}` },
        { key: 'Ls', value: Ls, tex: R`E[n] = E[n_s] = a\,(1-B)`, sub: R`${t(a)}\times(1-${t(B)})` },
        { key: 'L', value: Ls, tex: R`E[n] = E[n_s]`, sub: t(Ls) },
        { key: 'Lq', value: 0, tex: R`E[n_w] = 0` },
        { key: 'W', value: 1 / m, tex: R`E[r] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
        { key: 'Wq', value: 0, tex: R`E[w] = 0` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: Math.round(v.c), K: Math.round(v.c) }),
}

// ---------------------------------------------------------------- M/M/∞

const mminf: ModelDef = {
  id: 'mminf',
  kendall: () => 'M/M/∞',
  name: 'Servidores ilimitados (autoatendimento)',
  level: 1,
  short: 'Cada cliente que chega é atendido na hora: nunca há fila.',
  when: 'Autoatendimento, usuários navegando num site, pessoas dentro de um parque, chamadas num sistema muito grande.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento exponencial com taxa μ (o resultado de E[n] vale para qualquer distribuição)', 'Infinitos servidores'],
  exact: true,
  refs: ['gross', 'kleinrock'],
  params: [P_LAMBDA, P_MU],
  anchor: 'mod-mminf',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu]),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const a = l / m
    return {
      stable: true,
      stability: { tex: R`c = \infty`, sub: R`a = ${t(a)}`, msg: 'Com infinitos servidores o sistema é sempre estável e ninguém espera.' },
      notes: ['O número de clientes no sistema segue uma distribuição de Poisson com média a = λ/μ.'],
      metrics: [
        { key: 'a', value: a, tex: R`a = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` },
        { key: 'P0', value: Math.exp(-a), tex: R`P_0 = e^{-a}`, sub: R`e^{-${t(a)}}` },
        { key: 'L', value: a, tex: R`E[n] = a`, sub: t(a) },
        { key: 'Ls', value: a, tex: R`E[n_s] = a`, sub: t(a) },
        { key: 'Lq', value: 0, tex: R`E[n_w] = 0` },
        { key: 'W', value: 1 / m, tex: R`E[r] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
        { key: 'Wq', value: 0, tex: R`E[w] = 0` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: INF, K: INF }),
}

// ---------------------------------------------------------------- M/G/1 e casos particulares

function mg1Core(l: number, m: number, cs2: number, lqTex: string, lqSub: (rho: string) => string): ModelResult {
  const rho = l / m
  const stabTex = R`\rho = \dfrac{\lambda}{\mu} < 1`
  const stabSub = R`\rho = \dfrac{${t(l)}}{${t(m)}} = ${t(rho)}`
  const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` }
  if (rho >= 1) return unstable(rho, stabTex, stabSub, [rhoM])
  const Lq = (rho * rho * (1 + cs2)) / (2 * (1 - rho))
  const Wq = Lq / l
  const W = Wq + 1 / m
  return {
    stable: true,
    stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
    notes: [],
    metrics: [
      rhoM,
      { key: 'Es', value: 1 / m, tex: R`E[s] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
      { key: 'P0', value: 1 - rho, tex: R`P_0 = 1 - \rho`, sub: R`1 - ${t(rho)}` },
      { key: 'Pwait', value: rho, tex: R`P(\text{espera}) = \rho`, sub: t(rho) },
      { key: 'Lq', value: Lq, tex: lqTex, sub: lqSub(t(rho)), note: 'Fórmula de Pollaczek-Khinchine.' },
      { key: 'L', value: Lq + rho, tex: R`E[n] = E[n_w] + \rho`, sub: R`${t(Lq)} + ${t(rho)}` },
      { key: 'Wq', value: Wq, tex: R`E[w] = \dfrac{E[n_w]}{\lambda}`, sub: R`\dfrac{${t(Lq)}}{${t(l)}}`, note: 'Lei de Little aplicada à fila.' },
      { key: 'W', value: W, tex: R`E[r] = E[w] + \dfrac{1}{\mu}`, sub: R`${t(Wq)} + \dfrac{1}{${t(m)}}` },
    ],
  }
}

const mg1: ModelDef = {
  id: 'mg1',
  kendall: () => 'M/G/1',
  name: 'Um servidor, atendimento com qualquer distribuição',
  level: 1,
  short: 'Chegadas de Poisson e tempo de atendimento geral, descrito pela média e pela variabilidade (fórmula de Pollaczek-Khinchine).',
  when: 'Quando o tempo de atendimento não é exponencial: atendimento médico, processos industriais, requisições com tamanhos variados.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento com média 1/μ e coeficiente de variação Cₛ', '1 servidor, fila FCFS'],
  exact: true,
  refs: ['kleinrock', 'gross', 'jain'],
  params: [P_LAMBDA, P_MU, P_CS],
  anchor: 'mod-mg1',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu]) ?? (v.cs < 0 ? 'Cₛ não pode ser negativo.' : null),
  compute: ({ v }) => {
    const r = mg1Core(
      v.lambda, v.mu, v.cs * v.cs,
      R`E[n_w] = \dfrac{\rho^2\,(1+C_s^2)}{2\,(1-\rho)}`,
      (rho) => R`\dfrac{${rho}^2\times(1+${t(v.cs)}^2)}{2\times(1-${rho})}`,
    )
    r.notes.push(`Desvio padrão do atendimento: σ = Cₛ/μ ≈ ${fmt(v.cs / v.mu)} (na unidade de tempo dos resultados).`)
    return r
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: dist(1 / v.mu, v.cs) }], c: 1, K: INF }),
}

const md1: ModelDef = {
  id: 'md1',
  kendall: () => 'M/D/1',
  name: 'Um servidor com atendimento constante',
  level: 1,
  short: 'Caso da M/G/1 com tempo de atendimento sempre igual (Cₛ = 0). A espera é metade da M/M/1.',
  when: 'Máquinas automáticas, lava-rápido automático, transmissão de pacotes de tamanho fixo.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento sempre igual a 1/μ', '1 servidor, fila FCFS'],
  exact: true,
  refs: ['kleinrock', 'gross'],
  params: [P_LAMBDA, P_MU],
  anchor: 'mod-mg1',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu]),
  compute: ({ v }) =>
    mg1Core(v.lambda, v.mu, 0, R`E[n_w] = \dfrac{\rho^2}{2\,(1-\rho)}`, (rho) => R`\dfrac{${rho}^2}{2\times(1-${rho})}`),
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: { kind: 'det', mean: 1 / v.mu } }], c: 1, K: INF }),
}

const mek1: ModelDef = {
  id: 'mek1',
  kendall: (v) => `M/E${toSub(v.k ?? 2)}/1`,
  name: 'Um servidor com atendimento de Erlang',
  level: 1,
  short: 'Caso da M/G/1 em que o atendimento é feito em k etapas exponenciais (Cₛ² = 1/k).',
  when: 'Atendimentos em várias etapas parecidas (ex.: triagem em k passos), mais regulares que a exponencial.',
  assumptions: ['Chegadas de Poisson com taxa λ', 'Atendimento Erlang-k com média 1/μ', '1 servidor, fila FCFS'],
  exact: true,
  refs: ['gross', 'kleinrock'],
  params: [P_LAMBDA, P_MU, { key: 'k', label: 'Número de fases', symbol: 'k', kind: 'int', def: 2, min: 1, max: 100, step: 1, gloss: 'k', help: 'Quantas etapas exponenciais compõem o atendimento. k = 1 é exponencial; quanto maior, mais regular.' }],
  anchor: 'mod-mg1',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu], ['k', v.k]),
  compute: ({ v }) => {
    const k = Math.round(v.k)
    return mg1Core(
      v.lambda, v.mu, 1 / k,
      R`E[n_w] = \dfrac{\rho^2}{2\,(1-\rho)}\cdot\dfrac{k+1}{k}`,
      (rho) => R`\dfrac{${rho}^2}{2\times(1-${rho})}\times\dfrac{${k + 1}}{${k}}`,
    )
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: { kind: 'gamma', mean: 1 / v.mu, shape: Math.round(v.k) } }], c: 1, K: INF }),
}

function toSub(n: number): string {
  return String(Math.round(n)).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]).join('')
}

// ---------------------------------------------------------------- D/D/1

const dd1: ModelDef = {
  id: 'dd1',
  kendall: () => 'D/D/1',
  name: 'Tudo determinístico (sem aleatoriedade)',
  level: 2,
  short: 'Chegadas em intervalos fixos e atendimento de duração fixa, como na tabela da secretaria acadêmica.',
  when: 'Linhas de produção cadenciadas, ou como ponto de partida didático (o exemplo da secretaria acadêmica).',
  assumptions: ['Intervalo fixo 1/λ entre chegadas', 'Atendimento fixo 1/μ', '1 servidor, fila FCFS'],
  exact: true,
  refs: ['gross'],
  params: [{ ...P_LAMBDA, def: 0.125 }, { ...P_MU, def: 0.2 }],
  anchor: 'mod-dd1',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu]),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const rho = l / m
    const stabTex = R`\rho = \dfrac{\lambda}{\mu} < 1`
    const stabSub = R`\rho = \dfrac{${t(l)}}{${t(m)}} = ${t(rho)}`
    const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` }
    if (rho > 1) return unstable(rho, stabTex, stabSub, [rhoM])
    return {
      stable: true,
      stability: { tex: R`\rho = \dfrac{\lambda}{\mu} \le 1`, sub: stabSub, msg: 'Sem aleatoriedade, nenhum cliente espera enquanto o atendimento for mais curto que o intervalo entre chegadas.' },
      notes: ['Em regime permanente não há fila. Se o sistema começa com clientes acumulados (como os 5 alunos esperando na abertura da secretaria), a fila diminui aos poucos: use a aba "Ao longo do tempo" para ver a tabela.'],
      metrics: [
        rhoM,
        { key: 'Es', value: 1 / m, tex: R`E[s] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
        { key: 'L', value: rho, tex: R`E[n] = \rho`, sub: t(rho), note: 'Média no tempo: o servidor está ocupado uma fração ρ do tempo.' },
        { key: 'Lq', value: 0, tex: R`E[n_w] = 0` },
        { key: 'W', value: 1 / m, tex: R`E[r] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
        { key: 'Wq', value: 0, tex: R`E[w] = 0` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: { kind: 'det', mean: 1 / v.lambda }, service: { kind: 'det', mean: 1 / v.mu } }], c: 1, K: INF }),
}

// ---------------------------------------------------------------- População finita

const finite: ModelDef = {
  id: 'finite',
  kendall: (v) => `M/M/${v.c ?? 'c'}//${v.N ?? 'N'}`,
  name: 'População finita (modelo de reparo de máquinas)',
  level: 2,
  short: 'Só N clientes existem. Quem está no sistema não pode chegar de novo, então as chegadas diminuem quando a fila cresce.',
  when: 'N máquinas que quebram e esperam técnicos, N terminais usando um servidor, poucos clientes fixos.',
  assumptions: ['N clientes; cada um, quando fora do sistema, chega com taxa λ', 'Atendimento exponencial, taxa μ por servidor', 'c servidores, fila FCFS'],
  exact: true,
  refs: ['gross', 'hillier'],
  params: [
    { ...P_LAMBDA, label: 'Taxa de chegada por cliente', def: 0.1, help: 'Com que frequência UM cliente que está fora do sistema chega (ex.: taxa de quebra de uma máquina).' },
    { ...P_MU, def: 0.5 },
    { ...P_C, def: 1 },
    { key: 'N', label: 'Tamanho da população', symbol: 'N', kind: 'int', def: 5, min: 1, max: 2000, step: 1, gloss: 'N', help: 'Quantos clientes existem no total.' },
  ],
  anchor: 'mod-finita',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu], ['c', v.c], ['N', v.N]),
  compute: ({ v }) => {
    const { lambda: l, mu: m } = v
    const c = Math.round(v.c)
    const N = Math.round(v.N)
    const P = finitePopProbs(l, m, c, N)
    const P0 = P[0]
    const L = sum(P, (p, n) => n * p)
    const Lq = sum(P, (p, n) => (n > c ? (n - c) * p : 0))
    const lef = l * (N - L)
    const Ls = lef / m
    const one = c === 1
    return {
      stable: true,
      stability: { tex: R`N = ${N} < \infty`, sub: R`\dfrac{\lambda}{\mu} = ${t(l / m)}`, msg: stableMsg(0, true) },
      notes: ['P_n vem das equações de equilíbrio: a taxa de chegada no estado n é (N − n)·λ.'],
      metrics: [
        one
          ? { key: 'P0', value: P0, tex: R`P_0 = \left[\sum_{n=0}^{N}\dfrac{N!}{(N-n)!}\left(\dfrac{\lambda}{\mu}\right)^n\right]^{-1}`, sub: R`\left[\sum_{n=0}^{${N}}\dfrac{${N}!}{(${N}-n)!}\left(${t(l / m)}\right)^n\right]^{-1}` }
          : { key: 'P0', value: P0, tex: R`P_0 = \left[\sum_{n=0}^{c-1}\binom{N}{n}r^n + \sum_{n=c}^{N}\dfrac{N!\,r^n}{(N-n)!\,c!\,c^{n-c}}\right]^{-1},\; r=\dfrac{\lambda}{\mu}` },
        one
          ? { key: 'L', value: L, tex: R`E[n] = N - \dfrac{\mu}{\lambda}\,(1-P_0)`, sub: R`${N} - \dfrac{${t(m)}}{${t(l)}}\times(1-${t(P0)})` }
          : { key: 'L', value: L, tex: R`E[n] = \sum_{n=0}^{N} n\,P_n` },
        { key: 'lambdaEff', value: lef, tex: R`\lambda_{ef} = \lambda\,(N - E[n])`, sub: R`${t(l)}\times(${N} - ${t(L)})` },
        { key: 'rho', value: Ls / c, tex: R`\rho = \dfrac{\lambda_{ef}}{c\,\mu}`, sub: R`\dfrac{${t(lef)}}{${c}\times ${t(m)}}` },
        { key: 'Ls', value: Ls, tex: R`E[n_s] = \dfrac{\lambda_{ef}}{\mu}`, sub: R`\dfrac{${t(lef)}}{${t(m)}}` },
        one
          ? { key: 'Lq', value: Lq, tex: R`E[n_w] = E[n] - (1-P_0)`, sub: R`${t(L)} - (1-${t(P0)})` }
          : { key: 'Lq', value: Lq, tex: R`E[n_w] = \sum_{n=c+1}^{N}(n-c)\,P_n` },
        { key: 'W', value: L / lef, tex: R`E[r] = \dfrac{E[n]}{\lambda_{ef}}`, sub: R`\dfrac{${t(L)}}{${t(lef)}}` },
        { key: 'Wq', value: Lq / lef, tex: R`E[w] = \dfrac{E[n_w]}{\lambda_{ef}}`, sub: R`\dfrac{${t(Lq)}}{${t(lef)}}` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: expD(v.lambda), service: expD(v.mu) }], c: Math.round(v.c), K: INF, N: Math.round(v.N) }),
}

// ---------------------------------------------------------------- Prioridades

const priority: ModelDef = {
  id: 'prio',
  kendall: () => 'M/M/1 com prioridades',
  name: 'Um servidor com classes de prioridade',
  level: 2,
  short: 'Várias classes de clientes; a classe 1 é atendida primeiro. Pode ser preemptivo (interrompe) ou não.',
  when: 'Atendimento preferencial, clientes VIP, pacotes de rede com QoS, triagem hospitalar.',
  assumptions: ['Cada classe i chega como Poisson com taxa λᵢ', 'Atendimento exponencial com taxa μᵢ', '1 servidor; dentro da mesma classe, FCFS'],
  exact: true,
  refs: ['cobham54', 'kleinrock', 'hillier'],
  params: [],
  hasClasses: true,
  anchor: 'mod-prioridade',
  validate: ({ classes }) => {
    if (!classes || classes.length === 0) return 'Adicione pelo menos uma classe.'
    for (const [i, c] of classes.entries()) {
      const e = positive([`λ da classe ${i + 1}`, c.lambda], [`μ da classe ${i + 1}`, c.mu])
      if (e) return e
    }
    return null
  },
  compute: ({ classes = [], preemptive = false }) => {
    const rhos = classes.map((c) => c.lambda / c.mu)
    const sigma = rhos.reduce((acc, r) => [...acc, (acc.at(-1) ?? 0) + r], [] as number[])
    const rho = sigma.at(-1) ?? 0
    const lam = sum(classes.map((c) => c.lambda))
    const stabTex = R`\rho = \sum_i \dfrac{\lambda_i}{\mu_i} < 1`
    const stabSub = R`\rho = ${rhos.map((r) => t(r)).join(' + ')} = ${t(rho)}`
    const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \sum_i \rho_i`, sub: rhos.map((r) => t(r)).join(' + ') }
    if (rho >= 1) return unstable(rho, stabTex, stabSub, [rhoM])
    const per: ClassOut[] = classes.map((c, i) => {
      const sPrev = i === 0 ? 0 : sigma[i - 1]
      const sK = sigma[i]
      let W: number
      if (!preemptive) {
        const W0 = sum(classes.map((x) => x.lambda / (x.mu * x.mu)))
        W = W0 / ((1 - sPrev) * (1 - sK)) + 1 / c.mu
      } else {
        const Rk = sum(classes.slice(0, i + 1).map((x) => x.lambda / (x.mu * x.mu)))
        W = 1 / c.mu / (1 - sPrev) + Rk / ((1 - sPrev) * (1 - sK))
      }
      const Wq = W - 1 / c.mu
      return { name: `Classe ${i + 1}`, lambda: c.lambda, mu: c.mu, rho: rhos[i], W, Wq, L: c.lambda * W, Lq: c.lambda * Wq }
    })
    const L = sum(per.map((p) => p.L))
    const Lq = sum(per.map((p) => p.Lq))
    return {
      stable: true,
      stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
      perClass: per,
      notes: preemptive
        ? ['Preemptivo com retomada: um cliente mais prioritário interrompe o atendimento, que continua depois de onde parou. No modo preemptivo, E[w] inclui o tempo parado durante as interrupções.']
        : ['Não preemptivo: quem já está sendo atendido termina antes do próximo começar, mesmo que chegue alguém mais prioritário.'],
      metrics: [
        rhoM,
        preemptive
          ? { key: 'Wq', value: Lq / lam, tex: R`E[w]_k = \dfrac{1/\mu_k}{1-\sigma_{k-1}} + \dfrac{\sum_{i\le k}\lambda_i/\mu_i^2}{(1-\sigma_{k-1})(1-\sigma_k)} - \dfrac{1}{\mu_k}`, note: 'Valor exibido: média ponderada pelas taxas de chegada (σₖ = ρ₁ + … + ρₖ).' }
          : { key: 'Wq', value: Lq / lam, tex: R`E[w]_k = \dfrac{\sum_i \lambda_i/\mu_i^2}{(1-\sigma_{k-1})(1-\sigma_k)}`, note: 'Fórmula de Cobham. Valor exibido: média ponderada pelas taxas de chegada (σₖ = ρ₁ + … + ρₖ).' },
        { key: 'W', value: L / lam, tex: R`E[r] = \dfrac{\sum_k \lambda_k\,E[r]_k}{\sum_k \lambda_k}` },
        { key: 'Lq', value: Lq, tex: R`E[n_w] = \sum_k \lambda_k\,E[w]_k`, note: 'Lei de Little por classe.' },
        { key: 'L', value: L, tex: R`E[n] = \sum_k \lambda_k\,E[r]_k` },
      ],
    }
  },
  sim: ({ classes = [], preemptive = false }) => ({ classes: classes.map((c) => ({ arrival: expD(c.lambda), service: expD(c.mu) })), c: 1, K: INF, priority: true, preemptive }),
}

// ---------------------------------------------------------------- G/G/1 e G/G/c (aproximações)

const gg1: ModelDef = {
  id: 'gg1',
  kendall: () => 'G/G/1',
  name: 'Um servidor, chegadas e atendimento gerais (aproximação de Kingman)',
  level: 2,
  short: 'O caso mais geral com um servidor. Usa só médias e coeficientes de variação. Resultado aproximado.',
  when: 'Quando nem as chegadas nem o atendimento são exponenciais (ex.: chegadas agendadas com atrasos).',
  assumptions: ['Intervalos entre chegadas com média 1/λ e variação Cₐ', 'Atendimento com média 1/μ e variação Cₛ', '1 servidor, fila FCFS'],
  exact: false,
  refs: ['kingman61', 'gross'],
  params: [P_LAMBDA, P_MU, P_CA, P_CS],
  anchor: 'mod-gg',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu]) ?? (v.ca < 0 || v.cs < 0 ? 'Os coeficientes de variação não podem ser negativos.' : null),
  compute: ({ v }) => {
    const { lambda: l, mu: m, ca, cs } = v
    const rho = l / m
    const stabTex = R`\rho = \dfrac{\lambda}{\mu} < 1`
    const stabSub = R`\rho = \dfrac{${t(l)}}{${t(m)}} = ${t(rho)}`
    const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` }
    if (rho >= 1) return unstable(rho, stabTex, stabSub, [rhoM])
    const Wq = (rho / (1 - rho)) * ((ca * ca + cs * cs) / 2) * (1 / m)
    const W = Wq + 1 / m
    return {
      stable: true,
      stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
      notes: ['Aproximação: é exata quando Cₐ = Cₛ = 1 (vira a M/M/1) e fica mais precisa com tráfego alto. Compare com a simulação.'],
      metrics: [
        rhoM,
        { key: 'Es', value: 1 / m, tex: R`E[s] = \dfrac{1}{\mu}`, sub: R`\dfrac{1}{${t(m)}}` },
        {
          key: 'Wq', value: Wq, approx: true,
          tex: R`E[w] \approx \dfrac{\rho}{1-\rho}\cdot\dfrac{C_a^2+C_s^2}{2}\cdot\dfrac{1}{\mu}`,
          sub: R`\dfrac{${t(rho)}}{1-${t(rho)}}\times\dfrac{${t(ca)}^2+${t(cs)}^2}{2}\times\dfrac{1}{${t(m)}}`,
          note: 'Fórmula de Kingman.',
        },
        { key: 'W', value: W, approx: true, tex: R`E[r] = E[w] + \dfrac{1}{\mu}`, sub: R`${t(Wq)} + \dfrac{1}{${t(m)}}` },
        { key: 'Lq', value: l * Wq, approx: true, tex: R`E[n_w] = \lambda\,E[w]`, sub: R`${t(l)}\times ${t(Wq)}` },
        { key: 'L', value: l * W, approx: true, tex: R`E[n] = \lambda\,E[r]`, sub: R`${t(l)}\times ${t(W)}` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: dist(1 / v.lambda, v.ca), service: dist(1 / v.mu, v.cs) }], c: 1, K: INF }),
}

const ggc: ModelDef = {
  id: 'ggc',
  kendall: (v) => `G/G/${v.c ?? 'c'}`,
  name: 'Vários servidores, chegadas e atendimento gerais (Allen-Cunneen)',
  level: 2,
  short: 'O caso mais geral (G/G/c). Ajusta a espera da M/M/c pela variabilidade. Resultado aproximado.',
  when: 'Sistemas reais com vários atendentes e tempos que não seguem a exponencial.',
  assumptions: ['Intervalos entre chegadas com média 1/λ e variação Cₐ', 'Atendimento com média 1/μ e variação Cₛ', 'c servidores, fila FCFS'],
  exact: false,
  refs: ['allen90', 'gross'],
  params: [P_LAMBDA, P_MU, P_C, P_CA, P_CS],
  anchor: 'mod-gg',
  validate: ({ v }) => positive(['λ', v.lambda], ['μ', v.mu], ['c', v.c]) ?? (v.ca < 0 || v.cs < 0 ? 'Os coeficientes de variação não podem ser negativos.' : null),
  compute: ({ v }) => {
    const { lambda: l, mu: m, ca, cs } = v
    const c = Math.round(v.c)
    const a = l / m
    const rho = a / c
    const stabTex = R`\rho = \dfrac{\lambda}{c\,\mu} < 1`
    const stabSub = R`\rho = \dfrac{${t(l)}}{${c}\times ${t(m)}} = ${t(rho)}`
    const rhoM: MetricOut = { key: 'rho', value: rho, tex: R`\rho = \dfrac{\lambda}{c\,\mu}`, sub: R`\dfrac{${t(l)}}{${c}\times ${t(m)}}` }
    if (rho >= 1) return unstable(rho, stabTex, stabSub, [rhoM])
    const C = erlangC(c, a)
    const Wq = (C / (c * m - l)) * ((ca * ca + cs * cs) / 2)
    const W = Wq + 1 / m
    return {
      stable: true,
      stability: { tex: stabTex, sub: stabSub, msg: stableMsg(rho) },
      notes: ['Aproximação: é exata quando Cₐ = Cₛ = 1 (vira a M/M/c). Compare com a simulação.'],
      metrics: [
        rhoM,
        { key: 'a', value: a, tex: R`a = \dfrac{\lambda}{\mu}`, sub: R`\dfrac{${t(l)}}{${t(m)}}` },
        { key: 'Pwait', value: C, approx: true, tex: R`P(\text{espera}) \approx C(c,a)`, sub: t(C), note: 'Erlang C da M/M/c equivalente.' },
        {
          key: 'Wq', value: Wq, approx: true,
          tex: R`E[w] \approx \dfrac{C(c,a)}{c\,\mu-\lambda}\cdot\dfrac{C_a^2+C_s^2}{2}`,
          sub: R`\dfrac{${t(C)}}{${c}\times ${t(m)}-${t(l)}}\times\dfrac{${t(ca)}^2+${t(cs)}^2}{2}`,
          note: 'Aproximação de Allen-Cunneen.',
        },
        { key: 'W', value: W, approx: true, tex: R`E[r] = E[w] + \dfrac{1}{\mu}`, sub: R`${t(Wq)} + \dfrac{1}{${t(m)}}` },
        { key: 'Lq', value: l * Wq, approx: true, tex: R`E[n_w] = \lambda\,E[w]`, sub: R`${t(l)}\times ${t(Wq)}` },
        { key: 'L', value: l * W, approx: true, tex: R`E[n] = \lambda\,E[r]`, sub: R`${t(l)}\times ${t(W)}` },
      ],
    }
  },
  sim: ({ v }) => ({ classes: [{ arrival: dist(1 / v.lambda, v.ca), service: dist(1 / v.mu, v.cs) }], c: Math.round(v.c), K: INF }),
}

// ---------------------------------------------------------------- catálogo

export const MODELS: ModelDef[] = [mm1, mmc, mm1k, mmck, mmcc, mminf, mg1, md1, mek1, finite, priority, gg1, ggc, dd1]

export const MODEL_BY_ID: Record<string, ModelDef> = Object.fromEntries(MODELS.map((m) => [m.id, m]))

export function defaultValues(m: ModelDef): Record<string, number> {
  return Object.fromEntries(m.params.map((p) => [p.key, p.def]))
}
