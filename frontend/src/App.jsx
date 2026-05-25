import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Analytics } from '@vercel/analytics/react'
import HomePage from './pages/HomePage'
import CreateEventPage from './pages/CreateEventPage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import GuestWishlistPage from './pages/GuestWishlistPage'
import CollectiveGiftPage from './pages/CollectiveGiftPage'
import NotFoundPage from './pages/NotFoundPage'
import InstallPrompt from './components/InstallPrompt'

// Registra il service worker con auto-update silenzioso
const updateSW = registerSW({
  onNeedRefresh() {
    // Aggiorna automaticamente in background — nessun popup fastidioso
    updateSW(true)
  },
  onOfflineReady() {
    console.log('Wishly è pronta per l\'uso offline!')
  },
})

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crea" element={<CreateEventPage />} />
        <Route path="/dashboard/:parentToken" element={<ParentDashboardPage />} />
        <Route path="/lista/:guestToken" element={<GuestWishlistPage />} />
        <Route path="/collettivo/:collectiveToken" element={<CollectiveGiftPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Banner installazione PWA — visibile su mobile */}
      <InstallPrompt />
      <Analytics />
    </Router>
  )
}
