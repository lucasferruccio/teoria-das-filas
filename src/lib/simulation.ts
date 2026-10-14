// Simulação de eventos discretos (Law, 2015) de uma fila com c servidores,
// capacidade K, população opcionalmente finita e classes de prioridade (não preemptiva).

export type Dist =
  | { kind: 'exp'; mean: number }
  | { kind: 'det'; mean: number }
  | { kind: 'gamma'; mean: number; shape: number }

export interface SimSpec {
  classes: { arrival: Dist; service: Dist }[]
  c: number
  K: number
  /** População finita: cada um dos N clientes, quando fora do sistema, chega segundo `classes[0].arrival`. */
  N?: number
  priority?: boolean
  /** Prioridade preemptiva com retomada: quem chega com prioridade maior interrompe o atendimento. */
  preemptive?: boolean
}

export interface SimOptions {
  /** Quantos clientes novos chegam (sem contar os que já estavam na fila). */
  customers: number
  seed: number
  /** Clientes já presentes no instante 0 (como os 5 alunos da secretaria). */
  initial: number
}

export interface SimCustomer {
  id: number
  cls: number
  arrival: number
  start: number
  end: number
  wait: number
  system: number
  server: number
  /** Clientes no sistema no instante da chegada (sem contar ele). */
  nAtArrival: number
  queueAtArrival: number
  blocked: boolean
  /** Quantas vezes o atendimento foi interrompido (prioridade preemptiva). */
  preemptions: number
  /** Duração total do atendimento sorteada. */
  service: number
  /** Quanto falta de atendimento, quando foi interrompido. */
  remaining?: number
}

export interface SimEvent {
  t: number
  type: 'chegada' | 'saída' | 'recusado' | 'interrupção'
  id: number
  arrivals: number
  served: number
  nSystem: number
  nQueue: number
}

export interface SimStats {
  W: number
  Wq: number
  L: number
  Lq: number
  Ls: number
  rho: number
  Pblock: number
  Pwait: number
  lambdaEff: number
  served: number
  blocked: number
  T: number
}

export interface SimResult {
  customers: SimCustomer[]
  events: SimEvent[]
  timeline: { t: number; n: number; q: number }[]
  convergence: { i: number; W: number; Wq: number }[]
  stats: SimStats
}

// ---------------------------------------------------------------- números aleatórios

