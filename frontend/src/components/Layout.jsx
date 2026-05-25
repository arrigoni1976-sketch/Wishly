import Navbar from './Navbar'

export default function Layout({ children, showNav = true }) {
  return (
    <div className="min-h-screen bg-avorio flex flex-col">
      {showNav && <Navbar />}
      <main className="flex-1">{children}</main>
      <footer className="py-8 text-center text-sm text-gray-400 border-t border-avorio-dark">
        <p>
          © {new Date().getFullYear()} Wishly — Fatto con{' '}
          <span className="text-cipria-dark">♥</span> per i compleanni speciali
        </p>
      </footer>
    </div>
  )
}
