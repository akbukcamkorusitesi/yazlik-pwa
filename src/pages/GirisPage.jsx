import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function girdiyiEmaileCevir(girdi) {
  const temiz = girdi.trim()
  // E-posta formatına benziyorsa olduğu gibi kullan
  if (temiz.includes('@')) return temiz
  // Sadece rakamlardan oluşuyorsa (telefon girilmiş demektir) sahte e-postaya çevir
  const sadeceRakam = temiz.replace(/\D/g, '')
  if (sadeceRakam.length >= 6) return `${sadeceRakam}@yazlik.local`
  return temiz
}

export default function GirisPage() {
  const { girisYap } = useAuth()
  const [girdi, setGirdi] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    const email = girdiyiEmaileCevir(girdi)
    const { error } = await girisYap(email, sifre)
    if (error) setHata('Bilgileriniz hatalı. E-posta/telefon veya şifrenizi kontrol edin.')
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
            <label className="form-etiket">E-posta veya Telefon</label>
            <input
              className="form-girdi"
              type="text"
              placeholder="ad@email.com veya 5xx xxx xx xx"
              value={girdi}
              onChange={e => setGirdi(e.target.value)}
              required
              autoComplete="username"
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
        Telefonla girişte ilk şifreniz telefon numaranızın son 6 hanesidir.<br/>
        Hesabınız yoksa <Link to="/kayit-ol" style={{ color: 'var(--yesil)', fontWeight: 500 }}>buradan başvuru</Link> yapabilirsiniz.
      </p>
    </div>
  )
}
