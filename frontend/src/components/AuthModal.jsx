import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import GiftIcon from './GiftIcon'

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const { signIn, signUp } = useAuth()

  if (!isOpen) return null

  const reset = () => {
    setEmail('')
    setPassword('')
    setError('')
    setRegistered(false)
  }

  const switchMode = (m) => {
    setMode(m)
    reset()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error: err } = await signIn(email.trim(), password)
      if (err) {
        setError('Email o password non corretti.')
      } else {
        onSuccess?.()
        onClose()
      }
    } else {
      if (password.length < 6) {
        setError('La password deve avere almeno 6 caratteri.')
        setLoading(false)
        return
      }
      const { error: err } = await signUp(email.trim(), password)
      if (err) {
        if (err.message?.includes('already registered')) {
          setError('Email già registrata. Prova ad accedere.')
        } else {
          setError(err.message || 'Errore nella registrazione.')
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
                {mode === 'login' ? 'Accedi' : 'Crea account'}
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
              Accedi
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Registrati
            </button>
          </div>

          {registered ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">📬</p>
              <p className="font-semibold text-gray-900 mb-1">Controlla la tua email</p>
              <p className="text-sm text-gray-500">
                Abbiamo inviato un link di conferma a <strong>{email}</strong>. Clicca il link per attivare il tuo account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="la-tua@email.it"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder={mode === 'register' ? 'Almeno 6 caratteri' : '••••••••'}
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
                  ? (mode === 'login' ? 'Accesso...' : 'Registrazione...')
                  : (mode === 'login' ? 'Accedi →' : 'Crea account →')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