/** Gerador mulberry32: rápido, com semente, reprodutível. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = a
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function normal(u: () => number): number {
  const u1 = Math.max(u(), 1e-300)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u())
}

/** Gama(forma k, escala 1) por Marsaglia e Tsang (2000). */
function gammaUnit(k: number, u: () => number): number {
  if (k < 1) return gammaUnit(k + 1, u) * Math.pow(u(), 1 / k)
  const d = k - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number, v: number
    do {
      x = normal(u)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const w = u()
    if (w < 1 - 0.0331 * x ** 4 || Math.log(w) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

export function sample(d: Dist, u: () => number): number {
  switch (d.kind) {
    case 'det':
      return d.mean
    case 'exp':
      return -d.mean * Math.log(1 - u())
    case 'gamma':
      return (gammaUnit(d.shape, u) * d.mean) / d.shape
  }
}

// ---------------------------------------------------------------- simulação

const MAX_EVENTS = 3000
const MAX_POINTS = 1500

interface Slot {
  cust: SimCustomer | null
  end: number
}

export function simulate(spec: SimSpec, opt: SimOptions): SimResult {
  const u = rng(opt.seed)
  const finitePop = spec.N !== undefined
  const infServers = !Number.isFinite(spec.c)
  const slots: Slot[] = infServers ? [] : Array.from({ length: spec.c }, () => ({ cust: null, end: Infinity }))
  const queue: SimCustomer[] = []
  let qHead = 0 // fila como vetor + índice da cabeça (evita custo O(n) de shift)
  const qLen = () => queue.length - qHead
  const customers: SimCustomer[] = []
  const events: SimEvent[] = []
  const rawTimeline: { t: number; n: number; q: number }[] = [{ t: 0, n: 0, q: 0 }]

  // Próxima chegada de cada fluxo (uma por classe, ou uma por cliente da população finita).
  const streams = finitePop ? spec.N! : spec.classes.length
  const nextArr: number[] = Array.from({ length: streams }, (_, i) =>
    sample(finitePop ? spec.classes[0].arrival : spec.classes[i].arrival, u),
  )
  const sourceOf = new Map<number, number>()

  let t = 0
  let nSystem = 0
  let generated = 0
  let arrivals = 0
  let served = 0
  let blocked = 0
  let areaN = 0
  let areaQ = 0
  let areaBusy = 0
  let busy = 0

  const advance = (to: number) => {
    const dt = to - t
    areaN += nSystem * dt
    areaQ += qLen() * dt
    areaBusy += busy * dt
    t = to
  }

  const record = (type: SimEvent['type'], id: number) => {
    if (events.length < MAX_EVENTS) events.push({ t, type, id, arrivals, served, nSystem, nQueue: qLen() })
    rawTimeline.push({ t, n: nSystem, q: qLen() })
  }

  const startService = (cust: SimCustomer) => {
    let idx = slots.findIndex((s) => s.cust === null)
    if (idx < 0) {
      slots.push({ cust: null, end: Infinity })
      idx = slots.length - 1
    }
    if (cust.remaining === undefined) {
      cust.start = t
      cust.wait = t - cust.arrival
      cust.service = sample(spec.classes[cust.cls].service, u)
    }
    cust.server = idx + 1
    slots[idx].cust = cust
    slots[idx].end = t + (cust.remaining ?? cust.service)
    cust.remaining = undefined
    busy++
  }

  const freeSlot = () => (infServers ? true : slots.some((s) => s.cust === null))

  const enqueue = (cust: SimCustomer) => {
    if (spec.priority) {
      let i = queue.length
      while (i > qHead && queue[i - 1].cls > cust.cls) i--
      queue.splice(i, 0, cust)
    } else queue.push(cust)
  }

  /** Cliente interrompido volta para a fila à frente dos outros da mesma classe (chegou antes deles). */
  const requeueFront = (cust: SimCustomer) => {
    let i = qHead
    while (i < queue.length && queue[i].cls < cust.cls) i++
    queue.splice(i, 0, cust)
  }

  /** Prioridade preemptiva: tenta tirar do servidor o cliente de menor prioridade. */
  const tryPreempt = (cust: SimCustomer): SimCustomer | null => {
    let idx = -1
    for (let i = 0; i < slots.length; i++) {
      const c = slots[i].cust
      if (c && c.cls > cust.cls && (idx < 0 || c.cls > slots[idx].cust!.cls)) idx = i
    }
    if (idx < 0) return null
    const out = slots[idx].cust!
    out.remaining = slots[idx].end - t
    out.preemptions++
    slots[idx].cust = null
    slots[idx].end = Infinity
    busy--
    requeueFront(out)
    startService(cust)
    return out
  }

  const arrive = (cls: number, source: number) => {
    const cust: SimCustomer = {
      id: customers.length + 1, cls, arrival: t, start: NaN, end: NaN, wait: NaN, system: NaN, server: 0,
      nAtArrival: nSystem, queueAtArrival: qLen(), blocked: false, preemptions: 0, service: NaN,
    }
    customers.push(cust)
    arrivals++
    if (nSystem >= spec.K) {
      cust.blocked = true
      blocked++
      if (finitePop) nextArr[source] = t + sample(spec.classes[0].arrival, u)
      record('recusado', cust.id)
      return
    }
    if (finitePop) sourceOf.set(cust.id, source)
    nSystem++
    let out: SimCustomer | null = null
    if (freeSlot()) startService(cust)
    else if (!(spec.preemptive && (out = tryPreempt(cust)))) enqueue(cust)
    record('chegada', cust.id)
    if (out) record('interrupção', out.id)
  }

  // Clientes que já estão esperando no instante 0.
  for (let i = 0; i < opt.initial; i++) arrive(0, i % streams)
  if (finitePop) for (let i = 0; i < Math.min(opt.initial, streams); i++) nextArr[i] = Infinity

  for (let guard = 0; guard < 10_000_000; guard++) {
    let depIdx = -1
    let depT = Infinity
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].cust && slots[i].end < depT) {
        depT = slots[i].end
        depIdx = i
      }
    }
    let arrIdx = -1
    let arrT = Infinity
    if (generated < opt.customers) {
      for (let i = 0; i < streams; i++) {
        if (nextArr[i] < arrT) {
          arrT = nextArr[i]
          arrIdx = i
        }
      }
    }
    if (depIdx < 0 && arrIdx < 0) break

    if (depT <= arrT) {
      advance(depT)
      const slot = slots[depIdx]
      const cust = slot.cust!
      cust.end = t
      cust.system = t - cust.arrival
      // Com interrupções, a espera inclui o tempo parado: espera = tempo no sistema − atendimento.
      if (cust.preemptions > 0) cust.wait = cust.system - cust.service
      slot.cust = null
      slot.end = Infinity
      busy--
      nSystem--
      served++
      if (finitePop) {
        const src = sourceOf.get(cust.id)
        if (src !== undefined && generated < opt.customers) nextArr[src] = t + sample(spec.classes[0].arrival, u)
      }
      const next = qHead < queue.length ? queue[qHead++] : undefined
      if (qHead > 4096 && qHead * 2 > queue.length) {
        queue.splice(0, qHead)
        qHead = 0
      }
      if (next) startService(next)
      record('saída', cust.id)
    } else {
      advance(arrT)
      generated++
      if (finitePop) {
        nextArr[arrIdx] = Infinity
        arrive(0, arrIdx)
      } else {
        nextArr[arrIdx] = t + sample(spec.classes[arrIdx].arrival, u)
        arrive(arrIdx, arrIdx)
      }
    }
  }

  const T = t
  const ok = customers.filter((c) => !c.blocked)
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN)
  const cServers = infServers ? Math.max(1, slots.length) : spec.c

  // Convergência das médias acumuladas (para o gráfico).
  const convergence: SimResult['convergence'] = []
  const step = Math.max(1, Math.floor(ok.length / MAX_POINTS))
  let sW = 0
  let sWq = 0
  ok.forEach((c, i) => {
    sW += c.system
    sWq += c.wait
    if ((i + 1) % step === 0 || i === ok.length - 1) convergence.push({ i: i + 1, W: sW / (i + 1), Wq: sWq / (i + 1) })
  })

  const tStep = Math.max(1, Math.floor(rawTimeline.length / MAX_POINTS))
  const timeline = rawTimeline.filter((_, i) => i % tStep === 0 || i === rawTimeline.length - 1)

  return {
    customers,
    events,
    timeline,
    convergence,
    stats: {
      W: mean(ok.map((c) => c.system)),
      Wq: mean(ok.map((c) => c.wait)),
      L: T > 0 ? areaN / T : NaN,
      Lq: T > 0 ? areaQ / T : NaN,
      Ls: T > 0 ? areaBusy / T : NaN,
      rho: T > 0 ? areaBusy / (cServers * T) : NaN,
      Pblock: arrivals ? blocked / arrivals : 0,
      Pwait: ok.length ? ok.filter((c) => c.wait > 1e-12).length / ok.length : NaN,
      lambdaEff: T > 0 ? ok.length / T : NaN,
      served,
      blocked,
      T,
    },
  }
}
