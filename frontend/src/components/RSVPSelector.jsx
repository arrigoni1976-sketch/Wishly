import clsx from 'clsx'

const OPTIONS = [
  {
    value: 'yes',
    label: 'Ci sarò!',
    emoji: '🎉',
    activeClass: 'bg-salvia text-white border-salvia',
    hoverClass: 'hover:border-salvia hover:text-salvia',
  },
  {
    value: 'maybe',
    label: 'Forse',
    emoji: '🤔',
    activeClass: 'bg-yellow-400 text-white border-yellow-400',
    hoverClass: 'hover:border-yellow-400 hover:text-yellow-600',
  },
  {
    value: 'no',
    label: 'Non vengo',
    emoji: '😔',
    activeClass: 'bg-red-400 text-white border-red-400',
    hoverClass: 'hover:border-red-400 hover:text-red-500',
  },
]

export default function RSVPSelector({ value, onChange, disabled = false }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salvia',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value === opt.value
              ? opt.activeClass
              : clsx('border-gray-200 text-gray-600', opt.hoverClass)
          )}
        >
          <span>{opt.emoji}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}
