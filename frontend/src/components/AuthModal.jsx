import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import GiftIcon from './GiftIcon'

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const { t } = useTranslation()

  if (!isOpen) return null

  const reset = () => {
    setEmail('')
    setPassword('')
    setError('')
    setRegistered(false)
    setResetSent(false)
  }

  const switchMode = (m) => {
    setMode(m)
    reset()
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await resetPassword(email.trim())
    if (err) {
      setError(t('auth.forgot.error'))
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error: err } = await signIn(email.trim(), password)
      if (err) {
        setError(t('auth.form.error.login'))
      } else {
        onSuccess?.()
        onClose()
      }
    } else {
      if (password.length < 6) {
        setError(t('auth.form.error.short_pwd'))
        setLoading(false)
        return
      }
      const { error: err } = await signUp(email.trim(), password)
      if (err) {
        if (err.message?.includes('already registered')) {
          setError(t('auth.form.error.already_registered'))
        } else {
          setError(err.message || t('auth.form.error.register_generic'))
        }
      } else {
        setRegistered(true)
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <GiftIcon size={22} />
              <h2 className="font-display text-lg font-bold text-gray-900">
                {mode === 'login' ? t('auth.tab.login') : t('auth.title.register')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-avorio rounded-2xl p-1 mb-5">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {t('auth.tab.login')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {t('auth.tab.register')}
            </button>
          </div>

          {registered ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">📬</p>
              <p className="font-semibold text-gray-900 mb-1">{t('auth.registered.title')}</p>
              <p className="text-sm text-gray-500"
                dangerouslySetInnerHTML={{ __html: t('auth.registered.body', { email }) }}
              />
            </div>
          ) : mode === 'forgot' ? (
            resetSent ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-3">📬</p>
                <p className="font-semibold text-gray-900 mb-1">{t('auth.forgot.sent.title')}</p>
                <p className="text-sm text-gray-500"
                  dangerouslySetInnerHTML={{ __html: t('auth.forgot.sent.body', { email }) }}
                />
                <button onClick={() => switchMode('login')} className="mt-4 text-sm text-salvia font-medium hover:underline">
                  {t('auth.forgot.sent.back')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-500">{t('auth.forgot.hint')}</p>
                <div>
                  <label className="label">{t('auth.forgot.email.label')}</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder={t('auth.forgot.email.placeholder')}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? t('auth.forgot.loading') : t('auth.forgot.submit_btn')}
                </button>
                <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  {t('auth.forgot.back')}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('auth.form.email.label')}</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder={t('auth.form.email.placeholder')}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">{t('auth.form.password.label')}</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder={mode === 'register' ? t('auth.form.password.placeholder.register') : t('auth.form.password.placeholder.login')}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading
                  ? (mode === 'login' ? t('auth.form.loading.login') : t('auth.form.loading.register'))
                  : (mode === 'login' ? t('auth.form.submit.login') : t('auth.form.submit.register'))}
              </button>

              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')} className="w-full text-xs text-gray-400 hover:text-salvia transition-colors">
                  {t('auth.form.forgot_link')}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
