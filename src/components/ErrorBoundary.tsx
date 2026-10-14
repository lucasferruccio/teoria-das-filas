import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Mostra o erro na tela em vez de deixar a página em branco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro no site:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#1f2a1f' }}>
        <h1 style={{ color: '#9a3412', fontSize: 24 }}>Algo deu errado ao carregar o site</h1>
        <p>
          Se estiver usando o Brave, desative o Brave Shields para este site (ícone do leão na barra de endereço) ou teste
          outro navegador. Copie a mensagem abaixo se precisar de ajuda.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#fde7d3', padding: 12, borderRadius: 8 }}>
          {String(this.state.error?.stack ?? this.state.error)}
        </pre>
        <button onClick={() => location.reload()} style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#2f5d3a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          Recarregar a página
        </button>
      </div>
    )
  }
}
