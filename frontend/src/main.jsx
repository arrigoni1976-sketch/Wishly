import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>😕</p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Qualcosa è andato storto</h1>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '20px' }}>Prova a ricaricare la pagina.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#4A7A50', color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.875rem', cursor: 'pointer' }}>
            Ricarica
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
