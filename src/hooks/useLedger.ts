import { useCallback, useEffect, useState } from 'react'
import {
  deleteCharge,
  deleteExpense,
  ensureVehicle,
  listCharges,
  listExpenses,
  saveCharge,
  saveExpense,
  saveVehicle,
} from '../db'
import type { ChargeSession, FixedExpense, Vehicle } from '../types'

export function useLedger() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [charges, setCharges] = useState<ChargeSession[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const nextVehicle = await ensureVehicle()
    const nextExpenses = await listExpenses()
    const nextCharges = await listCharges()
    setVehicle(nextVehicle)
    setExpenses(nextExpenses)
    setCharges(nextCharges)
    setReady(true)
  }, [])

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : '讀取帳本失敗')
    })
  }, [refresh])

  const updateVehicle = useCallback(async (next: Vehicle) => {
    await saveVehicle(next)
    setVehicle(next)
  }, [])

  const upsertExpense = useCallback(async (expense: FixedExpense) => {
    await saveExpense(expense)
    await refresh()
  }, [refresh])

  const removeExpense = useCallback(async (id: string) => {
    await deleteExpense(id)
    await refresh()
  }, [refresh])

  const upsertCharge = useCallback(async (charge: ChargeSession) => {
    await saveCharge(charge)
    await refresh()
  }, [refresh])

  const removeCharge = useCallback(async (id: string) => {
    await deleteCharge(id)
    await refresh()
  }, [refresh])

  return {
    vehicle,
    expenses,
    charges,
    ready,
    error,
    refresh,
    updateVehicle,
    upsertExpense,
    removeExpense,
    upsertCharge,
    removeCharge,
  }
}
