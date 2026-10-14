export type TimeUnit = 's' | 'min' | 'h'

export const TIME_UNITS: TimeUnit[] = ['s', 'min', 'h']

const SECONDS: Record<TimeUnit, number> = { s: 1, min: 60, h: 3600 }

export const UNIT_NAME: Record<TimeUnit, string> = { s: 'segundo', min: 'minuto', h: 'hora' }
export const UNIT_PLURAL: Record<TimeUnit, string> = { s: 'segundos', min: 'minutos', h: 'horas' }

/** Converte uma taxa "por `from`" para "por `to`". Ex.: 600/min -> 10/s. */
export function convertRate(rate: number, from: TimeUnit, to: TimeUnit): number {
  return (rate * SECONDS[to]) / SECONDS[from]
}

/** Converte uma duração de `from` para `to`. Ex.: 0,5 h -> 30 min. */
export function convertTime(t: number, from: TimeUnit, to: TimeUnit): number {
  return (t * SECONDS[from]) / SECONDS[to]
}
