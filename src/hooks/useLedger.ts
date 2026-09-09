import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  deleteChargeCloud,
  deleteExpenseCloud,
  ensureCloudVehicle,
  listChargesCloud,
  listExpensesCloud,
  saveChargeCloud,
  saveExpenseCloud,
  saveVehicleCloud,
  explainCloudError,
} from '../lib/cloud'
import { migrateLocalIfNeeded } from '../lib/migrate'
import type { ChargeSession, FixedExpense, Vehicle } from '../types'

export function useLedger() {
  const { user } = useAuth()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [charges, setCharges] = useState<ChargeSession[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migrated, setMigrated] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setVehicle(null)
      setExpenses([])
      setCharges([])
      setReady(false)
      return
    }
    const nextVehicle = await ensureCloudVehicle(user.uid)
    const nextExpenses = await listExpensesCloud(user.uid)
    const nextCharges = await listChargesCloud(user.uid)
    setVehicle(nextVehicle)
    setExpenses(nextExpenses)
    setCharges(nextCharges)
    setReady(true)
  }, [user])

  useEffect(() => {
    if (!user) {
      setReady(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const didMigrate = await migrateLocalIfNeeded(user.uid)
        if (!cancelled && didMigrate) setMigrated(true)
        await refresh()
      } catch (err: unknown) {
        if (!cancelled) setError(explainCloudError(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, refresh])

  const updateVehicle = useCallback(
    async (next: Vehicle) => {
      if (!user) return
      await saveVehicleCloud(user.uid, next)
      setVehicle(next)
    },
    [user],
  )

  const upsertExpense = useCallback(
    async (expense: FixedExpense) => {
      if (!user) return
      await saveExpenseCloud(user.uid, expense)
      await refresh()
    },
    [user, refresh],
  )

  const removeExpense = useCallback(
    async (id: string) => {
      if (!user) return
      await deleteExpenseCloud(user.uid, id)
      await refresh()
    },
    [user, refresh],
  )

  const upsertCharge = useCallback(
    async (charge: ChargeSession) => {
      if (!user) return
      await saveChargeCloud(user.uid, charge)
      await refresh()
    },
    [user, refresh],
  )

  const removeCharge = useCallback(
    async (id: string) => {
      if (!user) return
      await deleteChargeCloud(user.uid, id)
      await refresh()
    },
    [user, refresh],
  )

  return {
    vehicle,
    expenses,
    charges,
    ready,
    error,
    migrated,
    refresh,
    updateVehicle,
    upsertExpense,
    removeExpense,
    upsertCharge,
    removeCharge,
  }
}
