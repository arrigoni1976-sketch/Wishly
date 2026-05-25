import clsx from 'clsx'

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const stepNum = index + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  isCompleted && 'bg-salvia text-white',
                  isActive && 'bg-salvia text-white ring-4 ring-salvia/20',
                  !isCompleted && !isActive && 'bg-avorio-dark text-gray-400 border-2 border-gray-200'
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={clsx(
                  'text-xs mt-1 font-medium hidden sm:block whitespace-nowrap',
                  isActive ? 'text-salvia' : 'text-gray-400'
                )}
              >
                {step}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'h-0.5 w-10 sm:w-16 mx-1 mb-4 transition-colors duration-300',
                  isCompleted ? 'bg-salvia' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
