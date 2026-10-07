import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import GiftIcon from '../components/GiftIcon'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState('waiting') // waiting | ready | saving | success | error
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const { t } = useTranslation()

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
      setErrorMsg(t('reset.error.too_short'))
      return
    }
    if (password !== confirm) {
      setErrorMsg(t('reset.error.mismatch'))
      return
    }
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorMsg(error.message || t('reset.error.save'))
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
        <p className="font-display text-xl font-bold text-salvia mb-4">{t('reset.logo')}</p>

        {status === 'waiting' && (
          <>
            <p className="text-2xl mb-3">⏳</p>
            <p className="font-semibold text-gray-800">{t('reset.waiting.title')}</p>
          </>
        )}

        {(status === 'ready' || status === 'saving') && (
          <>
            <p className="font-semibold text-gray-900 text-lg mb-1">{t('reset.ready.title')}</p>
            <p className="text-sm text-gray-500 mb-5">{t('reset.ready.subtitle')}</p>
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <div>
                <label className="label">{t('reset.ready.new_label')}</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg('') }}
                  placeholder={t('reset.ready.new_placeholder')}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">{t('reset.ready.confirm_label')}</label>
                <input
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrorMsg('') }}
                  placeholder={t('reset.ready.confirm_placeholder')}
                  required
                />
              </div>
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              <button type="submit" disabled={status === 'saving'} className="btn-primary w-full py-3">
                {status === 'saving' ? t('reset.saving') : t('reset.submit_btn')}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-semibold text-gray-900 text-lg mb-2">{t('reset.success.title')}</p>
            <p className="text-sm text-gray-500">{t('reset.success.body')}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-3xl mb-3">⚠️</p>
            <p className="font-semibold text-gray-800 mb-1">{t('reset.error_state.title')}</p>
            <p className="text-sm text-gray-500">{t('reset.error_state.body')}</p>
          </>
        )}
      </div>
    </div>
  )
}
