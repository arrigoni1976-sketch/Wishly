// Returns true if the list's closing_date has passed 19:00 Italy time
export function isListClosed(closingDate) {
  if (!closingDate) return false
  const now = new Date()
  const italyDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }) // YYYY-MM-DD
  if (italyDateStr > closingDate) return true
  if (italyDateStr === closingDate) {
    const italyHour = Number(now.toLocaleString('en', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }))
    return italyHour >= 19
  }
  return false
}
