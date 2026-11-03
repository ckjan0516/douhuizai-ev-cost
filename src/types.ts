export const VEHICLE_ID = 'default'

export const EXPENSE_CATEGORIES = [
  { id: 'insurance', label: '保險', group: '固定持有' },
  { id: 'loan', label: '貸款', group: '固定持有' },
  { id: 'subscription', label: '連線訂閱', group: '固定持有' },
  { id: 'inspection', label: '驗車', group: '固定持有' },
  { id: 'parking', label: '停車', group: '日常用車' },
  { id: 'etag', label: 'eTag', group: '日常用車' },
  { id: 'wash', label: '洗車', group: '日常用車' },
  { id: 'supplies', label: '耗材', group: '日常用車' },
  { id: 'maintenance', label: '保養', group: '日常用車' },
  { id: 'other', label: '其他', group: '其他' },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['id']

const EXPENSE_GROUP_LABELS = ['固定持有', '日常用車', '其他'] as const

export const EXPENSE_GROUPS = EXPENSE_GROUP_LABELS.map((label) => ({
  id: label,
  label,
  items: EXPENSE_CATEGORIES.filter((item) => item.group === label),
}))

export const CHARGE_PROVIDERS = [
  { id: 'evoasis', label: 'EVOASIS' },
  { id: 'home', label: '家充' },
  { id: 'tesla', label: '特斯拉超充站' },
  { id: 'third_party', label: '第三方充電站' },
  { id: 'other', label: '其他' },
] as const

export type ChargeProvider = (typeof CHARGE_PROVIDERS)[number]['id']

const LEGACY_PROVIDERS: Record<string, ChargeProvider> = {
  chargespot: 'third_party',
  upower: 'third_party',
  cpc: 'third_party',
}

export function normalizeProvider(id: string | undefined | null): ChargeProvider {
  if (id && CHARGE_PROVIDERS.some((item) => item.id === id)) return id as ChargeProvider
  if (id && id in LEGACY_PROVIDERS) return LEGACY_PROVIDERS[id]
  return 'other'
}

export type Recurrence = 'monthly' | 'yearly' | 'one-off'
export type ChargeSource = 'manual' | 'ocr'
export type PeriodKey = 'month' | 'lastMonth' | 'quarter' | 'half' | 'year' | 'all' | 'custom'

export const EFFICIENCY_BASELINE = {
  model: '2026 Model Y RWD',
  kmPerKwh: 7.4,
  source: '經濟部能源署能效標示',
} as const

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
  loanAmount: number
  loanMonths: number
  loanPayment: number
  loanStartDate: string
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
  photoPath?: string
  photoUrl?: string
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
