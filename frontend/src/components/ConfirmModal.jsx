export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up p-6">
        <p className="font-display font-bold text-gray-900 text-lg mb-2">{title}</p>
        {message && <p className="text-sm text-gray-500 mb-5 leading-relaxed">{message}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 text-sm font-semibold rounded-2xl transition-colors ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-salvia text-white hover:bg-salvia-dark'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
