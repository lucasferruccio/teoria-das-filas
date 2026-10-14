import { useEffect, useState, type ReactNode } from 'react'

/** Campo numérico que aceita vírgula ou ponto como separador decimal. */
export function NumberField({
  value,
  onChange,
  integer = false,
  min,
  id,
  ariaLabel,
  className = '',
}: {
  value: number
  onChange: (x: number) => void
  integer?: boolean
  min?: number
  id?: string
  ariaLabel?: string
  className?: string
}) {
  const show = (x: number) => (Number.isFinite(x) ? String(x).replace('.', ',') : '')
  const [text, setText] = useState(show(value))
  const [bad, setBad] = useState(false)

  useEffect(() => {
    const parsed = Number(text.replace(',', '.'))
    if (parsed !== value) {
      setText(show(value))
      setBad(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      inputMode={integer ? 'numeric' : 'decimal'}
      className={`input tabular-nums ${bad ? 'border-warn bg-warn-bg/40' : ''} ${className}`}
      value={text}
      onChange={(e) => {
        const s = e.target.value
        setText(s)
        const x = Number(s.replace(',', '.'))
        const ok = s.trim() !== '' && Number.isFinite(x) && (!integer || Number.isInteger(x)) && (min === undefined || x >= min)
        setBad(!ok)
        if (ok) onChange(x)
      }}
    />
  )
}

export function Section({ id, step, title, children, aside }: { id?: string; step?: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-2xl">
          {step !== undefined && (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-sans text-lg font-bold text-white">{step}</span>
          )}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'ok' | 'approx'; title?: string; children: ReactNode }) {
  const styles = {
    info: 'border-primary-2 bg-soft text-ink',
    ok: 'border-primary bg-soft text-ink',
    warn: 'border-warn bg-warn-bg text-warn-ink',
    approx: 'border-approx-ink/50 bg-approx-bg text-approx-ink',
  }[tone]
  const icon = { info: 'ℹ', ok: '✓', warn: '⚠', approx: '≈' }[tone]
  return (
    <div className={`flex gap-3 rounded-xl border-l-4 p-4 ${styles}`} role={tone === 'warn' ? 'alert' : undefined}>
      <span aria-hidden="true" className="mt-0.5 text-lg font-bold leading-none">
        {icon}
      </span>
      <div className="min-w-0">
        {title && <div className="mb-1 font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b-2 border-line">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={`-mb-0.5 cursor-pointer rounded-t-lg border-b-4 px-4 py-2 font-semibold transition-colors ${
            value === it.id ? 'border-primary bg-soft text-primary-dark' : 'border-transparent text-muted hover:bg-sand'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (x: string | number) => {
    const s = String(x)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [header, ...rows].map((r) => r.map(esc).join(';')).join('\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <button className="btn-ghost px-3 py-1" disabled={page === 0} onClick={() => onPage(page - 1)}>
        ← Anterior
      </button>
      <span className="text-muted">
        Página {page + 1} de {pages}
      </span>
      <button className="btn-ghost px-3 py-1" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        Próxima →
      </button>
    </div>
  )
}
