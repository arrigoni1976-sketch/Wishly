import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const { t, i18n } = useTranslation()

  const toggleLang = () => {
    const next = i18n.language === 'it' ? 'en' : 'it'
    i18n.changeLanguage(next)
    localStorage.setItem('piky_lang', next)
  }

  return (
    <header className="sticky top-0 z-50 bg-avorio/90 backdrop-blur-sm border-b border-avorio-dark pt-safe">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/favicon.svg" alt="Piky" className="w-8 h-8 rounded-xl" />
          <span className="font-display text-xl font-bold text-salvia group-hover:text-salvia-dark transition-colors">
            {t('nav.logo')}
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-avorio-dark text-gray-500 hover:text-salvia hover:border-salvia transition-colors text-xs font-semibold"
            title={i18n.language === 'it' ? 'Switch to English' : 'Passa all\'italiano'}
          >
            {i18n.language === 'it' ? '🇬🇧' : '🇮🇹'}
          </button>
          {isHome && (
            <Link
              to="/crea"
              className="btn-primary text-sm py-2 px-5"
            >
              {t('nav.cta')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
