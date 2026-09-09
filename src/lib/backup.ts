import { replaceAllCloud } from './cloud'
import type { ChargeSession, FixedExpense, Vehicle } from '../types'

const BACKUP_VERSION = 1

interface BackupFile {
  version: number
  exportedAt: string
  vehicle: Vehicle
  expenses: FixedExpense[]
  charges: Array<Omit<ChargeSession, 'photoBlob'> & { photoDataUrl?: string }>
}

export async function exportLedger(
  vehicle: Vehicle,
  expenses: FixedExpense[],
  charges: ChargeSession[],
): Promise<void> {
  const rows = await Promise.all(
    charges.map(async (charge) => {
      const { photoBlob, ...rest } = charge
      return {
        ...rest,
        photoDataUrl: photoBlob ? await blobToDataUrl(photoBlob) : undefined,
      }
    }),
  )
  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    vehicle,
    expenses,
    charges: rows,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `豆灰仔帳本-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function importLedger(file: File, uid: string): Promise<void> {
  const parsed = JSON.parse(await file.text()) as BackupFile
  if (!parsed?.vehicle || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.charges)) {
    throw new Error('這個檔不是豆灰仔帳本備份')
  }
  const charges: ChargeSession[] = await Promise.all(
    parsed.charges.map(async (row) => {
      const { photoDataUrl, ...rest } = row
      return {
        ...rest,
        photoBlob: photoDataUrl ? await dataUrlToBlob(photoDataUrl) : undefined,
      }
    }),
  )
  await replaceAllCloud(uid, {
    vehicle: parsed.vehicle,
    expenses: parsed.expenses,
    charges,
  })
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return await response.blob()
}
