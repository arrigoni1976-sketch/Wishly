import { useState, useEffect } from 'react'
import { Clock, Lock } from 'lucide-react'

// Offset (in minuti) tra UTC e Europe/Rome nell'istante `date` — tiene conto dell'ora legale.
function getRomeOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc }, {})
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    parts.hour === '24' ? 0 : Number(parts.hour), Number(parts.minute), Number(parts.second)
  )
  return (asUTC - date.getTime()) / 60000
}

function getClosingMs(closingDate) {
  const [y, m, d] = closingDate.split('-').map(Number)
  // Stima iniziale trattando le 19:00 come UTC, poi corregge con l'offset reale Europe/Rome
  // valido in quell'istante (gestisce correttamente anche i giorni di cambio ora legale)
  const guess = Date.UTC(y, m - 1, d, 19, 0, 0)
  const offsetMin = getRomeOffsetMinutes(new Date(guess))
  return guess - offsetMin * 60000
}

function formatRemaining(ms) {
  const totalSecs = Math.floor(ms / 1000)
  const days  = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  const secs  = totalSecs % 60
  if (days > 0)  return `${days}g ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m ${String(secs).padStart(2,'0')}s`
  return `${mins}m ${String(secs).padStart(2,'0')}s`
}

export default function ClosingCountdown({ closingDate, closed = false, className = '' }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (closed || !closingDate) return
    const target = getClosingMs(closingDate)
    const update = () => setRemaining(Math.max(0, target - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [closingDate, closed])

  if (!closingDate) return null

  if (closed) {
    return (
      <div className={`flex justify-center ${className}`}>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-avorio border border-avorio-dark rounded-full px-3 py-1.5">
          <Lock className="w-3 h-3" />
          Prenotazioni chiuse
        </span>
      </div>
    )
  }

  if (remaining === null) return null

  return (
    <div className={`flex justify-center ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-avorio border border-avorio-dark rounded-full px-3 py-1.5">
        <Clock className="w-3 h-3" />
        Le prenotazioni chiudono tra{' '}
        <span className="font-mono font-medium text-gray-600 tabular-nums">{formatRemaining(remaining)}</span>
      </span>
    </div>
  )
}
