import clsx from 'clsx'
import CelebrationIcon from './CelebrationIcon'

export default function ProgressBar({ current, goal, className }) {
  const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const remaining = Math.max(0, goal - current)
  const isComplete = percent >= 100

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex justify-between items-baseline text-sm">
        <span className="font-semibold text-gray-800">
          €{current.toFixed(2)}{' '}
          <span className="font-normal text-gray-500">raccolti su €{goal.toFixed(2)}</span>
        </span>
        <span
          className={clsx(
            'font-bold',
            isComplete ? 'text-salvia' : 'text-gray-700'
          )}
        >
          {percent}%
        </span>
      </div>

      <div className="h-3 bg-avorio-dark rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-700 ease-out',
            isComplete ? 'bg-salvia' : 'bg-gradient-to-r from-cipria-dark to-salvia'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{isComplete ? <><CelebrationIcon size={16} className="inline-block mr-1" />Obiettivo raggiunto!</> : `Mancano €${remaining.toFixed(2)}`}</span>
        <span>{percent}% completato</span>
      </div>
    </div>
  )
}
