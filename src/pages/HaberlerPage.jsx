import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function HaberlerPage() {
  const { sakin, isAdmin } = useAuth()
  const [haberler,     setHaberler]     = useState([])
  const [yukleniyor,   setYukleniyor]   = useState(true)
  const [acikHaber,    setAcikHaber]    = useState(null)
  const [haborDosyalar, setHaberDosyalar] = useState([])
  const [yorumlar,     setYorumlar]     = useState([])
  const [yeniYorum,    setYeniYorum]    = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  // Admin form
  const [yeniForm,     setYeniForm]     = useState(false)
  const [form,         setForm]         = useState({ baslik: '', icerik: '' })
  const [dosyalar,     setDosyalar]     = useState([]) // seçilen dosyalar
  const [yuklenenler,  setYuklenenler]  = useState([]) // progress
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const dosyaRef = useRef()

  useEffect(() => { fetchHaberler() }, [])
  useEffect(() => {
    if (acikHaber) {
      fetchYorumlar(acikHaber.id)
      fetchDosyalar(acikHaber.id)
    }
  }, [acikHaber])

  async function fetchHaberler() {
    const { data } = await supabase
      .from('haberler')
      .select('*, haber_dosyalari(id, dosya_url, dosya_tipi, dosya_adi)')
      .eq('yayinda', true)
      .order('created_at', { ascending: false })
    setHaberler(data || [])
    setYukleniyor(false)
  }

  async function fetchDosyalar(haberId) {
    const { data } = await supabase
      .from('haber_dosyalari')
      .select('*')
      .eq('haber_id', haberId)
      .order('created_at')
    setHaberDosyalar(data || [])
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
    setYuklenenler([])

    // Haberi oluştur
    const { data: yeniHaber, error } = await supabase
      .from('haberler')
      .insert({ ...form, yayinda: true })
      .select()
      .single()

    if (error || !yeniHaber) { setKaydediliyor(false); return }

    // Dosyaları yükle
    let kapakUrl = null
    for (const dosya of dosyalar) {
      const uzanti = dosya.name.split('.').pop().toLowerCase()
      const path = `haberler/${yeniHaber.id}/${Date.now()}-${dosya.name}`
      const tip = ['jpg','jpeg','png','gif','webp'].includes(uzanti) ? 'image'
                : uzanti === 'pdf' ? 'pdf' : 'diger'

      setYuklenenler(prev => [...prev, { name: dosya.name, durum: 'yukleniyor' }])

      const { error: uploadError } = await supabase.storage
        .from('haber-dosyalari')
        .upload(path, dosya, { cacheControl: '3600' })

      if (uploadError) {
        setYuklenenler(prev => prev.map(u => u.name === dosya.name ? {...u, durum: 'hata'} : u))
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('haber-dosyalari').getPublicUrl(path)

      await supabase.from('haber_dosyalari').insert({
        haber_id: yeniHaber.id,
        dosya_adi: dosya.name,
        dosya_url: publicUrl,
        dosya_tipi: tip,
        storage_path: path,
        dosya_boyutu: dosya.size
      })

      if (tip === 'image' && !kapakUrl) kapakUrl = publicUrl

      setYuklenenler(prev => prev.map(u => u.name === dosya.name ? {...u, durum: 'tamam'} : u))
    }

    // Kapak fotoğrafı varsa haberi güncelle
    if (kapakUrl) {
      await supabase.from('haberler').update({ kapak_url: kapakUrl }).eq('id', yeniHaber.id)
    }

    setForm({ baslik: '', icerik: '' })
    setDosyalar([])
    setYeniForm(false)
    setKaydediliyor(false)
    if (dosyaRef.current) dosyaRef.current.value = ''
    fetchHaberler()
  }

  async function haberSil(haber) {
    if (!confirm('Bu haberi ve tüm dosyalarını kalıcı olarak silmek istiyor musunuz?')) return

    // Önce Storage'daki dosyaları sil
    const { data: dosyaList } = await supabase
      .from('haber_dosyalari')
      .select('storage_path')
      .eq('haber_id', haber.id)

    if (dosyaList?.length > 0) {
      const pathler = dosyaList.map(d => d.storage_path)
      await supabase.storage.from('haber-dosyalari').remove(pathler)
    }

    // Sonra haberi sil (cascade ile dosya kayıtları da silinir)
    await supabase.from('haberler').delete().eq('id', haber.id)

    if (acikHaber?.id === haber.id) setAcikHaber(null)
    fetchHaberler()
  }

  async function dosyaSil(dosya) {
    if (!confirm(`"${dosya.dosya_adi}" dosyasını kalıcı olarak silmek istiyor musunuz?`)) return

    // Storage'dan sil
    await supabase.storage.from('haber-dosyalari').remove([dosya.storage_path])

    // Kayıttan sil
    await supabase.from('haber_dosyalari').delete().eq('id', dosya.id)

    // Kapak bu dosyaysa temizle
    if (acikHaber?.kapak_url === dosya.dosya_url) {
      await supabase.from('haberler').update({ kapak_url: null }).eq('id', acikHaber.id)
    }

    fetchDosyalar(acikHaber.id)
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

  const tarih = (str) => new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const saat  = (str) => new Date(str).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const boyut = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`

  // Haber detay
  if (acikHaber) {
    return (
      <div className="sayfa">
        <button onClick={() => setAcikHaber(null)} style={{ background: 'none', border: 'none', color: 'var(--yesil)', fontSize: 14, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}>
          ← Haberlere Dön
        </button>

        <div className="kart" style={{ marginBottom: '1rem' }}>
          {acikHaber.kapak_url && (
            <img src={acikHaber.kapak_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: '0.75rem', maxHeight: 220, objectFit: 'cover' }} />
          )}
          <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 6 }}>{tarih(acikHaber.created_at)}</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{acikHaber.baslik}</h2>
          <p style={{ fontSize: 14, color: 'var(--metin2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{acikHaber.icerik}</p>

          {/* Dosyalar */}
          {haborDosyalar.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>📎 Ekler ({haborDosyalar.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {haborDosyalar.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--yüzey)', borderRadius: 8 }}>
                    <span style={{ fontSize: 20 }}>{d.dosya_tipi === 'image' ? '🖼️' : d.dosya_tipi === 'pdf' ? '📄' : '📎'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={d.dosya_url} target="_blank" rel="noreferrer" style={{ color: 'var(--yesil)', fontSize: 13, textDecoration: 'none', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.dosya_adi}
                      </a>
                      {d.dosya_boyutu && <p style={{ fontSize: 11, color: 'var(--metin3)' }}>{boyut(d.dosya_boyutu)}</p>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => dosyaSil(d)} style={{ background: 'none', border: 'none', color: 'var(--metin3)', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <button onClick={() => haberSil(acikHaber)} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--turuncu)', fontSize: 12, cursor: 'pointer' }}>
              🗑 Haberi Kalıcı Sil
            </button>
          )}
        </div>

        {/* Yorumlar */}
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Yorumlar ({yorumlar.length})</h3>

        {yorumlar.length === 0 ? (
          <p style={{ color: 'var(--metin3)', fontSize: 13, marginBottom: '1rem' }}>Henüz yorum yok. İlk yorumu siz yapın!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {yorumlar.map(y => (
              <div key={y.id} className="kart" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{y.sakinler?.adi} {y.sakinler?.soyadi}</span>
                    <span style={{ color: 'var(--metin3)', fontSize: 12, marginLeft: 6 }}>D.{y.sakinler?.daire_no || y.sakinler?.daire}</span>
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

        {sakin ? (
          <div className="kart">
            <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 8 }}>
              {sakin.adi} {sakin.soyadi} · D.{sakin.daire_no || sakin.daire} olarak yorum yapıyorsunuz
            </p>
            <form onSubmit={yorumGonder}>
              <textarea className="form-girdi" rows={3} placeholder="Yorumunuzu yazın..." value={yeniYorum} onChange={e => setYeniYorum(e.target.value)} style={{ resize: 'vertical', marginBottom: 8 }} required />
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
            <div className="form-grup">
              <label className="form-etiket">Dosya / Fotoğraf Ekle</label>
              <input
                ref={dosyaRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => setDosyalar(Array.from(e.target.files))}
                style={{ fontSize: 13 }}
              />
              {dosyalar.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {dosyalar.map((d, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--metin3)', padding: '3px 0' }}>
                      📎 {d.name} ({boyut(d.size)})
                      {yuklenenler.find(u => u.name === d.name)?.durum === 'yukleniyor' && ' ⏳'}
                      {yuklenenler.find(u => u.name === d.name)?.durum === 'tamam' && ' ✓'}
                      {yuklenenler.find(u => u.name === d.name)?.durum === 'hata' && ' ✕'}
                    </div>
                  ))}
                </div>
              )}
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
        <div className="bos-durum"><div className="bos-durum-ikon">📰</div><p>Henüz haber yok.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {haberler.map(h => (
            <div key={h.id} className="kart" style={{ cursor: 'pointer' }} onClick={() => setAcikHaber(h)}>
              {h.kapak_url && (
                <img src={h.kapak_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: '0.75rem', height: 140, objectFit: 'cover' }} />
              )}
              <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 4 }}>{tarih(h.created_at)}</p>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{h.baslik}</h3>
              <p style={{ fontSize: 13, color: 'var(--metin2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {h.icerik}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--yesil)' }}>Devamını oku →</p>
                {h.haber_dosyalari?.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--metin3)' }}>📎 {h.haber_dosyalari.length} ek</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
