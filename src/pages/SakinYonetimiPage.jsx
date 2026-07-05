import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BOS_FORM = {
  daire: '', daire_no: '', adi: '', soyadi: '', tc_kimlik: '',
  es_adi: '', baba_adi: '', anne_adi: '', ceptel: '', ceptel2: '', tel1: '', email: '', ev_adresi: '',
  plaka: '', cocuk_sayisi: '', aciklama: '', fotograf_url: '',
  dogum_tarihi: '', dogum_yeri: '', meslek: '', konum: 0
}

export default function SakinYonetimiPage() {
  const [sakinler, setSakinler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [form, setForm] = useState(BOS_FORM)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [fotografYukleniyor, setFotografYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [hesapArama, setHesapArama] = useState('')
  const [hesapBaglaniyor, setHesapBaglaniyor] = useState(false)
  const [basvurular, setBasvurular] = useState([])
  const [basvuruIsleniyor, setBasvuruIsleniyor] = useState(null)
  const [eslesmeArama, setEslesmeArama] = useState({})
  const [detayAcik, setDetayAcik] = useState(null)

  useEffect(() => { fetchSakinler(); fetchBasvurular() }, [])

  async function fetchBasvurular() {
    const { data } = await supabase
      .from('basvurular')
      .select('*')
      .eq('durum', 'bekliyor')
      .order('created_at', { ascending: false })
    setBasvurular(data || [])
  }

  async function basvuruOnayla(basvuru, eslesenSakinId = null) {
    if (!confirm(`${basvuru.adi} ${basvuru.soyadi} (Daire ${basvuru.daire_no}) başvurusunu onaylamak istediğinize emin misiniz?`)) return
    setBasvuruIsleniyor(basvuru.id)

    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('basvuru-onayla', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { basvuru_id: basvuru.id, eslesen_sakin_id: eslesenSakinId }
    })

    setBasvuruIsleniyor(null)

    if (error) { alert('Onaylanamadı: ' + error.message); return }
    if (data?.sifre) {
      alert(`Hesap oluşturuldu!\n\nKullanıcı adı: ${data.email}\nŞifre: ${data.sifre}\n\nBu bilgiyi sakine iletin.`)
    } else {
      alert('Mevcut hesaba bağlandı.')
    }
    fetchBasvurular()
    fetchSakinler()
  }

  async function basvuruReddet(basvuru) {
    if (!confirm(`${basvuru.adi} ${basvuru.soyadi} başvurusunu reddetmek istediğinize emin misiniz?`)) return
    await supabase.from('basvurular').update({ durum: 'reddedildi', islenme_tarihi: new Date().toISOString() }).eq('id', basvuru.id)
    fetchBasvurular()
  }

  async function fetchSakinler() {
    setYukleniyor(true)
    const { data } = await supabase
      .from('sakinler')
      .select('*')
      .order('daire_no', { ascending: true, nullsFirst: false })
    setSakinler(data || [])
    setYukleniyor(false)
  }

  function yeniEkleAc() {
    setForm(BOS_FORM)
    setDuzenlenenId(null)
    setFormAcik(true)
    setHata('')
  }

  function csvIndir() {
    if (sakinler.length === 0) { alert('İndirilecek veri yok.'); return }

    const sutunlar = [
      'daire_no','daire','adi','soyadi','tc_kimlik','es_adi','baba_adi','anne_adi',
      'ceptel','ceptel2','tel1','email','ev_adresi','plaka','cocuk_sayisi',
      'dogum_tarihi','dogum_yeri','meslek','aciklama','konum'
    ]

    const satirlar = sakinler.map(s =>
      sutunlar.map(k => {
        const val = s[k]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str
      }).join(',')
    )

    const icerik = [sutunlar.join(','), ...satirlar].join('\n')
    const blob = new Blob(['\ufeff' + icerik], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sakinler-yedek-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function duzenleAc(s) {
    setForm({
      daire: s.daire || '', daire_no: s.daire_no || '', adi: s.adi || '', soyadi: s.soyadi || '',
      tc_kimlik: s.tc_kimlik || '', es_adi: s.es_adi || '', baba_adi: s.baba_adi || '', anne_adi: s.anne_adi || '',
      ceptel: s.ceptel || '', ceptel2: s.ceptel2 || '', tel1: s.tel1 || '', email: s.email || '',
      ev_adresi: s.ev_adresi || '', plaka: s.plaka || '', cocuk_sayisi: s.cocuk_sayisi ?? '',
      aciklama: s.aciklama || '', fotograf_url: s.fotograf_url || '',
      dogum_tarihi: s.dogum_tarihi || '', dogum_yeri: s.dogum_yeri || '', meslek: s.meslek || '',
      konum: parseInt(s.konum) || 0
    })
    setDuzenlenenId(s.id)
    setFormAcik(true)
    setHata('')
    setHesapArama('')
  }

  async function mevcutHesabaBagla(hedefSakin) {
    if (!confirm(`Bu daireyi ${hedefSakin.adi} ${hedefSakin.soyadi}'nın hesabına bağlamak istediğinize emin misiniz? Bu kişi artık her iki daireyi de aynı hesapla görebilecek.`)) return
    setHesapBaglaniyor(true)
    const { error } = await supabase
      .from('sakinler')
      .update({ user_id: hedefSakin.user_id })
      .eq('id', duzenlenenId)
    setHesapBaglaniyor(false)
    if (error) { setHata(error.message); return }
    setFormAcik(false)
    fetchSakinler()
  }

  async function fotografYukle(dosya) {
    if (!dosya) return
    setFotografYukleniyor(true)
    setHata('')

    const uzanti = dosya.name.split('.').pop()
    const dosyaAdi = `${Date.now()}-${Math.random().toString(36).slice(2)}.${uzanti}`

    const { error: yuklemeHatasi } = await supabase.storage
      .from('sakin-fotograflari')
      .upload(dosyaAdi, dosya, { cacheControl: '3600', upsert: false })

    if (yuklemeHatasi) {
      setHata('Fotoğraf yüklenemedi: ' + yuklemeHatasi.message)
      setFotografYukleniyor(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('sakin-fotograflari')
      .getPublicUrl(dosyaAdi)

    setForm(f => ({ ...f, fotograf_url: publicUrl }))
    setFotografYukleniyor(false)
  }

  async function kaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    setHata('')

    const veri = {
      ...form,
      daire_no: form.daire_no ? parseInt(form.daire_no) : null,
      cocuk_sayisi: form.cocuk_sayisi !== '' ? parseInt(form.cocuk_sayisi) : null,
      dogum_tarihi: form.dogum_tarihi || null,
      konum: parseInt(form.konum) || 0
    }

    let sonuc
    if (duzenlenenId) {
      sonuc = await supabase.from('sakinler').update(veri).eq('id', duzenlenenId)
    } else {
      sonuc = await supabase.from('sakinler').insert(veri)
    }

    setKaydediliyor(false)

    if (sonuc.error) {
      setHata(sonuc.error.message.includes('duplicate') ? 'Bu daire kodu zaten kayıtlı.' : sonuc.error.message)
      return
    }

    setFormAcik(false)
    fetchSakinler()
  }

  async function sakinSil(s) {
    if (!confirm(`${s.adi} ${s.soyadi} (Daire ${s.daire_no || s.daire}) kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return
    const { error } = await supabase.from('sakinler').delete().eq('id', s.id)
    if (error) { alert('Silinemedi: ' + error.message); return }
    fetchSakinler()
  }

  async function hesapBaglantisiKes(s) {
    if (!s.user_id) { alert('Bu sakinin zaten hesap bağlantısı yok.'); return }
    if (!confirm(`${s.adi} ${s.soyadi} (Daire ${s.daire_no || s.daire}) için hesap bağlantısı kesilecek. Eğer başka daireye bağlı değilse giriş hesabı da silinecek. Devam edilsin mi?`)) return

    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('hesap-baglantisi-kes', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { sakin_id: s.id }
    })

    if (error) { alert('Hata: ' + error.message); return }
    alert(data.mesaj)
    fetchSakinler()
  }

  async function sifreSifirla(s) {
    if (!s.user_id) { alert('Bu sakinin hesabı yok, önce hesap açılmalı.'); return }
    if (!confirm(`${s.adi} ${s.soyadi} için şifre telefon numarasının son 6 hanesine sıfırlanacak ve giriş telefonla yapılacak şekilde ayarlanacak. Devam edilsin mi?`)) return

    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('sifre-sifirla', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { sakin_id: s.id, telefona_cevir: true }
    })

    if (error) { alert('Sıfırlanamadı: ' + error.message); return }
    alert(`Şifre sıfırlandı!\n\nGiriş: ${data.email}\nŞifre: ${data.sifre}\n\nBu bilgiyi sakine iletin.`)
  }

  const filtreli = sakinler.filter(s =>
    `${s.adi} ${s.soyadi} ${s.daire} ${s.daire_no || ''}`.toLowerCase().includes(arama.toLowerCase())
  )

  return (
    <div className="sayfa">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="sayfa-baslik" style={{ marginBottom: 0 }}>Sakin Yönetimi</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ikincil" onClick={csvIndir} style={{ padding: '8px 12px', fontSize: 13, width: 'auto' }}>
            📥 CSV
          </button>
          <button className="btn btn-ana" onClick={yeniEkleAc} style={{ padding: '8px 14px', fontSize: 13, width: 'auto' }}>
            + Yeni Sakin
          </button>
        </div>
      </div>

      <input
        className="form-girdi"
        placeholder="İsim veya daire ara..."
        value={arama}
        onChange={e => setArama(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {basvurular.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            📋 Bekleyen Başvurular ({basvurular.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {basvurular.map(b => {
              const arananMetin = eslesmeArama[b.id] || ''
              const eslesenler = arananMetin.trim().length > 1
                ? sakinler.filter(s => s.user_id && `${s.adi} ${s.soyadi}`.toLowerCase().includes(arananMetin.toLowerCase())).slice(0, 5)
                : []
              return (
                <div key={b.id} className="kart" style={{ borderLeft: '3px solid var(--sari)' }}>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{b.adi} {b.soyadi} — Daire {b.daire_no}</p>
                  <p style={{ color: 'var(--metin3)', fontSize: 13, marginTop: 2 }}>{b.telefon}</p>
                  <p style={{ color: 'var(--metin3)', fontSize: 11, marginTop: 2 }}>
                    {new Date(b.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => basvuruOnayla(b)}
                      disabled={basvuruIsleniyor === b.id}
                      className="btn"
                      style={{ flex: 1, background: 'var(--yesil)', color: '#fff', fontSize: 13, padding: '8px' }}>
                      {basvuruIsleniyor === b.id ? 'İşleniyor...' : '✓ Yeni Sakin Olarak Onayla'}
                    </button>
                    <button
                      onClick={() => basvuruReddet(b)}
                      disabled={basvuruIsleniyor === b.id}
                      className="btn"
                      style={{ background: 'var(--turuncu-bg)', color: 'var(--turuncu)', fontSize: 13, padding: '8px 12px' }}>
                      Reddet
                    </button>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <input
                      className="form-girdi"
                      placeholder="Veya mevcut bir sakine bağlamak için isim arayın..."
                      value={arananMetin}
                      onChange={e => setEslesmeArama(prev => ({ ...prev, [b.id]: e.target.value }))}
                      style={{ fontSize: 12, padding: '8px 10px' }}
                    />
                    {eslesenler.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        {eslesenler.map(s => (
                          <button
                            key={s.id}
                            onClick={() => basvuruOnayla(b, s.id)}
                            disabled={basvuruIsleniyor === b.id}
                            style={{ textAlign: 'left', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--kenarlık)', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                            <strong>{s.adi} {s.soyadi}</strong> — Daire {s.daire_no || s.daire} hesabına bağla
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="ayirici" style={{ marginTop: '1rem' }} />
        </div>
      )}

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtreli.map(s => (
            <div key={s.id} className="kart" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div onClick={() => setDetayAcik(s)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: 40, height: 40 }}>
                  {s.fotograf_url ? (
                    <>
                      <img src={s.fotograf_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
                      <span style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(0,0,0,0.55)', color: '#fff',
                        fontSize: 9, fontWeight: 700, textAlign: 'center',
                        borderRadius: '0 0 8px 8px', padding: '1px 0', lineHeight: '14px'
                      }}>{s.daire_no || s.daire}</span>
                    </>
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: parseInt(s.konum) === 2 ? 'var(--mavi-bg)' : parseInt(s.konum) === 1 ? 'var(--yesil-bg)' : 'var(--yüzey)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: 13,
                      color: parseInt(s.konum) === 2 ? 'var(--mavi)' : parseInt(s.konum) === 1 ? 'var(--yesil)' : 'var(--metin3)'
                    }}>
                      {s.daire_no || s.daire}
                    </div>
                  )}
                  {parseInt(s.konum) === 1 && (
                    <span style={{
                      position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--yesil-acik)', border: '2px solid #fff'
                    }} />
                  )}
                  {parseInt(s.konum) === 2 && (
                    <span style={{
                      position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--mavi)', border: '2px solid #fff'
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{s.adi} {s.soyadi}</p>
                  <p style={{ color: 'var(--metin3)', fontSize: 12 }}>
                    {s.email || 'E-posta yok'}
                    {s.user_id && <span style={{ color: 'var(--yesil)' }}> · Hesabı var</span>}
                    {s.user_id && sakinler.filter(x => x.user_id === s.user_id).length > 1 && (
                      <span style={{ color: 'var(--mavi)' }}> · {sakinler.filter(x => x.user_id === s.user_id).length} daire</span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => duzenleAc(s)} style={{ background: 'var(--mavi-bg)', color: 'var(--mavi)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                Düzenle
              </button>
              {s.user_id && (
                <button onClick={() => sifreSifirla(s)} style={{ background: 'var(--sari-bg)', color: 'var(--sari)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                  🔑
                </button>
              )}
              {s.user_id && (
                <button onClick={() => hesapBaglantisiKes(s)} style={{ background: 'var(--turuncu-bg)', color: 'var(--turuncu)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }} title="Hesap bağlantısını kes">
                  🔗
                </button>
              )}
              <button onClick={() => sakinSil(s)} style={{ background: 'var(--turuncu-bg)', color: 'var(--turuncu)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                Sil
              </button>
            </div>
          ))}

          {filtreli.length === 0 && (
            <div className="bos-durum">
              <div className="bos-durum-ikon">🔍</div>
              <p>Sonuç bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Detay Görünümü Modal */}
      {detayAcik && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200, overflowY: 'auto'
        }} onClick={() => setDetayAcik(null)}>
          <div
            className="kart"
            style={{ width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '16px 16px 0 0', padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              {detayAcik.fotograf_url ? (
                <img src={detayAcik.fotograf_url} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 12, background: 'var(--yesil-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 20, color: 'var(--yesil)'
                }}>
                  {detayAcik.daire_no || detayAcik.daire}
                </div>
              )}
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 600 }}>{detayAcik.adi} {detayAcik.soyadi}</h2>
                <p style={{ color: 'var(--metin3)', fontSize: 13 }}>Daire {detayAcik.daire_no || detayAcik.daire}</p>
                {detayAcik.user_id && (() => {
                  const bagliDaireler = sakinler.filter(s => s.user_id === detayAcik.user_id && s.id !== detayAcik.id)
                  return bagliDaireler.length > 0 ? (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {bagliDaireler.map(d => (
                        <span key={d.id} className="rozet rozet-inceleniyor" style={{ fontSize: 11 }}>
                          🔗 Daire {d.daire_no || d.daire} — {d.adi} {d.soyadi}
                        </span>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            <div className="ayirici" />

            {[
              ['Doğum Tarihi', detayAcik.dogum_tarihi ? new Date(detayAcik.dogum_tarihi).toLocaleDateString('tr-TR') : null],
              ['Doğum Yeri', detayAcik.dogum_yeri],
              ['T.C/Web', detayAcik.tc_kimlik],
              ['Meslek', detayAcik.meslek],
              ['Eş Adı', detayAcik.es_adi],
              ['Çocuk Sayısı', detayAcik.cocuk_sayisi],
              ['Baba Adı', detayAcik.baba_adi],
              ['Anne Adı', detayAcik.anne_adi],
              ['Cep Telefon', detayAcik.ceptel],
              ['Cep Telefon 2', detayAcik.ceptel2],
              ['Ev Telefonu', detayAcik.tel1],
              ['E-posta', detayAcik.email],
              ['Ev Adresi', detayAcik.ev_adresi],
              ['Plaka', detayAcik.plaka],
              ['Not / Açıklama', detayAcik.aciklama],
            ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([label, val]) => (
              <div key={label} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--kenarlık)', fontSize: 14 }}>
                <span style={{ color: 'var(--metin3)', fontSize: 12 }}>{label}</span>
                <p style={{ marginTop: 2 }}>{val}</p>
              </div>
            ))}

            {/* Yönetim üyeliği */}
            <div className="ayirici" style={{ marginTop: '0.75rem' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
              <button
                className="btn"
                style={{
                  flex: 1, fontSize: 12,
                  background: detayAcik.yonetim_uyesi ? 'var(--turuncu-bg)' : 'var(--mavi-bg)',
                  color: detayAcik.yonetim_uyesi ? 'var(--turuncu)' : 'var(--mavi)'
                }}
                onClick={async () => {
                  await supabase.from('sakinler').update({
                    yonetim_uyesi: !detayAcik.yonetim_uyesi,
                    yonetim_gorevi: !detayAcik.yonetim_uyesi ? 'Üye' : null
                  }).eq('id', detayAcik.id)
                  fetchSakinler()
                  setDetayAcik(null)
                }}>
                {detayAcik.yonetim_uyesi ? '✕ Yönetimden Çıkar' : '🏛️ Yönetim Üyesi Yap'}
              </button>
            </div>

            <button
              className="btn btn-ikincil"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={() => setDetayAcik(null)}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Ekle/Düzenle Modal */}
      {formAcik && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200, overflowY: 'auto'
        }} onClick={() => setFormAcik(false)}>
          <div
            className="kart"
            style={{ width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '16px 16px 0 0', padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: '1rem' }}>
              {duzenlenenId ? 'Sakin Düzenle' : 'Yeni Sakin Ekle'}
            </h2>

            {duzenlenenId && (() => {
              const buSakin = sakinler.find(s => s.id === duzenlenenId)
              if (!buSakin) return null
              return (
                <div style={{ background: 'var(--yüzey)', borderRadius: 10, padding: '0.85rem', marginBottom: '1rem' }}>
                  <p className="form-etiket" style={{ marginBottom: 6 }}>
                    {buSakin.user_id ? '✓ Bu dairenin giriş hesabı var' : 'Bu daireyi mevcut bir hesaba bağla'}
                  </p>
                  {buSakin.user_id ? (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 6 }}>
                        Hesap zaten bağlı. Aynı kişinin başka bir dairesi varsa, o dairenin düzenleme ekranından buraya bağlayabilirsiniz.
                      </p>
                      {(() => {
                        const bagliDaireler = sakinler.filter(s => s.user_id === buSakin.user_id && s.id !== duzenlenenId)
                        return bagliDaireler.length > 0 ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {bagliDaireler.map(d => (
                              <span key={d.id} className="rozet rozet-inceleniyor" style={{ fontSize: 11 }}>
                                🔗 Daire {d.daire_no || d.daire} — {d.adi} {d.soyadi}
                              </span>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--metin3)', marginBottom: 8 }}>
                        Bu kişinin zaten başka bir dairede hesabı varsa, burada arayıp seçerek aynı hesaba bağlayabilirsiniz — yeni hesap açmaya gerek kalmaz.
                      </p>
                      <input
                        className="form-girdi"
                        placeholder="İsim ile ara..."
                        value={hesapArama}
                        onChange={e => setHesapArama(e.target.value)}
                        style={{ marginBottom: 8, fontSize: 13 }}
                      />
                      {hesapArama.trim().length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                          {sakinler
                            .filter(s => s.user_id && s.id !== duzenlenenId &&
                              `${s.adi} ${s.soyadi}`.toLowerCase().includes(hesapArama.toLowerCase()))
                            .slice(0, 5)
                            .map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => mevcutHesabaBagla(s)}
                                disabled={hesapBaglaniyor}
                                style={{
                                  textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                                  border: '0.5px solid var(--kenarlık)', background: '#fff',
                                  fontSize: 13, cursor: 'pointer'
                                }}>
                                <strong>{s.adi} {s.soyadi}</strong>
                                <span style={{ color: 'var(--metin3)' }}> — Daire {s.daire_no || s.daire}</span>
                              </button>
                            ))}
                          {sakinler.filter(s => s.user_id && s.id !== duzenlenenId &&
                            `${s.adi} ${s.soyadi}`.toLowerCase().includes(hesapArama.toLowerCase())).length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--metin3)' }}>Hesabı olan eşleşen kişi bulunamadı.</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div className="ayirici" style={{ marginTop: 10, marginBottom: 0 }} />
                </div>
              )
            })()}

            <form onSubmit={kaydet}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Daire No</label>
                  <input className="form-girdi" type="number" value={form.daire_no} onChange={e => setForm(f => ({...f, daire_no: e.target.value}))} />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Daire Kodu</label>
                  <input className="form-girdi" value={form.daire} onChange={e => setForm(f => ({...f, daire: e.target.value}))} required placeholder="A, AB, BA..." />
                </div>
              </div>
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
                <label className="form-etiket">Web Girişi</label>
                <input className="form-girdi" value={form.tc_kimlik} onChange={e => setForm(f => ({...f, tc_kimlik: e.target.value}))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Doğum Tarihi</label>
                  <input className="form-girdi" type="date" value={form.dogum_tarihi} onChange={e => setForm(f => ({...f, dogum_tarihi: e.target.value}))} />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Doğum Yeri</label>
                  <input className="form-girdi" value={form.dogum_yeri} onChange={e => setForm(f => ({...f, dogum_yeri: e.target.value}))} />
                </div>
              </div>
              <div className="form-grup">
                <label className="form-etiket">Meslek</label>
                <input className="form-girdi" value={form.meslek} onChange={e => setForm(f => ({...f, meslek: e.target.value}))} />
              </div>

              <div className="form-grup">
                <label className="form-etiket">Fotoğraf</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {form.fotograf_url && (
                    <img src={form.fotograf_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '0.5px solid var(--kenarlık)' }} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => fotografYukle(e.target.files?.[0])}
                    disabled={fotografYukleniyor}
                    style={{ fontSize: 12 }}
                  />
                </div>
                {fotografYukleniyor && <p style={{ fontSize: 12, color: 'var(--metin3)', marginTop: 4 }}>Yükleniyor...</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Eş Adı</label>
                  <input className="form-girdi" value={form.es_adi} onChange={e => setForm(f => ({...f, es_adi: e.target.value}))} />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Çocuk Sayısı</label>
                  <input className="form-girdi" type="number" min="0" value={form.cocuk_sayisi} onChange={e => setForm(f => ({...f, cocuk_sayisi: e.target.value}))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Baba Adı</label>
                  <input className="form-girdi" value={form.baba_adi} onChange={e => setForm(f => ({...f, baba_adi: e.target.value}))} />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Anne Adı</label>
                  <input className="form-girdi" value={form.anne_adi} onChange={e => setForm(f => ({...f, anne_adi: e.target.value}))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-grup">
                  <label className="form-etiket">Cep Telefon</label>
                  <input className="form-girdi" value={form.ceptel} onChange={e => setForm(f => ({...f, ceptel: e.target.value}))} />
                </div>
                <div className="form-grup">
                  <label className="form-etiket">Cep Telefon 2</label>
                  <input className="form-girdi" value={form.ceptel2} onChange={e => setForm(f => ({...f, ceptel2: e.target.value}))} />
                </div>
              </div>
              <div className="form-grup">
                <label className="form-etiket">Ev Telefonu</label>
                <input className="form-girdi" value={form.tel1} onChange={e => setForm(f => ({...f, tel1: e.target.value}))} />
              </div>
              <div className="form-grup">
                <label className="form-etiket">E-posta</label>
                <input className="form-girdi" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
              </div>
              <div className="form-grup">
                <label className="form-etiket">Ev Adresi</label>
                <textarea className="form-girdi" rows={2} value={form.ev_adresi} onChange={e => setForm(f => ({...f, ev_adresi: e.target.value}))} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-grup">
                <label className="form-etiket">Plaka</label>
                <input className="form-girdi" placeholder="34 ABC 123" value={form.plaka} onChange={e => setForm(f => ({...f, plaka: e.target.value}))} />
              </div>
              <div className="form-grup">
                <label className="form-etiket">Not / Açıklama</label>
                <textarea className="form-girdi" rows={2} value={form.aciklama} onChange={e => setForm(f => ({...f, aciklama: e.target.value}))} style={{ resize: 'vertical' }} placeholder="Yönetimin göreceği özel notlar..." />
              </div>
              <div className="form-grup">
                <label className="form-etiket">Konum Durumu</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { val: 0, label: 'Sitede Değil', bg: 'var(--yüzey)', color: 'var(--metin3)', border: 'var(--kenarlık)' },
                    { val: 1, label: 'Yazlıkçı', bg: 'var(--yesil-bg)', color: 'var(--yesil)', border: 'var(--yesil)' },
                    { val: 2, label: 'Devamlı', bg: 'var(--mavi-bg)', color: 'var(--mavi)', border: 'var(--mavi)' },
                  ].map(({ val, label, bg, color, border }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(f => ({...f, konum: val}))}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                        border: `1.5px solid ${parseInt(form.konum) === val ? border : 'var(--kenarlık)'}`,
                        background: parseInt(form.konum) === val ? bg : '#fff',
                        color: parseInt(form.konum) === val ? color : 'var(--metin3)',
                        fontWeight: parseInt(form.konum) === val ? 600 : 400
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {hata && <p style={{ color: 'var(--turuncu)', fontSize: 13, marginBottom: 8 }}>{hata}</p>}

              <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
                <button className="btn btn-ana" type="submit" disabled={kaydediliyor} style={{ flex: 1 }}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button type="button" className="btn" onClick={() => setFormAcik(false)} style={{ background: 'var(--yüzey)', color: 'var(--metin2)', border: '0.5px solid var(--kenarlık)' }}>
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
