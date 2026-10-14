import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { GLOSSARY } from '../lib/glossary'

interface PopProps {
  title?: string
  body: ReactNode
  anchor?: string
  children: ReactNode
  /** Estilo do gatilho: termo sublinhado (padrão) ou ícone de informação. */
  variant?: 'term' | 'icon'
  label?: string
}

/**
 * Explicação que aparece ao passar o mouse (ou ao focar com o teclado / tocar no celular).
 * Fica aberta enquanto o mouse estiver sobre o termo ou sobre a própria caixa.
 */
export function Popover({ title, body, anchor, children, variant = 'term', label }: PopProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean }>({ x: 0, y: 0, above: false })
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const id = useId()

  const show = useCallback(() => {
    window.clearTimeout(timer.current)
    const r = ref.current?.getBoundingClientRect()
    if (r) {
      const above = r.bottom + 220 > window.innerHeight && r.top > 240
      const x = Math.min(Math.max(r.left + r.width / 2, 170), window.innerWidth - 170)
      setPos({ x, y: above ? r.top : r.bottom, above })
    }
    setOpen(true)
  }, [])
  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(false), 150)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        role="button"
        aria-describedby={open ? id : undefined}
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation()
          if (open) setOpen(false)
          else show()
        }}
        className={
          variant === 'term'
            ? 'cursor-help border-b-2 border-dotted border-primary-2/70 hover:bg-soft rounded-sm'
            : 'inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-primary-2 text-xs font-bold text-primary align-middle hover:bg-soft'
        }
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            onMouseEnter={() => window.clearTimeout(timer.current)}
            onMouseLeave={hide}
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, ${pos.above ? 'calc(-100% - 8px)' : '8px'})`,
              zIndex: 60,
            }}
            className="w-[320px] max-w-[92vw] rounded-xl border border-primary-2 bg-white p-4 text-left text-[0.95rem] font-normal leading-snug text-ink shadow-lg"
          >
            {title && <div className="mb-1 font-serif text-base font-semibold text-primary-dark">{title}</div>}
            <div>{body}</div>
            {anchor && (
              <Link
                to={`/aprender?secao=${anchor}`}
                onClick={() => setOpen(false)}
                className="mt-2 inline-block text-sm font-semibold text-primary underline"
              >
                Saiba mais na aba Aprender →
              </Link>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

/** Termo do glossário com tooltip. Ex.: <Term k="lambda">λ</Term> */
export function Term({ k, children }: { k: string; children?: ReactNode }) {
  const g = GLOSSARY[k]
  if (!g) return <>{children}</>
  return (
    <Popover title={g.term} body={g.def} anchor={g.anchor}>
      {children ?? g.term}
    </Popover>
  )
}

/** Ícone "i" com uma explicação livre. */
export function Info({ children, title, k }: { children?: ReactNode; title?: string; k?: string }) {
  const g = k ? GLOSSARY[k] : undefined
  return (
    <Popover variant="icon" label="Mais informações" title={title ?? g?.term} body={children ?? g?.def} anchor={g?.anchor}>
      i
    </Popover>
  )
}
