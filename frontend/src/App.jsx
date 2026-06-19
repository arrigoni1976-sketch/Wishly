import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Analytics } from '@vercel/analytics/react'
import HomePage from './pages/HomePage'
import CreateEventPage from './pages/CreateEventPage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import GuestWishlistPage from './pages/GuestWishlistPage'
import CollectiveGiftPage from './pages/CollectiveGiftPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import AdminPage from './pages/AdminPage'
import NotFoundPage from './pages/NotFoundPage'
import InstallPrompt from './components/InstallPrompt'

// Registra il service worker con auto-update silenzioso
const updateSW = registerSW({
  onNeedRefresh() {
    // Aggiorna automaticamente in background — nessun popup fastidioso
    updateSW(true)
  },
  onOfflineReady() {
    console.log('Piky è pronta per l\'uso offline!')
  },
})

// Esponi la funzione di update globalmente per il pulsante in Navbar
window.__pikyUpdateSW = updateSW

// Riporta la pagina in cima a ogni cambio di rotta — senza, il browser mantiene
// lo scroll della pagina precedente quando si naviga con React Router
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crea" element={<CreateEventPage />} />
        <Route path="/dashboard/:parentToken" element={<ParentDashboardPage />} />
        <Route path="/lista/:guestToken" element={<GuestWishlistPage />} />
        <Route path="/collettivo/:collectiveToken" element={<CollectiveGiftPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Banner installazione PWA — visibile su mobile */}
      <InstallPrompt />
      <Analytics />
    </Router>
  )
}
