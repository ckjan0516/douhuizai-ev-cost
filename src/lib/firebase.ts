import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDacxe-Rq2-9f-6280IdHvj6ct4piB9RzA',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'douhuizai-f458f.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'douhuizai-f458f',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'douhuizai-f458f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1014625783643',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:1014625783643:web:210de023d17f1e29a9947e',
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId && config.authDomain)
}

let app: FirebaseApp | null = null
export let auth: Auth | null = null
export let cloudDb: Firestore | null = null

if (isFirebaseConfigured()) {
  app = initializeApp(config)
  auth = getAuth(app)
  cloudDb = initializeFirestore(app, { experimentalForceLongPolling: true })
}
