import { Link } from 'react-router-dom'
import { Term } from '../components/Term'
import { Tex } from '../components/Tex'
import { MODELS } from '../lib/models'

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-2 font-semibold tracking-wide text-primary-2 uppercase">Ferramenta didática</p>
          <h1 className="mb-4 text-5xl leading-tight">Entenda e calcule filas, do banco ao servidor web</h1>
          <p className="mb-6 text-xl text-muted">
            Informe a <Term k="lambda">taxa de chegada</Term>, a <Term k="mu">taxa de atendimento</Term> e o número de{' '}
            <Term k="servidor">servidores</Term>, e veja quanto tempo os clientes esperam, quantos ficam na fila e se o sistema dá
            conta da demanda, com cada fórmula explicada.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/calculadora" className="btn-primary px-6 py-3 text-lg">
              Abrir a calculadora →
            </Link>
            <Link to="/aprender" className="btn-ghost px-6 py-3 text-lg">
              Aprender o conteúdo
            </Link>
          </div>
        </div>
        <QueueIllustration />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { n: '1', t: 'Escolha o modelo', d: `${MODELS.length} modelos, da M/M/1 até a G/G/c, além da Lei de Little. Cada um explica quando usar.` },
          { n: '2', t: 'Informe os dados', d: 'Os campos mudam conforme o modelo. Use a unidade que quiser: o site converte tudo automaticamente.' },
          { n: '3', t: 'Entenda o resultado', d: 'Fórmulas com substituição passo a passo, interpretação em linguagem simples, simulação e análise de sensibilidade.' },
        ].map((s) => (
          <div key={s.n} className="card">
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">{s.n}</span>
            <h2 className="mb-1 text-xl">{s.t}</h2>
            <p className="text-muted">{s.d}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 rounded-2xl bg-soft p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="mb-2 text-2xl">A ideia central em uma linha</h2>
          <p className="text-lg">
            Uma fila se forma quando a demanda supera a capacidade de atendimento. Por isso, a primeira coisa que o site verifica é a{' '}
            <Term k="estabilidade">condição de estabilidade</Term>: a utilização <Term k="rho">ρ</Term> precisa ser menor que 1.
          </p>
        </div>
        <div className="rounded-xl bg-white px-6 py-4 text-center text-2xl">
          <Tex math="\rho = \dfrac{\lambda}{c\,\mu} < 1" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl">Exemplos prontos para explorar</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { id: 'web', t: 'Servidor Web', d: 'M/M/1 · 600 req/min, 80 req/s' },
            { id: 'curriculos', t: 'Currículos de RH', d: 'M/M/2 · fila única com 2 servidores' },
            { id: 'secretaria', t: 'Secretaria acadêmica', d: 'D/D/1 · a tabela minuto a minuto', aba: 'tempo' },
            { id: 'banco', t: 'Fila de banco', d: 'M/M/3 · quantos caixas abrir?' },
          ].map((e) => (
            <Link key={e.id} to={`/calculadora?exemplo=${e.id}${e.aba ? `&aba=${e.aba}` : ''}`} className="card block transition-colors hover:border-primary hover:bg-soft">
              <div className="font-serif text-lg font-semibold text-primary-dark">{e.t}</div>
              <div className="text-muted">{e.d}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function QueueIllustration() {
  return (
    <svg viewBox="0 0 420 240" className="w-full" role="img" aria-labelledby="qi-t">
      <title id="qi-t">Clientes chegando, esperando na fila e sendo atendidos por dois servidores</title>
      <rect x="0" y="0" width="420" height="240" rx="20" fill="#eef5ec" />
      <text x="24" y="40" fontSize="15" fill="#2f5d3a" fontWeight="600">chegadas (λ)</text>
      <path d="M30 120 H70" stroke="#2f5d3a" strokeWidth="3" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#2f5d3a" />
        </marker>
      </defs>
      <rect x="80" y="92" width="170" height="56" rx="12" fill="#fff" stroke="#4f7f5a" strokeWidth="2" strokeDasharray="6 4" />
      <text x="128" y="172" fontSize="15" fill="#2f5d3a" fontWeight="600">fila</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} fill={i === 0 ? '#c2410c' : '#2f5d3a'}>
          <circle cx={222 - i * 38} cy="108" r="9" />
          <rect x={213 - i * 38} y="119" width="18" height="22" rx="8" />
        </g>
      ))}
      <path d="M255 120 L288 82 M255 120 L288 162" stroke="#2f5d3a" strokeWidth="3" />
      {[60, 140].map((y, i) => (
        <g key={y}>
          <rect x="290" y={y} width="84" height="44" rx="10" fill="#2f5d3a" />
          <text x="332" y={y + 27} fontSize="13" fill="#fff" textAnchor="middle" fontWeight="600">servidor {i + 1}</text>
          <path d={`M378 ${y + 22} H404`} stroke="#2f5d3a" strokeWidth="3" markerEnd="url(#arr)" />
        </g>
      ))}
      <text x="290" y="40" fontSize="15" fill="#2f5d3a" fontWeight="600">atendimento (μ)</text>
      <text x="24" y="218" fontSize="14" fill="#4a584c">Sistema = fila + servidores</text>
    </svg>
  )
}
