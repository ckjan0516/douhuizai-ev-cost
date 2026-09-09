import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export function SignIn() {
  const { configured, signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!configured) {
    return (
      <section className="gate">
        <p className="eyebrow">行程電腦</p>
        <h2>還沒接上 Google</h2>
        <p className="lede">
          網站程式已準備好，但雲端帳本還沒設定完成。設定好之後，同一支 Google 帳號在手機和電腦都會看到同一本帳。
        </p>
      </section>
    )
  }

  async function handleSignIn() {
    setBusy(true)
    setError(null)
    try {
      await signIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗')
      setBusy(false)
    }
  }

  return (
    <section className="gate">
      <p className="eyebrow">行程電腦</p>
      <h2>用 Google 打開帳本</h2>
      <p className="lede">
        登入後，購置、固定支出和充電紀錄會跟著這支 Google 帳號走。換手機只要再登入一次。
      </p>
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => void handleSignIn()} disabled={busy}>
          {busy ? '正在登入…' : '使用 Google 登入'}
        </button>
      </div>
      {error ? <p className="alert">{error}</p> : null}
    </section>
  )
}
