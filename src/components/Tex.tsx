import katex from 'katex'
import { useMemo } from 'react'

/** Renderiza uma expressão LaTeX com KaTeX. */
export function Tex({ math, block = false, className = '' }: { math: string; block?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(math, { displayMode: block, throwOnError: false, strict: false }),
    [math, block],
  )
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
