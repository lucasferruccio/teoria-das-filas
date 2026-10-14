export type MetricKey =
  | 'rho'
  | 'a'
  | 'Es'
  | 'P0'
  | 'Pwait'
  | 'Pblock'
  | 'lambdaEff'
  | 'L'
  | 'Lq'
  | 'Ls'
  | 'W'
  | 'Wq'

export type MetricKind = 'time' | 'count' | 'prob' | 'rate' | 'erlang'

export interface MetricInfo {
  label: string
  /** Rótulo curto para cabeçalhos de tabela. */
  short: string
  /** Símbolo em KaTeX, na notação de Jain. */
  symbol: string
  kind: MetricKind
  gloss: string
}

export const METRICS: Record<MetricKey, MetricInfo> = {
  rho: { label: 'Utilização dos servidores', short: 'ρ', symbol: '\\rho', kind: 'prob', gloss: 'rho' },
  a: { label: 'Carga oferecida', short: 'a', symbol: 'a', kind: 'erlang', gloss: 'a' },
  Es: { label: 'Tempo médio de atendimento', short: 'E[s]', symbol: 'E[s]', kind: 'time', gloss: 'Es' },
  P0: { label: 'Probabilidade de sistema vazio', short: 'P₀', symbol: 'P_0', kind: 'prob', gloss: 'P0' },
  Pwait: { label: 'Probabilidade de ter que esperar', short: 'P(espera)', symbol: 'P(\\text{espera})', kind: 'prob', gloss: 'Pwait' },
  Pblock: { label: 'Probabilidade de bloqueio', short: 'P(bloqueio)', symbol: 'P_{\\text{bloq}}', kind: 'prob', gloss: 'Pblock' },
  lambdaEff: { label: 'Taxa efetiva de entrada', short: 'λ_ef', symbol: '\\lambda_{ef}', kind: 'rate', gloss: 'lambdaEff' },
  L: { label: 'Número médio no sistema (L)', short: 'E[n]', symbol: 'E[n]', kind: 'count', gloss: 'L' },
  Lq: { label: 'Número médio na fila (Lq)', short: 'E[n_w]', symbol: 'E[n_w]', kind: 'count', gloss: 'Lq' },
  Ls: { label: 'Número médio em atendimento', short: 'E[n_s]', symbol: 'E[n_s]', kind: 'count', gloss: 'Ls' },
  W: { label: 'Tempo médio de resposta (W)', short: 'E[r]', symbol: 'E[r]', kind: 'time', gloss: 'W' },
  Wq: { label: 'Tempo médio de espera na fila (Wq)', short: 'E[w]', symbol: 'E[w]', kind: 'time', gloss: 'Wq' },
}

/** Ordem de exibição padrão. */
export const METRIC_ORDER: MetricKey[] = ['rho', 'a', 'Es', 'P0', 'Pwait', 'Pblock', 'lambdaEff', 'L', 'Lq', 'Ls', 'W', 'Wq']
