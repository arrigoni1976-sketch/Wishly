import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

export default function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  const toggleLang = () => {
    const next = i18n.language === 'it' ? 'en' : 'it'
    i18n.changeLanguage(next)
    localStorage.setItem('piky_lang', next)
  }

  return (
    <>
    <header className="sticky top-0 z-50 bg-avorio/90 backdrop-blur-sm border-b border-avorio-dark pt-safe">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/favicon.svg" alt="Piky" className="w-8 h-8 rounded-xl" />
          <span className="font-display text-xl font-bold text-salvia group-hover:text-salvia-dark transition-colors">
            {t('nav.logo')}
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <div className="flex items-center gap-0 rounded-xl border border-avorio-dark overflow-hidden text-xs font-semibold">
            <button
              onClick={() => { i18n.changeLanguage('it'); localStorage.setItem('piky_lang', 'it') }}
              className={`px-3 py-1.5 transition-colors ${i18n.language === 'it' ? 'bg-salvia text-avorio' : 'text-salvia/60 hover:text-salvia'}`}
            >
              IT
            </button>
            <span className="w-px h-4 bg-avorio-dark" />
            <button
              onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('piky_lang', 'en') }}
              className={`px-3 py-1.5 transition-colors ${i18n.language === 'en' ? 'bg-salvia text-avorio' : 'text-salvia/60 hover:text-salvia'}`}
            >
              EN
            </button>
          </div>

          {user ? (
            <div className="w-8 h-8 bg-salvia text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="btn-outline text-xs py-1.5 px-4"
            >
              {t('auth.tab.login')}
            </button>
          )}

          {isHome && (
            <Link
              to="/crea"
              className="btn-primary text-xs py-1.5 px-4"
            >
              {t('nav.cta')}
            </Link>
          )}
        </nav>
      </div>
    </header>

    <AuthModal
      isOpen={showLogin}
      initialMode="login"
      onClose={() => setShowLogin(false)}
      onSuccess={() => setShowLogin(false)}
    />
    </>
  )
}
