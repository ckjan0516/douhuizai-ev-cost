import { peekLocalLedger } from '../db'
import { ensureCloudVehicle, hasCloudLedger, replaceAllCloud } from './cloud'

export async function migrateLocalIfNeeded(uid: string): Promise<boolean> {
  if (await hasCloudLedger(uid)) return false
  const local = await peekLocalLedger()
  if (local.meaningful && local.vehicle) {
    await replaceAllCloud(uid, {
      vehicle: local.vehicle,
      expenses: local.expenses,
      charges: local.charges,
    })
    return true
  }
  await ensureCloudVehicle(uid)
  return false
}
