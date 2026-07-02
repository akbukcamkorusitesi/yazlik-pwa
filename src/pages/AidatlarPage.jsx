import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

export default function AidatlarPage() {
  const { sakin, isAdmin } = useAuth()
  const bugunYil = new Date().getFullYear()
  const bugunAy  = new Date().getMonth() + 1

  const [mod, setMod] = useState('ay')          // 'ay' | 'sakin'
  const [yil, setYil] = useState(bugunYil)
  const [ay,  setAy]  = useState(bugunAy)
  const [filtre, setFiltre] = useState('hepsi') // 'hepsi' | 'bekliyor' | 'odendi'
  const [arama, setArama] = useState('')

  const [sakinler,  setSakinler]  = useState([])
  const [aidatlar,  setAidatlar]  = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliSakin, setSeciliSakin] = useState(null)

  // Toplu oluşturma state'leri
  const [topluTutar,     setTopluTutar]     = useState('500')
  const [topluYukleniyor, setTopluYukleniyor] = useState(false)
  const [topluSonuc,     setTopluSonuc]     = useState(null)
  const [topluAcik,      setTopluAcik]      = useState(false)

  useEffect(() => { if (isAdmin) fetchSakinler() }, [])
  useEffect(() => { fetchAidatlar() }, [yil, ay, mod, seciliSakin])

  async function fetchSakinler() {
    const { data } = await supabase
      .from('sakinler')
      .select('id, adi, soyadi, daire_no, daire')
      .order('daire_no')
    setSakinler(data || [])
  }

  async function fetchAidatlar() {
    setYukleniyor(true)
    let q = supabase.from('aidatlar')
      .select('*, sakinler(id, adi, soyadi, daire_no, daire)')
      .eq('yil', yil)

    if (mod === 'ay') q = q.eq('ay', ay)
    if (!isAdmin && sakin) q = q.eq('sakin_id', sakin.id)
    if (isAdmin && mod === 'sakin' && seciliSakin) q = q.eq('sakin_id', seciliSakin)

    const { data } = await q.order('ay')
    setAidatlar(data || [])
    setYukleniyor(false)
  }

  // Filtrelenmiş liste
  const filtreli = useMemo(() => {
    let liste = [...aidatlar]
    if (filtre === 'bekliyor') liste = liste.filter(a => !a.odendi)
    if (filtre === 'odendi')   liste = liste.filter(a => a.odendi)
    if (arama.trim()) {
      const s = arama.toLowerCase()
      liste = liste.filter(a =>
        `${a.sakinler?.adi} ${a.sakinler?.soyadi} ${a.sakinler?.daire_no}`.toLowerCase().includes(s)
      )
    }
    return liste
  }, [aidatlar, filtre, arama])

  // Özet istatistikler
  const ozet = useMemo(() => {
    const toplam    = aidatlar.length
    const odenen    = aidatlar.filter(a => a.odendi).length
    const bekleyen  = toplam - odenen
    const tahsil    = aidatlar.filter(a => a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
    const borc      = aidatlar.filter(a => !a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
    return { toplam, odenen, bekleyen, tahsil, borc }
  }, [aidatlar])

  async function odemeToggle(aidat) {
    if (!isAdmin) return
    await supabase.from('aidatlar').update({
      odendi: !aidat.odendi,
      odeme_tarihi: !aidat.odendi ? new Date().toISOString().split('T')[0] : null
    }).eq('id', aidat.id)
    fetchAidatlar()
  }

  async function aidatSil(aidat) {
    if (!confirm(`${AYLAR[aidat.ay-1]} ${yil} kaydını sil?`)) return
    await supabase.from('aidatlar').delete().eq('id', aidat.id)
    fetchAidatlar()
  }

  async function aidatEkle() {
    if (!isAdmin || !seciliSakin) return
    const mevcutAylar = aidatlar.map(a => a.ay)
    const eksikAylar = [1,2,3,4,5,6,7,8,9,10,11,12].filter(ay => !mevcutAylar.includes(ay))
    if (eksikAylar.length === 0) return alert('Bu sakin için tüm aylar zaten ekli.')
    const tutar = parseFloat(topluTutar) || 500
    await supabase.from('aidatlar').insert(
      eksikAylar.map(ay => ({ sakin_id: seciliSakin, yil, ay, tutar, odendi: false }))
    )
    fetchAidatlar()
  }

  async function yilSil() {
    if (!seciliSakin) return
    const s = sakinler.find(s => s.id === seciliSakin)
    if (!confirm(`${s?.adi} ${s?.soyadi} için ${yil} yılı tüm aidat kayıtları silinecek. Emin misiniz?`)) return
    await supabase.from('aidatlar').delete().eq('sakin_id', seciliSakin).eq('yil', yil)
    fetchAidatlar()
  }

  async function yillikOdemeToggle() {
    if (!seciliSakin) return
    const hepsi = aidatlar.every(a => a.odendi)
    const bugun = new Date().toISOString().split('T')[0]
    await supabase.from('aidatlar').update({
      odendi: !hepsi,
      odeme_tarihi: !hepsi ? bugun : null
    }).eq('sakin_id', seciliSakin).eq('yil', yil)
    fetchAidatlar()
  }

  async function topluAidatEkle() {
    const tutar = parseFloat(topluTutar) || 500
    if (!confirm(`${yil} yılı için TÜM sakinlere ${tutar.toLocaleString('tr-TR')} ₺/ay aidat kaydı oluşturulacak. Zaten kaydı olanlar atlanacak. Devam?`)) return
    setTopluYukleniyor(true)
    setTopluSonuc(null)

    const { data: mevcutlar } = await supabase.from('aidatlar').select('sakin_id, ay').eq('yil', yil)
    const mevcutSet = new Set((mevcutlar || []).map(m => `${m.sakin_id}-${m.ay}`))

    const yeniKayitlar = []
    for (const s of sakinler) {
      for (let a = 1; a <= 12; a++) {
        if (!mevcutSet.has(`${s.id}-${a}`)) {
          yeniKayitlar.push({ sakin_id: s.id, yil, ay: a, tutar, odendi: false })
        }
      }
    }

    if (yeniKayitlar.length === 0) {
      setTopluSonuc({ mesaj: 'Tüm kayıtlar zaten mevcut.', renk: 'var(--metin3)' })
      setTopluYukleniyor(false)
      return
    }

    let eklenen = 0
    for (let i = 0; i < yeniKayitlar.length; i += 500) {
      const { error } = await supabase.from('aidatlar').insert(yeniKayitlar.slice(i, i + 500))
      if (!error) eklenen += Math.min(500, yeniKayitlar.length - i)
    }

    setTopluSonuc({ mesaj: `✓ ${sakinler.length} sakin için ${eklenen} kayıt oluşturuldu.`, renk: 'var(--yesil)' })
    setTopluYukleniyor(false)
    fetchAidatlar()
  }

  const hepsiOdendi = aidatlar.length > 0 && aidatlar.every(a => a.odendi)

  // Sakin görünümü için tutar toplamı
  const sakinOzet = useMemo(() => {
    if (mod !== 'sakin') return null
    const odenen   = aidatlar.filter(a => a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
    const bekleyen = aidatlar.filter(a => !a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
    return { odenen, bekleyen }
  }, [aidatlar, mod])

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Aidat Takibi</h1>

      {/* MOD SEÇİCİ */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          {[['ay','📅 Aylık Tablo'],['sakin','👤 Sakin Detayı']].map(([m, label]) => (
            <button key={m} onClick={() => setMod(m)} style={{
              flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              border: `1.5px solid ${mod === m ? 'var(--yesil)' : 'var(--kenarlık)'}`,
              background: mod === m ? 'var(--yesil-bg)' : '#fff',
              color: mod === m ? 'var(--yesil)' : 'var(--metin2)',
              fontWeight: mod === m ? 600 : 400
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* YIL SEÇİCİ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
        <button onClick={() => setYil(y => y-1)} style={{ background: 'none', border: '0.5px solid var(--kenarlık)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{yil}</span>
        <button onClick={() => setYil(y => y+1)} style={{ background: 'none', border: '0.5px solid var(--kenarlık)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>›</button>
      </div>

      {/* ===== AYLIK TABLO MODU ===== */}
      {(mod === 'ay' || !isAdmin) && (
        <>
          {/* Ay seçici - kaydırılabilir */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: '1rem' }}>
            {AYLAR.map((ad, i) => (
              <button key={i} onClick={() => setAy(i+1)} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1.5px solid ${ay === i+1 ? 'var(--yesil)' : 'var(--kenarlık)'}`,
                background: ay === i+1 ? 'var(--yesil)' : '#fff',
                color: ay === i+1 ? '#fff' : 'var(--metin2)',
                fontWeight: ay === i+1 ? 600 : 400
              }}>{ad.slice(0,3)}</button>
            ))}
          </div>

          {/* Özet */}
          {aidatlar.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              <div className="kart" style={{ textAlign: 'center', padding: '0.75rem' }}>
                <p style={{ fontSize: 11, color: 'var(--metin3)' }}>Ödedi</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--yesil)' }}>{ozet.odenen}</p>
              </div>
              <div className="kart" style={{ textAlign: 'center', padding: '0.75rem' }}>
                <p style={{ fontSize: 11, color: 'var(--metin3)' }}>Bekliyor</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: ozet.bekleyen > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>{ozet.bekleyen}</p>
              </div>
              <div className="kart" style={{ textAlign: 'center', padding: '0.75rem' }}>
                <p style={{ fontSize: 11, color: 'var(--metin3)' }}>Toplam</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--metin)' }}>{ozet.toplam}</p>
              </div>
            </div>
          )}

          {/* Tutar özeti */}
          {aidatlar.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              <div className="kart" style={{ background: 'var(--yesil-bg)' }}>
                <p style={{ fontSize: 11, color: 'var(--yesil)' }}>Tahsil</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--yesil)' }}>{ozet.tahsil.toLocaleString('tr-TR')} ₺</p>
              </div>
              <div className="kart" style={{ background: ozet.borc > 0 ? 'var(--turuncu-bg)' : 'var(--yüzey)' }}>
                <p style={{ fontSize: 11, color: ozet.borc > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>Bekleyen</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: ozet.borc > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>{ozet.borc.toLocaleString('tr-TR')} ₺</p>
              </div>
            </div>
          )}

          {/* Arama + Filtre */}
          {isAdmin && aidatlar.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
              <input className="form-girdi" placeholder="İsim veya daire ara..." value={arama} onChange={e => setArama(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
              <select className="form-girdi" value={filtre} onChange={e => setFiltre(e.target.value)} style={{ width: 120, fontSize: 13 }}>
                <option value="hepsi">Tümü</option>
                <option value="bekliyor">Bekliyor</option>
                <option value="odendi">Ödendi</option>
              </select>
            </div>
          )}

          {/* Liste */}
          {yukleniyor ? (
            <div className="yukleniyor">Yükleniyor...</div>
          ) : aidatlar.length === 0 ? (
            <div className="bos-durum">
              <div className="bos-durum-ikon">💰</div>
              <p>{isAdmin ? 'Bu ay için kayıt yok. "Toplu Oluştur" ile oluşturun.' : 'Aidat kaydı yok.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filtreli.map(a => (
                <div key={a.id} className="kart" style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  borderLeft: `3px solid ${a.odendi ? 'var(--yesil)' : 'var(--kenarlık)'}`
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: 14 }}>
                      {a.sakinler?.adi} {a.sakinler?.soyadi}
                    </p>
                    <p style={{ color: 'var(--metin3)', fontSize: 12 }}>
                      Daire {a.sakinler?.daire_no || a.sakinler?.daire}
                      {a.odeme_tarihi && ` · ${new Date(a.odeme_tarihi).toLocaleDateString('tr-TR')}`}
                    </p>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13, color: a.odendi ? 'var(--yesil)' : 'var(--metin2)' }}>
                    {Number(a.tutar).toLocaleString('tr-TR')} ₺
                  </span>
                  {isAdmin && (
                    <button onClick={() => odemeToggle(a)} style={{
                      width: 30, height: 30, borderRadius: '50%', border: '2px solid',
                      borderColor: a.odendi ? 'var(--yesil)' : 'var(--kenarlık)',
                      background: a.odendi ? 'var(--yesil)' : 'transparent',
                      color: a.odendi ? '#fff' : 'var(--metin3)',
                      cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>{a.odendi ? '✓' : ''}</button>
                  )}
                  {!isAdmin && (
                    <span className={`rozet ${a.odendi ? 'rozet-normal' : 'rozet-acil'}`}>
                      {a.odendi ? 'Ödendi' : 'Bekliyor'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Toplu oluştur (admin) */}
          {isAdmin && (
            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-ikincil" onClick={() => setTopluAcik(!topluAcik)} style={{ width: '100%', fontSize: 13 }}>
                {topluAcik ? '✕ Kapat' : '⚙️ Toplu Aidat Oluştur'}
              </button>
              {topluAcik && (
                <div className="kart" style={{ marginTop: 8, background: 'var(--yüzey)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-etiket">Aylık Tutar (₺)</label>
                      <input className="form-girdi" type="number" value={topluTutar} onChange={e => setTopluTutar(e.target.value)} style={{ fontSize: 13 }} />
                    </div>
                    <button className="btn btn-ana" onClick={topluAidatEkle} disabled={topluYukleniyor} style={{ fontSize: 12, padding: '11px 14px', width: 'auto' }}>
                      {topluYukleniyor ? 'Oluşturuluyor...' : `Tüm Sakinlere ${yil} Ekle`}
                    </button>
                  </div>
                  {topluSonuc && <p style={{ fontSize: 12, color: topluSonuc.renk }}>{topluSonuc.mesaj}</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== SAKİN DETAY MODU ===== */}
      {isAdmin && mod === 'sakin' && (
        <>
          <select className="form-girdi" value={seciliSakin || ''} onChange={e => setSeciliSakin(e.target.value || null)} style={{ marginBottom: '1rem' }}>
            <option value="">— Sakin seçin —</option>
            {sakinler.map(s => <option key={s.id} value={s.id}>{s.adi} {s.soyadi} (D.{s.daire_no || s.daire})</option>)}
          </select>

          {seciliSakin && sakinOzet && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                <div className="kart" style={{ background: 'var(--yesil-bg)' }}>
                  <p style={{ fontSize: 11, color: 'var(--yesil)' }}>Ödenen</p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--yesil)' }}>{sakinOzet.odenen.toLocaleString('tr-TR')} ₺</p>
                </div>
                <div className="kart" style={{ background: sakinOzet.bekleyen > 0 ? 'var(--turuncu-bg)' : 'var(--yüzey)' }}>
                  <p style={{ fontSize: 11, color: sakinOzet.bekleyen > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>Borç</p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: sakinOzet.bekleyen > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>{sakinOzet.bekleyen.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>

              {aidatlar.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                  <button className="btn" onClick={yillikOdemeToggle} style={{
                    flex: 1, fontSize: 12,
                    background: hepsiOdendi ? 'var(--turuncu-bg)' : 'var(--yesil)',
                    color: hepsiOdendi ? 'var(--turuncu)' : '#fff'
                  }}>
                    {hepsiOdendi ? `✕ ${yil} Ödemeleri Geri Al` : `✓ ${yil} Yıllık Ödendi`}
                  </button>
                  <button className="btn" onClick={yilSil} style={{ background: 'var(--turuncu-bg)', color: 'var(--turuncu)', fontSize: 12, padding: '8px 12px' }}>
                    🗑 Yılı Sil
                  </button>
                  <button className="btn btn-ikincil" onClick={aidatEkle} style={{ fontSize: 12, padding: '8px 12px' }}>
                    + Yıl Ekle
                  </button>
                </div>
              )}
            </>
          )}

          {yukleniyor ? (
            <div className="yukleniyor">Yükleniyor...</div>
          ) : !seciliSakin ? (
            <div className="bos-durum"><div className="bos-durum-ikon">👤</div><p>Sakin seçin.</p></div>
          ) : aidatlar.length === 0 ? (
            <div className="bos-durum">
              <div className="bos-durum-ikon">💰</div>
              <p>Kayıt yok.
                <button className="btn btn-ikincil" onClick={aidatEkle} style={{ display: 'block', margin: '0.75rem auto 0', fontSize: 13 }}>+ {yil} Yılını Ekle</button>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {aidatlar.map(a => (
                <div key={a.id} className="kart" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: a.odendi ? 'var(--yesil-bg)' : 'var(--yüzey)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: a.odendi ? 'var(--yesil)' : 'var(--metin3)'
                  }}>{AYLAR[a.ay-1].slice(0,3)}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: 14 }}>{AYLAR[a.ay-1]}</p>
                    {a.odeme_tarihi && <p style={{ fontSize: 12, color: 'var(--metin3)' }}>{new Date(a.odeme_tarihi).toLocaleDateString('tr-TR')}</p>}
                  </div>
                  <span style={{ fontWeight: 600, color: a.odendi ? 'var(--yesil)' : 'var(--metin2)', fontSize: 13 }}>
                    {Number(a.tutar).toLocaleString('tr-TR')} ₺
                  </span>
                  <button onClick={() => odemeToggle(a)} style={{
                    width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                    borderColor: a.odendi ? 'var(--yesil)' : 'var(--kenarlık)',
                    background: a.odendi ? 'var(--yesil)' : 'transparent',
                    color: a.odendi ? '#fff' : 'var(--metin3)',
                    cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>{a.odendi ? '✓' : ''}</button>
                  <button onClick={() => aidatSil(a)} style={{
                    width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--kenarlık)',
                    background: 'var(--turuncu-bg)', color: 'var(--turuncu)',
                    cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Sakin modunda yıl ekle fonksiyonu (dışarıdan erişim için — component içinde)
AidatlarPage.displayName = 'AidatlarPage'
