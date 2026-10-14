import { Link } from 'react-router-dom'
import { GLOSSARY } from '../lib/glossary'
import { REFS } from '../lib/refs'

export default function References() {
  const terms = Object.values(GLOSSARY).sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'))
  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 text-4xl">Referências</h1>
        <p className="max-w-3xl text-lg text-muted">
          As fórmulas do site seguem a notação do livro de Jain e foram conferidas nas referências abaixo. Cada
          modelo da calculadora indica as fontes usadas e se o resultado é exato ou aproximado.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-2xl">Bibliografia</h2>
        <ol className="space-y-3">
          {Object.values(REFS).map((r) => (
            <li key={r.id} className="card">
              <div className="mb-1">{r.full}</div>
              <div className="text-sm text-muted">
                <b>Usado para:</b> {r.usedFor}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Como os cálculos foram verificados</h2>
        <ul className="prose-tf list-disc pl-6">
          <li>Testes automatizados comparam os resultados com exemplos publicados (Jain, exemplo 31.1) e com exemplos resolvidos à mão.</li>
          <li>Casos-limite: M/M/c com c = 1 tem que ser igual à M/M/1; M/M/1/K com K grande tem que se aproximar da M/M/1; M/D/1 espera metade da M/M/1; as aproximações G/G viram as fórmulas exatas quando Cₐ = Cₛ = 1.</li>
          <li>Leis gerais: a Lei de Little e a lei de conservação das filas com prioridade.</li>
          <li>A simulação de eventos discretos é comparada às fórmulas e reproduz exatamente os casos determinísticos calculados à mão.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl">Glossário</h2>
        <dl className="grid gap-3 md:grid-cols-2">
          {terms.map((g) => (
            <div key={g.term} className="rounded-xl border border-line bg-white p-4">
              <dt className="font-serif font-semibold text-primary-dark">{g.term}</dt>
              <dd className="text-muted">
                {g.def}{' '}
                {g.anchor && (
                  <Link to={`/aprender?secao=${g.anchor}`} className="font-semibold text-primary underline">
                    Ver explicação
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
