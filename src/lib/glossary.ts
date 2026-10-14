// Glossário único: alimenta os tooltips do site inteiro e a página de referências.
// `anchor` aponta para a seção da aba Aprender onde o termo é explicado.

export interface GlossaryEntry {
  term: string
  def: string
  anchor?: string
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  fila: { term: 'Fila', def: 'Clientes (pessoas, requisições, peças) esperando para receber um serviço que não pode ser prestado a todos ao mesmo tempo.', anchor: 'o-que-e' },
  sistema: { term: 'Sistema', def: 'Tudo o que é estudado: a fila de espera mais os servidores. Quem está "no sistema" está esperando ou sendo atendido.', anchor: 'o-que-e' },
  servidor: { term: 'Servidor', def: 'Quem presta o serviço: um caixa de banco, um atendente, um núcleo de processador, uma instância de software.', anchor: 'componentes' },
  lambda: { term: 'λ (lambda): taxa de chegada', def: 'Número médio de clientes que chegam por unidade de tempo. Ex.: 10 requisições por segundo. É o inverso do tempo médio entre chegadas.', anchor: 'metricas' },
  mu: { term: 'μ (mi): taxa de atendimento', def: 'Número médio de clientes que UM servidor consegue atender por unidade de tempo. É o inverso do tempo médio de atendimento: se cada atendimento leva 5 min, μ = 1/5 por minuto.', anchor: 'metricas' },
  rho: { term: 'ρ (rô): utilização', def: 'Fração do tempo em que cada servidor fica ocupado. Com um servidor, ρ = λ/μ; com c servidores, ρ = λ/(cμ). Também chamada de intensidade de tráfego.', anchor: 'estabilidade' },
  a: { term: 'a: carga oferecida', def: 'a = λ/μ, medida em Erlangs. Indica quantos servidores estariam ocupados, em média, se nunca faltasse servidor.', anchor: 'metricas' },
  c: { term: 'c: número de servidores', def: 'Quantos atendentes trabalham em paralelo, todos alimentados pela mesma fila.', anchor: 'kendall' },
  K: { term: 'K: capacidade do sistema', def: 'Número máximo de clientes no sistema (esperando + em atendimento). Quem chega com o sistema cheio é recusado (bloqueado).', anchor: 'componentes' },
  N: { term: 'N: tamanho da população', def: 'Quantidade total de clientes que podem usar o sistema. Importa quando é pequena, porque cada cliente que entra reduz a taxa de chegadas.', anchor: 'kendall' },
  k: { term: 'k: fases de Erlang', def: 'Parâmetro de forma da distribuição de Erlang. Quanto maior o k, mais regular (menos variável) é o tempo: k = 1 é exponencial; k → ∞ é constante.', anchor: 'distribuicoes' },
  kendall: { term: 'Notação de Kendall', def: 'Forma compacta de descrever uma fila: A/S/c/K/N/D (chegadas / serviço / servidores / capacidade / população / disciplina). Os três últimos são omitidos quando valem ∞, ∞ e FCFS.', anchor: 'kendall' },
  M: { term: 'M (Markoviano)', def: 'Chegadas de Poisson (intervalos exponenciais) ou tempo de serviço exponencial. É o caso "sem memória": o tempo que já passou não muda o que falta.', anchor: 'distribuicoes' },
  D: { term: 'D (determinístico)', def: 'Tempo fixo, sem variação. Ex.: uma máquina que sempre leva exatamente 2 minutos.', anchor: 'distribuicoes' },
  Ek: { term: 'Eₖ (Erlang)', def: 'Tempo formado pela soma de k etapas exponenciais iguais. É menos variável que a exponencial.', anchor: 'distribuicoes' },
  G: { term: 'G (geral)', def: 'Qualquer distribuição de probabilidade. Basta conhecer a média e a variabilidade (desvio padrão ou coeficiente de variação).', anchor: 'distribuicoes' },
  poisson: { term: 'Processo de Poisson', def: 'Chegadas aleatórias e independentes, com taxa média constante λ. O número de chegadas num intervalo segue a distribuição de Poisson, e o tempo entre chegadas é exponencial.', anchor: 'distribuicoes' },
  exponencial: { term: 'Distribuição exponencial', def: 'Distribuição de tempos com muitos valores curtos e alguns longos. Desvio padrão igual à média (CV = 1). É a única contínua "sem memória".', anchor: 'distribuicoes' },
  cv: { term: 'CV: coeficiente de variação', def: 'Desvio padrão dividido pela média (CV = σ/média). Mede a variabilidade: 0 = constante, 1 = exponencial, > 1 = muito irregular.', anchor: 'distribuicoes' },
  ca: { term: 'Cₐ: variabilidade das chegadas', def: 'Coeficiente de variação dos intervalos entre chegadas. Chegadas de Poisson têm Cₐ = 1; chegadas agendadas e regulares têm Cₐ perto de 0.', anchor: 'distribuicoes' },
  cs: { term: 'Cₛ: variabilidade do serviço', def: 'Coeficiente de variação do tempo de atendimento. Serviço exponencial tem Cₛ = 1; serviço constante tem Cₛ = 0.', anchor: 'distribuicoes' },
  fcfs: { term: 'FCFS / FIFO', def: 'First Come, First Served: o primeiro a chegar é o primeiro a ser atendido. É a disciplina padrão.', anchor: 'componentes' },
  prioridade: { term: 'Disciplina com prioridade', def: 'Clientes de classes mais importantes passam na frente. A classe 1 é a de maior prioridade.', anchor: 'componentes' },
  preemptivo: { term: 'Preemptivo × não preemptivo', def: 'Não preemptivo: quem está sendo atendido termina, mesmo que chegue alguém mais prioritário. Preemptivo: o atendimento é interrompido e retomado depois.', anchor: 'mod-prioridade' },
  estabilidade: { term: 'Condição de estabilidade', def: 'Para a fila não crescer sem limite, a capacidade de atendimento tem que superar a demanda: λ < cμ, ou seja, ρ < 1. Sistemas com capacidade finita (K) são sempre estáveis.', anchor: 'estabilidade' },
  regime: { term: 'Regime permanente', def: 'O comportamento médio do sistema depois de muito tempo funcionando, quando as condições iniciais já não importam. As fórmulas analíticas descrevem esse regime.', anchor: 'estabilidade' },
  little: { term: 'Lei de Little', def: 'L = λW: o número médio de clientes no sistema é a taxa de chegada vezes o tempo médio no sistema. Vale para quase qualquer sistema estável.', anchor: 'little' },
  L: { term: 'E[n] ou L: número médio no sistema', def: 'Quantos clientes há, em média, no sistema (esperando + sendo atendidos).', anchor: 'metricas' },
  Lq: { term: 'E[n_w] ou Lq: número médio na fila', def: 'Quantos clientes há, em média, apenas esperando (sem contar quem está em atendimento).', anchor: 'metricas' },
  Ls: { term: 'E[n_s]: número médio em atendimento', def: 'Quantos clientes estão, em média, sendo atendidos. Equivale ao número médio de servidores ocupados.', anchor: 'metricas' },
  W: { term: 'E[r] ou W: tempo médio de resposta', def: 'Tempo médio que um cliente passa no sistema, da chegada até a saída: espera + atendimento.', anchor: 'metricas' },
  Wq: { term: 'E[w] ou Wq: tempo médio de espera', def: 'Tempo médio que um cliente passa na fila antes de começar a ser atendido.', anchor: 'metricas' },
  Es: { term: 'E[s]: tempo médio de atendimento', def: 'Duração média de um atendimento, igual a 1/μ.', anchor: 'metricas' },
  P0: { term: 'P₀: probabilidade de sistema vazio', def: 'Fração do tempo em que não há nenhum cliente no sistema e todos os servidores estão livres.', anchor: 'metricas' },
  Pwait: { term: 'Probabilidade de esperar', def: 'Chance de um cliente que entra no sistema encontrar todos os servidores ocupados e ter que aguardar na fila.', anchor: 'metricas' },
  Pblock: { term: 'Probabilidade de bloqueio', def: 'Chance de um cliente chegar com o sistema cheio e ser recusado (perdido). Só existe quando a capacidade K é finita.', anchor: 'mod-mm1k' },
  lambdaEff: { term: 'λ_ef: taxa efetiva', def: 'Taxa de clientes que realmente entram no sistema. É menor que λ quando há bloqueio ou população finita.', anchor: 'mod-mm1k' },
  erlangB: { term: 'Fórmula de Erlang B', def: 'Probabilidade de bloqueio num sistema com c servidores e sem fila (M/M/c/c). Muito usada para dimensionar linhas telefônicas.', anchor: 'mod-mmcc' },
  erlangC: { term: 'Fórmula de Erlang C', def: 'Probabilidade de um cliente ter que esperar numa M/M/c. Muito usada para dimensionar call centers.', anchor: 'mod-mmc' },
  pk: { term: 'Pollaczek-Khinchine', def: 'Fórmula exata para a M/G/1: o tempo de espera cresce com a variabilidade do serviço. Serviço constante espera metade do exponencial.', anchor: 'mod-mg1' },
  kingman: { term: 'Aproximação de Kingman', def: 'Estimativa da espera na G/G/1: W_q ≈ (ρ/(1−ρ)) · ((Cₐ² + Cₛ²)/2) · E[s]. É exata para a M/M/1 e muito boa com tráfego alto.', anchor: 'mod-gg' },
  allen: { term: 'Aproximação de Allen-Cunneen', def: 'Estende a ideia de Kingman para c servidores: espera da M/M/c multiplicada por (Cₐ² + Cₛ²)/2.', anchor: 'mod-gg' },
  aproximacao: { term: 'Resultado aproximado', def: 'Valor estimado por uma fórmula aproximada. Costuma ter erro pequeno, mas não é exato. Use a simulação para conferir.', anchor: 'mod-gg' },
  simulacao: { term: 'Simulação de eventos discretos', def: 'O computador sorteia chegadas e atendimentos, um cliente por vez, e registra o que acontece. Com muitos clientes, as médias se aproximam das fórmulas.', anchor: 'simulacao' },
  semente: { term: 'Semente', def: 'Número que inicia o sorteio aleatório. A mesma semente gera sempre a mesma simulação, o que permite repetir um resultado.', anchor: 'simulacao' },
  sensibilidade: { term: 'Análise de sensibilidade', def: 'Variar um parâmetro (ex.: número de servidores) e observar como as métricas mudam. Ajuda a tomar decisões de dimensionamento.', anchor: 'simulacao' },
  populacaoFinita: { term: 'População finita', def: 'Quando poucos clientes podem usar o sistema (ex.: 5 máquinas de uma fábrica), quem já está na fila não pode chegar de novo, e a taxa de chegadas cai.', anchor: 'mod-finita' },
}
