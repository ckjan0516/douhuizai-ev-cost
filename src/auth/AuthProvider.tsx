import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, isFirebaseConfigured } from '../lib/firebase'

interface AuthState {
  user: User | null
  ready: boolean
  configured: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!auth) {
      setReady(true)
      return
    }
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setReady(true)
    })
  }, [])

  async function signIn() {
    if (!auth) throw new Error('尚未設定 Google 登入')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (mobile) {
      await signInWithRedirect(auth, provider)
      return
    }
    await signInWithPopup(auth, provider)
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
