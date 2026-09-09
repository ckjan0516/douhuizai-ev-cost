import Dexie, { type Table } from 'dexie'
import { todayISO, uid } from './lib/ids'
import { VEHICLE_ID, type ChargeSession, type FixedExpense, type Vehicle } from './types'

class LedgerDB extends Dexie {
  vehicle!: Table<Vehicle, string>
  expenses!: Table<FixedExpense, string>
  charges!: Table<ChargeSession, string>

  constructor() {
    super('douhuizai-ledger')
    this.version(1).stores({
      vehicle: 'id',
      expenses: 'id, startDate, category',
      charges: 'id, chargedAt, provider',
    })
  }
}

export const db = new LedgerDB()

export function defaultVehicle(): Vehicle {
  return {
    id: VEHICLE_ID,
    nickname: '豆灰仔',
    model: '',
    purchaseDate: todayISO(),
    purchaseItems: [{ id: uid(), name: '車價', amount: 0 }],
    ownershipYears: 8,
    residualValue: 0,
    startOdometer: 0,
    electricityRateHome: 3.5,
  }
}

export async function ensureVehicle(): Promise<Vehicle> {
  const existing = await db.vehicle.get(VEHICLE_ID)
  if (existing) return existing
  const seeded = defaultVehicle()
  await db.vehicle.put(seeded)
  return seeded
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  await db.vehicle.put(vehicle)
}

export async function listExpenses(): Promise<FixedExpense[]> {
  const rows = await db.expenses.toArray()
  return rows.sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function saveExpense(expense: FixedExpense): Promise<void> {
  await db.expenses.put(expense)
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
}

export async function listCharges(): Promise<ChargeSession[]> {
  const rows = await db.charges.toArray()
  return rows.sort((a, b) => b.chargedAt.localeCompare(a.chargedAt))
}

export async function saveCharge(charge: ChargeSession): Promise<void> {
  await db.charges.put(charge)
}

export async function deleteCharge(id: string): Promise<void> {
  await db.charges.delete(id)
}

export async function peekLocalLedger(): Promise<{
  vehicle: Vehicle | undefined
  expenses: FixedExpense[]
  charges: ChargeSession[]
  meaningful: boolean
}> {
  const vehicle = await db.vehicle.get(VEHICLE_ID)
  const expenses = await db.expenses.toArray()
  const charges = await db.charges.toArray()
  const meaningful = Boolean(
    vehicle?.model ||
      vehicle?.purchaseItems.some((item) => item.amount > 0) ||
      expenses.length ||
      charges.length,
  )
  return { vehicle, expenses, charges, meaningful }
}

export async function replaceAll(data: {
  vehicle: Vehicle
  expenses: FixedExpense[]
  charges: ChargeSession[]
}): Promise<void> {
  await db.transaction('rw', db.vehicle, db.expenses, db.charges, async () => {
    await db.vehicle.clear()
    await db.expenses.clear()
    await db.charges.clear()
    await db.vehicle.put(data.vehicle)
    if (data.expenses.length) await db.expenses.bulkPut(data.expenses)
    if (data.charges.length) await db.charges.bulkPut(data.charges)
  })
}
