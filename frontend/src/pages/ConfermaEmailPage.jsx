import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import GiftIcon from '../components/GiftIcon'

export default function ConfermaEmailPage() {
  const [status, setStatus] = useState('loading') // loading | success | error

  useEffect(() => {
    // Supabase processa automaticamente il token dall'URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setStatus('success')
      }
    })

    // Timeout fallback: se non arriva evento entro 3s, controlliamo la sessione
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setStatus(session ? 'success' : 'error')
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-avorio flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-sm w-full text-center">
        <div className="flex justify-center mb-4">
          <GiftIcon size={40} />
        </div>
        <p className="font-display text-xl font-bold text-salvia mb-2">Piky</p>

        {status === 'loading' && (
          <>
            <p className="text-2xl mb-3">⏳</p>
            <p className="font-semibold text-gray-800 mb-1">Conferma in corso…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-semibold text-gray-900 text-lg mb-2">Email confermata!</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Il tuo account è attivo.<br />
              Torna all'app e accedi con la tua email e password.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-3xl mb-3">⚠️</p>
            <p className="font-semibold text-gray-800 mb-1">Link non valido</p>
            <p className="text-sm text-gray-500">
              Il link è scaduto o già usato.<br />
              Torna all'app e prova ad accedere — il tuo account potrebbe essere già attivo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
