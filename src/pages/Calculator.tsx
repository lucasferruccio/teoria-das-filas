import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { InputsForm } from '../components/calc/InputsForm'
import { LITTLE_ID, ModelPicker, ModelSummary } from '../components/calc/ModelPicker'
import { LittleCalc } from '../components/calc/LittleCalc'
import { MetricsView } from '../components/calc/MetricsView'
import { SensitivityView } from '../components/calc/SensitivityView'
import { SimulationView, type SimOpts } from '../components/calc/SimulationView'
import { Section, Tabs } from '../components/ui'
import { PRESETS, prepare, run, type Preset, type RawInput } from '../lib/calc'
import { MODEL_BY_ID, defaultValues, type ModelDef } from '../lib/models'

function defaultRaw(m: ModelDef): RawInput {
  const units = Object.fromEntries(m.params.filter((p) => p.kind === 'rate').map((p) => [p.key, 'min' as const]))
  const pa = PRESETS.find((p) => p.id === 'pa')!
  return {
    values: defaultValues(m),
    units,
    classes: m.hasClasses ? pa.classes!.map((c) => ({ ...c })) : [],
    preemptive: false,
    out: m.hasClasses ? 'min' : 'min',
  }
}

const DEFAULT_SIM: SimOpts = { customers: 1000, seed: 1, initial: 0 }
type Tab = 'metricas' | 'tempo' | 'sensibilidade'

const STEPS = [
  { id: 'passo-modelo', label: 'Escolha o modelo' },
  { id: 'passo-dados', label: 'Informe os dados' },
  { id: 'passo-resultados', label: 'Veja e interprete os resultados' },
]

export default function Calculator() {
  const [params, setParams] = useSearchParams()
  const [modelId, setModelId] = useState(() => {
    const m = params.get('modelo')
    return m && (MODEL_BY_ID[m] || m === LITTLE_ID) ? m : 'mm1'
  })
  const [raws, setRaws] = useState<Record<string, RawInput>>({})
  const [simOpts, setSimOpts] = useState<SimOpts>(DEFAULT_SIM)
  const [tab, setTab] = useState<Tab>('metricas')
  const [presetId, setPresetId] = useState<string | null>(null)

  const applyPreset = (p: Preset) => {
    const m = MODEL_BY_ID[p.model]
    setModelId(p.model)
    setRaws((r) => ({
      ...r,
      [p.model]: {
        values: { ...defaultValues(m), ...p.values },
        units: { ...p.units },
        classes: p.classes ? p.classes.map((c) => ({ ...c })) : [],
        preemptive: p.preemptive ?? false,
        out: p.out,
      },
    }))
    setSimOpts(p.sim ? { ...DEFAULT_SIM, ...p.sim } : DEFAULT_SIM)
    setPresetId(p.id)
  }

  // Exemplo vindo da aba Aprender (?exemplo=web).
  useEffect(() => {
    const ex = params.get('exemplo')
    const p = PRESETS.find((x) => x.id === ex)
    if (p) {
      applyPreset(p)
      if (params.get('aba') === 'tempo') setTab('tempo')
      setParams({}, { replace: true })
    }
    const m = params.get('modelo')
    if (!p && m && (MODEL_BY_ID[m] || m === LITTLE_ID)) {
      setModelId(m)
      setPresetId(null)
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const isLittle = modelId === LITTLE_ID
  const model = isLittle ? null : MODEL_BY_ID[modelId]
  const raw = model ? (raws[modelId] ?? defaultRaw(model)) : null
  const setRaw = (r: RawInput) => {
    setRaws((all) => ({ ...all, [modelId]: r }))
    setPresetId(null)
  }

  const prepared = useMemo(() => (model && raw ? prepare(model, raw) : null), [model, raw])
  const outcome = useMemo(() => (model && prepared ? run(model, prepared.input) : null), [model, prepared])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 text-4xl">Calculadora de filas</h1>
        <p className="max-w-3xl text-lg text-muted">
          Escolha o modelo, informe os dados e veja todas as métricas calculadas com as fórmulas e a substituição passo a passo. Passe o
          mouse sobre os termos sublinhados para ver o que significam.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2" aria-label="Etapas">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }} className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-4 pl-1 font-semibold text-primary-dark hover:bg-soft">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">{i + 1}</span>
                {s.label}
              </a>
              {i < STEPS.length - 1 && <span aria-hidden="true" className="sr-only">→</span>}
            </li>
          ))}
        </ol>
      </div>

      <Section id="passo-modelo" step={1} title="Escolha o modelo">
        <div className="mb-5 rounded-xl border border-line bg-sand p-4">
          <div className="mb-2 font-semibold">Comece por um exemplo pronto:</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} title={`${p.desc} (${p.source})`} onClick={() => applyPreset(p)} className={`btn-ghost px-3 py-1.5 text-sm ${presetId === p.id ? 'border-primary bg-soft' : ''}`}>
                {p.title}
              </button>
            ))}
            <button onClick={() => { setModelId(LITTLE_ID); setPresetId('lanchonete') }} className={`btn-ghost px-3 py-1.5 text-sm ${presetId === 'lanchonete' ? 'border-primary bg-soft' : ''}`} title="Exemplo da Lei de Little">
              Lanchonete (Little)
            </button>
          </div>
          {presetId && PRESETS.find((p) => p.id === presetId) && (
            <p className="mt-2 text-sm text-muted">
              <b>{PRESETS.find((p) => p.id === presetId)!.title}:</b> {PRESETS.find((p) => p.id === presetId)!.desc} Fonte:{' '}
              {PRESETS.find((p) => p.id === presetId)!.source}.
            </p>
          )}
        </div>
        <ModelPicker value={modelId} onChange={(id) => { setModelId(id); setPresetId(null) }} />
      </Section>

      {isLittle ? (
        <Section id="passo-dados" step={2} title="Lei de Little">
          <LittleCalc />
        </Section>
      ) : (
        model &&
        raw &&
        prepared && (
          <>
            <Section id="passo-dados" step={2} title="Informe os dados">
              <div className="mb-4">
                <ModelSummary model={model} />
              </div>
              <InputsForm model={model} raw={raw} setRaw={setRaw} conversions={prepared.conversions} error={outcome?.error ?? null} />
            </Section>

            <Section
              id="passo-resultados"
              step={3}
              title={`Resultados da ${model.kendall(raw.values)}`}
              aside={<span className="text-sm text-muted">Tudo é recalculado na hora, enquanto você digita.</span>}
            >
              <Tabs<Tab>
                value={tab}
                onChange={setTab}
                items={[
                  { id: 'metricas', label: 'Métricas e passo a passo' },
                  { id: 'tempo', label: 'Ao longo do tempo (simulação)' },
                  { id: 'sensibilidade', label: 'Sensibilidade' },
                ]}
              />
              <div className="pt-5">
                {outcome?.error ? (
                  <p className="text-warn-ink">Corrija os dados de entrada (etapa 2) para ver os resultados.</p>
                ) : tab === 'metricas' && outcome?.result ? (
                  <MetricsView model={model} raw={raw} result={outcome.result} conversions={prepared.conversions} />
                ) : tab === 'tempo' ? (
                  <SimulationView model={model} input={prepared.input} theory={outcome?.result ?? null} unit={raw.out} opts={simOpts} setOpts={setSimOpts} />
                ) : tab === 'sensibilidade' ? (
                  <SensitivityView model={model} raw={raw} />
                ) : null}
              </div>
            </Section>
          </>
        )
      )}
    </div>
  )
}
