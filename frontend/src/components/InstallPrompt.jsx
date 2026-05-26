import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'
import clsx from 'clsx'
import GiftIcon from './GiftIcon'

/**
 * InstallPrompt
 *
 * Android/Chrome: intercetta l'evento `beforeinstallprompt` e mostra
 *   un banner custom in basso con il bottone "Installa".
 *
 * iOS/Safari: `beforeinstallprompt` non esiste, quindi mostriamo
 *   istruzioni manuali ("tocca Condividi → Aggiungi a schermata Home").
 *
 * Si nasconde automaticamente se:
 *   - l'utente l'ha già installata (display-mode: standalone)
 *   - l'utente ha già chiuso/rifiutato il banner (localStorage)
 */

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIos, setShowIos] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Non mostrare se già installata
    if (isInStandaloneMode()) return

    // Non mostrare se l'utente ha già rifiutato
    if (localStorage.getItem('wishly-pwa-dismissed')) return

    // Android/Chrome
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowAndroid(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — mostra dopo 3 secondi se Safari
    if (isIos()) {
      const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
      if (isSafari) {
        const timer = setTimeout(() => setShowIos(true), 3000)
        return () => clearTimeout(timer)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowAndroid(false)
    }
    setDeferredPrompt(null)
    setInstalling(false)
  }

  const handleDismiss = () => {
    setShowAndroid(false)
    setShowIos(false)
    localStorage.setItem('wishly-pwa-dismissed', '1')
  }

  // ── Android banner ──────────────────────────────────────────────────────
  if (showAndroid) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 border border-avorio-dark p-5 max-w-sm mx-auto">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-avorio rounded-2xl flex items-center justify-center flex-shrink-0">
              <GiftIcon size={34} />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 text-base leading-tight">
                Installa Wishly
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Aggiungila alla schermata home — si apre come un'app
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Non ora
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {installing ? 'Installo...' : 'Installa'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── iOS instructions ────────────────────────────────────────────────────
  if (showIos) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 border border-avorio-dark p-5 max-w-sm mx-auto relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-avorio rounded-2xl flex items-center justify-center flex-shrink-0">
              <GiftIcon size={28} />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900">Installa Wishly</p>
              <p className="text-xs text-gray-500">Aggiungila alla schermata Home</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-salvia text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </span>
              <span>
                Tocca l'icona{' '}
                <span className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">
                  <Share className="w-3.5 h-3.5 text-blue-500" /> Condividi
                </span>{' '}
                in fondo alla barra di Safari
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-salvia text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </span>
              <span>
                Scorri e tocca{' '}
                <span className="font-semibold text-gray-800">
                  "Aggiungi a schermata Home"
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-salvia text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </span>
              <span>Tocca <span className="font-semibold text-gray-800">"Aggiungi"</span> in alto a destra</span>
            </li>
          </ol>

          {/* Arrow pointing down to Safari toolbar */}
          <div className="mt-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
            <span>↓</span>
            <span>l'icona Condividi è qui sotto</span>
            <span>↓</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
