import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { BackupPage } from './pages/Backup'
import { ChargesPage } from './pages/Charges'
import { FixedExpensesPage } from './pages/FixedExpenses'
import { OtherPage } from './pages/Other'
import { OverviewPage } from './pages/Overview'
import { PurchasePage } from './pages/Purchase'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="charges" element={<ChargesPage />} />
            <Route path="other" element={<OtherPage />} />
            <Route path="purchase" element={<PurchasePage />} />
            <Route path="fixed" element={<FixedExpensesPage />} />
            <Route path="backup" element={<BackupPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
