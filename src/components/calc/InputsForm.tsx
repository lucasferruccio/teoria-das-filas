import type { Conversion, RawInput } from '../../lib/calc'
import { fmt, tex } from '../../lib/format'
import type { ModelDef, ParamDef } from '../../lib/models'
import { TIME_UNITS, UNIT_NAME, type TimeUnit } from '../../lib/units'
import { Tex } from '../Tex'
import { Info, Term } from '../Term'
import { NumberField } from '../ui'

function UnitSelect({ value, onChange, prefix = 'por ', label }: { value: TimeUnit; onChange: (u: TimeUnit) => void; prefix?: string; label: string }) {
  return (
    <select aria-label={label} className="input w-auto" value={value} onChange={(e) => onChange(e.target.value as TimeUnit)}>
      {TIME_UNITS.map((u) => (
        <option key={u} value={u}>
          {prefix}
          {UNIT_NAME[u]}
        </option>
      ))}
    </select>
  )
}

function ParamRow({ p, raw, setRaw }: { p: ParamDef; raw: RawInput; setRaw: (r: RawInput) => void }) {
  const id = `p-${p.key}`
  const setVal = (x: number) => setRaw({ ...raw, values: { ...raw.values, [p.key]: x } })
  const value = raw.values[p.key] ?? p.def
  const rate = value
  const unit = raw.units[p.key] ?? raw.out
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <label htmlFor={id} className="mb-1 flex items-center gap-2 font-semibold">
        <Term k={p.gloss}>
          <Tex math={p.symbol} />
        </Term>
        <span>{p.label}</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <NumberField id={id} value={value} onChange={setVal} integer={p.kind === 'int'} min={p.min} className="max-w-[10rem]" />
        {p.kind === 'rate' && (
          <>
            <span className="text-muted">clientes</span>
            <UnitSelect label={`Unidade de ${p.label}`} value={unit} onChange={(u) => setRaw({ ...raw, units: { ...raw.units, [p.key]: u } })} />
          </>
        )}
        {p.kind === 'cv' && (
          <input
            type="range"
            aria-label={`${p.label} (controle deslizante)`}
            min={0}
            max={3}
            step={0.05}
            value={Math.min(value, 3)}
            onChange={(e) => setVal(Number(e.target.value))}
            className="min-w-[8rem] flex-1 accent-primary"
          />
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {p.help}
        {p.kind === 'rate' && rate > 0 && (
          <> Equivale a 1 cliente a cada {fmt(1 / rate)} {unit}{p.key === 'mu' ? ' de atendimento' : ''}.</>
        )}
      </p>
    </div>
  )
}

export function InputsForm({ model, raw, setRaw, conversions, error }: {
  model: ModelDef; raw: RawInput; setRaw: (r: RawInput) => void; conversions: Conversion[]; error: string | null
}) {
  return (
    <div className="space-y-4">
      {model.hasClasses ? (
        <ClassesEditor raw={raw} setRaw={setRaw} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {model.params.map((p) => (
            <ParamRow key={p.key} p={p} raw={raw} setRaw={setRaw} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sand p-3">
        <label htmlFor="out-unit" className="font-semibold">
          Mostrar os tempos dos resultados em
        </label>
        <select id="out-unit" className="input w-auto" value={raw.out} onChange={(e) => setRaw({ ...raw, out: e.target.value as TimeUnit })}>
          {TIME_UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_NAME[u]}s
            </option>
          ))}
        </select>
        <Info title="Por que converter unidades?">
          Todas as taxas precisam estar na mesma unidade de tempo antes de entrar nas fórmulas. Misturar "por minuto" com
          "por segundo" é o erro mais comum nos cálculos. O site converte tudo automaticamente.
        </Info>
      </div>

      {conversions.length > 0 && (
        <div className="rounded-xl border border-dashed border-primary-2 bg-soft p-3">
          <div className="mb-1 font-semibold text-primary-dark">Conversão de unidades feita automaticamente</div>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            {conversions.map((c, i) => (
              <Tex
                key={i}
                math={`${c.symbol} = ${tex(c.from)}\\ \\text{por ${UNIT_NAME[c.fromUnit]}} = ${tex(c.to)}\\ \\text{por ${UNIT_NAME[raw.out]}}`}
              />
            ))}
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border-l-4 border-warn bg-warn-bg p-3 font-semibold text-warn-ink" role="alert">⚠ {error}</div>}
    </div>
  )
}

function ClassesEditor({ raw, setRaw }: { raw: RawInput; setRaw: (r: RawInput) => void }) {
  const set = (i: number, patch: Partial<RawInput['classes'][number]>) =>
    setRaw({ ...raw, classes: raw.classes.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-3">
        <span className="font-semibold">
          Tipo de <Term k="preemptivo">prioridade</Term>:
        </span>
        {[
          { v: false, l: 'Não preemptiva (espera o atendimento atual terminar)' },
          { v: true, l: 'Preemptiva (interrompe o atendimento atual)' },
        ].map((o) => (
          <label key={String(o.v)} className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="preempt" checked={raw.preemptive === o.v} onChange={() => setRaw({ ...raw, preemptive: o.v })} className="accent-primary" />
            {o.l}
          </label>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="table-tf">
          <thead>
            <tr>
              <th>Classe</th>
              <th>
                <Term k="lambda">λ (chegadas)</Term>
              </th>
              <th>
                <Term k="mu">μ (atendimento)</Term>
              </th>
              <th>Unidade</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {raw.classes.map((c, i) => (
              <tr key={i}>
                <td className="font-semibold">
                  {i + 1} {i === 0 && <span className="text-sm text-muted">(maior prioridade)</span>}
                </td>
                <td>
                  <NumberField ariaLabel={`λ da classe ${i + 1}`} value={c.lambda} min={0} onChange={(x) => set(i, { lambda: x })} className="max-w-[8rem]" />
                </td>
                <td>
                  <NumberField ariaLabel={`μ da classe ${i + 1}`} value={c.mu} min={0} onChange={(x) => set(i, { mu: x })} className="max-w-[8rem]" />
                </td>
                <td>
                  <UnitSelect label={`Unidade da classe ${i + 1}`} value={c.unit} onChange={(u) => set(i, { unit: u })} />
                </td>
                <td>
                  {raw.classes.length > 1 && (
                    <button className="btn-ghost px-2 py-1 text-sm" onClick={() => setRaw({ ...raw, classes: raw.classes.filter((_, j) => j !== i) })}>
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {raw.classes.length < 8 && (
        <button className="btn-ghost" onClick={() => setRaw({ ...raw, classes: [...raw.classes, { ...raw.classes.at(-1)! }] })}>
          + Adicionar classe
        </button>
      )}
    </div>
  )
}
