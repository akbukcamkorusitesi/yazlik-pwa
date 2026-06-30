import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AltNav from './components/AltNav'
import GirisPage from './pages/GirisPage'
import AnasayfaPage from './pages/AnasayfaPage'
import RehberPage from './pages/RehberPage'
import TaleplerPage from './pages/TaleplerPage'
import AidatlarPage from './pages/AidatlarPage'
import ProfilPage from './pages/ProfilPage'

function KorumalıRota({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="yukleniyor" style={{ minHeight: '100dvh' }}>Yükleniyor...</div>
  if (!user) return <Navigate to="/giris" replace />
  return children
}

function AppIci() {
  const { user, loading } = useAuth()

  if (loading) return <div className="yukleniyor" style={{ minHeight: '100dvh' }}>Yükleniyor...</div>

  return (
    <BrowserRouter basename="/yazlik-pwa">
      <Routes>
        <Route path="/giris" element={user ? <Navigate to="/" replace /> : <GirisPage />} />
        <Route path="/" element={<KorumalıRota><AnasayfaPage /></KorumalıRota>} />
        <Route path="/rehber" element={<KorumalıRota><RehberPage /></KorumalıRota>} />
        <Route path="/talepler" element={<KorumalıRota><TaleplerPage /></KorumalıRota>} />
        <Route path="/aidatlar" element={<KorumalıRota><AidatlarPage /></KorumalıRota>} />
        <Route path="/profil" element={<KorumalıRota><ProfilPage /></KorumalıRota>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <AltNav />}
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppIci />
    </AuthProvider>
  )
}
