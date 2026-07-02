import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { pushDestekleniyorMu, bildirimIzniDurumu, bildirimleriAc, bildirimleriKapat } from '../lib/push'

export default function ProfilPage() {
  const { user, sakin, sakinler, coklu, aktifSakinId, daireSec, isAdmin, cikisYap } = useAuth()
  const [duzenleme, setDuzenleme] = useState(false)
  const [bildirimDurum, setBildirimDurum] = useState('default')
  const [bildirimYukleniyor, setBildirimYukleniyor] = useState(false)

  useEffect(() => {
    bildirimIzniDurumu().then(setBildirimDurum)
  }, [])

  async function bildirimToggle() {
    setBildirimYukleniyor(true)
    try {
      if (bildirimDurum === 'granted') {
        await bildirimleriKapat()
        setBildirimDurum('default')
      } else {
        await bildirimleriAc()
        setBildirimDurum('granted')
      }
    } catch (err) {
      alert(err.message)
    }
    setBildirimYukleniyor(false)
  }

  const [form, setForm] = useState(sakin ? {
    adi: sakin.adi, soyadi: sakin.soyadi,
    ceptel: sakin.ceptel || '', ceptel2: sakin.ceptel2 || '',
    email: sakin.email || '', ev_adresi: sakin.ev_adresi || ''
  } : {})
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')

  async function kaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    const { error } = await supabase.from('sakinler').update(form).eq('id', sakin.id)
    setKaydediliyor(false)
    setMesaj(error ? 'Hata oluştu.' : 'Kaydedildi!')
    if (!error) setDuzenleme(false)
    setTimeout(() => setMesaj(''), 3000)
  }

  if (!sakin && !isAdmin) {
    return (
      <div className="sayfa">
        <h1 className="sayfa-baslik">Profil</h1>
        <div className="kart">
          <p style={{ color: 'var(--metin2)', marginBottom: '1rem' }}>
            Hesabınız henüz bir daireyle eşleştirilmemiş. Site yöneticisiyle iletişime geçin.
          </p>
          <p style={{ fontSize: 13, color: 'var(--metin3)' }}>Giriş yapılan e-posta: {user?.email}</p>
        </div>
        <button className="btn btn-tehlike" onClick={cikisYap} style={{ marginTop: '1rem', width: '100%' }}>Çıkış Yap</button>
      </div>
    )
  }

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Profil</h1>

      <div className="kart" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'var(--yesil-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 20, color: 'var(--yesil)'
        }}>
          {sakin ? `${sakin.adi[0]}${sakin.soyadi[0]}` : '👑'}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 16 }}>{sakin ? `${sakin.adi} ${sakin.soyadi}` : 'Yönetici'}</p>
          <p style={{ color: 'var(--metin3)', fontSize: 13 }}>
            {sakin ? `Daire ${sakin.daire_no || sakin.daire}` : 'Admin hesabı'} · {user?.email}
          </p>
          {isAdmin && <span className="rozet rozet-inceleniyor" style={{ marginTop: 4, display: 'inline-block' }}>Admin</span>}
        </div>
      </div>

      {pushDestekleniyorMu() && (
        <div className="kart" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: 14 }}>🔔 Bildirimler</p>
            <p style={{ color: 'var(--metin3)', fontSize: 12, marginTop: 2 }}>
              {bildirimDurum === 'granted' ? 'Açık — yeni duyurularda bildirim alırsınız' : 'Kapalı'}
            </p>
          </div>
          <button
            onClick={bildirimToggle}
            disabled={bildirimYukleniyor || bildirimDurum === 'denied'}
            className="btn"
            style={{
              fontSize: 12, padding: '8px 14px', whiteSpace: 'nowrap',
              background: bildirimDurum === 'granted' ? 'var(--turuncu-bg)' : 'var(--yesil)',
              color: bildirimDurum === 'granted' ? 'var(--turuncu)' : '#fff'
            }}>
            {bildirimYukleniyor ? '...' : bildirimDurum === 'granted' ? 'Kapat' : 'Aç'}
          </button>
        </div>
      )}

      {coklu && (
        <div className="kart" style={{ marginBottom: '1rem' }}>
          <p className="form-etiket" style={{ marginBottom: 8 }}>Birden fazla daireniz var, görüntülenecek daireyi seçin:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sakinler.map(s => (
              <button
                key={s.id}
                onClick={() => daireSec(s.id)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  border: s.id === aktifSakinId ? '1.5px solid var(--yesil)' : '0.5px solid var(--kenarlık)',
                  background: s.id === aktifSakinId ? 'var(--yesil-bg)' : '#fff',
                  color: s.id === aktifSakinId ? 'var(--yesil)' : 'var(--metin2)',
                  fontWeight: s.id === aktifSakinId ? 600 : 400
                }}>
                Daire {s.daire_no || s.daire}
              </button>
            ))}
          </div>
        </div>
      )}

      {sakin && (
        <div className="kart" style={{ marginBottom: '1rem' }}>
          {!duzenleme ? (
            <>
              {[
                ['📱 Cep Tel', sakin.ceptel],
                ['📱 Cep Tel 2', sakin.ceptel2],
                ['✉️ E-posta', sakin.email],
                ['🏠 Ev Adresi', sakin.ev_adresi],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--kenarlık)', fontSize: 14 }}>
                  <span style={{ color: 'var(--metin3)' }}>{label}</span>
                  <p style={{ marginTop: 2 }}>{val}</p>
                </div>
              ))}
              <button className="btn btn-ikincil" onClick={() => setDuzenleme(true)} style={{ marginTop: '0.75rem', width: '100%' }}>
                Bilgileri Düzenle
              </button>
            </>
          ) : (
            <form onSubmit={kaydet}>
              {[
                ['adi', 'Ad', 'text'], ['soyadi', 'Soyad', 'text'],
                ['ceptel', 'Cep Telefonu', 'tel'], ['ceptel2', 'Cep Telefonu 2', 'tel'],
                ['email', 'E-posta', 'email'],
              ].map(([key, label, type]) => (
                <div className="form-grup" key={key}>
                  <label className="form-etiket">{label}</label>
                  <input className="form-girdi" type={type} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} />
                </div>
              ))}
              <div className="form-grup">
                <label className="form-etiket">Ev Adresi</label>
                <textarea className="form-girdi" rows={2} value={form.ev_adresi || ''} onChange={e => setForm(f => ({...f, ev_adresi: e.target.value}))} style={{ resize: 'vertical' }} />
              </div>
              {mesaj && <p style={{ color: mesaj.includes('Hata') ? 'var(--turuncu)' : 'var(--yesil)', fontSize: 13, marginBottom: 8 }}>{mesaj}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ana" type="submit" disabled={kaydediliyor} style={{ flex: 1 }}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button type="button" className="btn" onClick={() => setDuzenleme(false)} style={{ background: 'var(--yüzey)', color: 'var(--metin2)', border: '0.5px solid var(--kenarlık)' }}>
                  Vazgeç
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {isAdmin && (
        <button
          className="btn btn-ikincil"
          onClick={() => window.location.href = '/yazlik-pwa/aidat-ayarlar'}
          style={{ width: '100%', marginBottom: '0.5rem' }}>
          💰 Aidat Ayarları & Banka Ekstresi
        </button>
      )}

      {isAdmin && (
        <button
          className="btn btn-ikincil"
          onClick={() => window.location.href = '/yazlik-pwa/sakin-yonetimi'}
          style={{ width: '100%', marginBottom: '0.5rem' }}>
          👥 Sakinleri Yönet
        </button>
      )}

      {isAdmin && (
        <button
          className="btn btn-ikincil"
          onClick={() => window.location.href = '/yazlik-pwa/hesap-yonetimi'}
          style={{ width: '100%', marginBottom: '1rem' }}>
          🔑 Sakin Hesaplarını Yönet
        </button>
      )}

      <button className="btn btn-tehlike" onClick={cikisYap} style={{ width: '100%' }}>
        Çıkış Yap
      </button>
    </div>
  )
}
