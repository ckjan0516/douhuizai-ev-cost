import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export function SignIn() {
  const { configured, denied, signIn } = useAuth()
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
        只有白名單裡的 Google 帳號能打開帳本。手機請用 Chrome 開啟這個網址，不要從 Line、Facebook
        或 Instagram 裡面的瀏覽器登入。
      </p>
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => void handleSignIn()} disabled={busy}>
          {busy ? '正在登入…' : '使用 Google 登入'}
        </button>
      </div>
      {denied ? <p className="alert">這個 Google 帳號不在白名單。若要使用，把信箱告訴我再加進去。</p> : null}
      {error ? <p className="alert">{error}</p> : null}
    </section>
  )
}
