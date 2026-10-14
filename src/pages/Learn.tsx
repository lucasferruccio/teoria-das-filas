import { useEffect, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DistributionChart, KendallBuilder, UtilizationChart } from '../components/learn/Interactive'
import { Tex } from '../components/Tex'
import { Term } from '../components/Term'
import { Callout } from '../components/ui'
import { REFS } from '../lib/refs'

const TOC: { id: string; label: string; sub?: boolean }[] = [
  { id: 'o-que-e', label: 'O que é uma fila' },
  { id: 'componentes', label: 'Componentes de uma fila' },
  { id: 'kendall', label: 'Notação de Kendall' },
  { id: 'distribuicoes', label: 'Distribuições (M, D, Eₖ, G)' },
  { id: 'metricas', label: 'Métricas de desempenho' },
  { id: 'estabilidade', label: 'Utilização e estabilidade' },
  { id: 'little', label: 'Lei de Little' },
  { id: 'modelos', label: 'Os modelos' },
  { id: 'mod-mm1', label: 'M/M/1', sub: true },
  { id: 'mod-mmc', label: 'M/M/c', sub: true },
  { id: 'mod-mm1k', label: 'M/M/1/K', sub: true },
  { id: 'mod-mmck', label: 'M/M/c/K', sub: true },
  { id: 'mod-mmcc', label: 'M/M/c/c', sub: true },
  { id: 'mod-mminf', label: 'M/M/∞', sub: true },
  { id: 'mod-mg1', label: 'M/G/1, M/D/1, M/Eₖ/1', sub: true },
  { id: 'mod-dd1', label: 'D/D/1', sub: true },
  { id: 'mod-finita', label: 'População finita', sub: true },
  { id: 'mod-prioridade', label: 'Prioridades', sub: true },
  { id: 'mod-gg', label: 'G/G/1 e G/G/c', sub: true },
  { id: 'simulacao', label: 'Simulação e sensibilidade' },
  { id: 'exercicios', label: 'Exemplos resolvidos' },
]

function S({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line pb-10">
      <h2 className="mb-4 text-3xl">{title}</h2>
      <div className="prose-tf space-y-4 text-lg">{children}</div>
    </section>
  )
}

function Eq({ m }: { m: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-1">
      <Tex block math={m} />
    </div>
  )
}

