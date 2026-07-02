import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Banka ekstresi sütun eşleştirme tahminleri
// Garanti: Açıklama, Tutar, Tarih
// Ziraat: Açıklama, Alacak, İşlem Tarihi  
// İşbankası: Açıklama, Tutar, Tarih
const BANKA_TAHMINLERI = {
  aciklama: ['açıklama', 'aciklama', 'description', 'detay', 'işlem açıklaması', 'karşı taraf'],
  tutar: ['tutar', 'alacak', 'amount', 'credit', 'gelen', 'tahsilat'],
  tarih: ['tarih', 'date', 'işlem tarihi', 'valör'],
}

export default function AidatAyarlarPage() {
  const { isAdmin } = useAuth()
  const [ayarlar, setAyarlar] = useState({ aidat_tutari: '500', aidat_yili: new Date().getFullYear().toString() })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [sakinler, setSakinler] = useState([])

  // Banka ekstresi state'leri
  const [ekstreVerisi, setEkstreVerisi] = useState(null)
  const [sutunlar, setSutunlar] = useState([])
  const [eslestirme, setEslestirme] = useState({ aciklama: '', tutar: '', tarih: '' })
  const [eslesmeAy, setEslesmeAy] = useState(new Date().getMonth() + 1)
  const [eslesmeYil, setEslesmeYil] = useState(new Date().getFullYear())
  const [eslesmeMinTutar, setEslesmeMinTutar] = useState('')
  const [sonuclar, setSonuclar] = useState(null)
  const [isleniyor, setIsleniyor] = useState(false)
  const dosyaRef = useRef()

  const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

  useEffect(() => {
    fetchAyarlar()
    fetchSakinler()
  }, [])

  async function fetchAyarlar() {
    const { data } = await supabase.from('ayarlar').select('*')
    if (data) {
      const obj = {}
      data.forEach(a => obj[a.anahtar] = a.deger)
      setAyarlar(a => ({ ...a, ...obj }))
    }
  }

  async function fetchSakinler() {
    const { data } = await supabase.from('sakinler').select('id, adi, soyadi, daire_no, daire').order('daire_no')
    setSakinler(data || [])
  }

  async function ayarKaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    for (const [anahtar, deger] of Object.entries(ayarlar)) {
      await supabase.from('ayarlar').upsert({ anahtar, deger }, { onConflict: 'anahtar' })
    }
    setKaydediliyor(false)
    setMesaj('Kaydedildi!')
    setTimeout(() => setMesaj(''), 3000)
  }

  // CSV/Excel dosyasını oku
  async function dosyaOku(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return

    const metin = await dosya.text()
    const satirlar = metin.split('\n').filter(s => s.trim())
    if (satirlar.length < 2) return alert('Dosya çok az satır içeriyor.')

    // CSV parse (basit, tırnaklı değerleri de destekler)
    const ayristir = (satir) => {
      const sonuc = []
      let alan = '', tirnakIci = false
      for (const ch of satir) {
        if (ch === '"') { tirnakIci = !tirnakIci }
        else if (ch === ',' && !tirnakIci) { sonuc.push(alan.trim()); alan = '' }
        else alan += ch
      }
      sonuc.push(alan.trim())
      return sonuc
    }

    // Noktalı virgül veya virgül ayırıcı
    const ilkSatir = satirlar[0]
    const ayirici = ilkSatir.includes(';') ? ';' : ','
    const ayristirFn = ayirici === ';'
      ? (s) => s.split(';').map(a => a.trim().replace(/^"|"$/g, ''))
      : ayristir

    const basliklar = ayristirFn(satirlar[0])
    const satirListesi = satirlar.slice(1).map(s => {
      const degerler = ayristirFn(s)
      const obj = {}
      basliklar.forEach((b, i) => obj[b] = degerler[i] || '')
      return obj
    }).filter(s => Object.values(s).some(v => v))

    setSutunlar(basliklar)
    setEkstreVerisi(satirListesi)

    // Otomatik sütun tahmin et
    const yeniEslestirme = { aciklama: '', tutar: '', tarih: '' }
    for (const [alan, tahminler] of Object.entries(BANKA_TAHMINLERI)) {
      const bulunan = basliklar.find(b => tahminler.some(t => b.toLowerCase().includes(t)))
      if (bulunan) yeniEslestirme[alan] = bulunan
    }
    setEslestirme(yeniEslestirme)
    setSonuclar(null)
  }

  // Ekstredeki satırları sakinlerle eşleştir
  async function ekstreEslesitir() {
    if (!ekstreVerisi || !eslestirme.aciklama) return alert('Açıklama sütununu seçin.')
    setIsleniyor(true)
    setSonuclar(null)

    const minTutar = parseFloat(eslesmeMinTutar) || 0

    // Sakinlerin eşleştirme anahtar kelimelerini oluştur
    const sakinEslestirme = sakinler.map(s => ({
      ...s,
      anahtarlar: [
        String(s.daire_no || ''),
        s.daire?.toLowerCase() || '',
        s.adi?.toLowerCase() || '',
        s.soyadi?.toLowerCase() || '',
        `${s.adi?.toLowerCase()} ${s.soyadi?.toLowerCase()}`,
        `${s.soyadi?.toLowerCase()} ${s.adi?.toLowerCase()}`,
      ].filter(Boolean)
    }))

    const eslesen = []
    const eslesmeyenEkstre = []
    const eslesmeyenSakinler = new Set(sakinler.map(s => s.id))

    for (const satir of ekstreVerisi) {
      const aciklama = (satir[eslestirme.aciklama] || '').toLowerCase()
      // Türkçe format: 1.500,00 → önce binlik noktaları kaldır, sonra virgülü noktaya çevir
      const tutarTemiz = (satir[eslestirme.tutar] || '')
        .replace(/\./g, '')      // binlik nokta kaldır
        .replace(',', '.')       // ondalık virgülü noktaya çevir
        .replace(/[^\d.\-]/g, '') // sadece rakam, nokta ve eksi bırak
      const tutar = parseFloat(tutarTemiz) || 0
      const tarih = eslestirme.tarih ? satir[eslestirme.tarih] : ''

      if (minTutar > 0 && tutar < minTutar) continue
      if (!aciklama) continue

      // Sakin eşleştir
      let eslesenSakin = null
      for (const s of sakinEslestirme) {
        if (s.anahtarlar.some(k => k && k.length >= 3 && aciklama.includes(k))) {
          eslesenSakin = s
          break
        }
      }

      if (eslesenSakin) {
        eslesen.push({ sakin: eslesenSakin, tutar, tarih, aciklama: satir[eslestirme.aciklama] })
        eslesmeyenSakinler.delete(eslesenSakin.id)
      } else {
        eslesmeyenEkstre.push({ aciklama: satir[eslestirme.aciklama], tutar, tarih })
      }
    }

    setSonuclar({
      eslesen,
      eslesmeyenEkstre,
      eslesmeyenSakinler: sakinler.filter(s => eslesmeyenSakinler.has(s.id))
    })
    setIsleniyor(false)
  }

  // Eşleşenleri ödendi olarak işaretle
  async function odediIsaretle() {
    if (!sonuclar?.eslesen?.length) return
    const bugun = new Date().toISOString().split('T')[0]
    let isaretlen = 0

    for (const { sakin } of sonuclar.eslesen) {
      const { data: aidat } = await supabase
        .from('aidatlar')
        .select('id, odendi')
        .eq('sakin_id', sakin.id)
        .eq('yil', eslesmeYil)
        .eq('ay', eslesmeAy)
        .single()

      if (aidat && !aidat.odendi) {
        await supabase.from('aidatlar').update({ odendi: true, odeme_tarihi: bugun }).eq('id', aidat.id)
        isaretlen++
      }
    }

    alert(`${isaretlen} sakin ödendi olarak işaretlendi.`)
    setSonuclar(null)
    setEkstreVerisi(null)
    if (dosyaRef.current) dosyaRef.current.value = ''
  }

  if (!isAdmin) return <div className="sayfa"><p>Bu sayfa sadece admin içindir.</p></div>

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Aidat Ayarları</h1>

      {/* GENEL AYARLAR */}
      <div className="kart" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>Genel Ayarlar</p>
        <form onSubmit={ayarKaydet}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
            <div className="form-grup" style={{ marginBottom: 0 }}>
              <label className="form-etiket">Aylık Aidat Tutarı (₺)</label>
              <input className="form-girdi" type="number" value={ayarlar.aidat_tutari}
                onChange={e => setAyarlar(a => ({...a, aidat_tutari: e.target.value}))} />
            </div>
            <div className="form-grup" style={{ marginBottom: 0 }}>
              <label className="form-etiket">Aktif Yıl</label>
              <input className="form-girdi" type="number" value={ayarlar.aidat_yili}
                onChange={e => setAyarlar(a => ({...a, aidat_yili: e.target.value}))} />
            </div>
          </div>
          {mesaj && <p style={{ color: 'var(--yesil)', fontSize: 13, marginBottom: 8 }}>{mesaj}</p>}
          <button className="btn btn-ana" type="submit" disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </div>

      {/* BANKA EKSTRESİ */}
      <div className="kart">
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Banka Ekstresi ile Otomatik Eşleştirme</p>
        <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: '1rem' }}>
          Garanti, Ziraat veya İşbankası'ndan indirdiğiniz CSV/Excel ekstresini yükleyin.
          Sistem daire no veya ad-soyadı eşleştirerek otomatik "ödendi" işaretler.
        </p>

        {/* Dönem seçimi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1rem' }}>
          <div className="form-grup" style={{ marginBottom: 0 }}>
            <label className="form-etiket">Yıl</label>
            <input className="form-girdi" type="number" value={eslesmeYil}
              onChange={e => setEslesmeYil(parseInt(e.target.value))} />
          </div>
          <div className="form-grup" style={{ marginBottom: 0 }}>
            <label className="form-etiket">Ay</label>
            <select className="form-girdi" value={eslesmeAy} onChange={e => setEslesmeAy(parseInt(e.target.value))}>
              {AYLAR.map((ad, i) => <option key={i} value={i+1}>{ad}</option>)}
            </select>
          </div>
          <div className="form-grup" style={{ marginBottom: 0 }}>
            <label className="form-etiket">Min. Tutar (₺)</label>
            <input className="form-girdi" type="number" placeholder="0" value={eslesmeMinTutar}
              onChange={e => setEslesmeMinTutar(e.target.value)} />
          </div>
        </div>

        {/* Dosya yükleme */}
        <div className="form-grup">
          <label className="form-etiket">Ekstre Dosyası (CSV)</label>
          <input ref={dosyaRef} type="file" accept=".csv,.txt" onChange={dosyaOku}
            style={{ fontSize: 13 }} />
        </div>

        {/* Sütun eşleştirme */}
        {sutunlar.length > 0 && (
          <>
            <div className="ayirici" />
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Sütun Eşleştirme</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              {[['aciklama','Açıklama'],['tutar','Tutar'],['tarih','Tarih']].map(([alan, etiket]) => (
                <div key={alan} className="form-grup" style={{ marginBottom: 0 }}>
                  <label className="form-etiket">{etiket}</label>
                  <select className="form-girdi" value={eslestirme[alan]}
                    onChange={e => setEslestirme(es => ({...es, [alan]: e.target.value}))}>
                    <option value="">Seçin</option>
                    {sutunlar.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button className="btn btn-ana" onClick={ekstreEslesitir} disabled={isleniyor}>
              {isleniyor ? 'Eşleştiriliyor...' : 'Eşleştir'}
            </button>
          </>
        )}

        {/* Sonuçlar */}
        {sonuclar && (
          <>
            <div className="ayirici" style={{ marginTop: '1rem' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '1rem 0' }}>
              <div className="kart" style={{ background: 'var(--yesil-bg)', padding: '0.75rem' }}>
                <p style={{ fontSize: 11, color: 'var(--yesil)' }}>Eşleşen</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--yesil)' }}>{sonuclar.eslesen.length}</p>
              </div>
              <div className="kart" style={{ background: 'var(--turuncu-bg)', padding: '0.75rem' }}>
                <p style={{ fontSize: 11, color: 'var(--turuncu)' }}>Eşleşmeyen</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--turuncu)' }}>{sonuclar.eslesmeyenEkstre.length}</p>
              </div>
            </div>

            {sonuclar.eslesen.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>✅ Eşleşenler</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
                  {sonuclar.eslesen.map((e, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '0.5px solid var(--kenarlık)' }}>
                      <span><strong>D.{e.sakin.daire_no || e.sakin.daire}</strong> {e.sakin.adi} {e.sakin.soyadi}</span>
                      <span style={{ color: 'var(--yesil)', fontWeight: 500 }}>{e.tutar.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ana" onClick={odediIsaretle}>
                  ✓ {sonuclar.eslesen.length} Kişiyi Ödendi Olarak İşaretle
                </button>
              </>
            )}

            {sonuclar.eslesmeyenEkstre.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '1rem 0 8px' }}>❓ Eşleşemeyen Ekstre Satırları</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sonuclar.eslesmeyenEkstre.slice(0, 10).map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--metin3)', padding: '4px 0', borderBottom: '0.5px solid var(--kenarlık)' }}>
                      <span>{e.aciklama}</span>
                      {e.tutar > 0 && <span style={{ float: 'right' }}>{e.tutar.toLocaleString('tr-TR')} ₺</span>}
                    </div>
                  ))}
                  {sonuclar.eslesmeyenEkstre.length > 10 && (
                    <p style={{ fontSize: 12, color: 'var(--metin3)' }}>...ve {sonuclar.eslesmeyenEkstre.length - 10} satır daha</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
