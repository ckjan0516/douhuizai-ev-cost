import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useLedger } from '../hooks/useLedger'
import { exportLedger, importLedger } from '../lib/backup'

export function BackupPage() {
  const { user } = useAuth()
  const { vehicle, expenses, charges, ready, refresh } = useLedger()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    if (!vehicle) return
    await exportLedger(vehicle, expenses, charges)
    setMessage('已下載 JSON，可另外存進雲端硬碟。日常換手機只要再 Google 登入即可。')
  }

  async function handleImport(file: File | undefined) {
    if (!file || !user) return
    setBusy(true)
    setMessage(null)
    try {
      await importLedger(file, user.uid)
      await refresh()
      setMessage('已用備份覆寫這支 Google 帳號的雲端帳本。')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '匯入失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="page-lead">
        <p className="eyebrow">備份</p>
        <h2>帳本跟著 Google 帳號</h2>
        <p className="lede">
          你現在看到的資料存在雲端，同一支 Google 帳號在其他裝置登入就會看到同一本帳。JSON
          是額外備份，不是日常同步方式。
        </p>
      </section>

      <section className="panel">
        <h3>匯出</h3>
        <p className="lede">下載完整帳本，包含充電單照片，方便自己再存一份。</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => void handleExport()} disabled={!ready}>
            下載 JSON 備份
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>匯入</h3>
        <p className="lede">匯入會覆寫這支 Google 帳號目前的雲端資料。先匯出一份再操作比較安心。</p>
        <div className="actions">
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? '匯入中…' : '選擇備份檔'}
          </button>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
      </section>

      {message ? <p className="fine">{message}</p> : null}
    </div>
  )
}
