export interface Reference {
  id: string
  short: string
  full: string
  usedFor: string
}

export const REFS: Record<string, Reference> = {
  jain: {
    id: 'jain',
    short: 'Jain (1991)',
    full: 'JAIN, R. The Art of Computer Systems Performance Analysis: Techniques for Experimental Design, Measurement, Simulation, and Modeling. New York: Wiley, 1991. Caps. 30–31.',
    usedFor: 'Notação usada no site (E[n], E[n_w], E[r], E[w], A/S/m/B/K/SD) e fórmulas de M/M/1, M/M/m, M/M/1/B e M/G/1.',
  },
  gross: {
    id: 'gross',
    short: 'Shortle et al. (2018)',
    full: 'SHORTLE, J. F.; THOMPSON, J. M.; GROSS, D.; HARRIS, C. M. Fundamentals of Queueing Theory. 5. ed. Hoboken: Wiley, 2018.',
    usedFor: 'Referência principal para conferir todas as fórmulas exatas: M/M/c, M/M/c/K, M/M/c/c, M/M/∞, população finita, M/G/1 e prioridades.',
  },
  kleinrock: {
    id: 'kleinrock',
    short: 'Kleinrock (1975)',
    full: 'KLEINROCK, L. Queueing Systems, Volume 1: Theory. New York: Wiley, 1975. (Vol. 2: Computer Applications, 1976.)',
    usedFor: 'Fórmula de Pollaczek-Khinchine (M/G/1) e filas com prioridade preemptiva.',
  },
  hillier: {
    id: 'hillier',
    short: 'Hillier e Lieberman (2013)',
    full: 'HILLIER, F. S.; LIEBERMAN, G. J. Introdução à Pesquisa Operacional. 9. ed. Porto Alegre: AMGH, 2013. Cap. 17 (Teoria das Filas).',
    usedFor: 'Textos didáticos em português, modelo de população finita e prioridades não preemptivas.',
  },
  little61: {
    id: 'little61',
    short: 'Little (1961)',
    full: 'LITTLE, J. D. C. A Proof for the Queuing Formula: L = λW. Operations Research, v. 9, n. 3, p. 383–387, 1961.',
    usedFor: 'Lei de Little (L = λW e L_q = λW_q).',
  },
  kendall53: {
    id: 'kendall53',
    short: 'Kendall (1953)',
    full: 'KENDALL, D. G. Stochastic Processes Occurring in the Theory of Queues and their Analysis by the Method of the Imbedded Markov Chain. The Annals of Mathematical Statistics, v. 24, n. 3, p. 338–354, 1953.',
    usedFor: 'Notação de Kendall (A/S/c).',
  },
  erlang17: {
    id: 'erlang17',
    short: 'Erlang (1917)',
    full: 'ERLANG, A. K. Solution of some Problems in the Theory of Probabilities of Significance in Automatic Telephone Exchanges. Elektroteknikeren, v. 13, 1917.',
    usedFor: 'Fórmulas de Erlang B (perda) e Erlang C (espera).',
  },
  cobham54: {
    id: 'cobham54',
    short: 'Cobham (1954)',
    full: 'COBHAM, A. Priority Assignment in Waiting Line Problems. Journal of the Operations Research Society of America, v. 2, n. 1, p. 70–76, 1954.',
    usedFor: 'Tempo de espera por classe em filas com prioridade não preemptiva.',
  },
  kingman61: {
    id: 'kingman61',
    short: 'Kingman (1961)',
    full: 'KINGMAN, J. F. C. The Single Server Queue in Heavy Traffic. Mathematical Proceedings of the Cambridge Philosophical Society, v. 57, n. 4, p. 902–904, 1961.',
    usedFor: 'Aproximação de Kingman para a G/G/1.',
  },
  allen90: {
    id: 'allen90',
    short: 'Allen (1990)',
    full: 'ALLEN, A. O. Probability, Statistics, and Queueing Theory with Computer Science Applications. 2. ed. San Diego: Academic Press, 1990.',
    usedFor: 'Aproximação de Allen-Cunneen para a G/G/c.',
  },
  law: {
    id: 'law',
    short: 'Law (2015)',
    full: 'LAW, A. M. Simulation Modeling and Analysis. 5. ed. New York: McGraw-Hill, 2015.',
    usedFor: 'Simulação de eventos discretos usada na aba "Ao longo do tempo".',
  },
}
