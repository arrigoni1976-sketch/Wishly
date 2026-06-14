import { useState, useEffect } from 'react'
import { Clock, Lock } from 'lucide-react'

function getClosingMs(closingDate) {
  const [y, m, d] = closingDate.split('-').map(Number)
  // Find Italy's UTC offset at midnight of that day
  const midnight = new Date(Date.UTC(y, m - 1, d))
  const italyOffsetHours = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }).format(midnight)
  )
  return new Date(Date.UTC(y, m - 1, d, 19 - italyOffsetHours, 0, 0)).getTime()
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
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <Lock className="w-3 h-3" />
          Prenotazioni chiuse
        </span>
      </div>
    )
  }

  if (remaining === null) return null

  return (
    <div className={`flex justify-center ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
        <Clock className="w-3 h-3" />
        Le prenotazioni chiudono tra{' '}
        <span className="font-mono font-medium text-gray-600 tabular-nums">{formatRemaining(remaining)}</span>
      </span>
    </div>
  )
}
