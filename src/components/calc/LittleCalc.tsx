import { useState } from 'react'
import { fmt, tex } from '../../lib/format'
import { fmtTime } from '../../lib/interpret'
import { REFS } from '../../lib/refs'
import { TIME_UNITS, UNIT_NAME, convertRate, convertTime, type TimeUnit } from '../../lib/units'
import { Tex } from '../Tex'
import { Term } from '../Term'
import { Callout, NumberField } from '../ui'

type Unknown = 'L' | 'lambda' | 'W'

export function LittleCalc() {
  const [unknown, setUnknown] = useState<Unknown>('W')
  const [scope, setScope] = useState<'sistema' | 'fila'>('sistema')
  const [L, setL] = useState(50)
  const [lambda, setLambda] = useState(100)
  const [lu, setLu] = useState<TimeUnit>('h')
  const [W, setW] = useState(0.5)
  const [wu, setWu] = useState<TimeUnit>('h')

  const lam = convertRate(lambda, lu, wu) // λ na mesma unidade de W
  const q = scope === 'fila'
  const sL = q ? 'E[n_w]' : 'E[n]'
  const sW = q ? 'E[w]' : 'E[r]'
  let result = NaN
  let steps: string[] = []
  const conv = lu !== wu ? `\\lambda = ${tex(lambda)}\\ \\text{por ${UNIT_NAME[lu]}} = ${tex(lam)}\\ \\text{por ${UNIT_NAME[wu]}}` : null
  if (unknown === 'L') {
    result = lam * W
    steps = [`${sL} = \\lambda \\times ${sW}`, `${sL} = ${tex(lam)} \\times ${tex(W)} = \\boxed{${tex(result)}}\\ \\text{clientes}`]
  } else if (unknown === 'W') {
    result = L / lam
    steps = [`${sW} = \\dfrac{${sL}}{\\lambda}`, `${sW} = \\dfrac{${tex(L)}}{${tex(lam)}} = \\boxed{${tex(result)}\\ \\text{${wu}}}`]
  } else {
    result = L / W
    steps = [`\\lambda = \\dfrac{${sL}}{${sW}}`, `\\lambda = \\dfrac{${tex(L)}}{${tex(W)}} = \\boxed{${tex(result)}\\ \\text{por ${UNIT_NAME[wu]}}}`]
  }
  const valid = Number.isFinite(result) && result >= 0

  const field = (k: Unknown) => unknown !== k

  return (
    <div className="space-y-5">
      <Callout tone="info" title="Lei de Little">
        <Tex math="L = \lambda\,W" /> vale para praticamente qualquer sistema estável, sem precisar saber as distribuições: o número médio
        de clientes é a taxa de chegada vezes o tempo médio de permanência. Também vale só para a fila: <Tex math="E[n_w] = \lambda\,E[w]" />.
        <span className="block text-sm text-muted">Fonte: {REFS.little61.short}.</span>
      </Callout>

      <div className="flex flex-wrap gap-6 rounded-xl border border-line bg-white p-4">
        <fieldset>
          <legend className="label mb-1">O que você quer descobrir?</legend>
          <div className="flex flex-wrap gap-2">
            {([
              ['L', 'Número médio de clientes'],
              ['W', 'Tempo médio de permanência'],
              ['lambda', 'Taxa de chegada'],
            ] as [Unknown, string][]).map(([k, l]) => (
              <button key={k} className={`btn-ghost ${unknown === k ? 'border-primary bg-soft' : ''}`} aria-pressed={unknown === k} onClick={() => setUnknown(k)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-1">Aplicar a</legend>
          <div className="flex gap-2">
            {(['sistema', 'fila'] as const).map((s) => (
              <button key={s} className={`btn-ghost ${scope === s ? 'border-primary bg-soft' : ''}`} aria-pressed={scope === s} onClick={() => setScope(s)}>
                {s === 'sistema' ? 'Sistema inteiro' : 'Só a fila'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {field('L') && (
          <label className="rounded-xl border border-line bg-white p-3">
            <span className="mb-1 block font-semibold">
              <Term k={q ? 'Lq' : 'L'}>{q ? 'Número médio na fila' : 'Número médio no sistema'}</Term> <Tex math={sL} />
            </span>
            <NumberField value={L} min={0} onChange={setL} />
          </label>
        )}
        {field('lambda') && (
          <div className="rounded-xl border border-line bg-white p-3">
            <span className="mb-1 block font-semibold">
              <Term k="lambda">Taxa de chegada</Term> <Tex math="\lambda" />
            </span>
            <div className="flex gap-2">
              <NumberField ariaLabel="Taxa de chegada" value={lambda} min={0} onChange={setLambda} />
              <select aria-label="Unidade da taxa" className="input w-auto" value={lu} onChange={(e) => setLu(e.target.value as TimeUnit)}>
                {TIME_UNITS.map((u) => (
                  <option key={u} value={u}>
                    por {UNIT_NAME[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-line bg-white p-3">
          <span className="mb-1 block font-semibold">
            <Term k={q ? 'Wq' : 'W'}>{q ? 'Tempo médio na fila' : 'Tempo médio no sistema'}</Term> <Tex math={sW} />
          </span>
          <div className="flex gap-2">
            {field('W') && <NumberField ariaLabel="Tempo médio" value={W} min={0} onChange={setW} />}
            <select aria-label="Unidade de tempo" className="input w-auto" value={wu} onChange={(e) => {
              const u = e.target.value as TimeUnit
              if (field('W')) setW(Number(convertTime(W, wu, u).toPrecision(10)))
              setWu(u)
            }}>
              {TIME_UNITS.map((u) => (
                <option key={u} value={u}>
                  {field('W') ? UNIT_NAME[u] + 's' : `resultado em ${UNIT_NAME[u]}s`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-sand p-4">
        <h3 className="mb-2 text-xl">Resultado passo a passo</h3>
        {conv && <Tex block math={conv} />}
        {steps.map((s, i) => (
          <Tex key={i} block math={s} />
        ))}
        {valid && (
          <p className="mt-2 text-lg font-semibold text-primary-dark">
            {unknown === 'L' && `Em média há ${fmt(result)} clientes ${q ? 'esperando na fila' : 'no sistema'}.`}
            {unknown === 'W' && `Cada cliente fica, em média, ${fmtTime(result, wu)} ${q ? 'esperando na fila' : 'no sistema'}${wu === 'h' ? ` (= ${fmt(result * 60)} min)` : ''}.`}
            {unknown === 'lambda' && `Chegam, em média, ${fmt(result)} clientes por ${UNIT_NAME[wu]}.`}
          </p>
        )}
      </div>
      <p className="text-sm text-muted">
        Exemplo (lanchonete): ocupação média de 50 pessoas e 100 chegadas por hora, logo W = 50 / 100 = 0,5 h = 30 min. Como a refeição
        leva 20 min, os outros 10 min são espera (fila e preparo do pedido).
      </p>
    </div>
  )
}
