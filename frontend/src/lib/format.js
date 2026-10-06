const fmt = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const formatEur = (amount) => fmt.format(parseFloat(amount) || 0)
export const formatEurInt = (amount) => fmtInt.format(parseFloat(amount) || 0)