function Model({ id, kendall, title, when, formulas, example, link, refs, children }: {
  id: string; kendall: string; title: string; when: string; formulas: string[]; example?: ReactNode; link: string; refs: string[]; children?: ReactNode
}) {
  return (
    <article id={id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-primary px-2 py-0.5 font-mono text-lg font-bold text-white">{kendall}</span>
        <h3 className="text-2xl">{title}</h3>
      </div>
      <p className="mb-3">
        <b>Quando usar:</b> {when}
      </p>
      {children}
      <div className="my-3 space-y-1 rounded-xl bg-soft p-3">
        {formulas.map((f, i) => (
          <Tex key={i} block math={f} />
        ))}
      </div>
      {example && (
        <div className="mb-3 rounded-xl border-l-4 border-primary-2 bg-sand p-3">
          <b>Exemplo:</b> {example}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted">Fontes: {refs.map((r) => REFS[r].short).join('; ')}</span>
        <Link to={link} className="btn-primary px-3 py-1.5">
          Calcular na ferramenta →
        </Link>
      </div>
    </article>
  )
}

export default function Learn() {
  const [params] = useSearchParams()
  const secao = params.get('secao')
  useEffect(() => {
    if (!secao) return
    const el = document.getElementById(secao)
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('ring-4', 'ring-primary-2/40', 'rounded-2xl')
        setTimeout(() => el.classList.remove('ring-4', 'ring-primary-2/40'), 2000)
      }, 50)
    }
  }, [secao])

  return (
    <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
      <aside className="hidden lg:block">
        <nav aria-label="Conteúdo da página" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-line bg-white p-3">
          <div className="mb-2 font-serif font-semibold text-primary-dark">Nesta página</div>
          <ul className="space-y-0.5 text-[0.95rem]">
            {TOC.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }) }}
                  className={`block rounded px-2 py-0.5 hover:bg-soft ${t.sub ? 'pl-5 text-muted' : 'font-semibold text-primary-dark'}`}
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 space-y-10">
        <div>
          <h1 className="mb-2 text-4xl">Aprender teoria das filas</h1>
          <p className="max-w-3xl text-lg text-muted">
            Do conceito de fila até os modelos mais gerais. Cada conceito tem uma explicação curta, as fórmulas e um exemplo. Passe o
            mouse sobre os termos sublinhados para ver definições rápidas.
          </p>
        </div>

        <S id="o-que-e" title="O que é uma fila?">
          <p>
            Uma <Term k="fila">fila</Term> é um processo em que clientes (pessoas, produtos, requisições) chegam a um sistema de atendimento para
            receber um ou mais serviços, executados por uma certa quantidade de <Term k="servidor">servidores</Term>.
          </p>
          <p>
            As filas se formam porque, em certos momentos, a procura pelo serviço é maior do que a capacidade do sistema de atendê-la. Mesmo
            quando a capacidade média é suficiente, a <b>variabilidade</b> (chegadas em rajadas, atendimentos que demoram mais) gera espera.
          </p>
          <p>Filas são estudadas para:</p>
          <ul>
            <li><b>Otimizar recursos:</b> equilibrar funcionários, máquinas e espaço com a demanda.</li>
            <li><b>Aumentar a eficiência:</b> organizar o fluxo de trabalho e reduzir o tempo de espera.</li>
            <li><b>Melhorar o atendimento:</b> menos frustração e mais satisfação dos clientes.</li>
          </ul>
          <Callout tone="info" title="Exemplo de fila determinística: secretaria acadêmica">
            A secretaria atende 1 aluno a cada 5 minutos e chega 1 aluno a cada 8 minutos, com 5 alunos esperando na abertura. Como a
            capacidade (1 a cada 5 min) supera a demanda (1 a cada 8 min), a fila diminui até zerar aos 55 minutos.{' '}
            <Link to="/calculadora?exemplo=secretaria&aba=tempo" className="font-semibold text-primary underline">
              Ver a tabela minuto a minuto na calculadora →
            </Link>
          </Callout>
        </S>

        <S id="componentes" title="Componentes de uma fila">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="mb-1 text-xl">Chegada de clientes</h3>
              <p>
                Descrita pela <Term k="lambda">taxa de chegada λ</Term> (clientes por unidade de tempo) e pela distribuição do intervalo entre
                chegadas, <Tex math="A(t) = P[\text{tempo entre chegadas} \le t]" />. Pode ser constante, variável ou seguir um padrão.
              </p>
            </div>
            <div className="card">
              <h3 className="mb-1 text-xl">Atendimento</h3>
              <p>
                Descrito pela <Term k="mu">taxa de atendimento μ</Term> de cada servidor e pela distribuição do tempo de serviço,{' '}
                <Tex math="B(x) = P[\text{tempo de serviço} \le x]" />. Depende do tipo de serviço, da complexidade e da experiência do
                atendente.
              </p>
            </div>
            <div className="card">
              <h3 className="mb-1 text-xl">Capacidade do sistema</h3>
              <p>
                Número máximo de clientes no sistema (<Term k="K">K</Term>). Capacidade finita leva a clientes recusados; capacidade
                excessiva, a recursos subutilizados.
              </p>
            </div>
            <div className="card">
              <h3 className="mb-1 text-xl">Disciplina da fila</h3>
              <p>A ordem de atendimento:</p>
              <ul className="text-base">
                <li><Term k="fcfs">FCFS (FIFO)</Term>: primeiro a chegar, primeiro a ser atendido.</li>
                <li>LCFS: último a chegar, primeiro a ser atendido.</li>
                <li>SIRO: ordem aleatória. RR: revezamento (round robin). PS: compartilhamento do processador.</li>
                <li><Term k="prioridade">Prioridade</Term>: clientes especiais ou VIP passam na frente.</li>
              </ul>
            </div>
          </div>
        </S>

        <S id="kendall" title="Notação de Kendall">
          <p>
            Proposta por Kendall (1953) e estendida depois, descreve uma fila em seis campos: <b>A/S/c/K/N/D</b>. No livro de Jain
            (1991) aparece como A/S/m/B/K/SD: o significado é o mesmo.
          </p>
          <div className="overflow-x-auto">
            <table className="table-tf bg-white text-base">
              <thead>
                <tr><th>Campo</th><th>Significado</th><th>Valores comuns</th></tr>
              </thead>
              <tbody>
                <tr><td>A</td><td>Distribuição do tempo entre chegadas</td><td><Term k="M">M</Term>, <Term k="D">D</Term>, <Term k="Ek">Eₖ</Term>, <Term k="G">G</Term></td></tr>
                <tr><td>S</td><td>Distribuição do tempo de atendimento</td><td>M, D, Eₖ, G</td></tr>
                <tr><td>c (m)</td><td><Term k="c">Número de servidores</Term></td><td>1, 2, …, ∞</td></tr>
                <tr><td>K (B)</td><td><Term k="K">Capacidade do sistema</Term></td><td>∞ se omitido</td></tr>
                <tr><td>N (K)</td><td><Term k="N">Tamanho da população</Term></td><td>∞ se omitido</td></tr>
                <tr><td>D (SD)</td><td>Disciplina de atendimento</td><td>FCFS se omitido</td></tr>
              </tbody>
            </table>
          </div>
          <p>Exemplos: M/M/1 é o sistema clássico; M/M/3/10 tem 3 servidores e no máximo 10 clientes; M/D/1 tem atendimento constante.</p>
          <KendallBuilder />
        </S>

        <S id="distribuicoes" title="Distribuições: M, D, Eₖ e G">
          <ul>
            <li>
              <b><Term k="M">M</Term> (Markoviano):</b> chegadas segundo um <Term k="poisson">processo de Poisson</Term>, ou seja, intervalos
              entre chegadas <Term k="exponencial">exponenciais</Term>. É a hipótese "mais aleatória": sem memória, desvio padrão igual à média.
            </li>
            <li><b><Term k="D">D</Term> (determinístico):</b> tempos fixos, sem variação.</li>
            <li><b><Term k="Ek">Eₖ</Term> (Erlang):</b> soma de k etapas exponenciais; quanto maior o k, menos variável.</li>
            <li><b><Term k="G">G</Term> (geral):</b> qualquer distribuição, descrita pela média e pelo <Term k="cv">coeficiente de variação</Term>.</li>
          </ul>
          <p>
            A <b>função de distribuição</b> <Tex math="F(x) = P[X \le x]" /> dá a probabilidade acumulada. A <b>função de densidade</b>{' '}
            <Tex math="f(x)" /> mostra onde os valores se concentram: a área sob a curva num intervalo é a probabilidade de cair nele. Para a
            exponencial com taxa λ:
          </p>
          <Eq m="f(t) = \lambda\,e^{-\lambda t},\qquad F(t) = 1 - e^{-\lambda t},\qquad E[t] = \dfrac{1}{\lambda},\qquad C = \dfrac{\sigma}{E[t]} = 1" />
          <DistributionChart />
        </S>

        <S id="metricas" title="Métricas de desempenho">
          <p>Este site usa a notação de Jain (1991). Ao lado, a notação L/W comum em outros livros:</p>
          <div className="overflow-x-auto">
            <table className="table-tf bg-white text-base">
              <thead>
                <tr><th>Símbolo</th><th>Outros livros</th><th>Significado</th></tr>
              </thead>
              <tbody>
                {[
                  ['\\lambda', '\\lambda', 'lambda', 'Taxa média de chegada', ''],
                  ['\\mu', '\\mu', 'mu', 'Taxa média de atendimento de um servidor', ''],
                  ['E[s] = 1/\\mu', '1/\\mu', 'Es', 'Tempo médio de atendimento', ''],
                  ['\\rho', '\\rho', 'rho', 'Utilização (intensidade de tráfego)', ''],
                  ['E[n]', 'L', 'L', 'Número médio de clientes no sistema', ''],
                  ['E[n_w]', 'L_q', 'Lq', 'Número médio de clientes na fila', ''],
                  ['E[n_s]', 'L_s', 'Ls', 'Número médio em atendimento', ''],
                  ['E[r]', 'W', 'W', 'Tempo médio de resposta (no sistema)', ''],
                  ['E[w]', 'W_q', 'Wq', 'Tempo médio de espera na fila', ''],
                  ['P_0', 'P_0', 'P0', 'Probabilidade de o sistema estar vazio', ''],
                ].map(([a, b, k, d]) => (
                  <tr key={k}>
                    <td><Tex math={a} /></td>
                    <td><Tex math={b} /></td>
                    <td><Term k={k}>{d}</Term></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Duas relações valem sempre:</p>
          <Eq m="E[n] = E[n_w] + E[n_s] \qquad\qquad E[r] = E[w] + E[s]" />
          <p>
            Ou seja: quem está no sistema está esperando ou sendo atendido, e o tempo total é espera mais atendimento. Na notação de Jain,{' '}
            <Tex math="\lambda = 1/A(t)" /> e <Tex math="\mu = 1/B(x)" /> significam "inverso do tempo médio" entre chegadas e de atendimento.
          </p>
        </S>

        <S id="estabilidade" title="Utilização e estabilidade">
          <p>
            A <Term k="rho">utilização</Term> é a fração do tempo em que cada servidor está ocupado. Num intervalo de duração T chegam λT
            clientes, cada um ocupando o servidor por 1/μ:
          </p>
          <Eq m="U = \dfrac{\text{tempo ocupado}}{\text{tempo total}} = \dfrac{\lambda T/\mu}{T} = \dfrac{\lambda}{\mu} = \rho \qquad\text{(com } c \text{ servidores: } \rho = \tfrac{\lambda}{c\,\mu}\text{)}" />
          <p>
            <Term k="estabilidade">Condição de estabilidade</Term>: a taxa de chegada tem que ser menor que a capacidade total de atendimento.
          </p>
          <Eq m="\lambda < c\,\mu \quad\Longleftrightarrow\quad \rho < 1" />
          <p>
            Se ρ ≥ 1, chegam mais clientes do que é possível atender e a fila cresce sem limite (num sistema de fluxo, quando a taxa de entrada R supera a
            capacidade C, há congestionamento). Mas atenção: mesmo com ρ &lt; 1 a espera cresce muito rápido perto de 1. Arraste o controle:
          </p>
          <UtilizationChart />
        </S>

        <S id="little" title="Lei de Little">
          <p>
            Relaciona o número médio de clientes, a taxa de chegada e o tempo médio de permanência. Vale para praticamente qualquer sistema
            estável, sem hipótese sobre distribuições (Little, 1961):
          </p>
          <Eq m="L = \lambda\,W \qquad\Longleftrightarrow\qquad E[n] = \lambda\,E[r] \qquad\text{e}\qquad E[n_w] = \lambda\,E[w]" />
          <p>
            Usos: dimensionar recursos, controlar estoque (estoque médio = demanda × tempo médio em estoque), avaliar desempenho e planejar
            capacidade.
          </p>
          <Callout tone="ok" title="Exemplo: lanchonete">
            Ocupação média de 50 pessoas, 100 chegadas por hora: <Tex math="W = L/\lambda = 50/100 = 0{,}5\ \text{h} = 30\ \text{min}" />.
            Como a refeição leva 20 min, os 10 min restantes são espera.{' '}
            <Link to="/calculadora?modelo=little" className="font-semibold text-primary underline">Abrir a Lei de Little →</Link>
          </Callout>
        </S>

        <section id="modelos" className="scroll-mt-24 space-y-5 border-b border-line pb-10">
          <h2 className="text-3xl">Os modelos</h2>
          <p className="text-lg">
            Cada modelo vale sob certas hipóteses. Os de chegadas de Poisson e atendimento exponencial (M/M/…) têm fórmulas exatas; quando
            as distribuições são gerais, usamos fórmulas exatas para um servidor (M/G/1) ou aproximações (G/G/c).
          </p>

          <Model id="mod-mm1" kendall="M/M/1" title="O sistema clássico" refs={['jain', 'gross']} link="/calculadora?exemplo=web"
            when="um servidor, chegadas aleatórias (Poisson) e atendimento exponencial, com população e capacidade ilimitadas."
            formulas={[
              '\\rho = \\dfrac{\\lambda}{\\mu} \\qquad P_n = (1-\\rho)\\,\\rho^n',
              'E[n] = \\dfrac{\\rho}{1-\\rho} \\qquad E[n_w] = \\dfrac{\\rho^2}{1-\\rho}',
              'E[r] = \\dfrac{1}{\\mu\\,(1-\\rho)} \\qquad E[w] = \\dfrac{\\rho}{\\mu\\,(1-\\rho)}',
            ]}
            example={<>servidor Web com 600 req/min (10 req/s) e capacidade de 80 req/s: ρ = 0,125, E[r] = 1/(80 × 0,875) ≈ 0,0143 s.</>}
          >
            <p className="text-base text-muted">
              Detalhe importante: o tempo de atendimento exponencial tem <i>média</i> constante 1/μ, mas cada atendimento varia bastante (o
              desvio padrão é igual à média).
            </p>
          </Model>

          <Model id="mod-mmc" kendall="M/M/c" title="Vários servidores, fila única" refs={['gross', 'erlang17']} link="/calculadora?exemplo=curriculos"
            when="bancos, call centers e instâncias paralelas de um software. Cada cliente vai para o primeiro servidor livre."
            formulas={[
              'a = \\dfrac{\\lambda}{\\mu} \\qquad \\rho = \\dfrac{a}{c} \\qquad P_0 = \\left[\\sum_{n=0}^{c-1}\\dfrac{a^n}{n!} + \\dfrac{a^c}{c!\\,(1-\\rho)}\\right]^{-1}',
              'C(c,a) = \\dfrac{a^c}{c!\\,(1-\\rho)}\\,P_0 \\quad\\text{(Erlang C: probabilidade de esperar)}',
              'E[n_w] = C(c,a)\\,\\dfrac{\\rho}{1-\\rho} \\qquad E[w] = \\dfrac{C(c,a)}{c\\,\\mu-\\lambda} \\qquad E[r] = E[w] + \\dfrac{1}{\\mu}',
            ]}
            example={<>currículos: λ = 10/min, μ = 12/min por instância, c = 2. Então ρ = 10/24 ≈ 0,417, P₀ = 7/17, C ≈ 0,245, E[w] ≈ 0,0175 min e E[r] ≈ 0,101 min (≈ 6 s).</>}
          />

          <Model id="mod-mm1k" kendall="M/M/1/K" title="Capacidade limitada" refs={['gross', 'jain']} link="/calculadora?modelo=mm1k"
            when="sala de espera com poucas cadeiras, buffer de roteador. Quem chega com o sistema cheio é recusado."
            formulas={[
              'P_0 = \\dfrac{1-a}{1-a^{K+1}} \\qquad P_K = a^K P_0 \\qquad (a = \\lambda/\\mu \\ne 1)',
              '\\lambda_{ef} = \\lambda\\,(1-P_K) \\qquad E[n] = \\dfrac{a}{1-a} - \\dfrac{(K+1)\\,a^{K+1}}{1-a^{K+1}}',
              'E[r] = \\dfrac{E[n]}{\\lambda_{ef}} \\qquad E[n_w] = E[n] - (1-P_0)',
            ]}
          >
            <p className="text-base">
              Aqui λ/μ pode ser maior que 1: o sistema é sempre estável, mas recusa muitos clientes. A Lei de Little usa a{' '}
              <Term k="lambdaEff">taxa efetiva</Term>, porque só os aceitos entram.
            </p>
          </Model>

          <Model id="mod-mmck" kendall="M/M/c/K" title="Vários servidores e capacidade limitada" refs={['gross', 'hillier']} link="/calculadora?exemplo=lanhouse"
            when="lan house com poucos computadores e pouco espaço, consultório com sala de espera pequena."
            formulas={[
              'P_n = \\begin{cases} \\dfrac{a^n}{n!}\\,P_0 & n \\le c \\\\[4pt] \\dfrac{a^n}{c!\\,c^{\\,n-c}}\\,P_0 & c < n \\le K \\end{cases}',
              'E[n_w] = \\sum_{n=c+1}^{K} (n-c)\\,P_n \\qquad \\lambda_{ef} = \\lambda(1-P_K) \\qquad E[w] = \\dfrac{E[n_w]}{\\lambda_{ef}}',
            ]}
          />

          <Model id="mod-mmcc" kendall="M/M/c/c" title="Sistema de perda (Erlang B)" refs={['erlang17', 'gross']} link="/calculadora?modelo=mmcc"
            when="linhas telefônicas, vagas de estacionamento, leitos: não há fila, quem não encontra servidor livre vai embora."
            formulas={['B(c,a) = \\dfrac{a^c/c!}{\\sum_{k=0}^{c} a^k/k!} \\qquad E[n] = a\\,(1-B) \\qquad E[r] = \\dfrac{1}{\\mu}']}
            example={<>10 Erlangs de tráfego com 15 linhas: B ≈ 3,65% das chamadas são perdidas.</>}
          />

          <Model id="mod-mminf" kendall="M/M/∞" title="Servidores ilimitados" refs={['gross', 'kleinrock']} link="/calculadora?modelo=mminf"
            when="autoatendimento, usuários navegando num site: cada cliente é atendido na hora."
            formulas={['E[n] = a = \\dfrac{\\lambda}{\\mu} \\qquad P_n = \\dfrac{a^n e^{-a}}{n!} \\qquad E[r] = \\dfrac{1}{\\mu} \\qquad E[w] = 0']}
          />

          <Model id="mod-mg1" kendall="M/G/1" title="Atendimento com qualquer distribuição" refs={['kleinrock', 'gross']} link="/calculadora?modelo=mg1"
            when="atendimento médico, processos industriais, requisições de tamanhos variados. Casos especiais: M/D/1 (constante) e M/Eₖ/1 (Erlang)."
            formulas={[
              'E[n_w] = \\dfrac{\\rho^2\\,(1+C_s^2)}{2\\,(1-\\rho)} \\quad\\text{(Pollaczek-Khinchine)}',
              '\\text{M/D/1: } C_s = 0 \\Rightarrow E[n_w] = \\dfrac{\\rho^2}{2(1-\\rho)} \\qquad \\text{M/E}_k\\text{/1: } C_s^2 = \\tfrac{1}{k}',
              'E[w] = \\dfrac{E[n_w]}{\\lambda} \\qquad E[r] = E[w] + \\dfrac{1}{\\mu} \\qquad E[n] = E[n_w] + \\rho',
            ]}
          >
            <p className="text-base">
              A fórmula mostra que a espera depende da <Term k="cs">variabilidade do atendimento</Term>: com atendimento constante, a fila é
              metade da M/M/1. Reduzir a variabilidade é tão importante quanto acelerar o atendimento.
            </p>
          </Model>

          <Model id="mod-dd1" kendall="D/D/1" title="Tudo determinístico" refs={['gross']} link="/calculadora?exemplo=secretaria&aba=tempo"
            when="processos cadenciados, como uma linha de produção, e o exemplo da secretaria acadêmica."
            formulas={['\\rho = \\dfrac{\\lambda}{\\mu} \\le 1 \\;\\Rightarrow\\; E[w] = 0,\\quad E[r] = \\dfrac{1}{\\mu} \\quad\\text{(em regime permanente)}']}
          >
            <p className="text-base">
              Sem aleatoriedade não há espera em regime. Se o sistema começa com clientes acumulados, a fila diminui à razão de (μ − λ) por
              unidade de tempo, como mostra a tabela da simulação.
            </p>
          </Model>

          <Model id="mod-finita" kendall="M/M/c//N" title="População finita" refs={['gross', 'hillier']} link="/calculadora?exemplo=maquinas"
            when="poucos clientes fixos, como N máquinas que quebram e esperam um técnico."
            formulas={[
              '\\lambda_n = (N-n)\\,\\lambda \\qquad P_0 = \\left[\\sum_{n=0}^{N}\\dfrac{N!}{(N-n)!}\\left(\\dfrac{\\lambda}{\\mu}\\right)^n\\right]^{-1} \\;(c = 1)',
              'E[n] = N - \\dfrac{\\mu}{\\lambda}(1-P_0) \\qquad \\lambda_{ef} = \\lambda\\,(N - E[n]) \\qquad E[r] = \\dfrac{E[n]}{\\lambda_{ef}}',
            ]}
          />

          <Model id="mod-prioridade" kendall="M/M/1 + prioridade" title="Classes de prioridade" refs={['cobham54', 'kleinrock']} link="/calculadora?exemplo=pa"
            when="atendimento preferencial, clientes VIP, triagem hospitalar. A classe 1 tem a maior prioridade."
            formulas={[
              '\\sigma_k = \\rho_1 + \\dots + \\rho_k \\qquad W_0 = \\sum_i \\lambda_i\\,\\dfrac{E[s_i^2]}{2} = \\sum_i \\dfrac{\\lambda_i}{\\mu_i^2}',
              '\\text{Não preemptiva (Cobham): } E[w]_k = \\dfrac{W_0}{(1-\\sigma_{k-1})(1-\\sigma_k)}',
              '\\text{Preemptiva: } E[r]_k = \\dfrac{1/\\mu_k}{1-\\sigma_{k-1}} + \\dfrac{\\sum_{i\\le k}\\lambda_i/\\mu_i^2}{(1-\\sigma_{k-1})(1-\\sigma_k)}',
            ]}
          >
            <p className="text-base">
              <Term k="preemptivo">Preemptivo ou não?</Term> No modo preemptivo a classe 1 nem enxerga as outras. Curiosidade (lei de
              conservação): com o mesmo μ para todos, a espera média geral é a mesma da fila FCFS; a prioridade só redistribui a espera.
            </p>
          </Model>

          <Model id="mod-gg" kendall="G/G/c" title="O caso geral (aproximações)" refs={['kingman61', 'allen90']} link="/calculadora?exemplo=aeroporto"
            when="sistemas reais em que nem chegadas nem atendimentos são exponenciais. Não há solução analítica exata: usamos aproximações e simulação."
            formulas={[
              '\\text{G/G/1 (Kingman): } E[w] \\approx \\dfrac{\\rho}{1-\\rho}\\cdot\\dfrac{C_a^2+C_s^2}{2}\\cdot\\dfrac{1}{\\mu}',
              '\\text{G/G/c (Allen-Cunneen): } E[w] \\approx \\dfrac{C(c,a)}{c\\,\\mu-\\lambda}\\cdot\\dfrac{C_a^2+C_s^2}{2}',
            ]}
          >
            <p className="text-base">
              As duas viram as fórmulas exatas da M/M/1 e da M/M/c quando <Term k="ca">Cₐ</Term> = <Term k="cs">Cₛ</Term> = 1. A mensagem:
              a espera é proporcional à variabilidade total do sistema.
            </p>
          </Model>
        </section>

        <S id="simulacao" title="Simulação e sensibilidade">
          <p>
            As fórmulas descrevem o <Term k="regime">regime permanente</Term>. Para ver o comportamento cliente a cliente, a calculadora faz
            uma <Term k="simulacao">simulação de eventos discretos</Term>: sorteia os intervalos entre chegadas e os tempos de atendimento,
            avança o relógio de evento em evento e registra quando cada cliente chega, começa e termina. A{' '}
            <Term k="semente">semente</Term> permite repetir a mesma simulação.
          </p>
          <p>
            A <Term k="sensibilidade">análise de sensibilidade</Term> varia um parâmetro (λ, μ, c, K…) e mostra como as métricas mudam, o que
            ajuda a responder perguntas como "quantos caixas preciso abrir?".
          </p>
        </S>

        <S id="exercicios" title="Exemplos resolvidos">
          <div className="card space-y-2">
            <h3 className="text-xl">1. Servidor Web (M/M/1)</h3>
            <p>600 requisições por minuto; capacidade de 80 requisições por segundo.</p>
            <Eq m="\lambda = \dfrac{600}{60} = 10\ \text{req/s} \qquad \mu = 80\ \text{req/s} \qquad \rho = \dfrac{10}{80} = 0{,}125" />
            <Eq m="E[r] = \dfrac{1}{80\,(1-0{,}125)} = 0{,}01429\ \text{s} \qquad E[w] = \dfrac{0{,}125}{80\,(1-0{,}125)} = 0{,}001786\ \text{s}" />
            <Eq m="E[n] = \dfrac{0{,}125}{1-0{,}125} = 0{,}1429 \qquad E[n_w] = \dfrac{0{,}125^2}{1-0{,}125} = 0{,}01786" />
            <Link to="/calculadora?exemplo=web" className="btn-ghost">Conferir na calculadora →</Link>
          </div>

          <div className="card space-y-2">
            <h3 className="text-xl">2. Currículos de RH (M/M/2)</h3>
            <p>10 currículos por minuto; duas instâncias, cada uma verificando 12 currículos por minuto. Qual o tempo médio no sistema?</p>
            <Callout tone="warn" title="Erro comum">
              Calcular ρ = 10/24 para os 2 servidores e depois aplicar a fórmula da M/M/1, <Tex math="1/(\mu(1-\rho))" />, o que dá
              0,14 min. Essa fórmula só vale para um servidor. Com duas instâncias e fila única, o modelo correto é a M/M/2.
            </Callout>
            <Eq m="a = \dfrac{10}{12} = 0{,}8333 \qquad \rho = \dfrac{10}{2\times 12} = 0{,}4167 \qquad P_0 = \left[1 + a + \dfrac{a^2}{2!\,(1-\rho)}\right]^{-1} = \dfrac{7}{17} = 0{,}4118" />
            <Eq m="C(2,a) = \dfrac{a^2}{2!\,(1-\rho)}\,P_0 = 0{,}2451 \qquad E[w] = \dfrac{C}{2\mu - \lambda} = \dfrac{0{,}2451}{24-10} = 0{,}0175\ \text{min}" />
            <Eq m="E[r] = E[w] + \dfrac{1}{\mu} = 0{,}0175 + 0{,}0833 = 0{,}1008\ \text{min} \approx 6{,}05\ \text{s}" />
            <p className="text-base text-muted">
              Se as duas instâncias tivessem filas separadas (5 currículos/min para cada), cada uma seria uma M/M/1 com ρ = 5/12 e E[r] = 1/(12 − 5)
              ≈ 0,143 min. A fila única é melhor: nenhum servidor fica ocioso enquanto há currículos esperando no outro.
            </p>
            <Link to="/calculadora?exemplo=curriculos" className="btn-ghost">Conferir na calculadora →</Link>
          </div>

          <div className="card space-y-2">
            <h3 className="text-xl">3. Lanchonete (Lei de Little)</h3>
            <p>Ocupação média de 50 pessoas, 100 chegadas por hora, 20 minutos de refeição em média. Quanto tempo um cliente fica na lanchonete?</p>
            <Eq m="W = \dfrac{L}{\lambda} = \dfrac{50}{100\ \text{por hora}} = 0{,}5\ \text{h} = 30\ \text{min}" />
            <p className="text-base text-muted">
              O dado μ = 3 pessoas/hora (de 20 min por refeição) não é necessário: a Lei de Little resolve com L e λ. O tempo
              além dos 20 min de refeição (10 min) é espera.
            </p>
            <Link to="/calculadora?modelo=little" className="btn-ghost">Conferir na calculadora →</Link>
          </div>
        </S>
      </div>
    </div>
  )
}
