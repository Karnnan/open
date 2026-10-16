export const PRIORITIES = ['low', 'medium', 'high']

export const COLORS = [
  { value: '#6366f1', name: 'Indigo' },
  { value: '#8b5cf6', name: 'Violet' },
  { value: '#10b981', name: 'Emerald' },
  { value: '#0ea5e9', name: 'Sky' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#f43f5e', name: 'Rose' },
]

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(iso) {
  const seconds = (Date.parse(iso) - Date.now()) / 1000
  if (Number.isNaN(seconds)) return ''
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function fullDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

export function truncate(text, max = 40) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
