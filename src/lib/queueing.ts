// Funções matemáticas básicas da teoria das filas.
// Todas são puras e trabalham em uma mesma unidade de tempo (escolhida pela interface).

/** log(n!) por soma de logaritmos (exato e estável para os tamanhos usados aqui). */
export function logFactorial(n: number): number {
  let s = 0
  for (let i = 2; i <= n; i++) s += Math.log(i)
  return s
}

/** log(Σ exp(x_i)) de forma numericamente estável. */
export function logSumExp(xs: number[]): number {
  const m = Math.max(...xs)
  if (m === -Infinity) return -Infinity
  let s = 0
  for (const x of xs) s += Math.exp(x - m)
  return m + Math.log(s)
}

/**
 * Fórmula de Erlang B (probabilidade de bloqueio da M/M/c/c),
 * pela recursão estável B(0)=1, B(k) = a·B(k−1) / (k + a·B(k−1)).
 */
export function erlangB(c: number, a: number): number {
  let b = 1
  for (let k = 1; k <= c; k++) b = (a * b) / (k + a * b)
  return b
}

/**
 * Fórmula de Erlang C (probabilidade de um cliente ter que esperar na M/M/c),
 * C = B / (1 − ρ(1 − B)), com ρ = a/c < 1.
 */
export function erlangC(c: number, a: number): number {
  const rho = a / c
  if (rho >= 1) return 1
  const b = erlangB(c, a)
  return b / (1 - rho * (1 - b))
}

/** P0 da M/M/c (calculado em escala logarítmica para evitar estouro). */
export function mmcP0(c: number, a: number): number {
  const rho = a / c
  const logs: number[] = []
  for (let n = 0; n < c; n++) logs.push(n * Math.log(a) - logFactorial(n))
  logs.push(c * Math.log(a) - logFactorial(c) - Math.log(1 - rho))
  return Math.exp(-logSumExp(logs))
}

/**
 * Resolve um processo de nascimento e morte finito em regime permanente.
 * birth[n] = taxa de n -> n+1 (n = 0..K−1); death[n] = taxa de n -> n−1 (n = 1..K).
 * Devolve P[0..K].
 */
export function birthDeath(birth: number[], death: number[]): number[] {
  const K = birth.length
  const lp: number[] = [0]
  for (let n = 1; n <= K; n++) {
    const b = birth[n - 1]
    const d = death[n]
    lp.push(b <= 0 ? -Infinity : lp[n - 1] + Math.log(b) - Math.log(d))
  }
  const norm = logSumExp(lp)
  return lp.map((x) => Math.exp(x - norm))
}

/** P_n da M/M/c/K (K = capacidade total, incluindo quem está em atendimento). */
export function mmckProbs(lambda: number, mu: number, c: number, K: number): number[] {
  const birth = Array.from({ length: K }, () => lambda)
  const death = Array.from({ length: K + 1 }, (_, n) => Math.min(n, c) * mu)
  return birthDeath(birth, death)
}

/** P_n da M/M/c//N (população finita de N clientes; λ = taxa de cada cliente fora do sistema). */
export function finitePopProbs(lambda: number, mu: number, c: number, N: number): number[] {
  const birth = Array.from({ length: N }, (_, n) => (N - n) * lambda)
  const death = Array.from({ length: N + 1 }, (_, n) => Math.min(n, c) * mu)
  return birthDeath(birth, death)
}

export function sum(xs: number[], f: (x: number, i: number) => number = (x) => x): number {
  let s = 0
  xs.forEach((x, i) => (s += f(x, i)))
  return s
}
