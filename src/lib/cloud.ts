import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  setDoc,
} from 'firebase/firestore'
import { defaultVehicle } from '../db'
import { VEHICLE_ID, type ChargeSession, type FixedExpense, type Vehicle } from '../types'
import { cloudDb } from './firebase'

export function explainCloudError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/offline|unavailable|Failed to get document/i.test(message)) {
    return '連不上雲端帳本。請到 Firebase 建立 Firestore 資料庫，規則貼上 firestore.rules，然後重新整理。'
  }
  if (/permission/i.test(message)) {
    return '雲端帳本權限不足。請把專案裡的 firestore.rules 貼到 Firebase。'
  }
  return message
}

function requireCloud() {
  if (!cloudDb) throw new Error('尚未設定雲端帳本')
  return cloudDb
}

function vehicleRef(uid: string) {
  return doc(requireCloud(), 'users', uid, 'vehicle', VEHICLE_ID)
}

function expenseRef(uid: string, id: string) {
  return doc(requireCloud(), 'users', uid, 'expenses', id)
}

function chargeRef(uid: string, id: string) {
  return doc(requireCloud(), 'users', uid, 'charges', id)
}

function compact<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined),
  ) as T
}

export async function hasCloudLedger(uid: string): Promise<boolean> {
  const snap = await getDocFromServer(vehicleRef(uid))
  return snap.exists()
}

export async function loadVehicle(uid: string): Promise<Vehicle | null> {
  const snap = await getDocFromServer(vehicleRef(uid))
  return snap.exists() ? (snap.data() as Vehicle) : null
}

export async function saveVehicleCloud(uid: string, vehicle: Vehicle): Promise<void> {
  await setDoc(vehicleRef(uid), compact({ ...vehicle }))
}

export async function listExpensesCloud(uid: string): Promise<FixedExpense[]> {
  const snap = await getDocs(collection(requireCloud(), 'users', uid, 'expenses'))
  return snap.docs
    .map((row) => row.data() as FixedExpense)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function saveExpenseCloud(uid: string, expense: FixedExpense): Promise<void> {
  await setDoc(expenseRef(uid, expense.id), compact({ ...expense }))
}

export async function deleteExpenseCloud(uid: string, id: string): Promise<void> {
  await deleteDoc(expenseRef(uid, id))
}

export async function listChargesCloud(uid: string): Promise<ChargeSession[]> {
  const snap = await getDocs(collection(requireCloud(), 'users', uid, 'charges'))
  return snap.docs
    .map((row) => row.data() as ChargeSession)
    .sort((a, b) => b.chargedAt.localeCompare(a.chargedAt))
}

export async function saveChargeCloud(uid: string, charge: ChargeSession): Promise<void> {
  await setDoc(
    chargeRef(uid, charge.id),
    compact({
      id: charge.id,
      chargedAt: charge.chargedAt,
      provider: charge.provider,
      location: charge.location,
      kWh: charge.kWh,
      costTwd: charge.costTwd,
      odometerKm: charge.odometerKm,
      source: charge.source,
      ocrRawText: charge.ocrRawText,
      createdAt: charge.createdAt,
    }),
  )
}

export async function deleteChargeCloud(uid: string, id: string): Promise<void> {
  await deleteDoc(chargeRef(uid, id))
}

export async function replaceAllCloud(
  uid: string,
  data: { vehicle: Vehicle; expenses: FixedExpense[]; charges: ChargeSession[] },
): Promise<void> {
  const existingExpenses = await listExpensesCloud(uid)
  const existingCharges = await listChargesCloud(uid)
  await Promise.all(existingExpenses.map((row) => deleteExpenseCloud(uid, row.id)))
  await Promise.all(existingCharges.map((row) => deleteChargeCloud(uid, row.id)))
  await saveVehicleCloud(uid, data.vehicle)
  await Promise.all(data.expenses.map((row) => saveExpenseCloud(uid, row)))
  await Promise.all(data.charges.map((row) => saveChargeCloud(uid, row)))
}

export async function ensureCloudVehicle(uid: string): Promise<Vehicle> {
  const existing = await loadVehicle(uid)
  if (existing) return existing
  const seeded = defaultVehicle()
  await saveVehicleCloud(uid, seeded)
  return seeded
}
