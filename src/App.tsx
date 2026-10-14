import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Calculator from './pages/Calculator'
import Home from './pages/Home'
import Learn from './pages/Learn'
import References from './pages/References'

const NAV = [
  { to: '/', label: 'Início' },
  { to: '/aprender', label: 'Aprender' },
  { to: '/calculadora', label: 'Calculadora' },
  { to: '/referencias', label: 'Referências' },
]

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <header style={{ top: "env(safe-area-inset-top, 0px)" }} className="sticky z-40 bg-primary text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-3">
            <QueueLogo />
            <span className="font-serif text-xl font-semibold">Teoria das Filas</span>
          </NavLink>
          <nav className="flex flex-wrap gap-1" aria-label="Navegação principal">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 font-semibold transition-colors ${isActive ? 'bg-white text-primary-dark' : 'text-white hover:bg-primary-2'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aprender" element={<Learn />} />
          <Route path="/calculadora" element={<Calculator />} />
          <Route path="/referencias" element={<References />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="border-t border-line bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-muted">
          Ferramenta didática de Teoria das Filas, baseada nas referências clássicas da área.
          Fórmulas conferidas por testes automatizados.
        </div>
      </footer>
    </div>
  )
}

function QueueLogo() {
  return (
    <svg width="36" height="28" viewBox="0 0 36 28" aria-hidden="true">
      <rect x="25" y="4" width="10" height="20" rx="2" fill="#eef5ec" />
      {[0, 7, 14].map((x) => (
        <g key={x} fill="#fffdf8">
          <circle cx={x + 3.5} cy="9" r="3" />
          <rect x={x + 0.5} y="13" width="6" height="11" rx="2.5" />
        </g>
      ))}
    </svg>
  )
}
