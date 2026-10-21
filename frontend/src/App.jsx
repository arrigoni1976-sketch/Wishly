import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Analytics } from '@vercel/analytics/react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { supabase } from './lib/supabase'
import HomePage from './pages/HomePage'
import CreateEventPage from './pages/CreateEventPage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import GuestWishlistPage from './pages/GuestWishlistPage'
import CollectiveGiftPage from './pages/CollectiveGiftPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import AdminPage from './pages/AdminPage'
import NotFoundPage from './pages/NotFoundPage'
import ConfermaEmailPage from './pages/ConfermaEmailPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ScaricaPage from './pages/ScaricaPage'
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

// Fix iOS WKWebView: resetta il viewport dopo che la tastiera si chiude
// senza questo, il viewport rimane zoomato dopo aver toccato un input
if (typeof window !== 'undefined') {
  document.addEventListener('focusout', () => {
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      const content = viewport.getAttribute('content')
      // Trick: toggle maximum-scale per forzare il reset dello zoom
      viewport.setAttribute('content', content.replace('maximum-scale=1.0', 'maximum-scale=1.1'))
      requestAnimationFrame(() => {
        viewport.setAttribute('content', content)
      })
    }
  }, true)
}

// Riporta la pagina in cima a ogni cambio di rotta
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Gestisce i deep link quando l'app nativa viene aperta tramite Universal Link / App Link
// Es: pikyapp.it/lista/abc → naviga a /lista/abc dentro React Router
function DeepLinkHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handler = CapApp.addListener('appUrlOpen', async (event) => {
      try {
        const url = new URL(event.url)
        const hash = url.hash // es. #access_token=...&refresh_token=...&type=signup

        // Supabase processa il hash #access_token= SOLO all'avvio dell'app.
        // Se l'app è già in esecuzione (caso normale dei deep link), dobbiamo
        // chiamare setSession() esplicitamente per completare conferma email e reset password.
        if (hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.slice(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          const type = params.get('type') // 'signup' | 'recovery'

          if (accessToken && refreshToken) {
            try {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            } catch {}
          }

          // Per recovery: passa ?recovery=1 così ResetPasswordPage sa di mostrare il form
          const suffix = type === 'recovery' ? '?recovery=1' : ''
          const path = url.pathname + suffix
          if (path && path !== '/') navigate(path, { replace: true })
        } else {
          // Nessun token auth — naviga normalmente (lista, dashboard, collettivo, ecc.)
          const path = url.pathname + url.search + url.hash
          if (path && path !== '/') navigate(path, { replace: true })
        }
      } catch {}
    })
    return () => { handler.then((h) => h.remove()) }
  }, [navigate])
  return null
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <DeepLinkHandler />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crea" element={<CreateEventPage />} />
        <Route path="/dashboard/:parentToken" element={<ParentDashboardPage />} />
        <Route path="/lista/:guestToken" element={<GuestWishlistPage />} />
        <Route path="/collettivo/:collectiveToken" element={<CollectiveGiftPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/conferma-email" element={<ConfermaEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/scarica" element={<ScaricaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Banner installazione PWA — visibile su mobile */}
      <InstallPrompt />
      <Analytics />
    </Router>
  )
}
