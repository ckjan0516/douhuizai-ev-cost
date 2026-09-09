import type {
  ChargeSession,
  FixedExpense,
  PeriodKey,
  Vehicle,
} from '../types'

export interface MonthKey {
  year: number
  month: number
}

export interface PeriodRange {
  start: Date
  end: Date
}

export interface CostBreakdown {
  amort: number
  fixed: number
  charge: number
  total: number
  km: number | null
  perKm: number | null
  months: number
}

export function purchaseTotal(vehicle: Vehicle): number {
  return vehicle.purchaseItems.reduce((sum, item) => sum + item.amount, 0)
}

export function monthlyAmortization(vehicle: Vehicle): number {
  const months = vehicle.ownershipYears * 12
  if (months <= 0) return 0
  const principal = Math.max(0, purchaseTotal(vehicle) - vehicle.residualValue)
  return principal / months
}

export function periodRange(
  key: PeriodKey,
  now: Date,
  purchaseDate: string,
): PeriodRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const purchased = parseDateOnly(purchaseDate)
  let start = purchased
  if (key === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (key === 'quarter') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  } else if (key === 'year') {
    start = new Date(now.getFullYear(), 0, 1)
  }
  if (start < purchased) start = purchased
  return { start, end }
}

export function monthsInRange(start: Date, end: Date): MonthKey[] {
  const last = new Date(end.getTime() - 1)
  const months: MonthKey[] = []
  let year = start.getFullYear()
  let month = start.getMonth()
  while (year < last.getFullYear() || (year === last.getFullYear() && month <= last.getMonth())) {
    months.push({ year, month })
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return months
}

export function isExpenseActiveInMonth(expense: FixedExpense, key: MonthKey): boolean {
  const start = parseDateOnly(expense.startDate)
  const end = expense.endDate ? parseDateOnly(expense.endDate) : null
  const monthStart = new Date(key.year, key.month, 1)
  const monthEnd = new Date(key.year, key.month + 1, 0)
  if (start > monthEnd) return false
  if (end && end < monthStart) return false
  return true
}

export function fixedCostForMonth(expenses: FixedExpense[], key: MonthKey): number {
  let total = 0
  for (const expense of expenses) {
    if (!isExpenseActiveInMonth(expense, key)) continue
    if (expense.recurrence === 'monthly') {
      total += expense.amount
      continue
    }
    if (expense.recurrence === 'yearly') {
      total += expense.amount / 12
      continue
    }
    const start = parseDateOnly(expense.startDate)
    if (start.getFullYear() === key.year && start.getMonth() === key.month) {
      total += expense.amount
    }
  }
  return total
}

export function chargesInRange(
  charges: ChargeSession[],
  range: PeriodRange,
): ChargeSession[] {
  return charges.filter((charge) => {
    const at = new Date(charge.chargedAt)
    return at >= range.start && at < range.end
  })
}

export function chargeCostInRange(charges: ChargeSession[], range: PeriodRange): number {
  return chargesInRange(charges, range).reduce((sum, charge) => sum + charge.costTwd, 0)
}

export function kmInRange(
  vehicle: Vehicle,
  charges: ChargeSession[],
  range: PeriodRange,
): number | null {
  const withOdo = charges
    .filter((charge) => charge.odometerKm != null)
    .map((charge) => ({
      at: new Date(charge.chargedAt),
      km: charge.odometerKm as number,
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  const before = withOdo.filter((row) => row.at < range.start)
  const inside = withOdo.filter((row) => row.at >= range.start && row.at < range.end)
  const startKm = before.length > 0 ? before[before.length - 1].km : vehicle.startOdometer
  if (inside.length === 0) return null
  const endKm = inside[inside.length - 1].km
  const driven = endKm - startKm
  return driven > 0 ? driven : null
}

export function summarizePeriod(
  vehicle: Vehicle,
  expenses: FixedExpense[],
  charges: ChargeSession[],
  key: PeriodKey,
  now = new Date(),
): CostBreakdown {
  const range = periodRange(key, now, vehicle.purchaseDate)
  const months = monthsInRange(range.start, range.end)
  const amortEach = monthlyAmortization(vehicle)
  const amort = amortEach * months.length
  const fixed = months.reduce((sum, month) => sum + fixedCostForMonth(expenses, month), 0)
  const charge = chargeCostInRange(charges, range)
  const total = amort + fixed + charge
  const km = kmInRange(vehicle, charges, range)
  return {
    amort,
    fixed,
    charge,
    total,
    km,
    perKm: km ? total / km : null,
    months: months.length,
  }
}

export function monthlySeries(
  vehicle: Vehicle,
  expenses: FixedExpense[],
  charges: ChargeSession[],
  count = 6,
  now = new Date(),
): Array<MonthKey & CostBreakdown & { label: string }> {
  const series: Array<MonthKey & CostBreakdown & { label: string }> = []
  const purchased = parseDateOnly(vehicle.purchaseDate)
  const purchaseMonth = new Date(purchased.getFullYear(), purchased.getMonth(), 1)
  for (let i = count - 1; i >= 0; i -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = { year: cursor.getFullYear(), month: cursor.getMonth() }
    const start = new Date(key.year, key.month, 1)
    const end = new Date(key.year, key.month + 1, 1)
    const range = { start, end }
    const owned = cursor >= purchaseMonth
    const amort = owned ? monthlyAmortization(vehicle) : 0
    const fixed = owned ? fixedCostForMonth(expenses, key) : 0
    const charge = chargeCostInRange(charges, range)
    const total = amort + fixed + charge
    const km = kmInRange(vehicle, charges, range)
    series.push({
      ...key,
      amort,
      fixed,
      charge,
      total,
      km,
      perKm: km ? total / km : null,
      months: 1,
      label: `${key.month + 1}月`,
    })
  }
  return series
}

export function homeChargeAmount(kWh: number, rate: number): number {
  return Math.round(kWh * rate * 100) / 100
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}
