import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BOS_FORM = {
  daire: '', daire_no: '', adi: '', soyadi: '', tc_kimlik: '',
  es_adi: '', ceptel: '', ceptel2: '', tel1: '', email: '', ev_adresi: '', konum: 0
}

export default function SakinYonetimiPage() {
  const [sakinler, setSakinler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [form, setForm] = useState(BOS_FORM)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [hesapArama, setHesapArama] = useState('')
  const [hesapBaglaniyor, setHesapBaglaniyor] = useState(false)

  useEffect(() => { fetchSakinler() }, [])

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

  function duzenleAc(s) {
    setForm({
      daire: s.daire || '', daire_no: s.daire_no || '', adi: s.adi || '', soyadi: s.soyadi || '',
      tc_kimlik: s.tc_kimlik || '', es_adi: s.es_adi || '', ceptel: s.ceptel || '',
      ceptel2: s.ceptel2 || '', tel1: s.tel1 || '', email: s.email || '',
      ev_adresi: s.ev_adresi || '', konum: s.konum || 0
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

  async function kaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    setHata('')

    const veri = {
      ...form,
      daire_no: form.daire_no ? parseInt(form.daire_no) : null,
      konum: form.konum ? 1 : 0
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

  const filtreli = sakinler.filter(s =>
    `${s.adi} ${s.soyadi} ${s.daire} ${s.daire_no || ''}`.toLowerCase().includes(arama.toLowerCase())
  )

  return (
    <div className="sayfa">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="sayfa-baslik" style={{ marginBottom: 0 }}>Sakin Yönetimi</h1>
        <button className="btn btn-ana" onClick={yeniEkleAc} style={{ padding: '8px 14px', fontSize: 13, width: 'auto' }}>
          + Yeni Sakin
        </button>
      </div>

      <input
        className="form-girdi"
        placeholder="İsim veya daire ara..."
        value={arama}
        onChange={e => setArama(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtreli.map(s => (
            <div key={s.id} className="kart" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                background: 'var(--yesil-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: 13, color: 'var(--yesil)'
              }}>
                {s.daire_no || s.daire}
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
              <button onClick={() => duzenleAc(s)} style={{ background: 'var(--mavi-bg)', color: 'var(--mavi)', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                Düzenle
              </button>
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
                    <p style={{ fontSize: 12, color: 'var(--metin3)' }}>
                      Hesap zaten bağlı. Aynı kişinin başka bir dairesi varsa, o dairenin düzenleme ekranından buraya bağlayabilirsiniz.
                    </p>
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
                <label className="form-etiket">TC Kimlik</label>
                <input className="form-girdi" value={form.tc_kimlik} onChange={e => setForm(f => ({...f, tc_kimlik: e.target.value}))} />
              </div>
              <div className="form-grup">
                <label className="form-etiket">Eş Adı</label>
                <input className="form-girdi" value={form.es_adi} onChange={e => setForm(f => ({...f, es_adi: e.target.value}))} />
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
              <div className="form-grup" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!form.konum} onChange={e => setForm(f => ({...f, konum: e.target.checked}))} id="konum" style={{ width: 18, height: 18 }} />
                <label htmlFor="konum" className="form-etiket" style={{ margin: 0 }}>Şu anda sitede / yazlıkta</label>
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
