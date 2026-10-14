// Formatação numérica em português (vírgula decimal) para texto e para KaTeX.

const nf = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 4 })

/** Formata um número com até 4 algarismos significativos, no padrão pt-BR. */
export function fmt(x: number | null | undefined, digits = 4): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—'
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞'
  if (x === 0) return '0'
  const abs = Math.abs(x)
  if (abs < 1e-5 || abs >= 1e9) {
    const [m, e] = x.toExponential(digits - 1).split('e')
    return `${Number(m).toString().replace('.', ',')} × 10^${Number(e)}`
  }
  if (digits === 4) return nf.format(x)
  return new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: digits }).format(x)
}

/** Mesmo que fmt, mas pronto para ser inserido numa expressão KaTeX. */
export function tex(x: number | null | undefined, digits = 4): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '\\text{—}'
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty'
  const s = fmt(x, digits)
  if (s.includes('× 10^')) {
    const [m, e] = s.split(' × 10^')
    return `${m.replace(',', '{,}')}\\times 10^{${e}}`
  }
  return s.replace(/\./g, '{.}').replace(/,/g, '{,}')
}

/** Percentual legível: 0.125 -> "12,5%". */
export function pct(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(x * 100)}%`
}

/** Número para CSV (ponto decimal, sem agrupamento). */
export function csvNum(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return ''
  return String(Number(x.toPrecision(8)))
}
