import { Link } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout({ children, showNav = true }) {
  return (
    <div className="min-h-screen bg-avorio flex flex-col">
      {showNav && <Navbar />}
      <main className="flex-1">{children}</main>
      <footer className="py-8 text-center text-sm text-gray-400 border-t border-avorio-dark space-y-1">
        <p>
          © {new Date().getFullYear()} Piky — Fatto con{' '}
          <span className="text-cipria-dark">♥</span> per i compleanni speciali
        </p>
        <p className="text-xs text-gray-300">
          <Link to="/privacy" className="underline hover:text-gray-400 transition-colors">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  )
}
