import { nowDateTimeLocal } from './ids'
import type { ChargeDraft, ChargeProvider } from '../types'

export interface OcrProgress {
  status: string
  progress: number
}

export async function recognizeReceipt(
  image: Blob | File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<{ text: string; draft: Partial<ChargeDraft> }> {
  const prepared = await prepareImage(image)
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('chi_tra+eng', 1, {
    logger: (message) => {
      if (!onProgress) return
      onProgress({
        status: String(message.status ?? '辨識中'),
        progress: typeof message.progress === 'number' ? message.progress : 0,
      })
    },
  })
  try {
    const { data } = await worker.recognize(prepared)
    return { text: data.text, draft: parseReceiptText(data.text) }
  } finally {
    await worker.terminate()
  }
}

export function parseReceiptText(text: string): Partial<ChargeDraft> {
  const compact = text.replace(/,/g, '')
  const draft: Partial<ChargeDraft> = {
    source: 'ocr',
    ocrRawText: text,
    chargedAt: nowDateTimeLocal(),
    provider: guessProvider(text),
    location: guessLocation(text),
  }

  const kwh = compact.match(/(\d+(?:\.\d+)?)\s*(?:k\s*w\s*h|kwh|度)/i)
  if (kwh) draft.kWh = kwh[1]

  const money = compact.match(
    /(?:NT\$|TWD|＄|\$)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:元|塊)/i,
  )
  if (money) draft.costTwd = money[1] ?? money[2]

  const when = text.match(
    /(\d{4}[/.年-]\d{1,2}[/.月-]\d{1,2})[日]?\s*[T ]?(\d{1,2}[:：]\d{2})?/,
  )
  if (when) {
    const date = when[1].replace(/[年/.]/g, '-').replace(/月/g, '-').replace(/日/g, '')
    const [y, m, d] = date.split('-')
    const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const time = (when[2] ?? '12:00').replace('：', ':')
    draft.chargedAt = `${isoDate}T${time}`
  }

  return draft
}

async function prepareImage(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  const max = 1600
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return image
  ctx.drawImage(bitmap, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11
    const next = gray > 150 ? 255 : gray < 80 ? 0 : gray
    data[i] = next
    data[i + 1] = next
    data[i + 2] = next
  }
  ctx.putImageData(imageData, 0, 0)
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? image), 'image/jpeg', 0.92)
  })
}

function guessProvider(text: string): ChargeProvider {
  if (/tesla|supercharger/i.test(text)) return 'tesla'
  if (/chargespot/i.test(text)) return 'chargespot'
  if (/u-?power/i.test(text)) return 'upower'
  if (/中油|cpc/i.test(text)) return 'cpc'
  if (/家充|台電|住家|住家充電/i.test(text)) return 'home'
  return 'other'
}

function guessLocation(text: string): string {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2 && /[\u4e00-\u9fffA-Za-z]/.test(line))
  const hint = lines.find((line) =>
    /站|超充|商場|休息|服務區|Park|Mall|充電/.test(line),
  )
  return hint ?? ''
}
