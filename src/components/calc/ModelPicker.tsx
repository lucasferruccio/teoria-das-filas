import { Link } from 'react-router-dom'
import { MODELS, type ModelDef } from '../../lib/models'
import { REFS } from '../../lib/refs'
import { Info, Term } from '../Term'

export const LITTLE_ID = 'little'

function Card({ id, kendall, title, short, exact, selected, onSelect, when }: {
  id: string; kendall: string; title: string; short: string; exact: boolean; selected: boolean; onSelect: (id: string) => void; when?: string
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={`group flex h-full cursor-pointer flex-col rounded-xl border-2 p-3 text-left transition-colors ${
        selected ? 'border-primary bg-soft' : 'border-line bg-white hover:border-primary-2'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`rounded-md px-2 py-0.5 font-mono text-[0.95rem] font-bold ${selected ? 'bg-primary text-white' : 'bg-sand text-primary-dark'}`}>{kendall}</span>
        {!exact && <span className="badge bg-approx-bg text-approx-ink text-xs">aproximado</span>}
      </div>
      <span className="font-semibold leading-snug text-ink">{title}</span>
      <span className="mt-1 text-sm leading-snug text-muted">{short}</span>
      {when && selected && <span className="mt-2 text-sm text-primary-dark"><b>Quando usar:</b> {when}</span>}
    </button>
  )
}

export function ModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const groups: { title: string; desc: string; items: ModelDef[] }[] = [
    { title: 'Modelos essenciais', desc: 'Fórmulas exatas, os mais usados.', items: MODELS.filter((m) => m.level === 1) },
    { title: 'Modelos avançados', desc: 'População finita, prioridades e casos gerais.', items: MODELS.filter((m) => m.level === 2) },
  ]
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="text-lg">{g.title}</h3>
            <span className="text-sm text-muted">{g.desc}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((m) => (
              <Card key={m.id} id={m.id} kendall={m.kendall({})} title={m.name} short={m.short} exact={m.exact} selected={value === m.id} onSelect={onChange} when={m.when} />
            ))}
            {g.title === 'Modelos avançados' && (
              <Card
                id={LITTLE_ID}
                kendall="L = λW"
                title="Lei de Little"
                short="Vale para qualquer sistema estável. Informe duas grandezas e descubra a terceira."
                exact
                selected={value === LITTLE_ID}
                onSelect={onChange}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ModelSummary({ model }: { model: ModelDef }) {
  return (
    <div className="card grid gap-4 md:grid-cols-[1fr_auto]">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary px-2 py-0.5 font-mono font-bold text-white">{model.kendall({})}</span>
          <span className="font-semibold">{model.name}</span>
          <Info k="kendall" />
        </div>
        <p className="mb-2 text-muted">{model.when}</p>
        <div className="text-sm">
          <span className="font-semibold">Hipóteses do modelo: </span>
          {model.assumptions.join(' · ')}
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 text-sm md:items-end">
        <span className={`badge ${model.exact ? 'bg-soft text-primary-dark' : 'bg-approx-bg text-approx-ink'}`}>
          {model.exact ? '✓ Resultado exato' : <><Term k="aproximacao">≈ Resultado aproximado</Term></>}
        </span>
        <span className="text-muted">Fontes: {model.refs.map((r) => REFS[r].short).join('; ')}</span>
        <Link to={`/aprender?secao=${model.anchor}`} className="font-semibold text-primary underline">
          Entender este modelo →
        </Link>
      </div>
    </div>
  )
}
