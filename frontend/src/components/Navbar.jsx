import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="sticky top-0 z-50 bg-avorio/90 backdrop-blur-sm border-b border-avorio-dark pt-safe">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/icons/icon-72x72.png" alt="Wishly" className="w-8 h-8 rounded-xl" />
          <span className="font-display text-xl font-bold text-salvia group-hover:text-salvia-dark transition-colors">
            Wishly
          </span>
        </Link>

        {isHome && (
          <nav className="flex items-center gap-3">
            <Link
              to="/crea"
              className="btn-primary text-sm py-2 px-5"
            >
              Crea la lista
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
