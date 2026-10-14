import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt } from '../../lib/format'
import { AXIS, GRID, REF_LINE, SERIES } from '../calc/charts'
import { Tex } from '../Tex'
import { Term } from '../Term'

// ---------------------------------------------------------------- montador da notação de Kendall

type Dist = 'M' | 'D' | 'Ek' | 'G'
const DIST_TXT: Record<Dist, string> = {
  M: 'aleatórias, sem memória (Poisson / exponencial)',
  D: 'fixas, sempre iguais (determinístico)',
  Ek: 'em k etapas (Erlang), pouco variáveis',
  G: 'com qualquer distribuição (geral)',
}

function Sel<T extends string>({ label, value, set, opts, k }: { label: string; value: T; set: (v: T) => void; opts: [T, string][]; k: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">
        <Term k={k}>{label}</Term>
      </span>
      <select className="input" value={value} onChange={(e) => set(e.target.value as T)}>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

export function KendallBuilder() {
  const [A, setA] = useState<Dist>('M')
  const [S, setS] = useState<Dist>('M')
  const [c, setC] = useState<'1' | 'c' | '∞'>('1')
  const [K, setK] = useState<'∞' | 'K' | '=c'>('∞')
  const [N, setN] = useState<'∞' | 'N'>('∞')
  const [D, setD] = useState<'FCFS' | 'PRIO'>('FCFS')

  const cTxt = c === '∞' ? '∞' : c
  const kTxt = K === '=c' ? cTxt : K
  const tail = [K !== '∞' || N !== '∞' || D !== 'FCFS' ? kTxt : null, N !== '∞' || D !== 'FCFS' ? N : null, D !== 'FCFS' ? D : null].filter((x) => x !== null)
  const notation = [A === 'Ek' ? 'Eₖ' : A, S === 'Ek' ? 'Eₖ' : S, cTxt, ...tail].join('/')

  const suggestion = useMemo((): { id: string; why: string } => {
    const mm = A === 'M' && S === 'M'
    if (c === '∞') return mm ? { id: 'mminf', why: 'Servidores ilimitados: ninguém espera.' } : { id: 'mminf', why: 'Com infinitos servidores, E[n] = λ/μ vale para qualquer distribuição de atendimento.' }
    if (D === 'PRIO') return { id: 'prio', why: mm && c === '1' ? 'Modelo exato com classes de prioridade.' : 'A calculadora tem prioridades para M/M/1; use-o como aproximação.' }
    if (N === 'N') return { id: 'finite', why: mm ? 'Modelo exato de população finita.' : 'O modelo exato de população finita supõe tempos exponenciais.' }
    if (K === '=c') return { id: 'mmcc', why: 'Sistema de perda: Erlang B (vale para qualquer distribuição de atendimento).' }
    if (K === 'K') return mm ? { id: c === '1' ? 'mm1k' : 'mmck', why: 'Modelo exato com capacidade finita.' } : { id: c === '1' ? 'mm1k' : 'mmck', why: 'Só há fórmula exata simples para tempos exponenciais; use como aproximação.' }
    if (mm) return { id: c === '1' ? 'mm1' : 'mmc', why: 'Modelo exato.' }
    if (A === 'M' && c === '1') return { id: S === 'D' ? 'md1' : S === 'Ek' ? 'mek1' : 'mg1', why: 'Chegadas de Poisson e um servidor: fórmula exata de Pollaczek-Khinchine.' }
    if (A === 'D' && S === 'D' && c === '1') return { id: 'dd1', why: 'Sistema totalmente determinístico.' }
    return { id: c === '1' ? 'gg1' : 'ggc', why: 'Não há fórmula exata simples: a calculadora usa uma aproximação (Kingman ou Allen-Cunneen) e você pode conferir com a simulação.' }
  }, [A, S, c, K, N, D])

  const dOpts: [Dist, string][] = [['M', 'M: exponencial'], ['D', 'D: determinístico'], ['Ek', 'Eₖ: Erlang'], ['G', 'G: geral']]

  return (
    <div className="rounded-2xl border-2 border-primary-2 bg-white p-5">
      <div className="mb-3 font-serif text-xl font-semibold text-primary-dark">Monte a notação do seu sistema</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Sel label="A: chegadas" k="poisson" value={A} set={setA} opts={dOpts} />
        <Sel label="S: atendimento" k="exponencial" value={S} set={setS} opts={dOpts} />
        <Sel label="c: servidores" k="c" value={c} set={setC} opts={[['1', '1 servidor'], ['c', 'c servidores'], ['∞', 'infinitos']]} />
        <Sel label="K: capacidade" k="K" value={K} set={setK} opts={[['∞', 'ilimitada'], ['K', 'limitada (K lugares)'], ['=c', 'sem fila (K = c)']]} />
        <Sel label="N: população" k="N" value={N} set={setN} opts={[['∞', 'muito grande'], ['N', 'pequena (N clientes)']]} />
        <Sel label="Disciplina" k="fcfs" value={D} set={setD} opts={[['FCFS', 'FCFS: ordem de chegada'], ['PRIO', 'Com prioridades']]} />
      </div>
      <div className="mt-4 grid gap-4 rounded-xl bg-soft p-4 md:grid-cols-[auto_1fr] md:items-center">
        <div className="text-center font-mono text-4xl font-bold text-primary-dark">{notation}</div>
        <div>
          <p>
            Chegadas: {DIST_TXT[A]}. Atendimento: {DIST_TXT[S]}. Servidores: {c === '1' ? ' um' : c === 'c' ? ' c, em paralelo' : ' infinitos'}
            {K === 'K' ? '. No máximo K clientes no sistema' : K === '=c' ? '. Sem lugar de espera' : ''}
            {N === 'N' ? '. População de N clientes' : ''}
            {D === 'PRIO' ? '. Atendimento por prioridade' : '. Atendimento por ordem de chegada'}.
          </p>
          <p className="mt-1 text-sm text-muted">Quando K = ∞, N = ∞ e a disciplina é FCFS, os três últimos campos são omitidos.</p>
          <p className="mt-2">
            <b>Na calculadora:</b> {suggestion.why}{' '}
            <Link to={`/calculadora?modelo=${suggestion.id}`} className="font-semibold text-primary underline">
              Abrir este modelo →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- distribuições

export function DistributionChart() {
  const [k, setK] = useState(3)
  const data = useMemo(() => {
    const pts = []
    let fact = 1
    for (let i = 2; i < k; i++) fact *= i
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * 3
      const exp = Math.exp(-x)
      const erl = k === 1 ? exp : (Math.pow(k, k) * Math.pow(x, k - 1) * Math.exp(-k * x)) / fact
      pts.push({ x: Number(x.toFixed(2)), exp, erl })
    }
    return pts
  }, [k])
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="font-semibold">Densidade do tempo (média = 1)</span>
        <label className="flex items-center gap-2">
          <Term k="k">k</Term> = {k}
          <input type="range" min={1} max={20} value={k} onChange={(e) => setK(Number(e.target.value))} className="accent-primary" aria-label="Fases de Erlang" />
        </label>
        <span className="text-sm text-muted">CV do Erlang = 1/√k = {fmt(1 / Math.sqrt(k), 3)}</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="x" type="number" domain={[0, 3]} tick={AXIS} label={{ value: 'tempo ÷ média', position: 'insideBottom', offset: -8, ...AXIS }} />
          <YAxis tick={AXIS} width={40} tickFormatter={(x) => fmt(x, 2)} />
          <Tooltip formatter={(v) => fmt(Number(v), 3)} labelFormatter={(x) => `t = ${x}`} />
          <Legend verticalAlign="top" height={28} />
          <Line dataKey="exp" name="Exponencial (M)" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="erl" name={`Erlang com k = ${k} (Eₖ)`} stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine x={1} stroke={REF_LINE} strokeDasharray="6 4" strokeWidth={2} label={{ value: 'D: sempre = média', position: 'insideTopLeft', ...AXIS }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-sm text-muted">
        Com k grande a curva fica estreita e concentrada na média: os tempos quase não variam e o comportamento se aproxima do
        determinístico (linha tracejada).
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- explosão do tempo de resposta

export function UtilizationChart() {
  const [rho, setRho] = useState(0.8)
  const data = useMemo(() => Array.from({ length: 96 }, (_, i) => {
    const r = i / 100
    return { r, mm1: 1 / (1 - r), md1: 1 + r / (2 * (1 - r)) }
  }), [])
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-semibold">
          <Term k="rho">ρ</Term> = {fmt(rho, 2)}
          <input type="range" min={0} max={0.95} step={0.01} value={rho} onChange={(e) => setRho(Number(e.target.value))} className="accent-primary" aria-label="Utilização" />
        </label>
        <span>
          Na M/M/1, <Tex math={`E[r] = \\dfrac{E[s]}{1-\\rho} = ${fmt(1 / (1 - rho), 3).replace(',', '{,}')}\\times E[s]`} />
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="r" type="number" domain={[0, 0.95]} tick={AXIS} tickFormatter={(x) => fmt(x, 2)} label={{ value: 'utilização ρ', position: 'insideBottom', offset: -8, ...AXIS }} />
          <YAxis tick={AXIS} width={40} domain={[0, 20]} allowDataOverflow />
          <Tooltip formatter={(v) => `${fmt(Number(v), 3)} × E[s]`} labelFormatter={(x) => `ρ = ${fmt(Number(x), 2)}`} />
          <Legend verticalAlign="top" height={28} />
          <Line dataKey="mm1" name="M/M/1 (atendimento exponencial)" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="md1" name="M/D/1 (atendimento constante)" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine x={rho} stroke={REF_LINE} strokeDasharray="6 4" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-sm text-muted">
        Eixo vertical: tempo médio no sistema em múltiplos do tempo de atendimento. Com ρ = 0,5 o cliente fica 2 vezes o tempo de
        atendimento; com ρ = 0,9, 10 vezes; com ρ = 0,95, 20 vezes. Menos variabilidade (M/D/1) reduz a espera.
      </p>
    </div>
  )
}
