import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isAllowedEmail } from '../lib/allowlist'
import { auth, isFirebaseConfigured } from '../lib/firebase'

interface AuthState {
  user: User | null
  ready: boolean
  configured: boolean
  denied: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!auth) {
      setReady(true)
      return
    }
    const current = auth
    let unsub = () => {}
    void getRedirectResult(current)
      .catch(() => undefined)
      .finally(() => {
        unsub = onAuthStateChanged(current, (next) => {
          if (next && !isAllowedEmail(next.email)) {
            setDenied(true)
            setUser(null)
            void signOut(current)
            setReady(true)
            return
          }
          if (next) setDenied(false)
          setUser(next)
          setReady(true)
        })
      })
    return () => unsub()
  }, [])

  async function signIn() {
    if (!auth) throw new Error('尚未設定 Google 登入')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider, browserPopupRedirectResolver)
    } catch (err) {
      const code = errorCode(err)
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider)
        return
      }
      throw new Error(explainAuthError(err))
    }
  }

  async function signOutUser() {
    if (auth) await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        configured: isFirebaseConfigured(),
        denied,
        signIn,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 需要放在 AuthProvider 裡')
  return ctx
}

function errorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) return String(err.code)
  return ''
}

function explainAuthError(err: unknown): string {
  const code = errorCode(err)
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return '登入視窗被關掉了，再按一次即可'
  }
  if (code === 'auth/network-request-failed') {
    return '網路中斷，請確認用 Chrome 開啟這個網址後再試'
  }
  if (code === 'auth/unauthorized-domain') {
    return '這個網址還沒被允許登入，請把 ckjan0516.github.io 加到 Firebase Authorized domains'
  }
  return err instanceof Error ? err.message : '登入失敗'
}
