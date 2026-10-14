import { prepare, run, type Conversion, type RawInput } from '../../lib/calc'
import { fmt, tex } from '../../lib/format'
import { fmtMetric, fmtTime, interpret } from '../../lib/interpret'
import { METRICS, METRIC_ORDER } from '../../lib/metrics'
import type { MetricOut, ModelDef, ModelResult } from '../../lib/models'
import { REFS } from '../../lib/refs'
import { UNIT_NAME, type TimeUnit } from '../../lib/units'
import { Tex } from '../Tex'
import { Term } from '../Term'
import { Callout } from '../ui'

function unitTex(m: MetricOut, unit: TimeUnit): string {
  const kind = METRICS[m.key].kind
  if (kind === 'time') return `\\ \\text{${unit}}`
  if (kind === 'rate') return `\\ \\text{por ${UNIT_NAME[unit]}}`
  return ''
}

export function StabilityBanner({ result }: { result: ModelResult }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border-l-4 p-4 ${result.stable ? 'border-primary bg-soft' : 'border-warn bg-warn-bg text-warn-ink'}`} role={result.stable ? undefined : 'alert'}>
      <div className="font-semibold">
        {result.stable ? '✓ Sistema estável' : '⚠ Sistema instável'}{' '}
        <span className="font-normal">
          (<Term k="estabilidade">condição de estabilidade</Term>)
        </span>
      </div>
      <Tex math={result.stability.tex} />
      <Tex math={result.stability.sub} />
      <p className="basis-full">{result.stability.msg}</p>
    </div>
  )
}

export function MetricCards({ result, unit }: { result: ModelResult; unit: TimeUnit }) {
  const list = METRIC_ORDER.map((k) => result.metrics.find((m) => m.key === k)).filter(Boolean) as MetricOut[]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((m) => (
        <div key={m.key} className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-2 text-sm font-semibold text-muted">
            <Term k={METRICS[m.key].gloss}>{METRICS[m.key].label}</Term>
            <Tex math={METRICS[m.key].symbol} className="text-primary-dark" />
          </div>
          <div className="mt-1 text-2xl font-bold text-primary-dark tabular-nums">
            {m.approx && <span title="Valor aproximado">≈ </span>}
            {fmtMetric(m.key, m.value, unit)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StepByStep({ result, unit, conversions }: { result: ModelResult; unit: TimeUnit; conversions: Conversion[] }) {
  return (
    <ol className="space-y-3">
      {conversions.length > 0 && (
        <li className="rounded-xl border border-line bg-white p-3">
          <div className="mb-1 font-semibold">Converter todas as taxas para "por {UNIT_NAME[unit]}"</div>
          {conversions.map((c, i) => (
            <Tex key={i} block math={`${c.symbol} = ${tex(c.from)}\\ \\text{por ${UNIT_NAME[c.fromUnit]}} = ${tex(c.to)}\\ \\text{por ${UNIT_NAME[unit]}}`} />
          ))}
        </li>
      )}
      {result.metrics.map((m) => {
        const eq = m.approx ? '\\approx' : '='
        const parts = [m.tex]
        if (m.sub) parts.push(`= ${m.sub}`)
        parts.push(`${eq} \\boxed{${tex(m.value)}${unitTex(m, unit)}}`)
        return (
          <li key={m.key} className="rounded-xl border border-line bg-white p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
              <Term k={METRICS[m.key].gloss}>{METRICS[m.key].label}</Term>
              {m.approx && <span className="badge bg-approx-bg text-approx-ink text-xs">aproximação</span>}
            </div>
            <Tex block math={parts.join(' ')} />
            {m.note && <p className="text-sm text-muted">{m.note}</p>}
          </li>
        )
      })}
    </ol>
  )
}

function whatIf(model: ModelDef, raw: RawInput, base: ModelResult): string | null {
  const Wq = (r: ModelResult | null) => r?.metrics.find((m) => m.key === 'Wq')?.value
  const Pb = (r: ModelResult | null) => r?.metrics.find((m) => m.key === 'Pblock')?.value
  let label: string
  let raw2: RawInput
  if (model.params.some((p) => p.key === 'c') && model.id !== 'mmcc') {
    const c = raw.values.c + 1
    raw2 = { ...raw, values: { ...raw.values, c, ...(raw.values.K !== undefined ? { K: Math.max(raw.values.K, c) } : {}) } }
    label = `Com 1 servidor a mais (c = ${c})`
  } else if (model.id === 'mmcc') {
    raw2 = { ...raw, values: { ...raw.values, c: raw.values.c + 1 } }
    label = `Com 1 servidor a mais (c = ${raw.values.c + 1})`
  } else if (model.params.some((p) => p.key === 'mu')) {
    raw2 = { ...raw, values: { ...raw.values, mu: raw.values.mu * 1.2 } }
    label = 'Se o atendimento fosse 20% mais rápido'
  } else return null
  const r2 = run(model, prepare(model, raw2).input).result
  if (!r2) return null
  if (model.id === 'mmcc') {
    return `${label}, a probabilidade de bloqueio cairia de ${fmt(Pb(base)! * 100)}% para ${fmt(Pb(r2)! * 100)}%.`
  }
  if (!base.stable && r2.stable) return `${label}, o sistema ficaria estável, com espera média de ${fmtTime(Wq(r2)!, raw.out)}.`
  if (!r2.stable) return `${label}, o sistema ainda seria instável.`
  const a = Wq(base)
  const b = Wq(r2)
  if (a === undefined || b === undefined) return null
  return `${label}, o tempo médio de espera na fila passaria de ${fmtTime(a, raw.out)} para ${fmtTime(b, raw.out)}.`
}

export function MetricsView({ model, raw, result, conversions }: { model: ModelDef; raw: RawInput; result: ModelResult; conversions: Conversion[] }) {
  const unit = raw.out
  const tips = interpret(result, unit)
  const wi = whatIf(model, raw, result)
  return (
    <div className="space-y-6">
      <StabilityBanner result={result} />

      {result.metrics.length > 0 && <MetricCards result={result} unit={unit} />}

      {result.perClass && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="table-tf">
            <thead>
              <tr>
                <th>Classe</th>
                <th>λ</th>
                <th>μ</th>
                <th>ρ da classe</th>
                <th><Term k="Wq">E[w] espera</Term></th>
                <th><Term k="W">E[r] resposta</Term></th>
                <th><Term k="Lq">E[n_w]</Term></th>
                <th><Term k="L">E[n]</Term></th>
              </tr>
            </thead>
            <tbody>
              {result.perClass.map((c) => (
                <tr key={c.name}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{fmt(c.lambda)}</td>
                  <td>{fmt(c.mu)}</td>
                  <td>{fmt(c.rho)}</td>
                  <td>{fmtTime(c.Wq, unit)}</td>
                  <td>{fmtTime(c.W, unit)}</td>
                  <td>{fmt(c.Lq)}</td>
                  <td>{fmt(c.L)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Callout tone={result.stable ? 'ok' : 'warn'} title="O que esses números significam">
          <ul className="list-disc space-y-1 pl-5">
            {tips.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Callout>
        <div className="space-y-4">
          {wi && (
            <Callout tone="info" title="E se…?">
              {wi} Use a aba <b>Sensibilidade</b> para testar outros valores.
            </Callout>
          )}
          {!model.exact && (
            <Callout tone="approx" title="Resultado aproximado">
              As fórmulas deste modelo são aproximações. Confira na aba <b>Ao longo do tempo</b> o que a simulação mostra.
            </Callout>
          )}
          {result.notes.map((n, i) => (
            <Callout key={i} tone="info">
              {n}
            </Callout>
          ))}
        </div>
      </div>

      {result.metrics.length > 0 && (
        <details open className="rounded-xl border border-line bg-sand p-4">
          <summary className="cursor-pointer font-serif text-xl font-semibold text-primary-dark">Passo a passo dos cálculos</summary>
          <p className="mt-2 mb-3 text-muted">
            Cada linha mostra a fórmula, a substituição dos valores e o resultado (em destaque). As fórmulas seguem a notação de Jain (1991).
          </p>
          <StepByStep result={result} unit={unit} conversions={conversions} />
          <p className="mt-3 text-sm text-muted">Fontes das fórmulas: {model.refs.map((r) => REFS[r].short).join('; ')}.</p>
        </details>
      )}
    </div>
  )
}
