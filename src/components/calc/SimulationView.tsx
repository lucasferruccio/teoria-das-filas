import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { csvNum, fmt, pct } from '../../lib/format'
import { fmtTime } from '../../lib/interpret'
import type { MetricKey } from '../../lib/metrics'
import { METRICS } from '../../lib/metrics'
import type { ModelDef, ModelInput, ModelResult } from '../../lib/models'
import { simulate, type SimResult } from '../../lib/simulation'
import type { TimeUnit } from '../../lib/units'
import { Term } from '../Term'
import { Callout, NumberField, Pager, downloadCsv } from '../ui'
import { AXIS, GRID, REF_LINE, SERIES } from './charts'

export interface SimOpts {
  customers: number
  seed: number
  initial: number
}

const PAGE = 25

export function SimulationView({ model, input, theory, unit, opts, setOpts }: {
  model: ModelDef; input: ModelInput; theory: ModelResult | null; unit: TimeUnit; opts: SimOpts; setOpts: (o: SimOpts) => void
}) {
  const [view, setView] = useState<'cliente' | 'evento'>('cliente')
  const [page, setPage] = useState(0)

  const sim: SimResult | null = useMemo(() => {
    if (!model.sim) return null
    if (model.validate?.(input)) return null
    return simulate(model.sim(input), opts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, JSON.stringify(input), opts.customers, opts.seed, opts.initial])

  if (!model.sim) return <Callout tone="info">Este modelo não tem simulação.</Callout>

  const th = (k: MetricKey) => (theory?.stable ? theory.metrics.find((m) => m.key === k)?.value : undefined)
  const hasPrio = model.hasClasses

  return (
    <div className="space-y-6">
      <Callout tone="info" title="Por que simular?">
        As fórmulas dão as médias <Term k="regime">em regime permanente</Term>, ou seja, "a longo prazo". Para ver o que acontece
        cliente a cliente, o computador sorteia chegadas e atendimentos seguindo as distribuições do modelo
        (<Term k="simulacao">simulação de eventos discretos</Term>). Com muitos clientes, as médias da simulação se aproximam das
        fórmulas.
      </Callout>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="label">Clientes que chegam</span>
          <NumberField value={opts.customers} integer min={1} onChange={(x) => setOpts({ ...opts, customers: Math.min(50000, x) })} className="w-32" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Já esperando no início</span>
          <NumberField value={opts.initial} integer min={0} onChange={(x) => setOpts({ ...opts, initial: Math.min(1000, x) })} className="w-32" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">
            <Term k="semente">Semente</Term>
          </span>
          <NumberField value={opts.seed} integer min={0} onChange={(x) => setOpts({ ...opts, seed: x })} className="w-28" />
        </label>
        <button className="btn-primary" onClick={() => setOpts({ ...opts, seed: Math.floor(Math.random() * 100000) })}>
          ↻ Simular de novo
        </button>
        <div className="flex flex-wrap gap-2 text-sm">
          {[100, 1000, 10000, 50000].map((n) => (
            <button key={n} className={`btn-ghost px-3 py-1 ${opts.customers === n ? 'border-primary bg-soft' : ''}`} onClick={() => setOpts({ ...opts, customers: n })}>
              {n.toLocaleString('pt-BR')} clientes
            </button>
          ))}
        </div>
      </div>

      {!sim ? (
        <Callout tone="warn">Corrija os dados de entrada para simular.</Callout>
      ) : (
        <>
          {theory && !theory.stable && (
            <Callout tone="warn" title="Sistema instável">
              Repare nos gráficos: a fila não para de crescer enquanto chegam clientes. As médias da simulação dependem de quanto tempo
              ela durou, e não existe valor "a longo prazo".
            </Callout>
          )}
          {opts.initial > 0 && (
            <Callout tone="info">
              A simulação começa com {opts.initial} clientes já esperando (instante 0), como os 5 alunos na abertura da secretaria. Isso
              afeta as médias de uma simulação curta, mas não as fórmulas, que descrevem o longo prazo.
            </Callout>
          )}

          <ComparisonTable sim={sim} th={th} unit={unit} model={model} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-4">
              <h3 className="mb-1 text-lg">Clientes no sistema ao longo do tempo</h3>
              <p className="mb-2 text-sm text-muted">Cada degrau é uma chegada (sobe) ou uma saída (desce).</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sim.timeline} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tick={AXIS} tickFormatter={(x) => fmt(x, 3)} label={{ value: `tempo (${unit})`, position: 'insideBottom', offset: -8, ...AXIS }} />
                  <YAxis allowDecimals={false} tick={AXIS} width={40} />
                  <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={(x) => `t = ${fmt(Number(x))} ${unit}`} />
                  <Legend verticalAlign="top" height={28} />
                  <Line type="stepAfter" dataKey="n" name="No sistema" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="stepAfter" dataKey="q" name="Na fila" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-line bg-white p-4">
              <h3 className="mb-1 text-lg">A média da simulação converge para a fórmula</h3>
              <p className="mb-2 text-sm text-muted">Tempo médio no sistema calculado com os primeiros n clientes.</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sim.convergence} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="i" type="number" domain={[1, 'dataMax']} tick={AXIS} label={{ value: 'clientes atendidos', position: 'insideBottom', offset: -8, ...AXIS }} />
                  <YAxis tick={AXIS} width={52} tickFormatter={(x) => fmt(x, 3)} />
                  <Tooltip formatter={(v) => fmtTime(Number(v), unit)} labelFormatter={(x) => `após ${x} clientes`} />
                  <Legend verticalAlign="top" height={28} />
                  <Line type="monotone" dataKey="W" name="E[r] simulado" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  {th('W') !== undefined && (
                    <ReferenceLine y={th('W')} stroke={REF_LINE} strokeDasharray="6 4" strokeWidth={2} label={{ value: `fórmula: ${fmt(th('W'))}`, position: 'insideTopRight', ...AXIS }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg">Tabela da simulação</h3>
              <div className="flex flex-wrap gap-2">
                <div role="group" aria-label="Tipo de tabela" className="flex overflow-hidden rounded-lg border border-line">
                  {(['cliente', 'evento'] as const).map((v) => (
                    <button key={v} onClick={() => { setView(v); setPage(0) }} className={`cursor-pointer px-3 py-1.5 font-semibold ${view === v ? 'bg-primary text-white' : 'bg-white text-primary-dark hover:bg-soft'}`}>
                      {v === 'cliente' ? 'Por cliente' : 'Por evento'}
                    </button>
                  ))}
                </div>
                <button className="btn-ghost" onClick={() => exportCsv(sim, view, opts.initial, hasPrio)}>
                  ⬇ Exportar CSV
                </button>
              </div>
            </div>
            {hasPrio && input.preemptive && view === 'cliente' && (
              <p className="mb-2 text-sm text-muted">
                Prioridade preemptiva: um cliente de classe mais prioritária interrompe o atendimento em curso, que é retomado
                depois de onde parou. "Início do atendimento" é a primeira vez que o cliente foi atendido, e a espera inclui o
                tempo parado durante as interrupções.
              </p>
            )}
            {view === 'cliente' ? (
              <CustomerTable sim={sim} page={page} hasPrio={!!hasPrio} />
            ) : (
              <EventTable sim={sim} page={page} initial={opts.initial} />
            )}
            <Pager page={page} pages={Math.ceil((view === 'cliente' ? sim.customers.length : sim.events.length) / PAGE)} onPage={setPage} />
            {view === 'evento' && sim.events.length >= 3000 && <p className="mt-2 text-sm text-muted">Mostrando os primeiros 3.000 eventos.</p>}
          </div>
        </>
      )}
    </div>
  )
}

function ComparisonTable({ sim, th, unit, model }: { sim: SimResult; th: (k: MetricKey) => number | undefined; unit: TimeUnit; model: ModelDef }) {
  const s = sim.stats
  const rows: { k: MetricKey; sim: number }[] = [
    model.id === 'mminf' ? { k: 'Ls', sim: s.Ls } : { k: 'rho', sim: s.rho },
    { k: 'L', sim: s.L },
    { k: 'Lq', sim: s.Lq },
    { k: 'W', sim: s.W },
    { k: 'Wq', sim: s.Wq },
    { k: 'Pwait', sim: s.Pwait },
    { k: 'Pblock', sim: s.Pblock },
  ]
  const show = rows.filter((r) => r.k !== 'Pblock' || th('Pblock') !== undefined || s.blocked > 0)
  const isTime = (k: MetricKey) => METRICS[k].kind === 'time'
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="table-tf">
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Fórmula (teoria)</th>
            <th>Simulação</th>
            <th>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {show.map((r) => {
            const t = th(r.k)
            const d = t !== undefined && t !== 0 ? (r.sim - t) / t : undefined
            return (
              <tr key={r.k}>
                <td className="font-semibold">
                  <Term k={METRICS[r.k].gloss}>{METRICS[r.k].label}</Term>
                </td>
                <td>{t === undefined ? '—' : isTime(r.k) ? fmtTime(t, unit) : fmt(t)}</td>
                <td>{isTime(r.k) ? fmtTime(r.sim, unit) : fmt(r.sim)}</td>
                <td>{d === undefined ? '—' : `${d >= 0 ? '+' : ''}${pct(d)}`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-sm text-muted">
        {sim.stats.served.toLocaleString('pt-BR')} clientes atendidos em {fmt(sim.stats.T)} {unit} simulados
        {sim.stats.blocked > 0 && `, ${sim.stats.blocked.toLocaleString('pt-BR')} recusados`}. Diferenças pequenas são normais: a
        simulação é uma amostra aleatória. Aumente o número de clientes para reduzi-las.
      </p>
    </div>
  )
}

function CustomerTable({ sim, page, hasPrio }: { sim: SimResult; page: number; hasPrio: boolean }) {
  const rows = sim.customers.slice(page * PAGE, page * PAGE + PAGE)
  return (
    <div className="overflow-x-auto">
      <table className="table-tf">
        <thead>
          <tr>
            <th>Cliente</th>
            {hasPrio && <th>Classe</th>}
            <th>Chegada</th>
            <th>Início do atendimento</th>
            <th>Saída</th>
            <th><Term k="Wq">Espera</Term></th>
            <th><Term k="W">Tempo no sistema</Term></th>
            <th>Servidor</th>
            <th>Fila ao chegar</th>
            {hasPrio && <th>Interrupções</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className={c.blocked ? 'bg-warn-bg/60' : c.wait > 1e-12 ? '' : 'bg-soft/50'}>
              <td className="font-semibold">{c.id}</td>
              {hasPrio && <td>{c.cls + 1}</td>}
              <td>{fmt(c.arrival)}</td>
              {c.blocked ? (
                <td colSpan={5} className="font-semibold text-warn-ink">
                  Recusado: sistema cheio
                </td>
              ) : (
                <>
                  <td>{fmt(c.start)}</td>
                  <td>{fmt(c.end)}</td>
                  <td>{fmt(c.wait)}</td>
                  <td>{fmt(c.system)}</td>
                  <td>{c.server}</td>
                </>
              )}
              <td>{c.queueAtArrival}</td>
              {hasPrio && <td>{c.preemptions || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventTable({ sim, page, initial }: { sim: SimResult; page: number; initial: number }) {
  const rows = sim.events.slice(page * PAGE, page * PAGE + PAGE)
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm text-muted">
        A = atendidos acumulados, B = chegadas acumuladas (sem contar os {initial} que já
        estavam na fila) e restantes = {initial} + B − A.
      </p>
      <table className="table-tf">
        <thead>
          <tr>
            <th>Tempo</th>
            <th>Evento</th>
            <th>Cliente</th>
            <th>Atendidos acum. (A)</th>
            <th>Chegadas acum. (B)</th>
            <th>Restantes ({initial} + B − A)</th>
            <th>Na fila</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={i}>
              <td>{fmt(e.t)}</td>
              <td className={e.type === 'recusado' ? 'font-semibold text-warn-ink' : e.type === 'interrupção' ? 'font-semibold text-primary-dark' : ''}>{e.type}</td>
              <td>{e.id}</td>
              <td>{e.served}</td>
              <td>{Math.max(0, e.arrivals - initial)}</td>
              <td className="font-semibold">{e.nSystem}</td>
              <td>{e.nQueue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function exportCsv(sim: SimResult, view: 'cliente' | 'evento', initial: number, hasPrio?: boolean) {
  if (view === 'cliente') {
    downloadCsv(
      'simulacao_por_cliente.csv',
      ['cliente', ...(hasPrio ? ['classe'] : []), 'chegada', 'inicio', 'saida', 'espera', 'tempo_no_sistema', 'servidor', 'fila_ao_chegar', 'recusado', ...(hasPrio ? ['interrupcoes'] : [])],
      sim.customers.map((c) => [c.id, ...(hasPrio ? [c.cls + 1] : []), csvNum(c.arrival), csvNum(c.start), csvNum(c.end), csvNum(c.wait), csvNum(c.system), c.server, c.queueAtArrival, c.blocked ? 'sim' : 'nao', ...(hasPrio ? [c.preemptions] : [])]),
    )
  } else {
    downloadCsv(
      'simulacao_por_evento.csv',
      ['tempo', 'evento', 'cliente', 'atendidos_acum', 'chegadas_acum', 'no_sistema', 'na_fila'],
      sim.events.map((e) => [csvNum(e.t), e.type, e.id, e.served, Math.max(0, e.arrivals - initial), e.nSystem, e.nQueue]),
    )
  }
}
