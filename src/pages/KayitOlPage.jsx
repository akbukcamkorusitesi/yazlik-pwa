import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function KayitOlPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ adi: '', soyadi: '', daire_no: '', telefon: '' })
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [basarili, setBasarili] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    setGonderiliyor(true)
    setHata('')

    const { error } = await supabase.from('basvurular').insert({
      adi: form.adi.trim(),
      soyadi: form.soyadi.trim(),
      daire_no: form.daire_no ? parseInt(form.daire_no) : null,
      telefon: form.telefon.trim()
    })

    setGonderiliyor(false)
    if (error) { setHata('Başvuru gönderilemedi, lütfen tekrar deneyin.'); return }
    setBasarili(true)
  }

  if (basarili) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Başvurunuz Alındı</h1>
        <p style={{ color: 'var(--metin2)', fontSize: 14, marginBottom: '1.5rem' }}>
          Site yöneticisi başvurunuzu onayladıktan sonra giriş bilgileriniz size iletilecektir.
        </p>
        <Link to="/giris" className="btn btn-ikincil" style={{ display: 'inline-flex' }}>Giriş Sayfasına Dön</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 40, marginBottom: '0.5rem' }}>🏖️</div>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Hesap Başvurusu</h1>
        <p style={{ color: 'var(--metin3)', fontSize: 13, marginTop: 4 }}>
          Bilgileriniz site yöneticisi tarafından onaylandıktan sonra hesabınız aktif olur.
        </p>
      </div>

      <div className="kart">
        <form onSubmit={gonder}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-grup">
              <label className="form-etiket">Ad</label>
              <input className="form-girdi" value={form.adi} onChange={e => setForm(f => ({...f, adi: e.target.value}))} required />
            </div>
            <div className="form-grup">
              <label className="form-etiket">Soyad</label>
              <input className="form-girdi" value={form.soyadi} onChange={e => setForm(f => ({...f, soyadi: e.target.value}))} required />
            </div>
          </div>
          <div className="form-grup">
            <label className="form-etiket">Daire No</label>
            <input className="form-girdi" type="number" placeholder="Örn: 12" value={form.daire_no} onChange={e => setForm(f => ({...f, daire_no: e.target.value}))} required />
          </div>
          <div className="form-grup">
            <label className="form-etiket">Telefon</label>
            <input className="form-girdi" type="tel" placeholder="05xx xxx xx xx" value={form.telefon} onChange={e => setForm(f => ({...f, telefon: e.target.value}))} required />
          </div>

          {hata && <p style={{ color: 'var(--turuncu)', fontSize: 13, marginBottom: '0.75rem' }}>{hata}</p>}

          <button className="btn btn-ana" type="submit" disabled={gonderiliyor}>
            {gonderiliyor ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, marginTop: '1.5rem' }}>
        Zaten hesabınız var mı? <Link to="/giris" style={{ color: 'var(--yesil)', fontWeight: 500 }}>Giriş Yap</Link>
      </p>
    </div>
  )
}
