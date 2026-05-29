import { useState, useEffect } from 'react'
import { Key, X, AlertTriangle } from 'lucide-react'
import { registerUserKey, getUserKeyLinks } from '../lib/api'

// Chars without ambiguous look-alikes (no 0/O, 1/I/L)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomSuffix(len = 4) {
  return Array.from({ length: len }, () =>
    SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  ).join('')
}

function buildKey(name) {
  const prefix = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  return `${prefix}-${randomSuffix()}`
}

export default function KeyModal({ isOpen, initialMode = 'create', onClose, onKeySet }) {
  const [mode, setMode] = useState(initialMode) // 'create' | 'recover'

  // Aggiorna il modo quando si riapre il modal
  useEffect(() => {
    if (isOpen) setMode(initialMode)
  }, [isOpen, initialMode])
  const [name, setName] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [step, setStep] = useState(1) // 1: name input, 2: confirm key
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const reset = () => {
    setStep(1)
    setName('')
    setGeneratedKey('')
    setRecoveryInput('')
    setError('')
  }

  const switchMode = (m) => {
    setMode(m)
    reset()
  }

  const handleGenerateKey = () => {
    if (!name.trim()) return
    setGeneratedKey(buildKey(name))
    setStep(2)
    setError('')
  }

  const handleConfirmCreate = async () => {
    setLoading(true)
    setError('')
    try {
      await registerUserKey(generatedKey)
      onKeySet(generatedKey)
      onClose()
    } catch (e) {
      if (e?.response?.status === 409) {
        // Key collision — regenerate
        const newKey = buildKey(name)
        setGeneratedKey(newKey)
        setError('Codice già esistente, ne abbiamo generato uno nuovo. Conferma di nuovo.')
      } else {
        setError(e?.response?.data?.message || 'Errore. Riprova.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async () => {
    const key = recoveryInput.trim()
    if (!key) return
    setLoading(true)
    setError('')
    try {
      const res = await getUserKeyLinks(key)
      const links = res.data.links || []

      // Merge into localStorage
      const events = JSON.parse(localStorage.getItem('piky_events') || '[]')
      const invites = JSON.parse(localStorage.getItem('piky_invites') || '[]')

      for (const link of links) {
        if (link.link_type === 'event' && !events.find((e) => e.parentToken === link.token)) {
          events.unshift({
            childName: link.child_name,
            partyDate: link.party_date,
            parentToken: link.token,
            createdAt: link.created_at,
          })
        }
        if (link.link_type === 'invite' && !invites.find((e) => e.guestToken === link.token)) {
          invites.unshift({
            childName: link.child_name,
            partyDate: link.party_date,
            guestToken: link.token,
            visitedAt: link.created_at,
          })
        }
      }

      localStorage.setItem('piky_events', JSON.stringify(events.slice(0, 20)))
      localStorage.setItem('piky_invites', JSON.stringify(invites.slice(0, 20)))

      onKeySet(key)
      onClose()
    } catch (e) {
      if (e?.response?.status === 404) {
        setError('Codice non trovato. Controlla di averlo inserito correttamente.')
      } else {
        setError(e?.response?.data?.message || 'Errore. Riprova.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-salvia" />
              <h2 className="font-display text-lg font-bold text-gray-900">Codice personale</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-avorio-dark overflow-hidden mb-5 text-sm">
            <button
              onClick={() => switchMode('create')}
              className={`flex-1 py-2.5 font-medium transition-colors ${
                mode === 'create' ? 'bg-salvia text-white' : 'text-gray-500 hover:bg-avorio'
              }`}
            >
              Crea codice
            </button>
            <button
              onClick={() => switchMode('recover')}
              className={`flex-1 py-2.5 font-medium transition-colors ${
                mode === 'recover' ? 'bg-salvia text-white' : 'text-gray-500 hover:bg-avorio'
              }`}
            >
              Ho già un codice
            </button>
          </div>

          {/* ── CREATE mode ─────────────────────────────────── */}
          {mode === 'create' && step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Scegli un nome o soprannome. Ti verrà assegnato un codice personale
                che potrai usare su qualsiasi dispositivo per ritrovare tutto.
              </p>
              <div>
                <label className="label">Nome o soprannome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Marco, FamigliaRossi, Ale…"
                  className="input"
                  maxLength={12}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateKey()}
                />
                <p className="text-xs text-gray-400 mt-1">Massimo 12 caratteri, solo lettere e numeri</p>
              </div>
              <button
                onClick={handleGenerateKey}
                disabled={!name.trim()}
                className="btn-primary w-full py-3"
              >
                Genera il mio codice →
              </button>
            </div>
          )}

          {mode === 'create' && step === 2 && (
            <div className="space-y-4">
              <div className="bg-avorio rounded-2xl p-5 text-center border border-avorio-dark">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                  Il tuo codice personale
                </p>
                <p className="font-display text-3xl font-bold text-salvia tracking-widest">
                  {generatedKey}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 mb-1">Salvalo adesso!</p>
                  <p className="text-amber-700 leading-relaxed">
                    Fai uno screenshot o annotalo. Senza questo codice non potrai
                    recuperare le tue liste su un altro dispositivo.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError('') }}
                  className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ← Cambia nome
                </button>
                {/* Form con autocomplete per attivare il portachiavi del browser/iPhone */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleConfirmCreate() }}
                  action={window.location.href}
                  className="flex-1"
                >
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    defaultValue={`Piky-${name.trim()}`}
                    className="sr-only"
                    readOnly
                    tabIndex={-1}
                  />
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    defaultValue={generatedKey}
                    className="sr-only"
                    readOnly
                    tabIndex={-1}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-2.5 flex items-center justify-center gap-1.5"
                  >
                    {loading ? 'Salvo…' : <><Key className="w-4 h-4" /> Salva nel portachiavi</>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── RECOVER mode ────────────────────────────────── */}
          {mode === 'recover' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Inserisci il tuo codice personale per ritrovare tutte le tue liste
                e gli inviti ricevuti.
              </p>
              <div>
                <label className="label">Il tuo codice</label>
                <input
                  type="text"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
                  placeholder="Es. MARCO-7X2Q"
                  className="input font-mono tracking-wider"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRecover()}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                onClick={handleRecover}
                disabled={!recoveryInput.trim() || loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Cerco…' : 'Recupera le mie liste →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
