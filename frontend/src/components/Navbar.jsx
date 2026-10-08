import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { deleteAccount } from '../lib/api'
import AuthModal from './AuthModal'

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false)
        setShowDeleteConfirm(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      await deleteAccount()
      await signOut()
    } catch {
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setShowUserMenu((v) => !v); setShowDeleteConfirm(false) }}
                className="w-8 h-8 bg-salvia text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 hover:bg-salvia-dark transition-colors"
              >
                {user.email?.charAt(0).toUpperCase()}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  <p className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-100 mb-1">{user.email}</p>

                  <button
                    onClick={() => { signOut(); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('home.account.logout')}
                  </button>

                  {showDeleteConfirm ? (
                    <div className="px-4 py-2 border-t border-gray-100 mt-1">
                      <p className="text-xs text-red-500 mb-2">{t('home.account.delete.confirm')}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
                        >
                          {t('home.account.delete.cancel')}
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="flex-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded-lg py-1.5 transition-colors disabled:opacity-60"
                        >
                          {deletingAccount ? t('home.account.delete.loading') : t('home.account.delete.confirm_btn')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:text-red-400 transition-colors border-t border-gray-100 mt-1"
                    >
                      {t('home.account.delete.trigger')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="btn-outline text-xs py-1.5 px-4"
            >
              {t('auth.tab.login')}
            </button>
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
