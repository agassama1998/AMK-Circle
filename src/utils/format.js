/**
 * AMK Circle — Shared formatting utilities
 * Centralises date, currency, name, and string helpers used across the app.
 */

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a number as currency.
 * @param {number|string} amount
 * @param {string} [symbol='$']
 * @param {string} [locale='en-US']
 */
export function formatCurrency(amount, symbol = '$', locale = 'en-US') {
  const n = Number(amount) || 0
  return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Compact currency display (e.g. $12.5k, $1.2M)
 */
export function formatCurrencyCompact(amount, symbol = '$') {
  const n = Number(amount) || 0
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${symbol}${(n / 1_000).toFixed(1)}k`
  return `${symbol}${n.toFixed(2)}`
}

// ─── Dates ────────────────────────────────────────────────────────────────────

const FORMAT_MAP = {
  'MM/DD/YYYY': (d) => `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`,
  'DD/MM/YYYY': (d) => `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`,
  'YYYY-MM-DD': (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
}
const pad = n => String(n).padStart(2, '0')

/**
 * Format a date string/object using the app date format preference.
 * @param {string|Date} date
 * @param {string} [fmt='MM/DD/YYYY']
 */
export function formatDate(date, fmt = 'MM/DD/YYYY') {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00' : '')) : date
  if (isNaN(d.getTime())) return date
  const fn = FORMAT_MAP[fmt] || FORMAT_MAP['MM/DD/YYYY']
  return fn(d)
}

/**
 * Friendly relative date — "Today", "Yesterday", or formatted date.
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '—'
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  d.setHours(0,0,0,0)
  const diff = (today - d) / 86_400_000
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return formatDate(dateStr)
}

/**
 * Format datetime string to "Jun 5, 2025 · 14:32"
 */
export function formatDateTime(datetimeStr) {
  if (!datetimeStr) return '—'
  const d = new Date(datetimeStr)
  if (isNaN(d.getTime())) return datetimeStr
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(',', ' ·')
}

/**
 * ISO month string (YYYY-MM) to human label: "June 2025"
 */
export function formatMonth(monthStr) {
  if (!monthStr) return ''
  const [y, m] = monthStr.split('-')
  return new Date(+y, +m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

// ─── Strings ──────────────────────────────────────────────────────────────────

/**
 * Title-case a snake_case or kebab-case string.
 * "payment_type" → "Payment Type"
 */
export function titleCase(str) {
  if (!str) return ''
  return str.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str, len = 40) {
  if (!str) return ''
  return str.length > len ? `${str.slice(0, len)}…` : str
}

/**
 * Initials from a full name — up to 2 characters.
 * "Abdullah Al-Farsi" → "AA"
 */
export function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Pluralise a word based on count.
 * pluralise(1, 'student') → '1 student'
 * pluralise(5, 'student') → '5 students'
 */
export function pluralise(count, word, plural) {
  const p = plural || `${word}s`
  return `${count} ${count === 1 ? word : p}`
}

// ─── Attendance / percentage ───────────────────────────────────────────────────

/**
 * Format a percentage with optional decimal places.
 */
export function formatPercent(value, decimals = 1) {
  const n = Number(value)
  if (isNaN(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

/**
 * Attendance rate colour class based on percentage.
 */
export function attendanceColor(rate) {
  if (rate >= 90) return 'text-green-600 dark:text-green-400'
  if (rate >= 75) return 'text-gold-600 dark:text-gold-400'
  return 'text-red-500 dark:text-red-400'
}

// ─── Miscellaneous ────────────────────────────────────────────────────────────

/**
 * Delay helper — useful in async chains.
 */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Safely parse JSON without throwing.
 */
export function safeJson(str, fallback = null) {
  try { return JSON.parse(str) } catch { return fallback }
}

/**
 * Generate a simple random colour hex (for fallback avatars etc.)
 */
export function randomColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

/**
 * Return status badge class for payment/salary status.
 */
export function statusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'paid':      return 'badge-green'
    case 'pending':   return 'badge-gold'
    case 'partial':   return 'badge-blue'
    case 'overdue':   return 'badge-red'
    case 'active':    return 'badge-green'
    case 'inactive':  return 'badge-gray'
    default:          return 'badge-gray'
  }
}
