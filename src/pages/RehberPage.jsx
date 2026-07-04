import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function RehberPage() {
  const { isAdmin } = useAuth()
  const [sakinler,   setSakinler]   = useState([])
  const [yonetim,    setYonetim]    = useState([])
  const [calisanlar, setCalisanlar] = useState([])
  const [arama,      setArama]      = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili,     setSecili]     = useState(null)
  const [bolum,      setBolum]      = useState('sakinler') // sakinler | yonetim | calisanlar

  // Admin çalışan formu
  const [calisanForm,    setCalisanForm]    = useState(null) // null = kapalı, {} = yeni, {id,...} = düzenle
  const [calisanKayit,   setCalisanKayit]   = useState(false)

  useEffect(() => { fetchHepsi() }, [])

  async function fetchHepsi() {
    setYukleniyor(true)
    const [sakinRes, yonetimRes, calisanRes] = await Promise.all([
      supabase.from('sakinler')
        .select('id, daire, daire_no, adi, soyadi, ceptel, ceptel2, tel1, email, konum, fotograf_url, yonetim_uyesi, yonetim_gorevi')
        .eq('yonetim_uyesi', false)
        .order('daire_no', { ascending: true, nullsFirst: false }),
      supabase.from('sakinler')
        .select('id, daire, daire_no, adi, soyadi, ceptel, ceptel2, tel1, email, konum, fotograf_url, yonetim_uyesi, yonetim_gorevi')
        .eq('yonetim_uyesi', true)
        .order('daire_no'),
      supabase.from('calisanlar')
        .select('*')
        .eq('aktif', true)
        .order('sira')
    ])
    setSakinler(sakinRes.data || [])
    setYonetim(yonetimRes.data || [])
    setCalisanlar(calisanRes.data || [])
    setYukleniyor(false)
  }

  const basTutar = (s) => {
    const isim = `${s.adi || ''} ${s.soyadi || ''}`.trim()
    return isim.split(' ').map(k => k[0]).join('').slice(0, 2).toUpperCase()
  }

  const filtreli = (liste) => {
    if (!arama.trim()) return liste
    const s = arama.toLowerCase()
    return liste.filter(item =>
      `${item.adi} ${item.soyadi || ''} ${item.daire_no || ''} ${item.daire || ''} ${item.gorev || ''}`.toLowerCase().includes(s)
    )
  }

  async function calisanKaydet(e) {
    e.preventDefault()
    setCalisanKayit(true)
    const { id, ...veri } = calisanForm
    if (id) {
      await supabase.from('calisanlar').update(veri).eq('id', id)
    } else {
      await supabase.from('calisanlar').insert(veri)
    }
    setCalisanKayit(false)
    setCalisanForm(null)
    fetchHepsi()
  }

  async function calisanSil(id) {
    if (!confirm('Bu çalışanı kaldırmak istiyor musunuz?')) return
    await supabase.from('calisanlar').update({ aktif: false }).eq('id', id)
    fetchHepsi()
  }

  async function yonetimToggle(sakin) {
    await supabase.from('sakinler')
      .update({ yonetim_uyesi: !sakin.yonetim_uyesi, yonetim_gorevi: !sakin.yonetim_uyesi ? 'Üye' : null })
      .eq('id', sakin.id)
    fetchHepsi()
  }

  // Kart bileşeni — sakinler ve yönetim için
  const SakinKart = ({ s }) => (
    <div
      className="kart"
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
      onClick={() => setSecili(secili?.id === s.id ? null : s)}
    >
      <div style={{ position: 'relative', flexShrink: 0, width: 44, height: 44 }}>
        {s.fotograf_url ? (
          <img src={s.fotograf_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: s.yonetim_uyesi ? 'var(--mavi-bg)' : parseInt(s.konum) === 2 ? 'var(--mavi-bg)' : parseInt(s.konum) === 1 ? 'var(--yesil-bg)' : 'var(--yüzey)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 14,
            color: s.yonetim_uyesi ? 'var(--mavi)' : parseInt(s.konum) === 2 ? 'var(--mavi)' : parseInt(s.konum) === 1 ? 'var(--yesil)' : 'var(--metin3)'
          }}>
            {basTutar(s)}
          </div>
        )}
        {!s.yonetim_uyesi && parseInt(s.konum) === 1 && (
          <span style={{ position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%', background: 'var(--yesil-acik)', border: '2px solid #fff' }} />
        )}
        {!s.yonetim_uyesi && parseInt(s.konum) === 2 && (
          <span style={{ position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%', background: 'var(--mavi)', border: '2px solid #fff' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontWeight: 500, fontSize: 15 }}>{s.adi} {s.soyadi}</p>
          {s.yonetim_uyesi && s.yonetim_gorevi && (
            <span className="rozet rozet-inceleniyor" style={{ fontSize: 10 }}>{s.yonetim_gorevi}</span>
          )}
        </div>
        <p style={{ color: 'var(--metin3)', fontSize: 13 }}>
          {s.daire_no ? `Daire ${s.daire_no}` : `Daire ${s.daire}`}
          {s.daire_no && <span style={{ opacity: 0.5 }}> · {s.daire}</span>}
        </p>
      </div>
      <span style={{ color: 'var(--metin3)', fontSize: 16 }}>{secili?.id === s.id ? '▲' : '▼'}</span>
    </div>
  )

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Rehber</h1>

      {/* Bölüm seçici */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto' }}>
        {[
          ['sakinler',   '👥', `Sakinler (${sakinler.length})`],
          ['yonetim',    '🏛️', `Yönetim (${yonetim.length})`],
          ['calisanlar', '👷', `Çalışanlar (${calisanlar.length})`],
        ].map(([b, ikon, etiket]) => (
          <button key={b} onClick={() => { setBolum(b); setArama('') }} style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `1.5px solid ${bolum === b ? 'var(--yesil)' : 'var(--kenarlık)'}`,
            background: bolum === b ? 'var(--yesil)' : '#fff',
            color: bolum === b ? '#fff' : 'var(--metin2)',
            fontWeight: bolum === b ? 600 : 400
          }}>{ikon} {etiket}</button>
        ))}
      </div>

      {/* Arama */}
      <input
        className="form-girdi"
        placeholder={bolum === 'calisanlar' ? 'İsim veya görev ara...' : 'İsim veya daire ara...'}
        value={arama}
        onChange={e => setArama(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {/* Lejant — sadece sakinler bölümünde */}
      {bolum === 'sakinler' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: '0.75rem', fontSize: 12, color: 'var(--metin3)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yesil-acik)', border: '1px solid var(--yesil)', display: 'inline-block' }} />
            Yazlıkçı
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--mavi)', border: '1px solid var(--mavi)', display: 'inline-block' }} />
            Devamlı
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yüzey)', border: '1px solid var(--kenarlık)', display: 'inline-block' }} />
            Sitede değil
          </span>
        </div>
      )}

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : (
        <>
          {/* SAKİNLER */}
          {bolum === 'sakinler' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtreli(sakinler).map(s => <SakinKart key={s.id} s={s} />)}
              {filtreli(sakinler).length === 0 && (
                <div className="bos-durum"><div className="bos-durum-ikon">🔍</div><p>Sonuç bulunamadı.</p></div>
              )}
            </div>
          )}

          {/* YÖNETİM KURULU */}
          {bolum === 'yonetim' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {yonetim.length === 0 ? (
                <div className="bos-durum">
                  <div className="bos-durum-ikon">🏛️</div>
                  <p>{isAdmin ? 'Sakin Yönetimi\'nden sakinleri yönetim üyesi olarak işaretleyebilirsiniz.' : 'Yönetim kurulu henüz belirlenmemiş.'}</p>
                </div>
              ) : filtreli(yonetim).map(s => <SakinKart key={s.id} s={s} />)}
            </div>
          )}

          {/* ÇALIŞANLAR */}
          {bolum === 'calisanlar' && (
            <>
              {isAdmin && (
                <button className="btn btn-ikincil" onClick={() => setCalisanForm({ adi: '', soyadi: '', gorev: '', telefon: '', telefon2: '', sira: calisanlar.length + 1 })}
                  style={{ width: '100%', marginBottom: '1rem', fontSize: 13 }}>
                  + Çalışan Ekle
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filtreli(calisanlar).map(c => (
                  <div key={c.id} className="kart" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--sari-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20
                    }}>
                      {c.gorev?.includes('Teknis') ? '🔧' : c.gorev?.includes('Bahç') ? '🌿' : c.gorev?.includes('Güven') ? '🔒' : '👷'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: 15 }}>{c.adi} {c.soyadi || ''}</p>
                      <p style={{ color: 'var(--metin3)', fontSize: 13 }}>{c.gorev}</p>
                      {c.telefon && (
                        <a href={`tel:${c.telefon}`} style={{ color: 'var(--yesil)', fontSize: 13, textDecoration: 'none' }}>{c.telefon}</a>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setCalisanForm({ ...c })} style={{ background: 'var(--mavi-bg)', color: 'var(--mavi)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Düzenle</button>
                        <button onClick={() => calisanSil(c.id)} style={{ background: 'var(--turuncu-bg)', color: 'var(--turuncu)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Sil</button>
                      </div>
                    )}
                  </div>
                ))}
                {filtreli(calisanlar).length === 0 && !isAdmin && (
                  <div className="bos-durum"><div className="bos-durum-ikon">👷</div><p>Henüz çalışan eklenmemiş.</p></div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Sakin detay modal */}
      {secili && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }} onClick={() => setSecili(null)}>
          <div className="kart" style={{ width: '100%', maxWidth: 480, margin: '0 auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: '16px 16px 0 0', padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', width: 56, height: 56 }}>
                {secili.fotograf_url ? (
                  <img src={secili.fotograf_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--yesil-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'var(--yesil)' }}>
                    {basTutar(secili)}
                  </div>
                )}
                {parseInt(secili.konum) === 1 && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: 'var(--yesil-acik)', border: '2px solid #fff' }} />}
                {parseInt(secili.konum) === 2 && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: 'var(--mavi)', border: '2px solid #fff' }} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 600 }}>{secili.adi} {secili.soyadi}</h2>
                  {secili.yonetim_uyesi && secili.yonetim_gorevi && (
                    <span className="rozet rozet-inceleniyor" style={{ fontSize: 10 }}>{secili.yonetim_gorevi}</span>
                  )}
                </div>
                <p style={{ color: 'var(--metin3)', fontSize: 13 }}>Daire {secili.daire_no || secili.daire}</p>
              </div>
            </div>
            <div className="ayirici" />
            {[
              ['📱 Cep', secili.ceptel],
              ['📱 Cep 2', secili.ceptel2],
              ['☎️ Ev', secili.tel1],
              ['✉️ E-posta', secili.email],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--metin3)' }}>{label}</span>
                <a href={label.includes('posta') ? `mailto:${val}` : `tel:${val}`} style={{ color: 'var(--yesil)', textDecoration: 'none', fontWeight: 500 }}>{val}</a>
              </div>
            ))}
            <button className="btn btn-ikincil" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setSecili(null)}>Kapat</button>
          </div>
        </div>
      )}

      {/* Çalışan ekle/düzenle modal */}
      {calisanForm !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }} onClick={() => setCalisanForm(null)}>
          <div className="kart" style={{ width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '16px 16px 0 0', padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: '1rem' }}>{calisanForm.id ? 'Çalışanı Düzenle' : 'Yeni Çalışan Ekle'}</h2>
            <form onSubmit={calisanKaydet}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Ad</label>
                  <input className="form-girdi" value={calisanForm.adi} onChange={e => setCalisanForm(f => ({...f, adi: e.target.value}))} required />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Soyad</label>
                  <input className="form-girdi" value={calisanForm.soyadi || ''} onChange={e => setCalisanForm(f => ({...f, soyadi: e.target.value}))} />
                </div>
              </div>
              <div className="form-grup">
                <label className="form-etiket">Görev</label>
                <input className="form-girdi" placeholder="Teknisyen, Bahçıvan, Güvenlik..." value={calisanForm.gorev} onChange={e => setCalisanForm(f => ({...f, gorev: e.target.value}))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Telefon</label>
                  <input className="form-girdi" value={calisanForm.telefon || ''} onChange={e => setCalisanForm(f => ({...f, telefon: e.target.value}))} />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Telefon 2</label>
                  <input className="form-girdi" value={calisanForm.telefon2 || ''} onChange={e => setCalisanForm(f => ({...f, telefon2: e.target.value}))} />
                </div>
              </div>
              <div className="form-grup">
                <label className="form-etiket">Sıra</label>
                <input className="form-girdi" type="number" value={calisanForm.sira || 0} onChange={e => setCalisanForm(f => ({...f, sira: parseInt(e.target.value)}))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ana" type="submit" disabled={calisanKayit} style={{ flex: 1 }}>
                  {calisanKayit ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button type="button" className="btn" onClick={() => setCalisanForm(null)} style={{ background: 'var(--yüzey)', color: 'var(--metin2)', border: '0.5px solid var(--kenarlık)' }}>Vazgeç</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
