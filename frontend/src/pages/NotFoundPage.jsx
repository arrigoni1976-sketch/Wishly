import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function NotFoundPage() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-7xl">🎁</div>
          <div>
            <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Pagina non trovata</h1>
            <p className="text-gray-500">
              Il link che cerchi non esiste o è scaduto. Controlla di aver copiato l'indirizzo corretto.
            </p>
          </div>
          <Link to="/" className="btn-primary inline-block">
            Torna alla home
          </Link>
        </div>
      </div>
    </Layout>
  )
}
