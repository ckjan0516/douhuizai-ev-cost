import {
  normalizeProvider,
  type ChargeSession,
  type FixedExpense,
  type PeriodKey,
  type Vehicle,
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
  perKmWithPurchase: number | null
  kWh: number
  whPerKm: number | null
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
  custom?: { start: string; end: string },
): PeriodRange {
  const purchased = parseDateOnly(purchaseDate)
  let start = purchased
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (key === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (key === 'lastMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    end = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (key === 'quarter') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  } else if (key === 'half') {
    start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else if (key === 'year') {
    start = new Date(now.getFullYear(), 0, 1)
  } else if (key === 'all') {
    start = purchased
  } else if (key === 'custom') {
    const rawStart = custom?.start
      ? parseDateOnly(custom.start)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const rawEnd = custom?.end
      ? parseDateOnly(custom.end)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const earlier = rawStart <= rawEnd ? rawStart : rawEnd
    const later = rawStart <= rawEnd ? rawEnd : rawStart
    start = earlier
    end = new Date(later.getFullYear(), later.getMonth(), later.getDate() + 1)
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

export function expenseCostForMonth(expense: FixedExpense, key: MonthKey): number {
  if (!isExpenseActiveInMonth(expense, key)) return 0
  if (expense.recurrence === 'monthly') return expense.amount
  if (expense.recurrence === 'yearly') return expense.amount / 12
  const start = parseDateOnly(expense.startDate)
  if (start.getFullYear() === key.year && start.getMonth() === key.month) return expense.amount
  return 0
}

export function fixedCostForMonth(expenses: FixedExpense[], key: MonthKey): number {
  return expenses.reduce((sum, expense) => sum + expenseCostForMonth(expense, key), 0)
}

export function fixedBreakdown(
  expenses: FixedExpense[],
  months: MonthKey[],
): Array<{ expense: FixedExpense; amount: number }> {
  return expenses
    .map((expense) => ({
      expense,
      amount: months.reduce((sum, month) => sum + expenseCostForMonth(expense, month), 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.expense.name.localeCompare(b.expense.name, 'zh-Hant'))
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

export function chargeKwhInRange(charges: ChargeSession[], range: PeriodRange): number {
  return chargesInRange(charges, range).reduce((sum, charge) => sum + charge.kWh, 0)
}

export function whPerKm(kWh: number, km: number | null): number | null {
  if (km == null || km <= 0) return null
  return (kWh * 1000) / km
}

export interface ProviderShare {
  provider: string
  count: number
  kWh: number
  cost: number
}

export interface HabitBand {
  id: string
  label: string
  count: number
  kWh: number
  cost: number
}

export interface ChargeLeg {
  km: number
  perKm: number
  whPerKm: number
  kmPerKwh: number
}

const HABIT_BANDS = [
  { id: 'night', label: '深夜 0–6', from: 0, to: 6 },
  { id: 'morning', label: '上午 6–12', from: 6, to: 12 },
  { id: 'afternoon', label: '下午 12–18', from: 12, to: 18 },
  { id: 'evening', label: '晚上 18–24', from: 18, to: 24 },
]

export function averageUnitPrice(charges: ChargeSession[]): number | null {
  const charged = charges.reduce((sum, charge) => sum + charge.kWh, 0)
  if (charged <= 0) return null
  const cost = charges.reduce((sum, charge) => sum + charge.costTwd, 0)
  return cost / charged
}

export const EVOASIS_RATES = [
  { id: 'night', label: '夜貓', rate: 5.31 },
  { id: 'offpeak', label: '離峰', rate: 5.85 },
  { id: 'holiday', label: '假日', rate: 6.3 },
] as const

export const EVOASIS_RATE_TOLERANCE = 0.15

function evoasisRoundingCap(): number {
  const rates = EVOASIS_RATES.map((item) => item.rate).sort((a, b) => a - b)
  let halfGap = Number.POSITIVE_INFINITY
  for (let index = 1; index < rates.length; index += 1) {
    halfGap = Math.min(halfGap, (rates[index] - rates[index - 1]) / 2)
  }
  return Math.max(EVOASIS_RATE_TOLERANCE, halfGap - 0.01)
}

export type EvoasisRateId = (typeof EVOASIS_RATES)[number]['id']

export interface EvoasisRateMatch {
  unitPrice: number | null
  rateId: EvoasisRateId | null
  label: string
  rate: number | null
  needsReview: boolean
}

export function evoasisRateMatch(
  charge: Pick<ChargeSession, 'provider' | 'kWh' | 'costTwd'>,
): EvoasisRateMatch | null {
  if (normalizeProvider(charge.provider) !== 'evoasis') return null
  if (!(charge.kWh > 0)) {
    return { unitPrice: null, rateId: null, label: '待確認', rate: null, needsReview: true }
  }
  const unitPrice = charge.costTwd / charge.kWh
  let nearest: (typeof EVOASIS_RATES)[number] = EVOASIS_RATES[0]
  let distance = Math.abs(unitPrice - nearest.rate)
  for (const candidate of EVOASIS_RATES) {
    const gap = Math.abs(unitPrice - candidate.rate)
    if (gap < distance) {
      nearest = candidate
      distance = gap
    }
  }
  const roundingSlack = Math.min(evoasisRoundingCap(), 0.5 / charge.kWh)
  const needsReview = distance > Math.max(EVOASIS_RATE_TOLERANCE, roundingSlack)
  return {
    unitPrice,
    rateId: nearest.id,
    label: nearest.label,
    rate: nearest.rate,
    needsReview,
  }
}

export function describeEvoasisRate(match: EvoasisRateMatch): string {
  if (match.needsReview) {
    if (match.unitPrice == null || match.rate == null) return '待確認'
    return `待確認 ${match.unitPrice.toFixed(2)} 元/度，最接近${match.label} ${match.rate.toFixed(2)}`
  }
  return `${match.label} ${match.rate?.toFixed(2)}`
}

export interface EvoasisRateBucket {
  id: EvoasisRateId
  label: string
  rate: number
  count: number
  kWh: number
  cost: number
  km: number
  perKm: number | null
}

export interface EvoasisRateReview {
  charge: ChargeSession
  match: EvoasisRateMatch
}

export function evoasisRateReport(
  charges: ChargeSession[],
  legs: Map<string, ChargeLeg>,
): { buckets: EvoasisRateBucket[]; reviews: EvoasisRateReview[] } {
  const buckets: EvoasisRateBucket[] = EVOASIS_RATES.map((rate) => ({
    id: rate.id,
    label: rate.label,
    rate: rate.rate,
    count: 0,
    kWh: 0,
    cost: 0,
    km: 0,
    perKm: null,
  }))
  const legCost = new Map<EvoasisRateId, number>()
  const reviews: EvoasisRateReview[] = []
  for (const charge of charges) {
    const match = evoasisRateMatch(charge)
    if (!match) continue
    if (match.needsReview || !match.rateId) {
      reviews.push({ charge, match })
      continue
    }
    const bucket = buckets.find((row) => row.id === match.rateId)
    if (!bucket) continue
    bucket.count += 1
    bucket.kWh += charge.kWh
    bucket.cost += charge.costTwd
    const leg = legs.get(charge.id)
    if (leg) {
      bucket.km += leg.km
      legCost.set(match.rateId, (legCost.get(match.rateId) ?? 0) + charge.costTwd)
    }
  }
  for (const bucket of buckets) {
    const cost = legCost.get(bucket.id) ?? 0
    bucket.perKm = bucket.km > 0 ? cost / bucket.km : null
  }
  return { buckets, reviews }
}

export function providerShares(charges: ChargeSession[]): ProviderShare[] {
  const rows = new Map<string, ProviderShare>()
  for (const charge of charges) {
    const row = rows.get(charge.provider) ?? { provider: charge.provider, count: 0, kWh: 0, cost: 0 }
    row.count += 1
    row.kWh += charge.kWh
    row.cost += charge.costTwd
    rows.set(charge.provider, row)
  }
  return [...rows.values()].sort((a, b) => b.cost - a.cost || b.kWh - a.kWh)
}

export function chargingHabits(charges: ChargeSession[]): {
  bands: HabitBand[]
  weekday: number
  weekend: number
} {
  const bands: HabitBand[] = HABIT_BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    count: 0,
    kWh: 0,
    cost: 0,
  }))
  let weekday = 0
  let weekend = 0
  for (const charge of charges) {
    const at = new Date(charge.chargedAt)
    const hour = at.getHours()
    const band = bands.find((_, index) => hour >= HABIT_BANDS[index].from && hour < HABIT_BANDS[index].to)
    const target = band ?? bands[bands.length - 1]
    target.count += 1
    target.kWh += charge.kWh
    target.cost += charge.costTwd
    const day = at.getDay()
    if (day === 0 || day === 6) weekend += 1
    else weekday += 1
  }
  return { bands, weekday, weekend }
}

export function chargeLegs(charges: ChargeSession[]): Map<string, ChargeLeg> {
  const sorted = charges
    .filter((charge) => charge.odometerKm != null)
    .slice()
    .sort((a, b) => new Date(a.chargedAt).getTime() - new Date(b.chargedAt).getTime())
  const legs = new Map<string, ChargeLeg>()
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    const driven = (current.odometerKm as number) - (previous.odometerKm as number)
    if (driven <= 0 || current.kWh <= 0) continue
    legs.set(current.id, {
      km: driven,
      perKm: current.costTwd / driven,
      whPerKm: (current.kWh * 1000) / driven,
      kmPerKwh: driven / current.kWh,
    })
  }
  return legs
}

export type ChargeTrendMetric = 'unit' | 'perKm' | 'wh'

export const CHARGE_TREND_METRICS: { id: ChargeTrendMetric; label: string; unit: string }[] = [
  { id: 'unit', label: '單價', unit: '元/度' },
  { id: 'perKm', label: '每公里電費', unit: '元/km' },
  { id: 'wh', label: '每公里電耗', unit: 'Wh/km' },
]

export interface ChargeTrendPoint {
  id: string
  at: string
  label: string
  value: number
  weight: number
  outlier: boolean
  reason: string
}

export function chargeTrendAverage(points: ChargeTrendPoint[], includeOutliers: boolean): number | null {
  const used = includeOutliers ? points : points.filter((point) => !point.outlier)
  const weight = used.reduce((sum, point) => sum + point.weight, 0)
  if (!(weight > 0)) return null
  return used.reduce((sum, point) => sum + point.value * point.weight, 0) / weight
}

function quartile(sorted: number[], portion: number): number {
  if (sorted.length === 0) return 0
  const index = (sorted.length - 1) * portion
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function iqrOutlierFlags(values: number[]): boolean[] {
  const flags = values.map(() => false)
  if (values.length < 4) return flags
  const sorted = values.slice().sort((a, b) => a - b)
  const q1 = quartile(sorted, 0.25)
  const q3 = quartile(sorted, 0.75)
  const span = q3 - q1
  const low = q1 - span * 1.5
  const high = q3 + span * 1.5
  values.forEach((value, index) => {
    if (value < low || value > high) flags[index] = true
  })
  return flags
}

function trendLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function chargeTrend(
  charges: ChargeSession[],
  legs: Map<string, ChargeLeg>,
  metric: ChargeTrendMetric,
): ChargeTrendPoint[] {
  const ordered = charges
    .slice()
    .sort((a, b) => new Date(a.chargedAt).getTime() - new Date(b.chargedAt).getTime())
  const drafted: Array<Omit<ChargeTrendPoint, 'outlier' | 'reason'> & { tariffOff: boolean }> = []
  for (const charge of ordered) {
    if (metric === 'unit') {
      if (!(charge.kWh > 0)) continue
      drafted.push({
        id: charge.id,
        at: charge.chargedAt,
        label: trendLabel(charge.chargedAt),
        value: charge.costTwd / charge.kWh,
        weight: charge.kWh,
        tariffOff: evoasisRateMatch(charge)?.needsReview ?? false,
      })
      continue
    }
    const leg = legs.get(charge.id)
    if (!leg) continue
    drafted.push({
      id: charge.id,
      at: charge.chargedAt,
      label: trendLabel(charge.chargedAt),
      value: metric === 'perKm' ? leg.perKm : leg.whPerKm,
      weight: leg.km,
      tariffOff: false,
    })
  }
  const flags = iqrOutlierFlags(drafted.map((point) => point.value))
  return drafted.map((point, index) => {
    const spread = flags[index]
    const outlier = point.tariffOff || spread
    const reason = point.tariffOff ? '對不上夜貓、離峰或假日' : spread ? '偏離這批紀錄的常見範圍' : ''
    return {
      id: point.id,
      at: point.at,
      label: point.label,
      value: point.value,
      weight: point.weight,
      outlier,
      reason,
    }
  })
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
  custom?: { start: string; end: string },
): CostBreakdown {
  const range = periodRange(key, now, vehicle.purchaseDate, custom)
  const months = monthsInRange(range.start, range.end)
  const amortEach = monthlyAmortization(vehicle)
  const amort = amortEach * months.length
  const fixed =
    months.reduce((sum, month) => sum + fixedCostForMonth(expenses, month), 0) +
    loanInterestForMonths(vehicle, months)
  const charge = chargeCostInRange(charges, range)
  const chargedKwh = chargeKwhInRange(charges, range)
  const total = amort + fixed + charge
  const km = kmInRange(vehicle, charges, range)
  const operating = fixed + charge
  return {
    amort,
    fixed,
    charge,
    total,
    km,
    perKm: km ? operating / km : null,
    perKmWithPurchase: km ? total / km : null,
    kWh: chargedKwh,
    whPerKm: whPerKm(chargedKwh, km),
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
    const fixed = owned
      ? fixedCostForMonth(expenses, key) + loanInterestForMonth(vehicle, key)
      : 0
    const charge = chargeCostInRange(charges, range)
    const chargedKwh = chargeKwhInRange(charges, range)
    const total = amort + fixed + charge
    const km = kmInRange(vehicle, charges, range)
    const operating = fixed + charge
    series.push({
      ...key,
      amort,
      fixed,
      charge,
      total,
      km,
      perKm: km ? operating / km : null,
      perKmWithPurchase: km ? total / km : null,
      kWh: chargedKwh,
      whPerKm: whPerKm(chargedKwh, km),
      months: 1,
      label: `${key.month + 1}月`,
    })
  }
  return series
}

export function ownershipCostTrend(
  vehicle: Vehicle,
  expenses: FixedExpense[],
  charges: ChargeSession[],
  now = new Date(),
): ChargeTrendPoint[] {
  const purchased = parseDateOnly(vehicle.purchaseDate)
  const start = new Date(purchased.getFullYear(), purchased.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const drafted: Array<Omit<ChargeTrendPoint, 'outlier' | 'reason'>> = []
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const key = { year: cursor.getFullYear(), month: cursor.getMonth() }
    const range = {
      start: new Date(key.year, key.month, 1),
      end: new Date(key.year, key.month + 1, 1),
    }
    const total =
      monthlyAmortization(vehicle) +
      fixedCostForMonth(expenses, key) +
      loanInterestForMonth(vehicle, key) +
      chargeCostInRange(charges, range)
    drafted.push({
      id: `${key.year}-${key.month}`,
      at: range.start.toISOString(),
      label: `${String(key.year).slice(2)}/${key.month + 1}`,
      value: total,
      weight: 1,
    })
  }
  const flags = iqrOutlierFlags(drafted.map((point) => point.value))
  return drafted.map((point, index) => ({
    ...point,
    outlier: flags[index],
    reason: flags[index] ? '偏離這批月份的常見範圍' : '',
  }))
}

export function homeChargeAmount(kWh: number, rate: number): number {
  return Math.round(kWh * rate * 100) / 100
}

export interface LoanInstallment {
  index: number
  year: number
  month: number
  interest: number
  principal: number
  balance: number
}

export interface LoanPlan {
  monthlyRate: number
  annualRate: number
  totalInterest: number
  rows: LoanInstallment[]
}

export interface LoanOwnershipSplit {
  ownedMonths: number
  ownedInterest: number
  ownedPrincipal: number
  monthlyBurden: number
  monthlyInterest: number
  monthlyPrincipal: number
  remainingMonths: number
  remainingPrincipal: number
  remainingInterest: number
  remainingTotal: number
}

function annuityPayment(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const growth = (1 + monthlyRate) ** months
  return (principal * monthlyRate * growth) / (growth - 1)
}

export function solveMonthlyRate(principal: number, payment: number, months: number): number | null {
  if (principal <= 0 || payment <= 0 || months <= 0) return null
  const interestOnly = principal / months
  if (payment + 0.5 < interestOnly) return null
  if (Math.abs(payment - interestOnly) < 0.5) return 0
  let low = 0
  let high = 0.2
  if (annuityPayment(principal, high, months) < payment) return null
  for (let step = 0; step < 80; step += 1) {
    const mid = (low + high) / 2
    if (annuityPayment(principal, mid, months) > payment) high = mid
    else low = mid
  }
  return (low + high) / 2
}

export function loanPlan(
  amount: number,
  months: number,
  payment: number,
  startDate: string,
): LoanPlan | null {
  const monthlyRate = solveMonthlyRate(amount, payment, months)
  if (monthlyRate == null || !startDate) return null
  const start = parseDateOnly(startDate)
  let balance = amount
  const rows: LoanInstallment[] = []
  let totalInterest = 0
  for (let index = 0; index < months; index += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + index, 1)
    const interest = Math.round(balance * monthlyRate)
    const principalPaid = index === months - 1 ? Math.round(balance) : Math.round(payment - interest)
    balance = Math.max(0, Math.round((balance - principalPaid) * 100) / 100)
    totalInterest += interest
    rows.push({
      index,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      interest,
      principal: principalPaid,
      balance,
    })
  }
  return { monthlyRate, annualRate: monthlyRate * 12, totalInterest, rows }
}

export function vehicleLoanPlan(vehicle: Vehicle): LoanPlan | null {
  if (!vehicle.loanAmount || !vehicle.loanMonths || !vehicle.loanPayment || !vehicle.loanStartDate) {
    return null
  }
  return loanPlan(vehicle.loanAmount, vehicle.loanMonths, vehicle.loanPayment, vehicle.loanStartDate)
}

export function ownershipMonthCount(ownershipYears: number): number {
  return Math.max(0, Math.round((Number(ownershipYears) || 0) * 12))
}

export function loanOwnershipSplit(plan: LoanPlan, ownershipMonths: number): LoanOwnershipSplit {
  const ownedCount = Math.max(0, Math.min(plan.rows.length, Math.round(ownershipMonths)))
  const owned = plan.rows.slice(0, ownedCount)
  const rest = plan.rows.slice(ownedCount)
  const ownedInterest = owned.reduce((sum, row) => sum + row.interest, 0)
  const ownedPrincipal = owned.reduce((sum, row) => sum + row.principal, 0)
  const remainingInterest = rest.reduce((sum, row) => sum + row.interest, 0)
  const remainingPrincipal = rest.reduce((sum, row) => sum + row.principal, 0)
  const months = owned.length
  return {
    ownedMonths: months,
    ownedInterest,
    ownedPrincipal,
    monthlyBurden: months ? Math.round((ownedInterest + ownedPrincipal) / months) : 0,
    monthlyInterest: months ? ownedInterest / months : 0,
    monthlyPrincipal: months ? ownedPrincipal / months : 0,
    remainingMonths: rest.length,
    remainingPrincipal,
    remainingInterest,
    remainingTotal: remainingPrincipal + remainingInterest,
  }
}

export function loanInterestForMonth(vehicle: Vehicle, key: MonthKey): number {
  const plan = vehicleLoanPlan(vehicle)
  if (!plan) return 0
  const row = plan.rows.find((item) => item.year === key.year && item.month === key.month)
  if (!row) return 0
  const ownedMonths = ownershipMonthCount(vehicle.ownershipYears)
  if (ownedMonths > 0 && row.index >= ownedMonths) return 0
  return row.interest
}

export function loanInterestForMonths(vehicle: Vehicle, months: MonthKey[]): number {
  return months.reduce((sum, month) => sum + loanInterestForMonth(vehicle, month), 0)
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}
