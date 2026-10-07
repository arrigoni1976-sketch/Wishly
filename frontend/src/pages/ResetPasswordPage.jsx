import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import GiftIcon from '../components/GiftIcon'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState('waiting') // waiting | ready | saving | success | error
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setErrorMsg('La password deve avere almeno 6 caratteri.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Le password non coincidono.')
      return
    }
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorMsg(error.message || 'Errore nel salvataggio.')
      setStatus('ready')
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="min-h-screen bg-avorio flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-sm w-full text-center">
        <div className="flex justify-center mb-4">
          <GiftIcon size={40} />
        </div>
        <p className="font-display text-xl font-bold text-salvia mb-4">Piky</p>

        {status === 'waiting' && (
          <>
            <p className="text-2xl mb-3">⏳</p>
            <p className="font-semibold text-gray-800">Verifica in corso…</p>
          </>
        )}

        {(status === 'ready' || status === 'saving') && (
          <>
            <p className="font-semibold text-gray-900 text-lg mb-1">Nuova password</p>
            <p className="text-sm text-gray-500 mb-5">Scegli una password di almeno 6 caratteri.</p>
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <div>
                <label className="label">Nuova password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg('') }}
                  placeholder="Almeno 6 caratteri"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Conferma password</label>
                <input
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrorMsg('') }}
                  placeholder="Ripeti la password"
                  required
                />
              </div>
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              <button type="submit" disabled={status === 'saving'} className="btn-primary w-full py-3">
                {status === 'saving' ? 'Salvataggio…' : 'Salva nuova password →'}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-semibold text-gray-900 text-lg mb-2">Password aggiornata!</p>
            <p className="text-sm text-gray-500">Torna all'app e accedi con la nuova password.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-3xl mb-3">⚠️</p>
            <p className="font-semibold text-gray-800 mb-1">Link non valido</p>
            <p className="text-sm text-gray-500">Il link è scaduto o già usato. Torna all'app e richiedi un nuovo link.</p>
          </>
        )}
      </div>
    </div>
  )
}
