import { useState } from 'react'
import { X } from 'lucide-react'
import { isNative, isIosBrowser, isAndroidBrowser, APP_STORE_URL, PLAY_STORE_URL } from '../lib/platform'

function StoreModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="font-display font-bold text-gray-900 text-lg mb-1">Scarica Piky</h2>
        <p className="text-sm text-gray-500 mb-5">Disponibile su App Store e Google Play</p>
        <div className="flex flex-col gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-center py-3 text-sm font-semibold rounded-2xl"
          >
            🍎 Scarica su App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-center py-3 text-sm font-semibold rounded-2xl"
          >
            🤖 Scarica su Google Play
          </a>
        </div>
      </div>
    </div>
  )
}

export default function DownloadButton({ className }) {
  const [showModal, setShowModal] = useState(false)

  if (isNative()) return null

  const handleClick = () => {
    if (isIosBrowser()) {
      window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer')
    } else if (isAndroidBrowser()) {
      window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer')
    } else {
      setShowModal(true)
    }
  }

  return (
    <>
      <button onClick={handleClick} className={className}>
        Scarica l'app
      </button>
      {showModal && <StoreModal onClose={() => setShowModal(false)} />}
    </>
  )
}
