import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

export default function AidatlarPage() {
  const { sakin, isAdmin } = useAuth()
  const [aidatlar, setAidatlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yil, setYil] = useState(new Date().getFullYear())
  const [sakinler, setSakinler] = useState([])
  const [seciliSakin, setSeciliSakin] = useState(null)

  useEffect(() => {
    if (isAdmin) fetchSakinler()
    fetchAidatlar()
  }, [yil, seciliSakin])

  async function fetchSakinler() {
    const { data } = await supabase.from('sakinler').select('id, adi, soyadi, daire').order('daire')
    setSakinler(data || [])
  }

  async function fetchAidatlar() {
    let q = supabase.from('aidatlar').select('*, sakinler(adi, soyadi, daire)').eq('yil', yil).order('ay')
    if (!isAdmin && sakin) q = q.eq('sakin_id', sakin.id)
    if (isAdmin && seciliSakin) q = q.eq('sakin_id', seciliSakin)
    const { data } = await q
    setAidatlar(data || [])
    setYukleniyor(false)
  }

  async function odemeToggle(aidat) {
    if (!isAdmin) return
    await supabase.from('aidatlar').update({
      odendi: !aidat.odendi,
      odeme_tarihi: !aidat.odendi ? new Date().toISOString().split('T')[0] : null
    }).eq('id', aidat.id)
    fetchAidatlar()
  }

  async function aidatEkle() {
    if (!isAdmin || !seciliSakin) return
    const mevcutAylar = aidatlar.map(a => a.ay)
    const eksikAylar = [1,2,3,4,5,6,7,8,9,10,11,12].filter(ay => !mevcutAylar.includes(ay))
    if (eksikAylar.length === 0) return alert('Tüm aylar zaten ekli.')
    const yeniKayitlar = eksikAylar.map(ay => ({ sakin_id: seciliSakin, yil, ay, tutar: 500, odendi: false }))
    await supabase.from('aidatlar').insert(yeniKayitlar)
    fetchAidatlar()
  }

  const toplamBorc = aidatlar.filter(a => !a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
  const toplamOdenen = aidatlar.filter(a => a.odendi).reduce((t, a) => t + Number(a.tutar), 0)

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Aidat Takibi</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
        <button onClick={() => setYil(y => y - 1)} style={{ background: 'none', border: '0.5px solid var(--kenarlık)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{yil}</span>
        <button onClick={() => setYil(y => y + 1)} style={{ background: 'none', border: '0.5px solid var(--kenarlık)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>›</button>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
          <select className="form-girdi" value={seciliSakin || ''} onChange={e => setSeciliSakin(e.target.value || null)} style={{ flex: 1 }}>
            <option value="">— Tüm sakinler —</option>
            {sakinler.map(s => <option key={s.id} value={s.id}>{s.adi} {s.soyadi} (D.{s.daire})</option>)}
          </select>
          {seciliSakin && <button className="btn btn-ikincil" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={aidatEkle}>Yıl Ekle</button>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
        <div className="kart" style={{ background: 'var(--yesil-bg)' }}>
          <p style={{ fontSize: 12, color: 'var(--yesil)', marginBottom: 4 }}>Ödenen</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--yesil)' }}>{toplamOdenen.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="kart" style={{ background: toplamBorc > 0 ? 'var(--turuncu-bg)' : 'var(--yüzey)' }}>
          <p style={{ fontSize: 12, color: toplamBorc > 0 ? 'var(--turuncu)' : 'var(--metin3)', marginBottom: 4 }}>Borç</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: toplamBorc > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>{toplamBorc.toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : aidatlar.length === 0 ? (
        <div className="bos-durum">
          <div className="bos-durum-ikon">💰</div>
          <p>{isAdmin ? 'Sakin seçin ve "Yıl Ekle" ile aidatları oluşturun.' : 'Aidat kaydı bulunamadı.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {aidatlar.map(a => (
            <div key={a.id} className="kart" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                background: a.odendi ? 'var(--yesil-bg)' : 'var(--yüzey)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
                color: a.odendi ? 'var(--yesil)' : 'var(--metin3)'
              }}>
                {AYLAR[a.ay - 1].slice(0, 3)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, fontSize: 14 }}>{AYLAR[a.ay - 1]}</p>
                {a.odeme_tarihi && <p style={{ fontSize: 12, color: 'var(--metin3)' }}>{new Date(a.odeme_tarihi).toLocaleDateString('tr-TR')}</p>}
              </div>
              <span style={{ fontWeight: 600, color: a.odendi ? 'var(--yesil)' : 'var(--metin2)' }}>
                {Number(a.tutar).toLocaleString('tr-TR')} ₺
              </span>
              {isAdmin ? (
                <button
                  onClick={() => odemeToggle(a)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                    borderColor: a.odendi ? 'var(--yesil)' : 'var(--kenarlık)',
                    background: a.odendi ? 'var(--yesil)' : 'transparent',
                    color: a.odendi ? '#fff' : 'var(--metin3)',
                    cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                  {a.odendi ? '✓' : ''}
                </button>
              ) : (
                <span className={`rozet ${a.odendi ? 'rozet-normal' : 'rozet-acil'}`}>
                  {a.odendi ? 'Ödendi' : 'Bekliyor'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
