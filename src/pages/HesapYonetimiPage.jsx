import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function HesapYonetimiPage() {
  const [calisiyor, setCalisiyor] = useState(false)
  const [sonuclar, setSonuclar] = useState(null)
  const [hata, setHata] = useState('')

  async function topluOlustur() {
    if (!confirm('E-posta veya telefonu kayıtlı, henüz hesabı olmayan tüm sakinler için giriş hesabı oluşturulacak. Devam edilsin mi?')) return
    setCalisiyor(true)
    setHata('')
    setSonuclar(null)

    const { data: { session } } = await supabase.auth.getSession()

    const { data, error } = await supabase.functions.invoke('toplu-hesap-olustur', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })

    setCalisiyor(false)
    if (error) { setHata(error.message); return }
    setSonuclar(data.sonuclar)
  }

  function csvIndir() {
    if (!sonuclar) return
    const basarili = sonuclar.filter(s => s.durum === 'basarili')
    const baslik = 'Daire,Ad Soyad,Giriş Yöntemi,Kullanıcı Adı,Şifre\n'
    const satirlar = basarili.map(s =>
      `${s.daire},"${s.adi}",${s.yontem === 'telefon' ? 'Telefon' : 'E-posta'},${s.email},${s.sifre}`
    ).join('\n')
    const blob = new Blob(['\ufeff' + baslik + satirlar], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sakin-sifreleri-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const basariliSayisi = sonuclar?.filter(s => s.durum === 'basarili').length || 0
  const hataliSayisi = sonuclar?.filter(s => s.durum === 'hata').length || 0
  const atlananSayisi = sonuclar?.filter(s => s.durum === 'atlandi').length || 0

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Hesap Yönetimi</h1>

      <div className="kart" style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--metin2)', fontSize: 14, marginBottom: '0.5rem' }}>
          Henüz hesabı olmayan sakinler için otomatik giriş hesabı oluşturur:
        </p>
        <ul style={{ fontSize: 13, color: 'var(--metin2)', paddingLeft: 18, marginBottom: '1rem' }}>
          <li>E-postası varsa → rastgele şifre üretilir</li>
          <li>E-postası yok ama telefonu varsa → telefon ile giriş, şifre = telefonun son 6 hanesi</li>
        </ul>
        <button className="btn btn-ana" onClick={topluOlustur} disabled={calisiyor}>
          {calisiyor ? 'Oluşturuluyor...' : 'Eksik Hesapları Oluştur'}
        </button>
      </div>

      {hata && (
        <div className="kart" style={{ background: 'var(--turuncu-bg)', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--turuncu)', fontSize: 14 }}>Hata: {hata}</p>
        </div>
      )}

      {sonuclar && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '1rem' }}>
            <div className="kart" style={{ background: 'var(--yesil-bg)' }}>
              <p style={{ fontSize: 12, color: 'var(--yesil)' }}>Başarılı</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--yesil)' }}>{basariliSayisi}</p>
            </div>
            <div className="kart" style={{ background: hataliSayisi > 0 ? 'var(--turuncu-bg)' : 'var(--yüzey)' }}>
              <p style={{ fontSize: 12, color: hataliSayisi > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>Hatalı</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: hataliSayisi > 0 ? 'var(--turuncu)' : 'var(--metin3)' }}>{hataliSayisi}</p>
            </div>
            <div className="kart" style={{ background: 'var(--yüzey)' }}>
              <p style={{ fontSize: 12, color: 'var(--metin3)' }}>Atlandı</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--metin3)' }}>{atlananSayisi}</p>
            </div>
          </div>

          {basariliSayisi > 0 && (
            <button className="btn btn-ikincil" onClick={csvIndir} style={{ width: '100%', marginBottom: '1rem' }}>
              📥 Şifre Listesini İndir (CSV)
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sonuclar.map((s, i) => (
              <div key={i} className="kart" style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>{s.adi} (Daire {s.daire})</span>
                  <span className={`rozet ${s.durum === 'basarili' ? 'rozet-normal' : s.durum === 'hata' ? 'rozet-acil' : 'rozet-bekliyor'}`}>
                    {s.durum === 'basarili' ? 'Oluşturuldu' : s.durum === 'hata' ? 'Hata' : 'Atlandı'}
                  </span>
                </div>
                {s.email && <p style={{ color: 'var(--metin3)', marginTop: 4 }}>{s.email}</p>}
                {s.durum === 'basarili' ? (
                  <p style={{ color: 'var(--yesil)', fontWeight: 600, marginTop: 2 }}>
                    Şifre: {s.sifre} {s.yontem === 'telefon' && <span style={{ fontWeight: 400, color: 'var(--metin3)' }}>(telefonla giriş)</span>}
                  </p>
                ) : (
                  <p style={{ color: 'var(--turuncu)', marginTop: 2 }}>{s.mesaj}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
