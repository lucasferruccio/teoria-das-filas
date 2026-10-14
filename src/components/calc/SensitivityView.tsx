import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sensitivity, type RawInput } from '../../lib/calc'
import { csvNum, fmt } from '../../lib/format'
import { fmtTime, metricUnit } from '../../lib/interpret'
import { METRICS, METRIC_ORDER, type MetricKey } from '../../lib/metrics'
import { defaultValues, type ModelDef } from '../../lib/models'
import { UNIT_NAME } from '../../lib/units'
import { Tex } from '../Tex'
import { Info, Term } from '../Term'
import { Callout, NumberField, downloadCsv } from '../ui'
import { AXIS, GRID, REF_LINE, SERIES } from './charts'

type Op = '<' | '<=' | '>' | '>='
const OPS: { v: Op; l: string }[] = [
  { v: '<', l: 'menor que' },
  { v: '<=', l: 'no máximo' },
  { v: '>', l: 'maior que' },
  { v: '>=', l: 'no mínimo' },
]
const test = (x: number, op: Op, y: number) => (op === '<' ? x < y : op === '<=' ? x <= y : op === '>' ? x > y : x >= y)

function defaultRange(model: ModelDef, raw: RawInput, key: string) {
  const p = model.params.find((q) => q.key === key)!
  const cur = raw.values[key] ?? defaultValues(model)[key]
  if (p.kind === 'int') {
    const from = Math.max(p.min, cur - 2)
    return { from, to: from + 8, step: 1 }
  }
  if (p.kind === 'cv') return { from: 0, to: 2, step: 0.25 }
  const step = Number((cur / 10).toPrecision(2))
  return { from: step, to: Number((cur * 2).toPrecision(3)), step }
}

