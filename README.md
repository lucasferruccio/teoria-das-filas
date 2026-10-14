# Teoria das Filas: ferramenta didática

Site em React + TypeScript que ensina teoria das filas e calcula as métricas de 14 modelos, com fórmulas passo a passo,
interpretação em linguagem simples, simulação de eventos discretos e análise de sensibilidade. Baseado nas referências
clássicas (Jain, Shortle et al., Kleinrock, Hillier e Lieberman).

## Como rodar

Requer Node.js 22.12 ou mais novo.

```bash
npm install
npm run dev          # servidor de desenvolvimento em http://localhost:5173
npm test             # testes automatizados das fórmulas e da simulação
npm run build        # site estático em dist/ (GitHub Pages, Vercel, Netlify…)
npm run build:single # um único arquivo dist-single/index.html, que abre offline com dois cliques
```

## Páginas

- **Início:** apresentação e atalhos para exemplos prontos.
- **Aprender:** do conceito de fila até os modelos gerais, com montador interativo da notação de Kendall, gráficos das distribuições
  e da utilização, um bloco por modelo e exemplos resolvidos.
- **Calculadora:** escolha manual do modelo, campos que mudam conforme o modelo, conversão automática de unidades e três
  visões dos resultados: métricas com passo a passo, simulação ao longo do tempo (tabela por cliente e por evento) e
  sensibilidade (parâmetro, intervalo, métricas e meta configuráveis, com exportação em CSV).
- **Referências:** bibliografia, como os cálculos foram verificados e glossário.

## Modelos

| Modelo | Tipo |
|---|---|
| M/M/1, M/M/c, M/M/1/K, M/M/c/K, M/M/c/c (Erlang B), M/M/∞ | exatos |
| M/G/1 (Pollaczek-Khinchine), M/D/1, M/Eₖ/1 | exatos |
| M/M/c//N (população finita), M/M/1 com prioridades (preemptiva ou não), D/D/1 | exatos |
| G/G/1 (Kingman), G/G/c (Allen-Cunneen) | aproximados |
| Lei de Little | exata |

## Estrutura do código

```
src/lib/queueing.ts     funções matemáticas (Erlang B/C, nascimento e morte)
src/lib/models.ts       catálogo de modelos: parâmetros, fórmulas em LaTeX e cálculo
src/lib/simulation.ts   simulação de eventos discretos com semente
src/lib/calc.ts         conversão de unidades, sensibilidade e exemplos prontos
src/lib/glossary.ts     definições usadas nos tooltips
src/lib/models.test.ts  testes (exemplos resolvidos, exemplo de Jain, casos-limite)
src/pages/              Início, Aprender, Calculadora, Referências
src/components/         tooltips, KaTeX, formulários, tabelas e gráficos
```
