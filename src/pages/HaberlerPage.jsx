import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function HaberlerPage() {
  const { sakin, isAdmin } = useAuth()
  const [haberler,   setHaberler]   = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [acikHaber,  setAcikHaber]  = useState(null)
  const [yorumlar,   setYorumlar]   = useState([])
  const [yeniYorum,  setYeniYorum]  = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  // Admin form
  const [yeniForm,  setYeniForm]  = useState(false)
  const [form, setForm] = useState({ baslik: '', icerik: '' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => { fetchHaberler() }, [])
  useEffect(() => { if (acikHaber) fetchYorumlar(acikHaber.id) }, [acikHaber])

  async function fetchHaberler() {
    const { data } = await supabase
      .from('haberler')
      .select('*')
      .eq('yayinda', true)
      .order('created_at', { ascending: false })
    setHaberler(data || [])
    setYukleniyor(false)
  }

  async function fetchYorumlar(haberId) {
    const { data } = await supabase
      .from('yorumlar')
      .select('*, sakinler(adi, soyadi, daire_no, daire)')
      .eq('haber_id', haberId)
      .order('created_at', { ascending: true })
    setYorumlar(data || [])
  }

  async function haberEkle(e) {
    e.preventDefault()
    setKaydediliyor(true)
    await supabase.from('haberler').insert({ ...form, yayinda: true })
    setForm({ baslik: '', icerik: '' })
    setYeniForm(false)
    setKaydediliyor(false)
    fetchHaberler()
  }

  async function haberSil(id) {
    if (!confirm('Bu haberi kaldırmak istiyor musunuz?')) return
    await supabase.from('haberler').update({ yayinda: false }).eq('id', id)
    if (acikHaber?.id === id) setAcikHaber(null)
    fetchHaberler()
  }

  async function yorumGonder(e) {
    e.preventDefault()
    if (!sakin || !yeniYorum.trim()) return
    setGonderiliyor(true)
    await supabase.from('yorumlar').insert({
      haber_id: acikHaber.id,
      sakin_id: sakin.id,
      icerik: yeniYorum.trim()
    })
    setYeniYorum('')
    setGonderiliyor(false)
    fetchYorumlar(acikHaber.id)
  }

  async function yorumSil(id) {
    if (!confirm('Bu yorumu silmek istiyor musunuz?')) return
    await supabase.from('yorumlar').delete().eq('id', id)
    fetchYorumlar(acikHaber.id)
  }

  const tarih = (str) => new Date(str).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const saat = (str) => new Date(str).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit'
  })

  // Haber detay görünümü
  if (acikHaber) {
    return (
      <div className="sayfa">
        <button
          onClick={() => setAcikHaber(null)}
          style={{ background: 'none', border: 'none', color: 'var(--yesil)', fontSize: 14, cursor: 'pointer', marginBottom: '1rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Haberlere Dön
        </button>

        <div className="kart" style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 6 }}>{tarih(acikHaber.created_at)}</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{acikHaber.baslik}</h2>
          <p style={{ fontSize: 14, color: 'var(--metin2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{acikHaber.icerik}</p>
          {isAdmin && (
            <button onClick={() => haberSil(acikHaber.id)} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--metin3)', fontSize: 12, cursor: 'pointer' }}>
              Haberi Kaldır
            </button>
          )}
        </div>

        {/* Yorumlar */}
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>
          Yorumlar ({yorumlar.length})
        </h3>

        {yorumlar.length === 0 ? (
          <p style={{ color: 'var(--metin3)', fontSize: 13, marginBottom: '1rem' }}>Henüz yorum yok. İlk yorumu siz yapın!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {yorumlar.map(y => (
              <div key={y.id} className="kart" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {y.sakinler?.adi} {y.sakinler?.soyadi}
                    </span>
                    <span style={{ color: 'var(--metin3)', fontSize: 12, marginLeft: 6 }}>
                      D.{y.sakinler?.daire_no || y.sakinler?.daire}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--metin3)', fontSize: 11 }}>{saat(y.created_at)}</span>
                    {(isAdmin || sakin?.id === y.sakin_id) && (
                      <button onClick={() => yorumSil(y.id)} style={{ background: 'none', border: 'none', color: 'var(--metin3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>✕</button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--metin)', lineHeight: 1.5 }}>{y.icerik}</p>
              </div>
            ))}
          </div>
        )}

        {/* Yorum formu */}
        {sakin ? (
          <div className="kart">
            <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 8 }}>
              {sakin.adi} {sakin.soyadi} · D.{sakin.daire_no || sakin.daire} olarak yorum yapıyorsunuz
            </p>
            <form onSubmit={yorumGonder}>
              <textarea
                className="form-girdi"
                rows={3}
                placeholder="Yorumunuzu yazın..."
                value={yeniYorum}
                onChange={e => setYeniYorum(e.target.value)}
                style={{ resize: 'vertical', marginBottom: 8 }}
                required
              />
              <button className="btn btn-ana" type="submit" disabled={gonderiliyor || !yeniYorum.trim()}>
                {gonderiliyor ? 'Gönderiliyor...' : 'Yorum Yap'}
              </button>
            </form>
          </div>
        ) : (
          <p style={{ color: 'var(--metin3)', fontSize: 13 }}>Yorum yapmak için giriş yapmanız gerekiyor.</p>
        )}
      </div>
    )
  }

  // Haber listesi
  return (
    <div className="sayfa">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="sayfa-baslik" style={{ marginBottom: 0 }}>Haberler</h1>
        {isAdmin && (
          <button className="btn btn-ikincil" onClick={() => setYeniForm(!yeniForm)} style={{ padding: '8px 14px', fontSize: 13 }}>
            {yeniForm ? '✕ Kapat' : '+ Haber Ekle'}
          </button>
        )}
      </div>

      {isAdmin && yeniForm && (
        <div className="kart" style={{ marginBottom: '1rem' }}>
          <form onSubmit={haberEkle}>
            <div className="form-grup">
              <label className="form-etiket">Başlık</label>
              <input className="form-girdi" value={form.baslik} onChange={e => setForm(f => ({...f, baslik: e.target.value}))} required />
            </div>
            <div className="form-grup">
              <label className="form-etiket">İçerik</label>
              <textarea className="form-girdi" rows={5} value={form.icerik} onChange={e => setForm(f => ({...f, icerik: e.target.value}))} required style={{ resize: 'vertical' }} placeholder="Haber detaylarını yazın..." />
            </div>
            <button className="btn btn-ana" type="submit" disabled={kaydediliyor}>
              {kaydediliyor ? 'Yayınlanıyor...' : 'Yayınla'}
            </button>
          </form>
        </div>
      )}

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : haberler.length === 0 ? (
        <div className="bos-durum">
          <div className="bos-durum-ikon">📰</div>
          <p>Henüz haber yok.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {haberler.map(h => (
            <div
              key={h.id}
              className="kart"
              style={{ cursor: 'pointer' }}
              onClick={() => setAcikHaber(h)}
            >
              <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 4 }}>{tarih(h.created_at)}</p>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{h.baslik}</h3>
              <p style={{ fontSize: 13, color: 'var(--metin2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {h.icerik}
              </p>
              <p style={{ fontSize: 12, color: 'var(--yesil)', marginTop: 8 }}>Devamını oku →</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
