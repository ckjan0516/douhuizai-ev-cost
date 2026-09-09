import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BackupPage } from './pages/Backup'
import { ChargesPage } from './pages/Charges'
import { FixedExpensesPage } from './pages/FixedExpenses'
import { OverviewPage } from './pages/Overview'
import { PurchasePage } from './pages/Purchase'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="purchase" element={<PurchasePage />} />
          <Route path="fixed" element={<FixedExpensesPage />} />
          <Route path="charges" element={<ChargesPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
