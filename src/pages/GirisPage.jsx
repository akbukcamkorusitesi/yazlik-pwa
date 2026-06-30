import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function GirisPage() {
  const { girisYap } = useAuth()
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    const { error } = await girisYap(email, sifre)
    if (error) setHata('E-posta veya şifre hatalı.')
    setYukleniyor(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 48, marginBottom: '0.5rem' }}>🏖️</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--metin)' }}>Yazlık Sitesi</h1>
        <p style={{ color: 'var(--metin3)', fontSize: 14, marginTop: 4 }}>Sakin uygulaması</p>
      </div>

      <div className="kart">
        <form onSubmit={handleSubmit}>
          <div className="form-grup">
            <label className="form-etiket">E-posta</label>
            <input
              className="form-girdi"
              type="email"
              placeholder="ad@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-grup">
            <label className="form-etiket">Şifre</label>
            <input
              className="form-girdi"
              type="password"
              placeholder="••••••••"
              value={sifre}
              onChange={e => setSifre(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {hata && (
            <p style={{ color: 'var(--turuncu)', fontSize: 13, marginBottom: '0.75rem' }}>{hata}</p>
          )}
          <button className="btn btn-ana" type="submit" disabled={yukleniyor}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--metin3)', fontSize: 12, marginTop: '1.5rem' }}>
        Hesabınız yoksa site yöneticisiyle iletişime geçin.
      </p>
    </div>
  )
}
