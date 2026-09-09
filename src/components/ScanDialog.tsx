import { useRef, useState } from 'react'
import { recognizeReceipt } from '../lib/ocr'
import { nowDateTimeLocal } from '../lib/ids'
import { emptyDraft } from './ChargeForm'
import type { ChargeDraft } from '../types'

interface ScanDialogProps {
  open: boolean
  onClose: () => void
  onDraft: (draft: ChargeDraft) => void
}

export function ScanDialog({ open, onClose, onDraft }: ScanDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('選一張充電單或現場拍照')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setStatus('正在讀圖…')
    setProgress(0.05)
    try {
      const { text, draft } = await recognizeReceipt(file, (tick) => {
        setStatus(statusLabel(tick.status))
        setProgress(Math.max(0.05, tick.progress))
      })
      onDraft({
        ...emptyDraft(),
        ...draft,
        chargedAt: draft.chargedAt ?? nowDateTimeLocal(),
        provider: draft.provider ?? 'other',
        location: draft.location ?? '',
        kWh: draft.kWh ?? '',
        costTwd: draft.costTwd ?? '',
        source: 'ocr',
        photoBlob: file,
        ocrRawText: text,
      })
      onClose()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '辨識失敗，改手打即可')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-labelledby="scan-title" onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">充電單</p>
        <h2 id="scan-title">掃描入帳</h2>
        <p className="lede">拍螢幕或紙本充電紀錄，只用來抽出金額與度數。確認後只存數字，不存照片。</p>
        <div className="scan-meter" aria-hidden="true">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="fine">{status}</p>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            關閉
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? '辨識中…' : '拍照或選圖'}
          </button>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  )
}

function statusLabel(status: string): string {
  if (status.includes('download') || status.includes('load')) return '下載辨識模型（第一次會久一點）'
  if (status.includes('recognize') || status.includes('recognizing')) return '正在讀充電單'
  return '辨識中'
}
