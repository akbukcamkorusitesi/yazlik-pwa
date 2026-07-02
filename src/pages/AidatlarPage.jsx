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
  const [topluTutar, setTopluTutar] = useState('500')
  const [topluYukleniyor, setTopluYukleniyor] = useState(false)
  const [topluSonuc, setTopluSonuc] = useState(null)

  useEffect(() => {
    if (isAdmin) fetchSakinler()
    fetchAidatlar()
  }, [yil, seciliSakin])

  async function fetchSakinler() {
    const { data } = await supabase.from('sakinler').select('id, adi, soyadi, daire_no, daire').order('daire_no')
    setSakinler(data || [])
  }

  async function fetchAidatlar() {
    setYukleniyor(true)
    let q = supabase.from('aidatlar').select('*, sakinler(adi, soyadi, daire_no, daire)').eq('yil', yil).order('ay')
    if (!isAdmin && sakin) q = q.eq('sakin_id', sakin.id)
    if (isAdmin && seciliSakin) q = q.eq('sakin_id', seciliSakin)
    const { data } = await q
    setAidatlar(data || [])
    setYukleniyor(false)
  }

  // Tek sakin için yıl ekle
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

  // Tüm sakinler için toplu yıl ekle
  async function topluAidatEkle() {
    if (!isAdmin) return
    const tutar = parseFloat(topluTutar) || 500
    if (!confirm(`${yil} yılı için TÜM sakinlere ${tutar.toLocaleString('tr-TR')} ₺ aidat kaydı oluşturulacak. Zaten kaydı olanlar atlanacak. Devam edilsin mi?`)) return

    setTopluYukleniyor(true)
    setTopluSonuc(null)

    // Mevcut kayıtları çek
    const { data: mevcutlar } = await supabase
      .from('aidatlar')
      .select('sakin_id, ay')
      .eq('yil', yil)

    const mevcutSet = new Set((mevcutlar || []).map(m => `${m.sakin_id}-${m.ay}`))

    const yeniKayitlar = []
    for (const s of sakinler) {
      for (let ay = 1; ay <= 12; ay++) {
        if (!mevcutSet.has(`${s.id}-${ay}`)) {
          yeniKayitlar.push({ sakin_id: s.id, yil, ay, tutar, odendi: false })
        }
      }
    }

    if (yeniKayitlar.length === 0) {
      setTopluSonuc({ mesaj: 'Tüm sakinler için kayıtlar zaten mevcut.', tip: 'bilgi' })
      setTopluYukleniyor(false)
      return
    }

    // 500'lü batch'ler halinde ekle
    const BATCH = 500
    let eklenen = 0
    for (let i = 0; i < yeniKayitlar.length; i += BATCH) {
      const { error } = await supabase.from('aidatlar').insert(yeniKayitlar.slice(i, i + BATCH))
      if (!error) eklenen += Math.min(BATCH, yeniKayitlar.length - i)
    }

    setTopluSonuc({ mesaj: `${sakinler.length} sakin için ${eklenen} kayıt oluşturuldu.`, tip: 'basarili' })
    setTopluYukleniyor(false)
    fetchAidatlar()
  }

  // Tek ay ödeme toggle
  async function odemeToggle(aidat) {
    if (!isAdmin) return
    await supabase.from('aidatlar').update({
      odendi: !aidat.odendi,
      odeme_tarihi: !aidat.odendi ? new Date().toISOString().split('T')[0] : null
    }).eq('id', aidat.id)
    fetchAidatlar()
  }

  async function aidatSil(aidat) {
    if (!confirm(`${AYLAR[aidat.ay - 1]} ${yil} aidat kaydını silmek istediğinize emin misiniz?`)) return
    await supabase.from('aidatlar').delete().eq('id', aidat.id)
    fetchAidatlar()
  }

  async function yilSil() {
    if (!seciliSakin) return
    const sakinAdi = sakinler.find(s => s.id === seciliSakin)
    if (!confirm(`${sakinAdi?.adi} ${sakinAdi?.soyadi} için ${yil} yılına ait TÜM aidat kayıtları silinecek (ödenmiş olanlar dahil). Emin misiniz?`)) return
    await supabase.from('aidatlar').delete().eq('sakin_id', seciliSakin).eq('yil', yil)
    fetchAidatlar()
  }

  // Yıllık toplu ödeme işaretle
  async function yillikOdemeToggle() {
    if (!isAdmin || !seciliSakin) return
    const hepsiOdendi = aidatlar.every(a => a.odendi)
    const yeniDurum = !hepsiOdendi
    const bugun = new Date().toISOString().split('T')[0]

    await supabase.from('aidatlar').update({
      odendi: yeniDurum,
      odeme_tarihi: yeniDurum ? bugun : null
    }).eq('sakin_id', seciliSakin).eq('yil', yil)
    fetchAidatlar()
  }

  const toplamBorc = aidatlar.filter(a => !a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
  const toplamOdenen = aidatlar.filter(a => a.odendi).reduce((t, a) => t + Number(a.tutar), 0)
  const hepsiOdendi = aidatlar.length > 0 && aidatlar.every(a => a.odendi)

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Aidat Takibi</h1>

      {/* Yıl seçici */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
        <button onClick={() => setYil(y => y - 1)} style={{ background: 'none', border: '0.5px solid var(--kenarlık)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{yil}</span>
        <button onClick={() => setYil(y => y + 1)} style={{ background: 'none', border: '0.5px solid var(--kenarlık)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>›</button>
      </div>

      {isAdmin && (
        <>
          {/* Toplu aidat oluşturma */}
          <div className="kart" style={{ marginBottom: '1rem', background: 'var(--yüzey)' }}>
            <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Toplu Aidat Oluştur</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="form-etiket" style={{ fontSize: 11 }}>Aylık Tutar (₺)</label>
                <input
                  className="form-girdi"
                  type="number"
                  value={topluTutar}
                  onChange={e => setTopluTutar(e.target.value)}
                  style={{ fontSize: 13, padding: '7px 10px' }}
                />
              </div>
              <button
                className="btn btn-ana"
                onClick={topluAidatEkle}
                disabled={topluYukleniyor}
                style={{ fontSize: 12, padding: '8px 12px', width: 'auto', marginTop: 16 }}>
                {topluYukleniyor ? 'Oluşturuluyor...' : `Tüm Sakinlere ${yil} Ekle`}
              </button>
            </div>
            {topluSonuc && (
              <p style={{ fontSize: 12, color: topluSonuc.tip === 'basarili' ? 'var(--yesil)' : 'var(--metin3)' }}>
                {topluSonuc.mesaj}
              </p>
            )}
          </div>

          {/* Sakin seçici */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
            <select className="form-girdi" value={seciliSakin || ''} onChange={e => setSeciliSakin(e.target.value || null)} style={{ flex: 1 }}>
              <option value="">— Sakin seçin —</option>
              {sakinler.map(s => <option key={s.id} value={s.id}>{s.adi} {s.soyadi} (D.{s.daire_no || s.daire})</option>)}
            </select>
            {seciliSakin && (
              <button className="btn btn-ikincil" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={aidatEkle}>
                Yıl Ekle
              </button>
            )}
          </div>
        </>
      )}

      {/* Özet kartlar */}
      {(seciliSakin || !isAdmin) && aidatlar.length > 0 && (
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
      )}

      {/* Yıllık toplu ödeme + sil butonu */}
      {isAdmin && seciliSakin && aidatlar.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <button
            className="btn"
            onClick={yillikOdemeToggle}
            style={{
              flex: 1, fontSize: 13,
              background: hepsiOdendi ? 'var(--turuncu-bg)' : 'var(--yesil)',
              color: hepsiOdendi ? 'var(--turuncu)' : '#fff'
            }}>
            {hepsiOdendi ? `✕ ${yil} Yıllık Ödemeyi Geri Al` : `✓ ${yil} Yıllık Ödendi`}
          </button>
          <button
            className="btn"
            onClick={yilSil}
            style={{ background: 'var(--turuncu-bg)', color: 'var(--turuncu)', fontSize: 13, padding: '8px 12px' }}>
            🗑 Yılı Sil
          </button>
        </div>
      )}

      {/* Aidat listesi */}
      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : !seciliSakin && isAdmin ? (
        <div className="bos-durum">
          <div className="bos-durum-ikon">💰</div>
          <p>Yukarıdan sakin seçin veya "Tüm Sakinlere Ekle" ile toplu oluşturun.</p>
        </div>
      ) : aidatlar.length === 0 ? (
        <div className="bos-durum">
          <div className="bos-durum-ikon">💰</div>
          <p>{isAdmin ? '"Yıl Ekle" ile bu sakin için aidat kayıtlarını oluşturun.' : 'Aidat kaydı bulunamadı.'}</p>
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                  <button
                    onClick={() => aidatSil(a)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--kenarlık)',
                      background: 'var(--turuncu-bg)', color: 'var(--turuncu)',
                      cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    🗑
                  </button>
                </div>
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
