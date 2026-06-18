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

// Returns a finite, non-negative price (or null if empty/omitted) — throws a 400
// error for values that aren't a valid number, instead of silently storing NaN/null.
export function parsePrice(value) {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(value)
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error('Prezzo non valido')
    err.status = 400
    throw err
  }
  return n
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Returns true if the string is a syntactically valid UUID
export function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns true if the string is a syntactically valid email address
export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}
