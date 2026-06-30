import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const KATEGORİLER = [
  { value: 'elektrik', label: '⚡ Elektrik' },
  { value: 'su', label: '💧 Su' },
  { value: 'asansor', label: '🛗 Asansör' },
  { value: 'bahce', label: '🌿 Bahçe' },
  { value: 'guvenlik', label: '🔒 Güvenlik' },
  { value: 'diger', label: '🔧 Diğer' },
]

const DURUM_STİL = { bekliyor: 'rozet-bekliyor', inceleniyor: 'rozet-inceleniyor', tamamlandi: 'rozet-tamamlandi', iptal: 'rozet-bekliyor' }
const DURUM_ETİKET = { bekliyor: 'Bekliyor', inceleniyor: 'İnceleniyor', tamamlandi: 'Tamamlandı', iptal: 'İptal' }

export default function TaleplerPage() {
  const { sakin, isAdmin } = useAuth()
  const [talepler, setTalepler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yeniForm, setYeniForm] = useState(false)
  const [form, setForm] = useState({ kategori: 'diger', baslik: '', aciklama: '', oncelik: 'normal' })

  useEffect(() => { fetchTalepler() }, [])

  async function fetchTalepler() {
    let q = supabase.from('talepler').select('*, sakinler(adi, soyadi, daire)').order('created_at', { ascending: false })
    if (!isAdmin && sakin) q = q.eq('sakin_id', sakin.id)
    const { data } = await q
    setTalepler(data || [])
    setYukleniyor(false)
  }

  async function talepGonder(e) {
    e.preventDefault()
    if (!sakin) return
    await supabase.from('talepler').insert({ ...form, sakin_id: sakin.id })
    setForm({ kategori: 'diger', baslik: '', aciklama: '', oncelik: 'normal' })
    setYeniForm(false)
    fetchTalepler()
  }

  async function durumGuncelle(id, durum) {
    await supabase.from('talepler').update({ durum }).eq('id', id)
    fetchTalepler()
  }

  const tarih = (str) => new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

  return (
    <div className="sayfa">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="sayfa-baslik" style={{ marginBottom: 0 }}>Arıza & Talepler</h1>
        {sakin && (
          <button className="btn btn-ikincil" onClick={() => setYeniForm(!yeniForm)} style={{ padding: '8px 14px', fontSize: 13 }}>
            {yeniForm ? '✕ Kapat' : '+ Yeni Talep'}
          </button>
        )}
      </div>

      {yeniForm && (
        <div className="kart" style={{ marginBottom: '1rem' }}>
          <form onSubmit={talepGonder}>
            <div className="form-grup">
              <label className="form-etiket">Kategori</label>
              <select className="form-girdi" value={form.kategori} onChange={e => setForm(f => ({...f, kategori: e.target.value}))}>
                {KATEGORİLER.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div className="form-grup">
              <label className="form-etiket">Başlık</label>
              <input className="form-girdi" value={form.baslik} onChange={e => setForm(f => ({...f, baslik: e.target.value}))} required placeholder="Kısaca belirtin" />
            </div>
            <div className="form-grup">
              <label className="form-etiket">Açıklama</label>
              <textarea className="form-girdi" rows={3} value={form.aciklama} onChange={e => setForm(f => ({...f, aciklama: e.target.value}))} style={{ resize: 'vertical' }} placeholder="Detayları yazın..." />
            </div>
            <div className="form-grup">
              <label className="form-etiket">Öncelik</label>
              <select className="form-girdi" value={form.oncelik} onChange={e => setForm(f => ({...f, oncelik: e.target.value}))}>
                <option value="dusuk">Düşük</option>
                <option value="normal">Normal</option>
                <option value="yuksek">Yüksek</option>
                <option value="acil">Acil</option>
              </select>
            </div>
            <button className="btn btn-ana" type="submit">Gönder</button>
          </form>
        </div>
      )}

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : talepler.length === 0 ? (
        <div className="bos-durum">
          <div className="bos-durum-ikon">🔧</div>
          <p>Henüz talep yok.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {talepler.map(t => (
            <div key={t.id} className="kart">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--metin3)' }}>
                    {KATEGORİLER.find(k => k.value === t.kategori)?.label} · {tarih(t.created_at)}
                  </span>
                  {isAdmin && t.sakinler && (
                    <span style={{ fontSize: 12, color: 'var(--metin3)', marginLeft: 6 }}>
                      — {t.sakinler.adi} (Daire {t.sakinler.daire})
                    </span>
                  )}
                </div>
                <span className={`rozet ${DURUM_STİL[t.durum]}`}>{DURUM_ETİKET[t.durum]}</span>
              </div>
              <p style={{ fontWeight: 500, marginBottom: t.aciklama ? 4 : 0 }}>{t.baslik}</p>
              {t.aciklama && <p style={{ fontSize: 13, color: 'var(--metin2)' }}>{t.aciklama}</p>}
              {isAdmin && t.durum !== 'tamamlandi' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {t.durum === 'bekliyor' && (
                    <button className="btn btn-ikincil" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => durumGuncelle(t.id, 'inceleniyor')}>İncelemeye Al</button>
                  )}
                  <button className="btn" style={{ fontSize: 12, padding: '5px 10px', background: 'var(--yesil-bg)', color: 'var(--yesil)' }} onClick={() => durumGuncelle(t.id, 'tamamlandi')}>Tamamlandı</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
