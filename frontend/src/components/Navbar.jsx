import { Link, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [spinning, setSpinning] = useState(false)

  const handleUpdate = async () => {
    setSpinning(true)
    try {
      if (window.__pikyUpdateSW) {
        window.__pikyUpdateSW(true)
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) reg.update()
      }
    } catch (_) {}
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <header className="sticky top-0 z-50 bg-avorio/90 backdrop-blur-sm border-b border-avorio-dark pt-safe">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/icons/icon-72x72.png" alt="Piky" className="w-8 h-8 rounded-xl" />
          <span className="font-display text-xl font-bold text-salvia group-hover:text-salvia-dark transition-colors">
            Piky
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <button
            onClick={handleUpdate}
            title="Aggiorna l'app"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-avorio-dark text-gray-400 hover:text-salvia hover:border-salvia transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          </button>
          {isHome && (
            <Link
              to="/crea"
              className="btn-primary text-sm py-2 px-5"
            >
              Crea la lista
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
