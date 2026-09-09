import {
  CHARGE_PROVIDERS,
  EXPENSE_CATEGORIES,
  type ChargeProvider,
  type ExpenseCategory,
  type Recurrence,
} from '../types'

export function twd(value: number, digits = 0): string {
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function money(value: number, digits = 0): string {
  return `NT$ ${twd(value, digits)}`
}

export function km(value: number): string {
  return `${twd(value, 0)} km`
}

export function kwh(value: number): string {
  return `${twd(value, 1)} 度`
}

export function providerLabel(id: ChargeProvider): string {
  return CHARGE_PROVIDERS.find((item) => item.id === id)?.label ?? id
}

export function categoryLabel(id: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((item) => item.id === id)?.label ?? id
}

export function recurrenceLabel(value: Recurrence): string {
  if (value === 'monthly') return '每月'
  if (value === 'yearly') return '每年'
  return '一次'
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '')
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}`
}

export function fromDateTimeLocal(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}