export function SensitivityView({ model, raw }: { model: ModelDef; raw: RawInput }) {
  const params = model.params
  const [key, setKey] = useState(params.find((p) => p.key === 'c')?.key ?? params[0]?.key ?? '')
  const [range, setRange] = useState(() => (key ? defaultRange(model, raw, key) : { from: 0, to: 0, step: 1 }))
  const [cols, setCols] = useState<MetricKey[]>(['rho', 'Lq', 'Wq', 'W', 'Pwait', 'Pblock'])
  const [goal, setGoal] = useState<{ on: boolean; metric: MetricKey; op: Op; value: number }>({ on: false, metric: 'Wq', op: '<', value: 1 })

  // Ao trocar de modelo, recomeça com um parâmetro válido.
  useEffect(() => {
    const k = model.params.find((p) => p.key === 'c')?.key ?? model.params[0]?.key ?? ''
    setKey(k)
    if (k) setRange(defaultRange(model, raw, k))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id])

  const rows = useMemo(() => (key ? sensitivity(model, raw, key, range.from, range.to, range.step) : []), [model, raw, key, range])

  if (model.hasClasses || params.length === 0) {
    return <Callout tone="info">A análise de sensibilidade não está disponível para o modelo com classes de prioridade. Altere os valores das classes na etapa 2 para comparar cenários.</Callout>
  }

  const p = params.find((q) => q.key === key)!
  const available = METRIC_ORDER.filter((k) => rows.some((r) => r.result?.metrics.some((m) => m.key === k)))
  const shown = cols.filter((k) => available.includes(k))
  const val = (r: (typeof rows)[number], k: MetricKey) => (r.result?.stable ? r.result.metrics.find((m) => m.key === k)?.value : undefined)
  const meets = (r: (typeof rows)[number]) => {
    if (!goal.on) return false
    const x = val(r, goal.metric)
    return x !== undefined && test(x, goal.op, goal.value)
  }
  const first = rows.find(meets)
  const chartMetric = goal.on ? goal.metric : shown.find((k) => k !== 'rho') ?? shown[0]
  const chartData = rows.map((r) => ({ x: r.x, y: chartMetric ? (val(r, chartMetric) ?? null) : null }))
  const unitLabel = p.kind === 'rate' ? ` (por ${UNIT_NAME[raw.units[key] ?? raw.out]})` : ''
  const fmtCell = (k: MetricKey, x: number | undefined) => (x === undefined ? '—' : METRICS[k].kind === 'time' ? fmtTime(x, raw.out) : fmt(x))

  return (
    <div className="space-y-6">
      <Callout tone="info" title="Como usar">
        Escolha um parâmetro para variar e as métricas que quer acompanhar. Cada linha da tabela é um cenário. Use a meta para
        descobrir, por exemplo, quantos servidores são necessários para a espera ficar abaixo de um limite (<Term k="sensibilidade">análise de sensibilidade</Term>).
      </Callout>

      <div className="grid gap-4 rounded-xl border border-line bg-white p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="label">1. Parâmetro que vai variar</span>
            <select
              className="input"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setRange(defaultRange(model, raw, e.target.value))
              }}
            >
              {params.map((q) => (
                <option key={q.key} value={q.key}>
                  {q.label} ({q.symbol.replace(/\\|_/g, '').replace('lambda', 'λ').replace('mu', 'μ')})
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="label">2. Intervalo{unitLabel}</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(['from', 'to', 'step'] as const).map((f) => (
                <label key={f} className="flex flex-col text-sm">
                  {f === 'from' ? 'De' : f === 'to' ? 'Até' : 'Passo'}
                  <NumberField value={range[f]} integer={p.kind === 'int'} min={f === 'step' ? 0 : p.min} onChange={(x) => setRange({ ...range, [f]: x })} />
                </label>
              ))}
            </div>
            {rows.length >= 200 && <p className="mt-1 text-sm text-warn-ink">Limitado a 200 linhas. Aumente o passo.</p>}
          </div>
        </div>
        <div className="space-y-3">
          <fieldset>
            <legend className="label mb-1">3. Métricas exibidas</legend>
            <div className="flex flex-wrap gap-2">
              {available.map((k) => (
                <label key={k} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-sm ${cols.includes(k) ? 'border-primary bg-soft' : 'border-line'}`}>
                  <input type="checkbox" className="accent-primary" checked={cols.includes(k)} onChange={(e) => setCols(e.target.checked ? [...cols, k] : cols.filter((x) => x !== k))} />
                  {METRICS[k].label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label flex items-center gap-2">
              <input type="checkbox" className="accent-primary" checked={goal.on} onChange={(e) => setGoal({ ...goal, on: e.target.checked })} />
              4. Meta (opcional)
              <Info title="Meta">As linhas que cumprem a meta ficam destacadas, e o site indica o primeiro valor do parâmetro que a atinge.</Info>
            </label>
            <div className={`mt-1 flex flex-wrap items-center gap-2 ${goal.on ? '' : 'opacity-50'}`}>
              <select className="input w-auto" disabled={!goal.on} value={goal.metric} onChange={(e) => setGoal({ ...goal, metric: e.target.value as MetricKey })}>
                {available.map((k) => (
                  <option key={k} value={k}>
                    {METRICS[k].label}
                  </option>
                ))}
              </select>
              <select className="input w-auto" disabled={!goal.on} value={goal.op} onChange={(e) => setGoal({ ...goal, op: e.target.value as Op })}>
                {OPS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
              <NumberField value={goal.value} min={0} onChange={(x) => setGoal({ ...goal, value: x })} className="w-28" />
              <span className="text-muted">{metricUnit(goal.metric, raw.out)}</span>
            </div>
          </div>
        </div>
      </div>

      {goal.on && (
        <Callout tone={first ? 'ok' : 'warn'} title={first ? 'Meta atingida' : 'Meta não atingida no intervalo'}>
          {first
            ? `A partir de ${p.label.toLowerCase()} = ${fmt(first.x)}${unitLabel}, ${METRICS[goal.metric].label.toLowerCase()} fica ${OPS.find((o) => o.v === goal.op)!.l} ${fmt(goal.value)} ${metricUnit(goal.metric, raw.out)} (valor: ${fmtCell(goal.metric, val(first, goal.metric))}).`
            : 'Nenhum cenário da tabela cumpre a meta. Amplie o intervalo.'}
        </Callout>
      )}

      {chartMetric && (
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-2 text-lg">
            {METRICS[chartMetric].label} conforme <Tex math={p.symbol} /> varia
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={AXIS} tickFormatter={(x) => fmt(x, 3)} label={{ value: `${p.label}${unitLabel}`, position: 'insideBottom', offset: -8, ...AXIS }} />
              <YAxis tick={AXIS} width={56} tickFormatter={(x) => fmt(x, 3)} />
              <Tooltip formatter={(v) => fmtCell(chartMetric, Number(v))} labelFormatter={(x) => `${p.label} = ${fmt(Number(x))}`} />
              <Line type="monotone" dataKey="y" name={METRICS[chartMetric].label} stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
              {goal.on && <ReferenceLine y={goal.value} stroke={REF_LINE} strokeDasharray="6 4" strokeWidth={2} label={{ value: 'meta', position: 'insideTopRight', ...AXIS }} />}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted">Pontos ausentes são cenários instáveis (sem média a longo prazo).</p>
        </div>
      )}

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-lg">Tabela de sensibilidade</h3>
          <button
            className="btn-ghost"
            onClick={() =>
              downloadCsv(
                'sensibilidade.csv',
                [key, ...shown.map((k) => METRICS[k].short), 'estavel'],
                rows.map((r) => [csvNum(r.x), ...shown.map((k) => csvNum(val(r, k))), r.result?.stable ? 'sim' : 'nao']),
              )
            }
          >
            ⬇ Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-tf">
            <thead>
              <tr>
                <th>
                  <Tex math={p.symbol} />
                  {unitLabel}
                </th>
                {shown.map((k) => (
                  <th key={k}>
                    <Term k={METRICS[k].gloss}>{METRICS[k].label}</Term>
                    {metricUnit(k, raw.out) && METRICS[k].kind === 'time' && ` (${raw.out})`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ok = meets(r)
                const isCur = r.x === raw.values[key]
                return (
                  <tr key={r.x} className={ok ? 'bg-soft' : !r.result?.stable ? 'bg-warn-bg/50' : ''}>
                    <td className="font-semibold">
                      {fmt(r.x)} {isCur && <span className="badge bg-sand text-xs text-primary-dark">atual</span>}
                      {r === first && <span className="badge ml-1 bg-primary text-xs text-white">1º a cumprir a meta</span>}
                    </td>
                    {r.error ? (
                      <td colSpan={shown.length} className="text-warn-ink">{r.error}</td>
                    ) : !r.result?.stable ? (
                      <td colSpan={shown.length} className="font-semibold text-warn-ink">
                        ⚠ Instável: a fila cresce sem limite <Term k="estabilidade">(ρ ≥ 1)</Term>
                      </td>
                    ) : (
                      shown.map((k) => (
                        <td key={k}>
                          {(() => {
                            const x = val(r, k)
                            if (x === undefined) return '—'
                            return METRICS[k].kind === 'time' ? fmt(x) : fmt(x)
                          })()}
                        </td>
                      ))
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
