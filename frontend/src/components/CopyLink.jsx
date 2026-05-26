import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import clsx from 'clsx'

export default function CopyLink({ url, label, icon, description, variant = 'default' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border p-4 space-y-2',
        variant === 'collective'
          ? 'bg-salvia/5 border-salvia/20'
          : 'bg-cipria/10 border-cipria/30'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && (
          typeof icon === 'string'
            ? <span className="text-xl">{icon}</span>
            : <span className="flex items-center">{icon}</span>
        )}
        <span className="font-semibold text-sm text-gray-700">{label}</span>
      </div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 truncate font-mono">
          {url}
        </code>
        <button
          onClick={handleCopy}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0',
            copied
              ? 'bg-salvia text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-salvia hover:text-salvia'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copiato!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copia
            </>
          )}
        </button>
      </div>
    </div>
  )
}
