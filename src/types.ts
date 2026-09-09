export const VEHICLE_ID = 'default'

export const EXPENSE_CATEGORIES = [
  { id: 'insurance', label: '保險' },
  { id: 'parking', label: '停車' },
  { id: 'loan', label: '貸款' },
  { id: 'subscription', label: '連線訂閱' },
  { id: 'inspection', label: '驗車' },
  { id: 'other', label: '其他' },
] as const

export const CHARGE_PROVIDERS = [
  { id: 'home', label: '家充' },
  { id: 'tesla', label: 'Tesla Supercharger' },
  { id: 'chargespot', label: 'ChargeSPOT' },
  { id: 'upower', label: 'U-POWER' },
  { id: 'cpc', label: '中油' },
  { id: 'other', label: '其他' },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['id']
export type ChargeProvider = (typeof CHARGE_PROVIDERS)[number]['id']
export type Recurrence = 'monthly' | 'yearly' | 'one-off'
export type ChargeSource = 'manual' | 'ocr'
export type PeriodKey = 'month' | 'quarter' | 'year' | 'all'

export interface PurchaseItem {
  id: string
  name: string
  amount: number
}

export interface Vehicle {
  id: string
  nickname: string
  model: string
  purchaseDate: string
  purchaseItems: PurchaseItem[]
  ownershipYears: number
  residualValue: number
  startOdometer: number
  electricityRateHome: number
}

export interface FixedExpense {
  id: string
  name: string
  category: ExpenseCategory
  amount: number
  recurrence: Recurrence
  startDate: string
  endDate?: string
}

export interface ChargeSession {
  id: string
  chargedAt: string
  provider: ChargeProvider
  location: string
  kWh: number
  costTwd: number
  odometerKm?: number
  source: ChargeSource
  photoBlob?: Blob
  ocrRawText?: string
  createdAt: string
}

export interface ChargeDraft {
  chargedAt: string
  provider: ChargeProvider
  location: string
  kWh: string
  costTwd: string
  odometerKm: string
  source: ChargeSource
  photoBlob?: Blob
  ocrRawText?: string
}
