import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ONEM_ETİKETLER = { normal: 'Normal', onemli: 'Önemli', acil: 'Acil' }

export default function AnasayfaPage() {
  const { sakin, isAdmin } = useAuth()
  const [duyurular, setDuyurular] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yeniForm, setYeniForm] = useState(false)
  const [form, setForm] = useState({ baslik: '', icerik: '', onem: 'normal' })

  useEffect(() => { fetchDuyurular() }, [])

  async function fetchDuyurular() {
    const { data } = await supabase
      .from('duyurular')
      .select('*')
      .eq('yayinda', true)
      .order('created_at', { ascending: false })
    setDuyurular(data || [])
    setYukleniyor(false)
  }

  async function duyuruEkle(e) {
    e.preventDefault()
    await supabase.from('duyurular').insert({ ...form, yayinda: true })
    setForm({ baslik: '', icerik: '', onem: 'normal' })
    setYeniForm(false)
    fetchDuyurular()
  }

  async function duyuruSil(id) {
    if (!confirm('Bu duyuruyu kaldırmak istiyor musunuz?')) return
    await supabase.from('duyurular').update({ yayinda: false }).eq('id', id)
    fetchDuyurular()
  }

  const tarihFormat = (str) => new Date(str).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="sayfa">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 className="sayfa-baslik" style={{ marginBottom: 2 }}>
            {sakin ? `Merhaba, ${sakin.adi}` : 'Duyurular'}
          </h1>
          {sakin && <p style={{ color: 'var(--metin3)', fontSize: 13 }}>Daire {sakin.daire}</p>}
        </div>
        {isAdmin && (
          <button className="btn btn-ikincil" onClick={() => setYeniForm(!yeniForm)} style={{ padding: '8px 14px', fontSize: 13 }}>
            {yeniForm ? '✕ Kapat' : '+ Duyuru'}
          </button>
        )}
      </div>

      {isAdmin && yeniForm && (
        <div className="kart" style={{ marginBottom: '1rem' }}>
          <form onSubmit={duyuruEkle}>
            <div className="form-grup">
              <label className="form-etiket">Başlık</label>
              <input className="form-girdi" value={form.baslik} onChange={e => setForm(f => ({...f, baslik: e.target.value}))} required />
            </div>
            <div className="form-grup">
              <label className="form-etiket">İçerik</label>
              <textarea className="form-girdi" rows={3} value={form.icerik} onChange={e => setForm(f => ({...f, icerik: e.target.value}))} required style={{ resize: 'vertical' }} />
            </div>
            <div className="form-grup">
              <label className="form-etiket">Önem</label>
              <select className="form-girdi" value={form.onem} onChange={e => setForm(f => ({...f, onem: e.target.value}))}>
                <option value="normal">Normal</option>
                <option value="onemli">Önemli</option>
                <option value="acil">Acil</option>
              </select>
            </div>
            <button className="btn btn-ana" type="submit">Yayınla</button>
          </form>
        </div>
      )}

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : duyurular.length === 0 ? (
        <div className="bos-durum">
          <div className="bos-durum-ikon">📢</div>
          <p>Henüz duyuru yok.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {duyurular.map(d => (
            <div key={d.id} className="kart" style={{ borderLeft: d.onem === 'acil' ? '3px solid var(--turuncu)' : d.onem === 'onemli' ? '3px solid var(--sari)' : '3px solid var(--yesil)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{d.baslik}</h3>
                <span className={`rozet rozet-${d.onem}`}>{ONEM_ETİKETLER[d.onem]}</span>
              </div>
              <p style={{ color: 'var(--metin2)', fontSize: 14, marginBottom: 8 }}>{d.icerik}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--metin3)', fontSize: 12 }}>{tarihFormat(d.created_at)}</span>
                {isAdmin && (
                  <button onClick={() => duyuruSil(d.id)} style={{ background: 'none', border: 'none', color: 'var(--metin3)', fontSize: 12, cursor: 'pointer' }}>
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
