import { useRef, useState } from 'react'
import { useLedger } from '../hooks/useLedger'
import { exportLedger, importLedger } from '../lib/backup'

export function BackupPage() {
  const { vehicle, expenses, charges, ready, refresh } = useLedger()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    if (!vehicle) return
    await exportLedger(vehicle, expenses, charges)
    setMessage('已下載 JSON。把它存進雲端硬碟，換手機或清瀏覽器後再匯入。')
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      await importLedger(file)
      await refresh()
      setMessage('已用備份覆寫這台瀏覽器的帳本。')
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
        <h2>帳本在瀏覽器裡</h2>
        <p className="lede">
          花費資料不會上傳到網站。換裝置或清資料前，把 JSON 存到雲端硬碟。
        </p>
      </section>

      <section className="panel">
        <h3>匯出</h3>
        <p className="lede">
          下載完整帳本，包含充電單照片。建議檔名維持「豆灰仔帳本」，放到現有的專案備份資料夾即可。
        </p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => void handleExport()} disabled={!ready}>
            下載 JSON 備份
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>匯入</h3>
        <p className="lede">匯入會覆寫這台瀏覽器目前的資料。先匯出一份再操作比較安心。</p>
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

      <section className="panel muted">
        <h3>部署到網路上之後</h3>
        <ol className="steps">
          <li>用同一個網址開啟，這台裝置的帳才會還在。</li>
          <li>手機要掃充電單，請開部署後的 HTTPS 網址，不要用雲端硬碟預覽。</li>
          <li>換瀏覽器時，從雲端硬碟拿 JSON 匯入。</li>
        </ol>
      </section>
    </div>
  )
}
